-- Flight-delay / cancellation cover pricing, May-July 2026 (BTS on-time flights + IEM ASOS weather + SPC outlooks).
-- Run by build_insurance.sh from a working directory holding:
--   flights/flights_2026_0*.parquet   BTS flights (all US domestic, 1.85M)
--   out/ledger_wx_days.parquet        daily weather band at 99 airports (ledger build, storm-study rules)
--   asos/*.csv, asos-ledger/*.csv     hourly METAR observations, local time (for "thunder already reported")
--   spc/*_d1.json, spc/*_d2.json      SPC convective outlook history per airport (IEM point service)
--   tz.csv                            iata,tz for the 99 airports
-- Writes out/ins_*.parquet.
--
-- CLAIM DEFINITIONS (per scheduled flight; cancelled flights are not "delayed"):
--   cancel = cancelled;  d2/d3 = arrived 2+/3+ h late, or diverted;  d6 = arrived 6+ h late (diversions excluded:
--   BTS gives no arrival delay for them).
-- SAMPLE PRODUCT (parametric, pays automatically):  $200 on cancellation, $100 when 3+ h late, another $100 at 6+ h.
set TimeZone = 'UTC';
set variable pay_cancel = 200;
set variable pay_3h = 100;
set variable pay_6h = 100;
-- Shrinkage strength (pseudo-flights): origin toward national, origin x hour band toward origin x national hour
-- shape, cell (carrier x origin x hour band [x month]) toward its origin x band rate x the carrier's factor.
set variable m_origin = 500;
set variable m_band = 1500;
set variable m_cell = 500;
set variable a_carrier = 20;   -- pseudo-claims for the carrier factor (observed / expected, shrunk toward 1)

-- 1. Flights ------------------------------------------------------------------------------------------------------
create or replace table tz as select * from read_csv('tz.csv', header=true);
create or replace table fl as
select flight_date, month(flight_date) mon, carrier, origin, dest, sched_dep_hhmm, sched_dep_hhmm//100 dep_hour,
  case when sched_dep_hhmm//100 between 5 and 8 then '1 5-8am' when sched_dep_hhmm//100 between 9 and 11 then '2 9-11am'
       when sched_dep_hhmm//100 between 12 and 14 then '3 12-2pm' when sched_dep_hhmm//100 between 15 and 17 then '4 3-5pm'
       when sched_dep_hhmm//100 between 18 and 20 then '5 6-8pm' else '6 9pm-4am' end hour_band,
  cancelled::int c,
  (not cancelled and (diverted or coalesce(arr_delay_min,0) >= 120))::int d2,
  (not cancelled and (diverted or coalesce(arr_delay_min,0) >= 180))::int d3,
  (not cancelled and not diverted and coalesce(arr_delay_min,0) >= 360)::int d6
from read_parquet('flights/flights_2026_0*.parquet');
alter table fl add column payout double;
update fl set payout = getvariable('pay_cancel')*c + getvariable('pay_3h')*d3 + getvariable('pay_6h')*d6;

-- 2. Pricing cells with shrinkage, two scopes: 'full' (May-Jul, by month) and 'fit' (May-Jun pooled, for testing
--    on July). Long format: one row per cell x target.
create or replace table cell_base as
select 'full' fscope, mon::varchar mkey, carrier, origin, hour_band, count(*) n, sum(c) c, sum(d2) d2, sum(d3) d3, sum(d6) d6, sum(payout) pay
from fl group by all
union all
select 'fit', 'MJ', carrier, origin, hour_band, count(*), sum(c), sum(d2), sum(d3), sum(d6), sum(payout)
from fl where mon in (5, 6) group by all;

create or replace table cl as
unpivot (select fscope, mkey, carrier, origin, hour_band, n, c, d2, d3, d6 from cell_base)
on c, d2, d3, d6 into name target value k;

create or replace table lv0 as select fscope, mkey, target, sum(k)/sum(n) p0 from cl group by all;
create or replace table lvo as
select fscope, mkey, target, origin, sum(n) n_o, sum(k) k_o,
  (sum(k) + getvariable('m_origin')*any_value(p0)) / (sum(n) + getvariable('m_origin')) p_o
from cl join lv0 using (fscope, mkey, target) group by all;
create or replace table lvh as
select fscope, mkey, target, hour_band, (sum(k)/sum(n)) / any_value(p0) h_factor
from cl join lv0 using (fscope, mkey, target) group by all;
create or replace table lvob as
select fscope, mkey, target, origin, hour_band, sum(n) n_ob, sum(k) k_ob,
  (sum(k) + getvariable('m_band')*least(0.95, any_value(p_o)*any_value(h_factor))) / (sum(n) + getvariable('m_band')) p_ob
from cl join lvo using (fscope, mkey, target, origin) join lvh using (fscope, mkey, target, hour_band) group by all;
create or replace table lvc as
select fscope, mkey, target, carrier,
  (sum(k) + getvariable('a_carrier')) / (sum(n*p_ob) + getvariable('a_carrier')) c_factor
from cl join lvob using (fscope, mkey, target, origin, hour_band) group by all;
create or replace table cl_post as
select cl.*, p0, p_o, p_ob, c_factor, h_factor,
  least(0.95, p_ob*c_factor) prior_p,
  (k + getvariable('m_cell')*least(0.95, p_ob*c_factor)) / (n + getvariable('m_cell')) post,
  -- Beta posterior: alpha = m*prior_p + k, beta = m*(1-prior_p) + n - k; 90% interval by normal approximation.
  1.645*sqrt(((k + getvariable('m_cell')*least(0.95, p_ob*c_factor)) / (n + getvariable('m_cell')))
     * (1 - (k + getvariable('m_cell')*least(0.95, p_ob*c_factor)) / (n + getvariable('m_cell')))
     / (n + getvariable('m_cell') + 1)) half
from cl join lv0 using (fscope, mkey, target) join lvo using (fscope, mkey, target, origin)
  join lvh using (fscope, mkey, target, hour_band) join lvob using (fscope, mkey, target, origin, hour_band)
  join lvc using (fscope, mkey, target, carrier);

create or replace table cells as
pivot (select fscope, mkey, carrier, origin, hour_band, n, target, k, post, greatest(0, post-half) lo, least(1, post+half) hi, prior_p
       from cl_post)
on target using first(k) k, first(post) p, first(lo) lo, first(hi) hi, first(prior_p) pr
group by fscope, mkey, carrier, origin, hour_band, n;
alter table cells add column exp_payout double;
alter table cells add column exp_payout_lo double;
alter table cells add column exp_payout_hi double;
update cells set
  exp_payout = getvariable('pay_cancel')*c_p + getvariable('pay_3h')*d3_p + getvariable('pay_6h')*d6_p,
  exp_payout_lo = getvariable('pay_cancel')*c_lo + getvariable('pay_3h')*d3_lo + getvariable('pay_6h')*d6_lo,
  exp_payout_hi = getvariable('pay_cancel')*c_hi + getvariable('pay_3h')*d3_hi + getvariable('pay_6h')*d6_hi;

-- National base price per fscope (the "naive single price").
create or replace table naive as
select fscope, mkey, sum(c)/sum(n) c_p, sum(d2)/sum(n) d2_p, sum(d3)/sum(n) d3_p, sum(d6)/sum(n) d6_p, sum(pay)/sum(n) payout
from cell_base group by all;

-- Published pricing table: full fscope.
create or replace table ins_cells as
select b.mkey::int month_num,
  case b.mkey when '5' then 'May 2026' when '6' then 'June 2026' else 'July 2026' end month_label,
  b.carrier, b.origin, b.hour_band, b.n flights, b.c_k cancellations, b.d2_k delays_2h, b.d3_k delays_3h, b.d6_k delays_6h,
  b.c_k / b.n raw_cancel_rate, b.d3_k / b.n raw_d3_rate,
  b.c_p cancel_p, b.c_lo cancel_lo, b.c_hi cancel_hi,
  b.d2_p, b.d2_lo, b.d2_hi, b.d3_p, b.d3_lo, b.d3_hi, b.d6_p, b.d6_lo, b.d6_hi,
  b.exp_payout, b.exp_payout_lo, b.exp_payout_hi,
  b.exp_payout / nv.payout price_index,
  b.n < 100 thin
from cells b join naive nv on nv.fscope = 'full' and nv.mkey = b.mkey
where b.fscope = 'full';

-- Weather at both ends (daily band) for every flight.
create or replace table wxd as select origin station, flight_date d, severity_band band from read_parquet('out/ledger_wx_days.parquet');
create or replace table fl_wx as
select f.*, coalesce(o.band, 'unknown') o_band, coalesce(w.band, 'unknown') d_band,
  case when o.band is null and w.band is null then 'unknown'
       when o.band >= '3' or w.band >= '3' then '3 Storm (severe or extreme)'
       when o.band = '2 Moderate' or w.band = '2 Moderate' then '2 Moderate thunder'
       when o.band = '1 Minor' or w.band = '1 Minor' then '1 Minor (no thunder)'
       else '0 None' end wx_group
from fl f left join wxd o on o.station = f.origin and o.d = f.flight_date
left join wxd w on w.station = f.dest and w.d = f.flight_date;
-- 3. Out-of-sample test: fit May-June, predict every July flight. ---------------------------------------------------
create or replace table fit_ob as pivot (select origin, hour_band, target, p_ob from lvob where fscope='fit') on target using first(p_ob) group by origin, hour_band;
create or replace table fit_c as pivot (select carrier, target, c_factor from lvc where fscope='fit') on target using first(c_factor) group by carrier;
create or replace table fit_h as pivot (select hour_band, target, h_factor from lvh where fscope='fit') on target using first(h_factor) group by hour_band;
create or replace table jul as
select f.*,
  nv.c_p n_c, nv.d3_p n_d3, nv.payout n_pay,
  coalesce(ce.c_p, least(.95, coalesce(ob.c, nv.c_p*h.c)*coalesce(fc.c, 1))) m_c,
  coalesce(ce.d3_p, least(.95, coalesce(ob.d3, nv.d3_p*h.d3)*coalesce(fc.d3, 1))) m_d3,
  coalesce(ce.d6_p, least(.95, coalesce(ob.d6, nv.d6_p*h.d6)*coalesce(fc.d6, 1))) m_d6,
  ce.n is null no_cell
from fl_wx f
join naive nv on nv.fscope = 'fit'
join fit_h h using (hour_band)
left join cells ce on ce.fscope = 'fit' and ce.carrier = f.carrier and ce.origin = f.origin and ce.hour_band = f.hour_band
left join fit_ob ob on ob.origin = f.origin and ob.hour_band = f.hour_band
left join fit_c fc on fc.carrier = f.carrier
where f.mon = 7;
alter table jul add column m_pay double;
update jul set m_pay = getvariable('pay_cancel')*m_c + getvariable('pay_3h')*m_d3 + getvariable('pay_6h')*m_d6;

-- Weather-aware variant: the cell rate x the May-June uplift for the day's band at origin x destination (known
-- only after the fact; an upper bound on what a perfect same-day forecast adds).
create or replace table wx_uplift as
select wx_group, (sum(c)/count(*)) / any_value(nv.c_p) u_c, (sum(d3)/count(*)) / any_value(nv.d3_p) u_d3,
  (sum(d6)/count(*)) / any_value(nv.d6_p) u_d6
from fl_wx join naive nv on nv.fscope='fit' where mon in (5,6) group by wx_group;
create or replace table jul_wx as
select j.*,
  least(.95, j.m_c*u.u_c) w_c, least(.95, j.m_d3*u.u_d3) w_d3, least(.95, j.m_d6*u.u_d6) w_d6
from jul j join wx_uplift u using (wx_group);

create or replace table ins_validation as
select 'Cancelled' as claim, 1 as ord,
  avg((n_c - c)^2) brier_naive, avg((m_c - c)^2) brier_model, avg((w_c - c)^2) brier_model_weather,
  avg(c) observed, avg(n_c) naive_pred, avg(m_c) model_pred, count(*) july_flights from jul_wx
union all
select '3+ h late', 2, avg((n_d3 - d3)^2), avg((m_d3 - d3)^2), avg((w_d3 - d3)^2), avg(d3), avg(n_d3), avg(m_d3), count(*) from jul_wx
union all
select '6+ h late', 3, avg((n_d3*0 + (select d6_p from naive where fscope='fit') - d6)^2), avg((m_d6 - d6)^2), avg((w_d6 - d6)^2), avg(d6),
  any_value((select d6_p from naive where fscope='fit')), avg(m_d6), count(*) from jul_wx;
-- Re-levelled: the model's predictions scaled so their July mean equals July's observed mean. Separates ranking
-- skill (who is riskier) from level (July was a worse month than May-June).
create or replace table relev as select avg(c)/avg(m_c) r_c, avg(d3)/avg(m_d3) r_d3, avg(d6)/avg(m_d6) r_d6, avg(payout)/avg(m_pay) r_pay from jul_wx;
alter table ins_validation add column brier_model_relevelled double;
update ins_validation set brier_model_relevelled = (select case ins_validation.ord
  when 1 then avg((least(1, m_c*r_c) - c)^2) when 2 then avg((least(1, m_d3*r_d3) - d3)^2) else avg((least(1, m_d6*r_d6) - d6)^2) end from jul_wx, relev);
alter table ins_validation add column skill_model_relevelled double;
update ins_validation set skill_model_relevelled = 1 - brier_model_relevelled/brier_naive;
alter table ins_validation add column skill_model double;
alter table ins_validation add column skill_model_weather double;
update ins_validation set skill_model = 1 - brier_model/brier_naive, skill_model_weather = 1 - brier_model_weather/brier_naive;

-- Calibration: July flights in ten equal groups by the model's predicted payout.
create or replace table ins_calibration as
with r as (select *, ntile(10) over (order by m_pay) decile from jul_wx)
select decile, count(*) flights, avg(m_pay) predicted_payout, avg(payout) actual_payout, avg(n_pay) naive_payout,
  avg(m_c) predicted_cancel, avg(c) actual_cancel, avg(m_d3) predicted_d3, avg(d3) actual_d3,
  avg(w_c*200 + w_d3*100 + w_d6*100) predicted_payout_weather,
  avg(m_pay) * any_value(relev.r_pay) predicted_payout_relevelled
from r, relev group by decile order by decile;

-- Where the single national price loses money in July (carrier x origin x hour band, 100+ July flights).
create or replace table ins_july_cells as
select carrier, origin, hour_band, count(*) flights, sum(payout) actual_paid, avg(payout) actual_payout,
  avg(n_pay) naive_price, avg(m_pay) model_price, avg(payout)/avg(n_pay) naive_loss_ratio, avg(payout)/avg(m_pay) model_loss_ratio,
  sum(payout) - sum(n_pay) naive_shortfall, sum(payout) - sum(m_pay) model_shortfall
from jul group by all;

-- Same comparison with both prices scaled to July's overall level (removes the season shift): how much of July's
-- payout sits in cells the price misses by 1.5x+, and the dollars misallocated across cells.
create or replace table ins_july_summary as
with lv as (select sum(actual_paid)/sum(model_price*flights) rm, sum(actual_paid)/sum(naive_price*flights) rn from ins_july_cells),
c as (select j.*, model_price*rm mrel, naive_price*rn nrel from ins_july_cells j, lv where flights >= 100)
select 'Single national price' price, 1 ord,
  sum(actual_paid) / sum(naive_price*flights) loss_ratio_unscaled,
  sum(actual_paid) filter (where actual_payout >= 1.5*nrel) / sum(actual_paid) share_paid_in_cells_underpriced_1_5x,
  sum(abs(actual_paid - nrel*flights)) / sum(actual_paid) misallocated_share
from c
union all
select 'Pricing model (May-June)', 2, sum(actual_paid) / sum(model_price*flights),
  sum(actual_paid) filter (where actual_payout >= 1.5*mrel) / sum(actual_paid), sum(abs(actual_paid - mrel*flights)) / sum(actual_paid)
from c;

-- 4. Weather: claim rates by weather at both ends (all three months; 99 airports with observations). ---------------
create or replace table ins_weather as
select origin, wx_group, o_band, d_band, hour_band, month(flight_date) month_num,
  count(*) flights, sum(c) cancellations, sum(d2) delays_2h, sum(d3) delays_3h, sum(d6) delays_6h, sum(payout) paid
from fl_wx group by all;

-- Per airport: storm days (Severe/Extreme at the departure airport) vs what the same weather (both ends, same hour
-- band) paid at the other airports.
create or replace table exp_rate as
select o_band, d_band, hour_band, sum(payout) pay, count(*) n, sum(c) cn, sum(d3) d3n from fl_wx where o_band <> 'unknown' group by all;
create or replace table ins_airport_storm as
with a as (
  select f.origin, f.o_band >= '3' storm, count(*) flights, sum(payout) paid, sum(c) cancellations, sum(d3) delays_3h,
    sum((e.pay - f_pay.pay) / nullif(e.n - f_pay.n, 0)) expected_paid
  from fl_wx f
  join exp_rate e using (o_band, d_band, hour_band)
  join (select origin, o_band, d_band, hour_band, sum(payout) pay, count(*) n from fl_wx group by all) f_pay
    using (origin, o_band, d_band, hour_band)
  where f.o_band <> 'unknown' group by all)
select origin, storm, flights, paid, cancellations, delays_3h, expected_paid,
  (select count(*) from wxd w where w.station = a.origin and w.band >= '3') storm_days
from a;

-- 5. Adverse selection: what a buyer could know before buying. ----------------------------------------------------
-- Hourly thunder (UTC hour) at each airport from the METAR present-weather codes.
create or replace table obs as
select regexp_extract(filename, '([A-Z0-9]+)\.csv$', 1) station, try_cast(valid as timestamp) lt, coalesce(wxcodes,'') wx
from read_csv(['asos/*.csv', 'asos-ledger/*.csv'], header=true, filename=true, union_by_name=true, nullstr=['','M','T'],
  all_varchar=true);
create or replace table th as
select distinct o.station, date_trunc('hour', timezone(tz.tz, o.lt)) uh
from obs o join tz on tz.iata = o.station where regexp_matches(o.wx, '(^|\s)[+-]?TS');
-- thunder reported in the 3 hours ending at each UTC hour boundary k: hours k-3h .. k-1h (all before k).
create or replace table th3 as
select distinct station, uh + interval (s) hour k from th, range(1, 4) t(s);

create or replace table sig as
select f.flight_date, f.carrier, f.origin, f.dest, f.sched_dep_hhmm, f.mon, f.hour_band, f.c, f.d3, f.d6, f.payout, f.wx_group,
  date_trunc('hour', timezone(ot.tz, f.flight_date + to_minutes((f.sched_dep_hhmm//100)*60 + f.sched_dep_hhmm%100))) dep_k
from fl_wx f join tz ot on ot.iata = f.origin
where f.sched_dep_hhmm < 2400;

create or replace table spc as
select regexp_extract(filename, '([A-Z0-9]+)_d([12])\.json$', 1) station, regexp_extract(filename, '_d([12])\.json$', 1)::int dayn,
  (o.utc_expire::timestamp - interval 1 day)::date valid_date, o.utc_product_issue::timestamp issued, o.threshold
from (select filename, unnest(outlooks) o from read_json('spc/*.json', filename=true, union_by_name=true));
create or replace table spc_day as
select station, valid_date d,
  bool_or(dayn = 2) d2_any,
  bool_or(dayn = 2 and threshold in ('SLGT','ENH','MDT','HIGH')) d2_slgt,
  bool_or(dayn = 1 and issued < valid_date + interval 12 hour) d1_any,
  bool_or(dayn = 1 and issued < valid_date + interval 12 hour and threshold in ('SLGT','ENH','MDT','HIGH')) d1_slgt
from spc where valid_date between date '2026-05-01' and date '2026-07-31' group by all;

create or replace table sig2 as
select s.*,
  coalesce(so.d2_any,false) or coalesce(sd.d2_any,false) spc2,
  coalesce(so.d2_slgt,false) or coalesce(sd.d2_slgt,false) spc2_slgt,
  coalesce(so.d1_any,false) or coalesce(sd.d1_any,false) spc1,
  (o0.station is not null or e0.station is not null) th_l0,
  (o1.station is not null or e1.station is not null) th_l1,
  (o2.station is not null or e2.station is not null) th_l2,
  (o3.station is not null or e3.station is not null) th_l3,
  (o6.station is not null or e6.station is not null) th_l6,
  (o12.station is not null or e12.station is not null) th_l12
from sig s
left join spc_day so on so.station = s.origin and so.d = s.flight_date
left join spc_day sd on sd.station = s.dest and sd.d = s.flight_date
left join th3 o0 on o0.station = s.origin and o0.k = s.dep_k
left join th3 e0 on e0.station = s.dest and e0.k = s.dep_k
left join th3 o1 on o1.station = s.origin and o1.k = s.dep_k - interval 1 hour
left join th3 e1 on e1.station = s.dest and e1.k = s.dep_k - interval 1 hour
left join th3 o2 on o2.station = s.origin and o2.k = s.dep_k - interval 2 hour
left join th3 e2 on e2.station = s.dest and e2.k = s.dep_k - interval 2 hour
left join th3 o3 on o3.station = s.origin and o3.k = s.dep_k - interval 3 hour
left join th3 e3 on e3.station = s.dest and e3.k = s.dep_k - interval 3 hour
left join th3 o6 on o6.station = s.origin and o6.k = s.dep_k - interval 6 hour
left join th3 e6 on e6.station = s.dest and e6.k = s.dep_k - interval 6 hour
left join th3 o12 on o12.station = s.origin and o12.k = s.dep_k - interval 12 hour
left join th3 e12 on e12.station = s.dest and e12.k = s.dep_k - interval 12 hour;

-- One row per signal: what share of flights it flags and how much more they pay out. Base = all flights departing
-- the 99 airports (destinations outside the 99 count as "no signal at the destination").
create or replace table ins_signals as
with s as (
  select 1 ord, 'Day-2 SPC outlook, marginal+ risk' signal, 'Day before' known_when, 30.0 lead_hours, spc2 flag, origin, payout, c, d3 from sig2
  union all select 2, 'Day-2 SPC outlook, slight+ risk', 'Day before', 30.0, spc2_slgt, origin, payout, c, d3 from sig2
  union all select 3, 'Day-1 SPC outlook, marginal+ risk', 'Morning of', 12.0, spc1, origin, payout, c, d3 from sig2
  union all select 4, 'Thunder reported 12 h before', '12 h before', 12.0, th_l12, origin, payout, c, d3 from sig2
  union all select 5, 'Thunder reported 6 h before', '6 h before', 6.0, th_l6, origin, payout, c, d3 from sig2
  union all select 6, 'Thunder reported 3 h before', '3 h before', 3.0, th_l3, origin, payout, c, d3 from sig2
  union all select 7, 'Thunder reported 2 h before', '2 h before', 2.0, th_l2, origin, payout, c, d3 from sig2
  union all select 8, 'Thunder reported 1 h before', '1 h before', 1.0, th_l1, origin, payout, c, d3 from sig2
  union all select 9, 'Thunder reported at departure', 'At departure', 0.0, th_l0, origin, payout, c, d3 from sig2
  union all select 10, 'Storm day (hindsight)', 'After the fact', -12.0, wx_group like '3%', origin, payout, c, d3 from sig2)
select ord, signal, known_when, lead_hours, origin, flag, count(*) flights, sum(payout) paid, sum(c) cancellations, sum(d3) delays_3h
from s group by all;

-- 6. Checks -------------------------------------------------------------------------------------------------------
create or replace table ins_checks as
select 'flights' k, count(*)::double v from fl
union all select 'national payout per flight, July', payout from naive where fscope='full' and mkey='7'
union all select 'pricing cells (full)', count(*) from ins_cells
union all select 'thin cells (<100 flights)', count(*) filter (where thin) from ins_cells
union all select 'cells payout x flights minus raw payout (shrinkage moves money)', sum(exp_payout*flights) - (select sum(payout) from fl) from ins_cells
union all select 'july flights tested', count(*) from jul
union all select 'july flights without a May-June cell', count(*) filter (where no_cell) from jul
union all select 'flights from the 99 weather airports', count(*) from sig2
union all select 'spc outlook rows', count(*) from spc
union all select 'airport-days with day-2 marginal+', count(*) filter (where d2_any) from spc_day
union all select 'thunder hours (airport x UTC hour)', count(*) from th;

copy ins_cells to 'out/ins_cells.parquet' (format parquet, compression zstd);
copy ins_validation to 'out/ins_validation.parquet' (format parquet);
copy ins_calibration to 'out/ins_calibration.parquet' (format parquet);
copy ins_july_cells to 'out/ins_july_cells.parquet' (format parquet, compression zstd);
copy ins_weather to 'out/ins_weather.parquet' (format parquet, compression zstd);
copy ins_airport_storm to 'out/ins_airport_storm.parquet' (format parquet);
copy ins_signals to 'out/ins_signals.parquet' (format parquet);
copy ins_july_summary to 'out/ins_july_summary.parquet' (format parquet);
copy ins_checks to 'out/ins_checks.parquet' (format parquet);
