-- Part 2 of the airline risk / airport scorecard build (after the 399.81(c)(3) grouping passes).

-- 1b. Chronic test per grouped flight-month, linked month to month ------------------------------------------------
create or replace table cl as
select row_number() over (order by carrier, origin, dest, mon, mode_min) id, *,
  ops >= 10 and late30 > 0.5 * ops meets
from clusters;
create or replace table cm as select * from cl where meets;
-- The same flight next month: same carrier and market, most frequent time within 30 minutes (nearest wins).
create or replace table lk as
select b.id, a.id prev_id from cm a join cm b
  on a.carrier = b.carrier and a.origin = b.origin and a.dest = b.dest and b.mon = a.mon + 1
  and abs(b.mode_min - a.mode_min) <= 30
qualify row_number() over (partition by b.id order by abs(b.mode_min - a.mode_min), a.id) = 1;
create or replace table streaks as
with recursive s(id, streak, start_mon, chain_ops, chain_late30) as (
  select id, 1, mon, ops, late30 from cm where id not in (select id from lk)
  union all
  select lk.id, s.streak + 1, s.start_mon, s.chain_ops + c.ops, s.chain_late30 + c.late30
  from s join lk on lk.prev_id = s.id join cm c on c.id = lk.id
)
select id, max(streak) streak, min(start_mon) start_mon, max(chain_ops) chain_ops, max(chain_late30) chain_late30
from s group by id;

-- Every grouped flight-month with 10+ operations (the only ones that can meet the test).
create or replace table ar_chronic_months as
select c.carrier, c.origin, c.dest, c.mon month_num, c.mode_min,
  lpad((c.mode_min // 60)::varchar, 2, '0') || ':' || lpad((c.mode_min % 60)::varchar, 2, '0') sched_time,
  c.ops, c.late30, c.late30 / c.ops late30_share, c.meets, s.streak
from cl c left join streaks s using (id)
where c.ops >= 10;

-- One row per run of consecutive chronic months (the month the run ends).
create or replace table ar_chronic_flights as
select c.carrier, c.origin, c.dest, c.mode_min,
  lpad((c.mode_min // 60)::varchar, 2, '0') || ':' || lpad((c.mode_min % 60)::varchar, 2, '0') sched_time,
  s.start_mon, c.mon end_mon, s.streak months_running, s.chain_ops ops, s.chain_late30 late30,
  s.chain_late30 / s.chain_ops late30_share, c.ops last_month_ops, c.late30 / c.ops last_month_late30_share,
  s.start_mon = 2 started_in_first_month,
  case when c.mon = 7 and s.streak >= 5 then '1 Chronic 5+ months, still running'
       when c.mon = 7 and s.streak >= 3 then '2 At risk: 3-4 months running'
       when c.mon = 7 then '3 Watch: 1-2 months'
       when s.streak >= 5 then '4 Chronic 5+ months, ended'
       else '5 Ended before 5 months' end status
from cm c join streaks s using (id)
where c.id not in (select prev_id from lk);

-- Month-by-month history of every flight at risk in July (3+ chronic months running): the run's own linked months,
-- and for the months before the run, the same carrier and market's grouped flight whose most frequent time is nearest
-- the run's first-month time (within 45 minutes), met or not.
create or replace table ar_watch as
with recursive back(jid, id) as (
  select c.id, c.id from cm c join streaks s using (id) where c.mon = 7 and s.streak >= 3
  union all
  select back.jid, lk.prev_id from back join lk on lk.id = back.id
), path as (
  select b.jid, c.* from back b join cl c on c.id = b.id
), head as (
  select jid, arg_min(mode_min, mon) first_min, min(mon) first_mon from path group by jid
), before as (
  select h.jid, c.* from head h join cl j on j.id = h.jid
  join cl c on c.carrier = j.carrier and c.origin = j.origin and c.dest = j.dest and c.mon < h.first_mon
    and abs(c.mode_min - h.first_min) <= 45
  qualify row_number() over (partition by h.jid, c.mon order by abs(c.mode_min - h.first_min), c.ops desc) = 1
), hist as (
  select jid, carrier, origin, dest, mon, mode_min, ops, late30, meets from path
  union all
  select jid, carrier, origin, dest, mon, mode_min, ops, late30, meets from before
)
select h.carrier, h.origin, h.dest,
  h.origin || ' → ' || h.dest || ' ' || lpad((j.mode_min // 60)::varchar, 2, '0') || ':' || lpad((j.mode_min % 60)::varchar, 2, '0') flight_label,
  s.streak months_running, h.mon month_num, h.mode_min, h.ops, h.late30, h.late30 / h.ops late30_share, h.meets
from hist h join cl j on j.id = h.jid join streaks s on s.id = h.jid;

-- Flight-number variant (carrier + flight number + origin + dest), for comparison only.
create or replace table fn as
select carrier, flight_number, origin, dest, mon, count(*) ops,
  count(*) filter (where cancelled or diverted or arr_delay_min > 30) late30
from f6 group by all;
create or replace table fn_m as
select *, mon - row_number() over (partition by carrier, flight_number, origin, dest order by mon) grp
from fn where ops >= 10 and late30 > 0.5 * ops;
create or replace table fn_runs as
select carrier, flight_number, origin, dest, min(mon) start_mon, max(mon) end_mon, count(*) months_running
from fn_m group by carrier, flight_number, origin, dest, grp;

-- 2. REFUND EXPOSURE, 14 CFR 260 (May-July 2026) ---------------------------------------------------------------
-- Domestic: a cancellation, or arrival 3+ hours after the original schedule, entitles a passenger who does not
-- accept the alternative to an automatic refund. Exposure = affected flights x passengers per flight x one-way fare.
create or replace table fares as
select year::int yr, quarter::int q, least(airport_1, airport_2) a1, greatest(airport_1, airport_2) a2,
  passengers::double pax_per_day, fare::double fare, carrier_lg, fare_lg::double fare_lg, carrier_low,
  fare_low::double fare_low
from read_csv('fares/cfr_table1a_*.csv', header = true, all_varchar = true);
create or replace table fare_pick as
select * from fares qualify row_number() over (partition by a1, a2 order by yr desc, q desc) = 1;
set variable nat_fare = (select sum(fare * pax_per_day) / sum(pax_per_day) from fares where yr = 2026 and q = 1);
-- Passengers per flight = typical seats x load factor. Seats (assumption): 70 on regional carriers (SkyWest, Republic,
-- Envoy, Endeavor, PSA: 50-76-seat jets), 160 on the rest (A320/737 family). Load factor high = the value that makes
-- June 2026 reporting-carrier flights carry all 75.5M domestic passengers BTS counted for US airlines that month
-- (an upper bound, since non-reporting carriers carry some); low = 0.80.
set variable june_ops = (select count(*) from f6 where mon = 6 and not cancelled and not diverted);
set variable lf_hi = 75.5e6 / (select sum(case when carrier in ('OO','YX','MQ','9E','OH') then 70 else 160 end)
  from f6 where mon = 6 and not cancelled and not diverted);
set variable lf_lo = 0.80;

create or replace table ar_refund as
with r as (
  select carrier, origin, dest, count(*) flights, count(*) filter (where cancelled) cancellations,
    count(*) filter (where not cancelled and not diverted and arr_delay_min >= 180) delays_3h,
    count(*) filter (where diverted) diversions
  from f6 where mon between 5 and 7 group by all
)
select r.*, r.cancellations + r.delays_3h affected,
  coalesce(case when r.carrier = p.carrier_lg then p.fare_lg when r.carrier = p.carrier_low then p.fare_low end,
           p.fare, getvariable('nat_fare')) fare,
  case when r.carrier in (p.carrier_lg, p.carrier_low) then 'Route fare for this airline'
       when p.fare is not null then 'Route average fare' else 'National average fare' end fare_source,
  (case when r.carrier in ('OO','YX','MQ','9E','OH') then 70 else 160 end) seats,
  (case when r.carrier in ('OO','YX','MQ','9E','OH') then 70 else 160 end) * getvariable('lf_lo') pax_lo,
  (case when r.carrier in ('OO','YX','MQ','9E','OH') then 70 else 160 end) * getvariable('lf_hi') pax_hi
from r left join fare_pick p on p.a1 = least(r.origin, r.dest) and p.a2 = greatest(r.origin, r.dest);
create or replace table ar_refund as
select *, affected * pax_lo * fare exposure_lo, affected * pax_hi * fare exposure_hi from ar_refund;

-- 3. AIRPORT SCORECARD (May-July 2026) --------------------------------------------------------------------------
create or replace table f3 as select * from f6 where mon between 5 and 7;
create or replace table ap_airports as
with base as (
  select origin, count(*) departures, count(*) / 92.0 departures_per_day,
    count(*) filter (where not cancelled and not diverted) operated,
    count(*) filter (where arrived_late and not cancelled and not diverted) late,
    count(*) filter (where cancelled) cancellations, count(distinct carrier) carriers
  from f3 group by origin
), dests as (
  select origin, count(*) nonstop_destinations, sum(n) / 92.0 check_per_day from
  (select origin, dest, count(*) n from f3 where not cancelled group by all having count(*) >= 13) group by origin
), led as (
  select origin, sum(flights) ledger_departures, sum(a_hi) cost_hi, sum(a_lo) cost_lo,
    sum(controllable_hi) controllable_hi, sum(controllable_lo) controllable_lo,
    sum(a_hi) filter (where band != '0 None') / sum(e_hi) filter (where band != '0 None') weather_day_ratio,
    sum(cancellations) filter (where band >= '3') / sum(flights) filter (where band >= '3') storm_cancel_rate,
    sum(flights) filter (where band >= '3') storm_departures
  from read_parquet('wxout/ledger_cells.parquet') group by origin
), chains as (
  select origin, sum(total_lo) chain_lo, sum(total_hi) chain_hi, sum(controllable_hi) chain_controllable_hi,
    sum(first_departures) first_departures
  from read_parquet('wxout/ledger_slots.parquet') group by origin
)
select b.*, b.late / b.operated late_rate, b.cancellations / b.departures cancel_rate,
  coalesce(d.nonstop_destinations, 0) nonstop_destinations,
  l.ledger_departures, l.cost_lo, l.cost_hi, l.controllable_lo, l.controllable_hi, l.weather_day_ratio,
  l.storm_cancel_rate, l.storm_departures, c.chain_lo, c.chain_hi, c.chain_controllable_hi,
  c.chain_hi / b.departures chain_cost_per_departure_hi, c.chain_lo / b.departures chain_cost_per_departure_lo,
  k.lat, k.lon
from base b left join dests d using (origin) left join led l using (origin) left join chains c using (origin)
left join read_csv('coords.csv', header = true) k on k.iata = b.origin;

-- Catchment peers: airports within 175 miles (great circle) with 5+ departures a day; each airport is its own peer.
create or replace table ap_peers as
select a.origin, b.origin peer,
  round(3958.8 * 2 * asin(sqrt(pow(sin(radians(b.lat - a.lat) / 2), 2)
    + cos(radians(a.lat)) * cos(radians(b.lat)) * pow(sin(radians(b.lon - a.lon) / 2), 2)))) miles
from ap_airports a join ap_airports b on b.departures_per_day >= 5
where a.lat is not null and b.lat is not null
  and 3958.8 * 2 * asin(sqrt(pow(sin(radians(b.lat - a.lat) / 2), 2)
    + cos(radians(a.lat)) * cos(radians(b.lat)) * pow(sin(radians(b.lon - a.lon) / 2), 2))) <= 175;

-- Nonstop destinations by airport (for the "who flies where" view).
create or replace table ap_routes as
select origin, dest, count(*) departures, count(*) / 92.0 per_day, count(distinct carrier) carriers,
  count(*) filter (where cancelled) / count(*) cancel_rate,
  count(*) filter (where arrived_late and not cancelled and not diverted)
    / nullif(count(*) filter (where not cancelled and not diverted), 0) late_rate
from f3 group by all;

-- 4. WHOSE DELAY IS IT? Departures from the 99 ledger airports split three ways -----------------------------------
-- An airport-hour is "all airlines late together" when 2+ airlines depart in it (3+ departures in all) and EVERY
-- one of them had half or more of its departures leave 15+ minutes late or cancelled. Such an hour is WEATHER when the airport's
-- own ASOS observations show weather (level 1+, the ledger's hourly rules) that hour or the hour before, and
-- AIRPORT / AIR TRAFFIC otherwise. Every other departure in a testable hour (2+ airlines, 3+ departures) is the
-- AIRLINE's own; departures in hours with fewer airlines are NOT TESTABLE (kept as their own part). Cost = departure delay minutes x
-- $69.07-$100.76 + cancellations x $5,770-$22,000.
create or replace table obs as
select regexp_extract(filename, '([A-Z0-9]+)\.csv$', 1) station, cast(valid as timestamp) lt,
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
create or replace table wx_hours as
select station, d, h,
  case when heavy_ts or hail or (ts and coalesce(max_gust_kt,0)>=35) or (ts and coalesce(min_vis_mi,10)<1) then 3
       when ts or coalesce(max_gust_kt,0)>=45 or coalesce(min_vis_mi,10)<1 or coalesce(min_ceiling_ft,99999)<500 or coalesce(precip_in,0)>=0.5 then 2
       when vcts_only or coalesce(max_gust_kt,0)>=30 or coalesce(min_vis_mi,10)<3 or coalesce(min_ceiling_ft,99999)<1000 or coalesce(precip_in,0)>=0.1 then 1
       else 0 end hour_level
from wx_hours where d between date '2026-05-01' and date '2026-07-31';
create or replace table wx_h2 as
select a.station, a.d, a.h, greatest(a.hour_level, coalesce(b.hour_level, 0)) wx_level
from wx_hours a left join wx_hours b on b.station = a.station and b.d = a.d and b.h = a.h - 1;

create or replace table dep as
select f.flight_date, f.carrier, f.origin, f.dep_hour, f.cancelled, f.diverted,
  case when f.cancelled then 0 else greatest(coalesce(f.dep_delay_min, 0), 0) end delay_min,
  coalesce(f.late_aircraft_delay_min, 0) late_aircraft_min,
  (f.cancelled or coalesce(f.dep_delay_min, 0) >= 15) suffered
from f3 f where f.origin in (select distinct station from wx_hours);
create or replace table hour_carrier as
select origin, flight_date, dep_hour, carrier, count(*) n, avg(suffered::int) suffer_share
from dep group by all;
create or replace table hours as
select origin, flight_date, dep_hour,
  count(*) carriers_2plus, sum(n) departures_in_hour,
  count(*) filter (where suffer_share >= 0.5) carriers_suffering
from hour_carrier group by all;
create or replace table hours as
select h.*, carriers_2plus >= 2 and departures_in_hour >= 3 testable,
  carriers_2plus >= 2 and departures_in_hour >= 3 and carriers_suffering = carriers_2plus together, coalesce(w.wx_level, 0) wx_level
from hours h left join wx_h2 w on w.station = h.origin and w.d = h.flight_date and w.h = h.dep_hour;

create or replace table dep_part as
select d.*, h.wx_level,
  case when not h.testable then '4 Not testable'
       when h.together and h.wx_level >= 1 then '3 Weather'
       when h.together then '2 Airport / air traffic'
       else '1 Airline' end part,
  h.together and h.wx_level >= 2 strong_weather
from dep d join hours h using (origin, flight_date, dep_hour);

create or replace table ap_split as
select origin, carrier, part, dep_hour, (wx_level >= 2) weather_moderate_plus,
  count(*) departures, sum(delay_min) delay_min, count(*) filter (where cancelled) cancellations,
  sum(late_aircraft_min) late_aircraft_min,
  sum(delay_min) * getvariable('min_lo') + count(*) filter (where cancelled) * getvariable('can_lo') cost_lo,
  sum(delay_min) * getvariable('min_hi') + count(*) filter (where cancelled) * getvariable('can_hi') cost_hi
from dep_part group by all;

create or replace table ap_together as
select origin, count(*) filter (where testable) shared_hours,
  count(*) filter (where together) together_hours,
  count(*) filter (where together and wx_level >= 1) together_weather_hours,
  count(*) filter (where together and wx_level = 0) together_clear_hours
from hours group by origin;

-- 5. Checks ------------------------------------------------------------------------------------------------------
create or replace table ar_checks as
select * from (values
  ('flights Feb-Jul', (select count(*) from f6)::double),
  ('rows left ungrouped (must be 0)', (select count(*) from rem)::double),
  ('grouped flight-months', (select count(*) from cl)::double),
  ('grouped flight-months meeting test', (select count(*) from cm)::double),
  ('chronic 5+ running in July (rule grouping)', (select count(*) from ar_chronic_flights where status like '1%')::double),
  ('at risk 3-4 in July (rule grouping)', (select count(*) from ar_chronic_flights where status like '2%')::double),
  ('chronic 5+ ended earlier (rule grouping)', (select count(*) from ar_chronic_flights where status like '4%')::double),
  ('flight-number runs 5+ ending July', (select count(*) from fn_runs where end_mon = 7 and months_running >= 5)::double),
  ('flight-number runs 3-4 ending July', (select count(*) from fn_runs where end_mon = 7 and months_running between 3 and 4)::double),
  ('flight-number runs 5+ any', (select count(*) from fn_runs where months_running >= 5)::double),
  ('national avg one-way fare 2026Q1 (pax-weighted)', getvariable('nat_fare')),
  ('June 2026 operated flights (reporting carriers)', getvariable('june_ops')::double),
  ('load factor low (assumed)', getvariable('lf_lo')),
  ('load factor high (calibrated to BTS June 2026)', getvariable('lf_hi')),
  ('refund routes with route fare share of affected', (select sum(affected) filter (where fare_source != 'National average fare') / sum(affected) from ar_refund)),
  ('split departures', (select count(*) from dep_part)::double),
  ('split cost hi minus departures cost hi (must be 0)', (select sum(cost_hi) from ap_split) - (select sum(delay_min) * getvariable('min_hi') + count(*) filter (where cancelled) * getvariable('can_hi') from dep))
) t(k, v);

copy ar_chronic_months to 'out/ar_chronic_months.parquet' (format parquet, compression zstd);
copy ar_chronic_flights to 'out/ar_chronic_flights.parquet' (format parquet, compression zstd);
copy ar_refund to 'out/ar_refund.parquet' (format parquet, compression zstd);
copy ar_watch to 'out/ar_watch.parquet' (format parquet, compression zstd);
copy ar_checks to 'out/ar_checks.parquet' (format parquet, compression zstd);
copy ap_airports to 'out/ap_airports.parquet' (format parquet, compression zstd);
copy ap_peers to 'out/ap_peers.parquet' (format parquet, compression zstd);
copy ap_routes to 'out/ap_routes.parquet' (format parquet, compression zstd);
copy ap_split to 'out/ap_split.parquet' (format parquet, compression zstd);
copy ap_together to 'out/ap_together.parquet' (format parquet, compression zstd);
