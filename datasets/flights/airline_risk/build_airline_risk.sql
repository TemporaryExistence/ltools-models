-- Airline risk + airport scorecard tables (BTS on-time, Feb-Jul 2026). Run by build_airline_risk.sh from a working
-- directory holding: flights/ (flights_2026_05..07.parquet), prezip/ (flights_2026_02..04.parquet), fares/ (DOT
-- Consumer Airfare Report Table 1a CSVs), asos/ + asos-ledger/ (IEM ASOS), wxout/ (ledger_*.parquet), coords.csv.
-- Writes out/ar_*.parquet and out/ap_*.parquet.

set memory_limit = '6GB';
set threads = 4;
set variable min_lo = 69.07;   -- A4A 2025 block-minute cost less fuel (same as the disruption ledger)
set variable min_hi = 100.76;  -- A4A 2024 block-minute cost
set variable can_lo = 5770;    -- masFlight 2014 US average per cancelled flight
set variable can_hi = 22000;   -- EUROCONTROL Standard Inputs, EUR 20,930 (2022) at 1.05

-- 0. All six months ---------------------------------------------------------------------------------------------
create or replace table f6 as
select flight_date, month(flight_date) mon, carrier, flight_number, tail_number, origin, dest, sched_dep_hhmm,
  (sched_dep_hhmm // 100) * 60 + sched_dep_hhmm % 100 dep_min, sched_dep_hhmm // 100 dep_hour,
  cancelled, diverted, arr_delay_min, dep_delay_min, arrived_late, late_aircraft_delay_min
from read_parquet(['prezip/flights_2026_0*.parquet', 'flights/flights_2026_0*.parquet']);

-- 1. CHRONICALLY DELAYED FLIGHTS, 14 CFR 399.81(c) ---------------------------------------------------------------
-- (c)(2): a domestic flight operated at least 10 times a month that arrives more than 30 minutes late (including
-- cancelled flights) more than 50% of the time that month. (c)(3): all of a carrier's flights in a city-pair market
-- whose scheduled departure times are within 30 minutes of the most frequently occurring scheduled departure time are
-- ONE flight. Applied greedily: take the most frequent time, group everything within 30 minutes, remove, repeat.
-- Market = airport pair (BTS origin -> dest); a diverted flight counts as late (it did not arrive on time).
create or replace table rem as
select carrier, origin, dest, mon, dep_min, count(*) n,
  count(*) filter (where cancelled or diverted or arr_delay_min > 30) late30
from f6 group by all;
create or replace table clusters (carrier varchar, origin varchar, dest varchar, mon int, pass int, mode_min int,
  ops bigint, late30 bigint);
