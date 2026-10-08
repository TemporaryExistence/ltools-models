-- Disruption ledger, May-July 2026: every departure from the 100 busiest US airports priced in dollars and split
-- into three parts that add up to the total:
--   CONTROLLABLE = all disruption on clear days (no weather band at either end) + on weather days, the excess over
--                  the severity-matched expectation that even the best carrier at the airport also suffered
--                  (airport-wide excess)
--   WEATHER      = on weather days, the severity-matched expectation (what flights elsewhere suffered in weather
--                  of the same band at both ends, same time of day), capped at what actually happened
--   RESILIENCE   = on weather days, the excess over that expectation that the best carrier at the same airport and
--                  band avoided (what this carrier would save by matching it)
-- Run by build_ledger.sh from a working directory holding asos/ (30 storm-study airports), asos-ledger/ (70 more),
-- flights/flights_2026_0*.parquet. Writes out/ledger_cells.parquet, out/ledger_slots.parquet,
-- out/ledger_insurer.parquet, out/ledger_checks.parquet.

-- Prices (sources in findings/disruption-ledger.md):
--   delay minute  $69.07 (A4A 2025 block-minute cost less fuel)  to  $100.76 (A4A 2024 block-minute cost)
--   cancellation  $5,770 (masFlight 2014, US average per cancelled flight)  to  $22,000 (EUROCONTROL Standard
--                 Inputs system-wide average EUR 20,930, 2022 prices, at 1.05 USD/EUR; includes EU261 compensation)
set variable min_lo = 69.07;
set variable min_hi = 100.76;
set variable can_lo = 5770;
set variable can_hi = 22000;
set variable best_min_n = 100;   -- a carrier needs this many flights in the airport x band cell to set the benchmark

-- 1. Weather bands per airport-day (same rules as storms/build_storms.sql) ----------------------------------------
create or replace table obs as
select regexp_extract(filename, '([A-Z0-9]+)\.csv$', 1) station, cast(valid as timestamp) lt, sknt,
  coalesce(greatest(gust, peak_wind_gust), gust, peak_wind_gust) g, vsby, p01i, coalesce(wxcodes, '') wx,
  least(case when skyc1 in ('BKN','OVC','VV') then skyl1 end, case when skyc2 in ('BKN','OVC','VV') then skyl2 end,
        case when skyc3 in ('BKN','OVC','VV') then skyl3 end, case when skyc4 in ('BKN','OVC','VV') then skyl4 end) ceil_ft
from read_csv(['asos/*.csv', 'asos-ledger/*.csv'], header=true, filename=true, union_by_name=true, nullstr=['','M','T'],
  types={'p01i':'DOUBLE','gust':'DOUBLE','peak_wind_gust':'DOUBLE','sknt':'DOUBLE','vsby':'DOUBLE',
         'skyl1':'DOUBLE','skyl2':'DOUBLE','skyl3':'DOUBLE','skyl4':'DOUBLE'});

create or replace table wx_hours as
select station, cast(lt as date) d, hour(lt) h,
  bool_or(regexp_matches(wx, '(^|\s)[+-]?TS')) ts, bool_or(regexp_matches(wx, '(^|\s)\+TS')) heavy_ts,
  bool_or(regexp_matches(wx, 'VCTS') and not regexp_matches(wx, '(^|\s)[+-]?TS')) vcts_only,
  bool_or(regexp_matches(wx, 'GR')) hail,
  max(g) max_gust_kt, min(vsby) min_vis_mi, min(ceil_ft) min_ceiling_ft, max(p01i) precip_in
from obs group by all;
delete from wx_hours where d < date '2026-05-01' or d > date '2026-07-31';
create or replace table wx_hours as
select *,
  case when heavy_ts or hail or (ts and coalesce(max_gust_kt,0)>=35) or (ts and coalesce(min_vis_mi,10)<1) then 3
       when ts or coalesce(max_gust_kt,0)>=45 or coalesce(min_vis_mi,10)<1 or coalesce(min_ceiling_ft,99999)<500 or coalesce(precip_in,0)>=0.5 then 2
       when vcts_only or coalesce(max_gust_kt,0)>=30 or coalesce(min_vis_mi,10)<3 or coalesce(min_ceiling_ft,99999)<1000 or coalesce(precip_in,0)>=0.1 then 1
       else 0 end hour_level
from wx_hours;
create or replace table wx_days as
select station, d,
  count(*) filter (where ts) ts_hours, count(*) filter (where heavy_ts) heavy_ts_hours,
  count(*) filter (where hour_level>=2) moderate_plus_hours,
  max(max_gust_kt) peak_gust_kt, min(min_vis_mi) min_vis_mi, min(min_ceiling_ft) min_ceiling_ft
from wx_hours where h between 6 and 22 group by all;
create or replace table wx_days as
select station, d,
  case when heavy_ts_hours>0 and ts_hours>=4 then '4 Extreme'
       when heavy_ts_hours>0 or ts_hours>=4 then '3 Severe'
       when ts_hours>0 then '2 Moderate'
       when moderate_plus_hours>0 or coalesce(peak_gust_kt,0)>=30 or coalesce(min_vis_mi,10)<3 or coalesce(min_ceiling_ft,99999)<1000 then '1 Minor'
       else '0 None' end severity_band
from wx_days;

-- 2. Flights and delay chains ----------------------------------------------------------------------------------
create or replace table fl as
select flight_date, carrier, flight_number, tail_number, origin, dest, sched_dep_hhmm, sched_dep_hhmm//100 dep_hour,
  cancelled, diverted, arr_delay_min, late_aircraft_delay_min, (not cancelled and not diverted) operated
from read_parquet('flights/flights_2026_0*.parquet');

-- Same rules as flights.malloy delay_chains: operated flights with a tail number, ordered by scheduled departure.
create or replace table legs as
select *, row_number() over (partition by tail_number, flight_date order by sched_dep_hhmm, flight_number) leg
from fl where operated and tail_number is not null;
create or replace table chains as
select tail_number, flight_date,
  max(carrier) filter (where leg = 1) carrier, max(origin) filter (where leg = 1) origin,
  max(dest) filter (where leg = 1) dest, max(dep_hour) filter (where leg = 1) dep_hour,
  max(arr_delay_min) filter (where leg = 1) first_arr_delay,
  count(*) filter (where leg > 1) later_legs,
  coalesce(sum(late_aircraft_delay_min) filter (where leg > 1), 0) later_min,
  coalesce(sum(late_aircraft_delay_min) filter (where leg = 2), 0) next_min
from legs group by all;
create or replace table chains as
select *, (first_arr_delay >= 15 and later_legs > 0) late_start,
  case when first_arr_delay >= 15 and later_legs > 0 then next_min else 0 end chain_min_lo,
  case when first_arr_delay >= 15 and later_legs > 0 then later_min else 0 end chain_min_hi
from chains;

-- 3. Weather at both ends; the worse end is the flight's band ------------------------------------------------------
create or replace macro worse(o, d) as case when d is null then o when d > o then d else o end;

create or replace table units as
select f.*, o.severity_band o_band, coalesce(dw.severity_band, 'unknown') d_band, worse(o.severity_band, dw.severity_band) band,
  case when f.dep_hour < 12 then 'a 5-11am' when f.dep_hour < 17 then 'b 12-4pm' else 'c 5pm+' end tod,
  case when f.operated then greatest(coalesce(f.arr_delay_min, 0), 0) else 0 end delay_min,
  f.cancelled::int canc
from fl f
join wx_days o on o.station = f.origin and o.d = f.flight_date
left join wx_days dw on dw.station = f.dest and dw.d = f.flight_date;

create or replace table cunits as
select c.*, o.severity_band o_band, coalesce(dw.severity_band, 'unknown') d_band, worse(o.severity_band, dw.severity_band) band,
  case when c.dep_hour <= 5 then 'h05' when c.dep_hour <= 9 then 'h0' || c.dep_hour when c.dep_hour <= 11 then 'h10-11' else 'h12+' end hb
from chains c
join wx_days o on o.station = c.origin and o.d = c.flight_date
left join wx_days dw on dw.station = c.dest and dw.d = c.flight_date;

-- 4. Severity-matched expectation, leaving the airport itself out ---------------------------------------------------
-- Flights: other airports, same band at origin, same band at destination, same time of day (fallback: origin band x
-- time of day when fewer than 200 other-airport flights share the cell).
create or replace table e_f as
with co as (select o_band, d_band, tod, origin, count(*) n, sum(delay_min) m, sum(canc) c from units group by all),
     ct as (select o_band, d_band, tod, sum(n) n, sum(m) m, sum(c) c from co group by all),
     go as (select o_band, tod, origin, sum(n) n, sum(m) m, sum(c) c from co group by all),
     gt as (select o_band, tod, sum(n) n, sum(m) m, sum(c) c from co group by all)
select co.o_band, co.d_band, co.tod, co.origin, (ct.n - co.n) < 200 fallback,
  case when ct.n - co.n >= 200 then (ct.m - co.m) / (ct.n - co.n) else (gt.m - go.m) / nullif(gt.n - go.n, 0) end e_min,
  case when ct.n - co.n >= 200 then (ct.c - co.c) / (ct.n - co.n) else (gt.c - go.c) / nullif(gt.n - go.n, 0) end e_canc
from co join ct using (o_band, d_band, tod) join go using (o_band, tod, origin) join gt using (o_band, tod);

-- Chains: per first departure of an aircraft-day; same matching with the first flight's scheduled hour.
create or replace table e_c as
with co as (select o_band, d_band, hb, origin, count(*) n, sum(chain_min_lo) ml, sum(chain_min_hi) mh from cunits group by all),
     ct as (select o_band, d_band, hb, sum(n) n, sum(ml) ml, sum(mh) mh from co group by all),
     go as (select o_band, hb, origin, sum(n) n, sum(ml) ml, sum(mh) mh from co group by all),
     gt as (select o_band, hb, sum(n) n, sum(ml) ml, sum(mh) mh from co group by all)
select co.o_band, co.d_band, co.hb, co.origin, (ct.n - co.n) < 200 fallback,
  case when ct.n - co.n >= 200 then (ct.ml - co.ml) / (ct.n - co.n) else (gt.ml - go.ml) / nullif(gt.n - go.n, 0) end e_lo,
  case when ct.n - co.n >= 200 then (ct.mh - co.mh) / (ct.n - co.n) else (gt.mh - go.mh) / nullif(gt.n - go.n, 0) end e_hi
from co join ct using (o_band, d_band, hb) join go using (o_band, hb, origin) join gt using (o_band, hb);

-- 5. Flight ledger: one row per airline x departure airport x band -------------------------------------------------
create or replace table fcell as
select u.carrier, u.origin, u.band,
  count(*) n, count(distinct u.flight_date) n_days, sum(u.delay_min) delay_min, sum(u.canc) cancellations,
  count(*) filter (where u.d_band = 'unknown') n_dest_unknown, count(*) filter (where e.fallback) n_fallback,
  sum(u.delay_min) * getvariable('min_lo') + sum(u.canc) * getvariable('can_lo') a_lo,
  sum(u.delay_min) * getvariable('min_hi') + sum(u.canc) * getvariable('can_hi') a_hi,
  sum(u.delay_min) * getvariable('min_lo') a_delay_lo, sum(u.delay_min) * getvariable('min_hi') a_delay_hi,
  sum(e.e_min) e_delay_min, sum(e.e_canc) e_cancellations,
  sum(e.e_min) * getvariable('min_lo') + sum(e.e_canc) * getvariable('can_lo') e_lo,
  sum(e.e_min) * getvariable('min_hi') + sum(e.e_canc) * getvariable('can_hi') e_hi
from units u join e_f e using (o_band, d_band, tod, origin)
group by all;

-- Best carrier at the same airport and band: lowest actual / expected among carriers with enough flights (the
-- expectation already adjusts for each carrier's time-of-day and destination-weather mix).
create or replace table fbest as
select origin, band, min(a_lo / nullif(e_lo, 0)) best_ratio_lo, min(a_hi / nullif(e_hi, 0)) best_ratio_hi,
  arg_min(carrier, a_hi / nullif(e_hi, 0)) best_carrier
from fcell where n >= getvariable('best_min_n') and band <> '0 None' group by all;

-- Clear-day cost per flight of the same airline at the same airport (for the "weather net of baseline" check).
create or replace table fclear as
select carrier, origin, a_lo / n base_lo, a_hi / n base_hi from fcell where band = '0 None';

create or replace macro split_w(a, e) as least(a, e);
create or replace macro split_r(a, e, b) as greatest(0, a - greatest(e, coalesce(b, a)));
create or replace macro split_x(a, e, b) as greatest(0, least(a, coalesce(b, a)) - e);

create or replace table ledger_cells as
select c.carrier,
  case c.carrier when 'AA' then 'American' when 'DL' then 'Delta' when 'UA' then 'United' when 'WN' then 'Southwest'
    when 'B6' then 'JetBlue' when 'AS' then 'Alaska' when 'NK' then 'Spirit' when 'F9' then 'Frontier'
    when 'G4' then 'Allegiant' when 'HA' then 'Hawaiian' when 'OO' then 'SkyWest' when 'YX' then 'Republic'
    when 'MQ' then 'Envoy' when '9E' then 'Endeavor' when 'OH' then 'PSA' else c.carrier end airline,
  c.origin, c.band, c.band <> '0 None' is_weather,
  c.n flights, c.n_days airport_days, c.delay_min, c.cancellations, c.n_dest_unknown, c.n_fallback,
  c.e_delay_min, c.e_cancellations,
  c.a_lo, c.a_hi, c.a_delay_lo, c.a_delay_hi, c.e_lo, c.e_hi,
  b.best_carrier, b.best_ratio_lo * c.e_lo b_lo, b.best_ratio_hi * c.e_hi b_hi,
  -- parts (weather bands only; clear-day cost is all controllable)
  case when c.band = '0 None' then c.a_lo else split_x(c.a_lo, c.e_lo, b.best_ratio_lo * c.e_lo) end controllable_lo,
  case when c.band = '0 None' then c.a_hi else split_x(c.a_hi, c.e_hi, b.best_ratio_hi * c.e_hi) end controllable_hi,
  case when c.band = '0 None' then 0 else split_w(c.a_lo, c.e_lo) end weather_lo,
  case when c.band = '0 None' then 0 else split_w(c.a_hi, c.e_hi) end weather_hi,
  case when c.band = '0 None' then 0 else split_r(c.a_lo, c.e_lo, b.best_ratio_lo * c.e_lo) end resilience_lo,
  case when c.band = '0 None' then 0 else split_r(c.a_hi, c.e_hi, b.best_ratio_hi * c.e_hi) end resilience_hi,
  -- weather net of what the same airline at the same airport loses on a clear day (sensitivity only)
  case when c.band = '0 None' then 0 else greatest(0, split_w(c.a_lo, c.e_lo) - c.n * coalesce(k.base_lo, 0)) end weather_net_lo,
  case when c.band = '0 None' then 0 else greatest(0, split_w(c.a_hi, c.e_hi) - c.n * coalesce(k.base_hi, 0)) end weather_net_hi,
  (c.band <> '0 None' and (c.n < 100 or c.n_days < 3)) thin
from fcell c left join fbest b using (origin, band) left join fclear k using (carrier, origin);

-- 6. Delay-chain slot ledger: airline x first-flight airport x scheduled hour ----------------------------------------
create or replace table ccell as
select u.carrier, u.origin, u.dep_hour, u.band, count(*) first_departures, count(*) filter (where u.late_start) late_starts,
  count(distinct u.flight_date) n_days,
  sum(u.chain_min_lo) min_lo, sum(u.chain_min_hi) min_hi,
  sum(u.chain_min_lo) * getvariable('min_lo') a_lo, sum(u.chain_min_hi) * getvariable('min_hi') a_hi,
  sum(e.e_lo) * getvariable('min_lo') e_lo, sum(e.e_hi) * getvariable('min_hi') e_hi
from cunits u join e_c e using (o_band, d_band, hb, origin)
group by all;
create or replace table cbest as
with byc as (select carrier, origin, band, sum(first_departures) n, sum(a_lo) a_lo, sum(a_hi) a_hi, sum(e_lo) e_lo, sum(e_hi) e_hi
             from ccell where band <> '0 None' group by all)
select origin, band, min(a_lo / nullif(e_lo, 0)) best_ratio_lo, min(a_hi / nullif(e_hi, 0)) best_ratio_hi
from byc where n >= getvariable('best_min_n') group by all;
create or replace table cparts as
select c.*,
  case when c.band = '0 None' then c.a_lo else split_x(c.a_lo, c.e_lo, b.best_ratio_lo * c.e_lo) end controllable_lo,
  case when c.band = '0 None' then c.a_hi else split_x(c.a_hi, c.e_hi, b.best_ratio_hi * c.e_hi) end controllable_hi,
  case when c.band = '0 None' then 0 else split_w(c.a_lo, c.e_lo) end weather_lo,
  case when c.band = '0 None' then 0 else split_w(c.a_hi, c.e_hi) end weather_hi,
  case when c.band = '0 None' then 0 else split_r(c.a_lo, c.e_lo, b.best_ratio_lo * c.e_lo) end resilience_lo,
  case when c.band = '0 None' then 0 else split_r(c.a_hi, c.e_hi, b.best_ratio_hi * c.e_hi) end resilience_hi
from ccell c left join cbest b using (origin, band);

create or replace table ledger_slots as
with s as (
  select carrier, origin, dep_hour,
    sum(first_departures) first_departures, sum(late_starts) late_starts,
    sum(late_starts) filter (where band = '0 None') clear_late_starts,
    sum(first_departures) filter (where band = '0 None') clear_first_departures,
    sum(a_lo) total_lo, sum(a_hi) total_hi,
    coalesce(sum(a_lo) filter (where band = '0 None'), 0) clear_lo, coalesce(sum(a_hi) filter (where band = '0 None'), 0) clear_hi,
    coalesce(sum(a_lo) filter (where band <> '0 None'), 0) weatherday_lo, coalesce(sum(a_hi) filter (where band <> '0 None'), 0) weatherday_hi,
    coalesce(sum(a_hi) filter (where band >= '3'), 0) stormday_hi,
    sum(controllable_lo) controllable_lo, sum(controllable_hi) controllable_hi,
    sum(weather_lo) weather_lo, sum(weather_hi) weather_hi,
    sum(resilience_lo) resilience_lo, sum(resilience_hi) resilience_hi
  from cparts group by all)
select
  case carrier when 'AA' then 'American' when 'DL' then 'Delta' when 'UA' then 'United' when 'WN' then 'Southwest'
    when 'B6' then 'JetBlue' when 'AS' then 'Alaska' when 'NK' then 'Spirit' when 'F9' then 'Frontier'
    when 'G4' then 'Allegiant' when 'HA' then 'Hawaiian' when 'OO' then 'SkyWest' when 'YX' then 'Republic'
    when 'MQ' then 'Envoy' when '9E' then 'Endeavor' when 'OH' then 'PSA' else carrier end airline, *,
  row_number() over (order by total_hi desc, carrier, origin, dep_hour) rank_all_hi,
  row_number() over (order by clear_hi desc, carrier, origin, dep_hour) rank_clear_hi,
  row_number() over (order by controllable_hi desc, carrier, origin, dep_hour) rank_controllable_hi,
  row_number() over (order by total_lo desc, carrier, origin, dep_hour) rank_all_lo,
  row_number() over (order by controllable_lo desc, carrier, origin, dep_hour) rank_controllable_lo,
  -- clear-day cost per clear-day first departure x all first departures: what the slot would cost in the quarter if
  -- every day were clear (removes the bias toward airports that simply have more clear days)
  case when clear_first_departures >= 30 then clear_hi / clear_first_departures * first_departures end clear_rate_quarter_hi,
  case when clear_first_departures >= 30 then clear_lo / clear_first_departures * first_departures end clear_rate_quarter_lo,
  row_number() over (order by case when clear_first_departures >= 30 then clear_hi / clear_first_departures * first_departures else -1 end desc,
    carrier, origin, dep_hour) rank_clear_rate_hi,
  late_starts < 20 thin
from s where total_hi > 0 or clear_hi > 0;

-- 7. Insurer table: airport x month x origin band (departure-airport weather only, as an insurer would forecast it).
-- Expected = national per-flight cost in the same origin band and time of day at OTHER airports.
create or replace table e_ins as
with co as (select o_band, tod, origin, count(*) n, sum(delay_min) m, sum(canc) c from units group by all),
     ct as (select o_band, tod, sum(n) n, sum(m) m, sum(c) c from co group by all)
select co.o_band, co.tod, co.origin, (ct.m - co.m) / (ct.n - co.n) e_min, (ct.c - co.c) / (ct.n - co.n) e_canc
from co join ct using (o_band, tod);
create or replace table ledger_insurer as
select u.origin, month(u.flight_date) month_num,
  case month(u.flight_date) when 5 then 'May' when 6 then 'June' else 'July' end month_label, u.o_band band,
  count(distinct u.flight_date) n_days, count(*) flights, sum(u.delay_min) delay_min, sum(u.canc) cancellations,
  sum(u.delay_min) * getvariable('min_lo') + sum(u.canc) * getvariable('can_lo') a_lo,
  sum(u.delay_min) * getvariable('min_hi') + sum(u.canc) * getvariable('can_hi') a_hi,
  sum(e.e_min) e_delay_min, sum(e.e_canc) e_cancellations,
  sum(e.e_min) * getvariable('min_lo') + sum(e.e_canc) * getvariable('can_lo') e_lo,
  sum(e.e_min) * getvariable('min_hi') + sum(e.e_canc) * getvariable('can_hi') e_hi,
  (select count(*) from wx_days w where w.station = u.origin and month(w.d) = month(u.flight_date)) month_days
from units u join e_ins e using (o_band, tod, origin)
group by all;

-- 8. Checks ---------------------------------------------------------------------------------------------------------
create or replace table ledger_checks as
select 'flights in ledger' k, count(*)::double v from units
union all select 'flights, all US', count(*) from fl
union all select 'flights with destination weather known', count(*) filter (where d_band <> 'unknown') from units
union all select 'flight rows using fallback expectation', count(*) from units join e_f e using (o_band, d_band, tod, origin) where e.fallback
union all select 'chain minutes next leg, national', sum(chain_min_lo) from chains
union all select 'chain minutes all later legs, national', sum(chain_min_hi) from chains
union all select 'chain minutes next leg, ledger airports', sum(chain_min_lo) from cunits
union all select 'chain minutes all later legs, ledger airports', sum(chain_min_hi) from cunits
union all select 'airports', count(distinct origin) from units
union all select 'parts minus total, hi ($)', sum(controllable_hi + weather_hi + resilience_hi - a_hi) from ledger_cells
union all select 'parts minus total, lo ($)', sum(controllable_lo + weather_lo + resilience_lo - a_lo) from ledger_cells
union all select 'slot parts minus total, hi ($)', sum(controllable_hi + weather_hi + resilience_hi - total_hi) from ledger_slots;

create or replace table wx_days_out as select station origin, d flight_date, severity_band from wx_days;
copy ledger_cells to 'out/ledger_cells.parquet' (format parquet, compression zstd);
copy ledger_slots to 'out/ledger_slots.parquet' (format parquet, compression zstd);
copy ledger_insurer to 'out/ledger_insurer.parquet' (format parquet, compression zstd);
copy ledger_checks to 'out/ledger_checks.parquet' (format parquet, compression zstd);
copy wx_days_out to 'out/ledger_wx_days.parquet' (format parquet, compression zstd);
