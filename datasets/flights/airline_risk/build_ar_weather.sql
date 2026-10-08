-- July weather split for every flight on DOT's clock in July (3+ chronic months running).
-- A flight's July departures = same carrier and market, scheduled within 30 minutes of its most frequent time
-- (the same grouping as ar_chronic_flights). Weather day = any weather band (not '0 None') at origin or destination
-- that day, the same clear-day rule the disruption ledger uses; an airport-day with no weather record counts as clear.
create or replace table ltools.flights.ar_weather as
with jul as (
  select f.carrier, f.origin, f.dest, f.flight_date,
    (f.sched_dep_hhmm // 100) * 60 + f.sched_dep_hhmm % 100 dep_min,
    (f.cancelled or f.diverted or f.arr_delay_min > 30) late30
  from ltools.flights.flights f
  where month(f.flight_date) = 7
)
select c.carrier, c.origin, c.dest, c.sched_time,
  count(*) ops,
  count(*) filter (where j.late30) late30,
  count(*) filter (where j.late30 and (coalesce(o.severity_band, '0 None') <> '0 None' or coalesce(d.severity_band, '0 None') <> '0 None')) late30_weather
from ltools.flights.ar_chronic_flights c
join jul j on j.carrier = c.carrier and j.origin = c.origin and j.dest = c.dest and abs(j.dep_min - c.mode_min) <= 30
left join ltools.flights.ledger_wx_days o on o.origin = j.origin and o.flight_date = j.flight_date
left join ltools.flights.ledger_wx_days d on d.origin = j.dest and d.flight_date = j.flight_date
where c.end_mon = 7 and c.months_running >= 3
group by all;
