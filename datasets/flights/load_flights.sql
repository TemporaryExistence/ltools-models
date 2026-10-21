-- Load BTS Reporting Carrier On-Time Performance (US public data) into MotherDuck.
-- Source: https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_<YYYY>_<M>.zip
-- Run with the DuckDB CLI (1.5.6+) with motherduck_token set, from the folder holding the unzipped CSVs:
--   duckdb -c ".read datasets/flights/load_flights.sql"
-- Loading is the one place raw SQL is used (DR-LT-2): everything after this is Malloy, built through agents.

ATTACH 'md:';
CREATE DATABASE IF NOT EXISTS ltools;
USE ltools;

CREATE OR REPLACE TABLE flights AS
SELECT
  FlightDate::DATE                          AS flight_date,
  Reporting_Airline                         AS carrier,
  Flight_Number_Reporting_Airline::INTEGER  AS flight_number,
  Tail_Number                               AS tail_number,
  Origin                                    AS origin,
  OriginCityName                            AS origin_city,
  OriginState                               AS origin_state,
  Dest                                      AS dest,
  DestCityName                              AS dest_city,
  DestState                                 AS dest_state,
  CRSDepTime::INTEGER                       AS sched_dep_hhmm,
  DepDelay::DOUBLE                          AS dep_delay_min,
  ArrDelay::DOUBLE                          AS arr_delay_min,
  ArrDel15::DOUBLE = 1                      AS arrived_late,
  Cancelled::DOUBLE = 1                     AS cancelled,
  CancellationCode                          AS cancellation_code,
  Diverted::DOUBLE = 1                      AS diverted,
  AirTime::DOUBLE                           AS air_time_min,
  Distance::DOUBLE                          AS distance_miles,
  CarrierDelay::DOUBLE                      AS carrier_delay_min,
  WeatherDelay::DOUBLE                      AS weather_delay_min,
  NASDelay::DOUBLE                          AS nas_delay_min,
  SecurityDelay::DOUBLE                     AS security_delay_min,
  LateAircraftDelay::DOUBLE                 AS late_aircraft_delay_min
FROM read_csv('m_*/*.csv', header = true, all_varchar = true, union_by_name = true);

SELECT count(*) AS rows, min(flight_date) AS first_day, max(flight_date) AS last_day FROM flights;
