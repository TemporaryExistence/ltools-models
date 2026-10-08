-- Storm severity for the 30 busiest US departure airports (May-July 2026) and the flight summaries the
-- storm_reliability dashboard reads. Run by build_storms.sh from a working directory that holds:
--   asos/<CODE>.csv   IEM ASOS/METAR archive, one file per airport, local time (tz requested per station)
--   storm-events/StormEvents_details-*.csv.gz   NOAA NCEI Storm Events (May and June 2026 present; July not yet)
--   flights/flights_2026_0*.parquet, airport_coords.csv
-- Writes out/storm_days.parquet, out/storm_hours.parquet, out/storm_cube.parquet, out/storm_route_pairs.parquet,
-- out/storm_ci.parquet.

-- 1. Observations -> hours -> days ---------------------------------------------------------------------------
create or replace table obs as
select station, cast(valid as timestamp) lt, sknt, coalesce(greatest(gust, peak_wind_gust), gust, peak_wind_gust) g,
  vsby, p01i, coalesce(wxcodes, '') wx,
  least(case when skyc1 in ('BKN','OVC','VV') then skyl1 end, case when skyc2 in ('BKN','OVC','VV') then skyl2 end,
        case when skyc3 in ('BKN','OVC','VV') then skyl3 end, case when skyc4 in ('BKN','OVC','VV') then skyl4 end) ceil_ft
from read_csv('asos/*.csv', header=true, nullstr=['','M','T'],
  types={'p01i':'DOUBLE','gust':'DOUBLE','peak_wind_gust':'DOUBLE','sknt':'DOUBLE','vsby':'DOUBLE',
         'skyl1':'DOUBLE','skyl2':'DOUBLE','skyl3':'DOUBLE','skyl4':'DOUBLE'});

create or replace table wx_hours as
select station, cast(lt as date) d, hour(lt) h,
  bool_or(regexp_matches(wx, '(^|\s)[+-]?TS')) ts,                    -- thunderstorm at the airport (not VCTS)
  bool_or(regexp_matches(wx, '(^|\s)\+TS')) heavy_ts,                 -- heavy thunderstorm (+TSRA etc.)
  bool_or(regexp_matches(wx, 'VCTS') and not regexp_matches(wx, '(^|\s)[+-]?TS')) vcts_only,
  bool_or(regexp_matches(wx, 'GR')) hail,
  max(sknt) max_wind_kt, max(g) max_gust_kt, min(vsby) min_vis_mi, min(ceil_ft) min_ceiling_ft, max(p01i) precip_in
from obs group by all;
delete from wx_hours where d < date '2026-05-01' or d > date '2026-07-31';

create or replace table wx_hours as
select *,
  case when heavy_ts or hail or (ts and coalesce(max_gust_kt,0)>=35) or (ts and coalesce(min_vis_mi,10)<1) then 3
       when ts or coalesce(max_gust_kt,0)>=45 or coalesce(min_vis_mi,10)<1 or coalesce(min_ceiling_ft,99999)<500 or coalesce(precip_in,0)>=0.5 then 2
       when vcts_only or coalesce(max_gust_kt,0)>=30 or coalesce(min_vis_mi,10)<3 or coalesce(min_ceiling_ft,99999)<1000 or coalesce(precip_in,0)>=0.1 then 1
       else 0 end hour_level
from wx_hours;

-- Day = operating hours 6am-10pm local.
create or replace table wx_days as
select station, d,
  count(*) filter (where ts) ts_hours, count(*) filter (where heavy_ts) heavy_ts_hours,
  count(*) filter (where hour_level>=2) moderate_plus_hours,
  max(max_gust_kt) peak_gust_kt, min(min_vis_mi) min_vis_mi, min(min_ceiling_ft) min_ceiling_ft,
  sum(coalesce(precip_in,0)) precip_in, bool_or(hail) hail
from wx_hours where h between 6 and 22 group by all;

-- Bands are thunder-centred: wind without thunder barely moves cancellations (validated in findings/storms.md).
create or replace table wx_days as
select *,
  case when heavy_ts_hours>0 and ts_hours>=4 then '4 Extreme'
       when heavy_ts_hours>0 or ts_hours>=4 then '3 Severe'
       when ts_hours>0 then '2 Moderate'
       when moderate_plus_hours>0 or coalesce(peak_gust_kt,0)>=30 or coalesce(min_vis_mi,10)<3 or coalesce(min_ceiling_ft,99999)<1000 then '1 Minor'
       else '0 None' end severity_band,
  ts_hours + 2*heavy_ts_hours + greatest(coalesce(peak_gust_kt,0)-30,0)/5.0 + case when hail then 2 else 0 end storm_score,
  (case when ts_hours=0 then 't0' when ts_hours=1 then 't1' when ts_hours<=3 then 't2-3' when ts_hours<=5 then 't4-5' else 't6+' end) || '|' ||
  (case when heavy_ts_hours=0 then 'h0' when heavy_ts_hours=1 then 'h1' else 'h2+' end) || '|' ||
  (case when coalesce(peak_gust_kt,0)<35 then 'g<35' when peak_gust_kt<45 then 'g35-44' else 'g45+' end) intensity_cell
from wx_days;

-- 2. NOAA Storm Events within 40 km of the airport (May-June only; July not yet published) ------------------
create or replace table se as
select EVENT_TYPE ev, strptime(BEGIN_DATE_TIME, '%d-%b-%y %H:%M:%S')::date d, MAGNITUDE mag, BEGIN_LAT lat, BEGIN_LON lon,
  case when DAMAGE_PROPERTY is null or DAMAGE_PROPERTY = '' then 0
       else try_cast(regexp_replace(DAMAGE_PROPERTY, '[KMB]$', '') as double)
            * case right(DAMAGE_PROPERTY, 1) when 'K' then 1e3 when 'M' then 1e6 when 'B' then 1e9 else 1 end end dmg
from read_csv('storm-events/StormEvents_details-*.csv.gz', all_varchar=true,
  types={'MAGNITUDE':'DOUBLE','BEGIN_LAT':'DOUBLE','BEGIN_LON':'DOUBLE'})
where MONTH_NAME in ('May','June')
  and EVENT_TYPE in ('Thunderstorm Wind','Hail','Tornado','Flash Flood','Lightning','Heavy Rain','Funnel Cloud');
create or replace table ap as
select iata station, lat, lon from read_csv('airport_coords.csv') where iata in (select distinct station from wx_days);
create or replace table se_days as
select ap.station, se.d, count(*) n_reports, max(case when ev='Thunderstorm Wind' then mag end) max_wind_kt,
  max(case when ev='Hail' then mag end) max_hail_in, sum(dmg) damage_usd
from ap join se on se.lat is not null
  and 2*6371*asin(sqrt(power(sin(radians(se.lat-ap.lat)/2),2) + cos(radians(ap.lat))*cos(radians(se.lat))*power(sin(radians(se.lon-ap.lon)/2),2))) <= 40
group by all;

-- 3. Flights from these 30 airports, with the storm at the departure airport ---------------------------------
create or replace table f as
select f.flight_date, f.carrier, f.origin, f.dest, f.sched_dep_hhmm//100 dep_hour, f.cancelled, f.dep_delay_min,
  case when f.carrier in ('OO','YX','MQ','9E','OH') then 'Regional' else 'Mainline' end carrier_type,
  case when f.sched_dep_hhmm//100 < 12 then 'a 5-11am' when f.sched_dep_hhmm//100 < 17 then 'b 12-4pm' else 'c 5pm+' end tod,
  case when f.distance_miles<400 then 'a <400 mi' when f.distance_miles<800 then 'b 400-799 mi'
       when f.distance_miles<1200 then 'c 800-1199 mi' else 'd 1200+ mi' end dist_band,
  od.severity_band o_band, od.intensity_cell o_cell
from read_parquet('flights/flights_2026_0*.parquet') f
join wx_days od on od.station = f.origin and od.d = f.flight_date;

-- 4. Expected rates ("what the storm justifies") ------------------------------------------------------------
-- Airport method: other airports' rate for the same airline, same intensity cell, same time of day.
create or replace table cell_ap as
select o_cell, tod, carrier, origin, count(*) n, sum(cancelled::int) c,
  count(*) filter (where not cancelled) n_op, coalesce(sum((dep_delay_min>=15)::int) filter (where not cancelled),0) late
from f group by all;
create or replace table exp_ap as
select a.o_cell, a.tod, a.carrier, a.origin,
  (t.c - a.c)::double / nullif(t.n - a.n, 0) ap_rate, (t.late - a.late)::double / nullif(t.n_op - a.n_op, 0) ap_late
from cell_ap a join (select o_cell, tod, carrier, sum(n) n, sum(c) c, sum(n_op) n_op, sum(late) late from cell_ap group by all) t
  using (o_cell, tod, carrier);
-- Carrier method: other airlines' rate at the same airport, same intensity cell, same time of day.
create or replace table cell_cr as
select origin, o_cell, tod, carrier, count(*) n, sum(cancelled::int) c,
  count(*) filter (where not cancelled) n_op, coalesce(sum((dep_delay_min>=15)::int) filter (where not cancelled),0) late
from f group by all;
create or replace table exp_cr as
select a.origin, a.o_cell, a.tod, a.carrier,
  (t.c - a.c)::double / nullif(t.n - a.n, 0) cr_rate, (t.late - a.late)::double / nullif(t.n_op - a.n_op, 0) cr_late
from cell_cr a join (select origin, o_cell, tod, sum(n) n, sum(c) c, sum(n_op) n_op, sum(late) late from cell_cr group by all) t
  using (origin, o_cell, tod);

create or replace table storm_cube as
select f.origin, f.flight_date, f.carrier, f.carrier_type, f.tod, f.dist_band,
  count(*) n_flights, sum(f.cancelled::int) n_cancelled,
  count(*) filter (where not f.cancelled) n_operated,
  coalesce(sum((f.dep_delay_min>=15)::int) filter (where not f.cancelled),0) n_dep_late,
  coalesce(sum(greatest(f.dep_delay_min,0)) filter (where not f.cancelled),0) dep_delay_min_sum,
  count(*) filter (where e1.ap_rate is not null) n_ap_matched, sum(f.cancelled::int) filter (where e1.ap_rate is not null) n_ap_matched_cancelled,
  sum(e1.ap_rate) exp_cancelled_ap,
  count(*) filter (where not f.cancelled and e1.ap_late is not null) n_ap_matched_operated,
  coalesce(sum((f.dep_delay_min>=15)::int) filter (where not f.cancelled and e1.ap_late is not null),0) n_ap_matched_late,
  sum(e1.ap_late) filter (where not f.cancelled) exp_dep_late_ap,
  count(*) filter (where e2.cr_rate is not null) n_cr_matched, sum(f.cancelled::int) filter (where e2.cr_rate is not null) n_cr_matched_cancelled,
  sum(e2.cr_rate) exp_cancelled_cr,
  count(*) filter (where not f.cancelled and e2.cr_late is not null) n_cr_matched_operated,
  coalesce(sum((f.dep_delay_min>=15)::int) filter (where not f.cancelled and e2.cr_late is not null),0) n_cr_matched_late,
  sum(e2.cr_late) filter (where not f.cancelled) exp_dep_late_cr
from f
left join exp_ap e1 using (o_cell, tod, carrier, origin)
left join exp_cr e2 using (origin, o_cell, tod, carrier)
group by all;

-- 5. Same route, same day: mainline vs regional ------------------------------------------------------------------
create or replace table rdc as select origin, dest, flight_date, tod, carrier, count(*) n, sum(cancelled::int) c from f group by all;
create or replace table storm_route_pairs as
-- United / Delta / Alaska vs SkyWest + Republic on the same route and day (SkyWest and Republic fly for several brands)
select m.carrier || ' vs SkyWest+Republic' comparison, m.origin, m.flight_date, sum(m.n) mainline_flights, sum(m.c) mainline_cancelled,
  sum(r.n) regional_flights, sum(r.c) regional_cancelled
from (select origin, dest, flight_date, carrier, sum(n) n, sum(c) c from rdc where carrier in ('UA','DL') group by all) m
join (select origin, dest, flight_date, sum(n) n, sum(c) c from rdc where carrier in ('OO','YX') group by all) r using (origin, dest, flight_date)
group by all
union all
-- American vs its wholly owned regionals Envoy + PSA
select 'AA vs Envoy+PSA', m.origin, m.flight_date, sum(m.n), sum(m.c), sum(r.n), sum(r.c)
from (select origin, dest, flight_date, sum(n) n, sum(c) c from rdc where carrier = 'AA' group by all) m
join (select origin, dest, flight_date, sum(n) n, sum(c) c from rdc where carrier in ('MQ','OH') group by all) r using (origin, dest, flight_date)
group by all
union all
-- Every mainline vs every regional, same route, day and time of day
select 'All mainline vs all regional', m.origin, m.flight_date, sum(m.n), sum(m.c), sum(r.n), sum(r.c)
from (select origin, dest, flight_date, tod, sum(n) n, sum(c) c from rdc where carrier not in ('OO','YX','MQ','9E','OH') group by all) m
join (select origin, dest, flight_date, tod, sum(n) n, sum(c) c from rdc where carrier in ('OO','YX','MQ','9E','OH') group by all) r using (origin, dest, flight_date, tod)
group by all;

-- 6. Bootstrap intervals (storm days = Severe + Extreme): Poisson(1) weights on airport-days, 400 replicates ----
create or replace table reps as select range r from range(400);
create or replace table sd as
select c.*, w.severity_band from storm_cube c join wx_days w on w.station = c.origin and w.d = c.flight_date
where w.severity_band >= '3';
create or replace table w as
select r, origin, flight_date,
  case when u<.3679 then 0 when u<.7358 then 1 when u<.9197 then 2 when u<.9810 then 3 when u<.9963 then 4 else 5 end k
from (select r, origin, flight_date, (hash(r, origin, flight_date) % 1000000)/1000000.0 u
      from reps, (select distinct origin, flight_date from sd));
create or replace table storm_ci as
with
ap as (select r, sd.origin subject, sum(n_ap_matched_cancelled*k) o, sum(exp_cancelled_ap*k) e from sd join w using (origin, flight_date) group by all),
cr as (select r, sd.carrier subject, sum(n_cr_matched_cancelled*k) o, sum(exp_cancelled_cr*k) e,
         sum(n_cr_matched_late*k) ol, sum(exp_dep_late_cr*k) el from sd join w using (origin, flight_date) group by all),
pr as (select r, p.comparison subject, (sum(regional_cancelled*k)::double/sum(regional_flights*k)) / nullif(sum(mainline_cancelled*k)::double/sum(mainline_flights*k), 0) ratio
       from storm_route_pairs p join wx_days x on x.station = p.origin and x.d = p.flight_date and x.severity_band >= '3'
       join w using (origin, flight_date) group by all)
select 'airport cancellations' kind, subject, quantile_cont(o/nullif(e,0), .025) lo, quantile_cont(o/nullif(e,0), .975) hi from ap group by all
union all select 'airline cancellations', subject, quantile_cont(o/nullif(e,0), .025), quantile_cont(o/nullif(e,0), .975) from cr group by all
union all select 'airline late departures', subject, quantile_cont(ol/nullif(el,0), .025), quantile_cont(ol/nullif(el,0), .975) from cr group by all
union all select 'regional vs mainline, same route-day', subject, quantile_cont(ratio, .025), quantile_cont(ratio, .975) from pr group by all;

-- 7. Outputs -------------------------------------------------------------------------------------------------------
create or replace table storm_days as
select w.station origin, w.d flight_date, w.severity_band, w.storm_score, w.intensity_cell, w.ts_hours, w.heavy_ts_hours,
  w.peak_gust_kt, w.min_vis_mi, w.min_ceiling_ft, w.precip_in, w.hail,
  w.d < date '2026-07-01' storm_reports_available,
  case when w.d < date '2026-07-01' then coalesce(s.n_reports, 0) end storm_reports,
  s.max_wind_kt report_max_wind_kt, s.max_hail_in report_max_hail_in,
  case when w.d < date '2026-07-01' then coalesce(s.damage_usd, 0) end report_damage_usd
from wx_days w left join se_days s on s.station = w.station and s.d = w.d;
create or replace table storm_hours as
select station origin, d flight_date, h local_hour, hour_level, ts, heavy_ts, vcts_only, hail, max_wind_kt, max_gust_kt, min_vis_mi,
  min_ceiling_ft, precip_in from wx_hours;

copy storm_days to 'out/storm_days.parquet' (format parquet, compression zstd);
copy storm_hours to 'out/storm_hours.parquet' (format parquet, compression zstd);
copy storm_cube to 'out/storm_cube.parquet' (format parquet, compression zstd);
copy storm_route_pairs to 'out/storm_route_pairs.parquet' (format parquet, compression zstd);
copy storm_ci to 'out/storm_ci.parquet' (format parquet, compression zstd);
