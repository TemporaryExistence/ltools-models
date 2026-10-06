-- One-time build of transit/ondemand_annual.parquet: demand-response (on-demand) service by agency x type of service
-- x report year, 2022-2024, with the fields that separate ADA paratransit from general-public on-demand service.
-- (SQL only lands the data; every split, share and ranking is done in the Malloy model, ondemand.malloy.)
--
-- Sources (US Department of Transportation / FTA National Transit Database, Public Domain U.S. Government,
-- http://www.usa.gov/publicdomain/label/1.0/ as stated on each dataset page; downloaded 2026-10-06):
--   service_dr.csv   "2022 - 2024 NTD Annual Data - Service (by Mode and Time Period)", data.transportation.gov wwdp-t4re,
--                    rows mode = 'DR' and time_period = 'Annual Total'. Carries ada_upt (ADA-related trips) and
--                    sponsored_service_upt (trips paid for by a third party, e.g. human-service agencies).
--                    https://data.transportation.gov/resource/wwdp-t4re.csv?$where=mode in('DR','DT') and time_period='Annual Total'&$limit=50000
--   metrics_dr.csv   "2022 - 2024 NTD Annual Data - Metrics", ekg5-frzt, mode = 'DR' (total operating expenses).
--                    https://data.transportation.gov/resource/ekg5-frzt.csv?$where=mode in('DR','DT')&$limit=50000
--   sched_2024.csv   "2024 NTD Annual Data - Demand Response Geographic Area Coverage (Service Schedules)", uk25-sge7
--                    (per agency x type of service x day: only_ada_flag, gen_population_flag).
--                    https://data.transportation.gov/resource/uk25-sge7.csv?$limit=200000
--   elig_2024.csv    "2024 NTD Annual Data - Demand Response Geographic Area Coverage (Passenger Eligibility and Fares)",
--                    i3pw-uwab (has_psgnr_elig_rqmt_flag). https://data.transportation.gov/resource/i3pw-uwab.csv?$limit=200000
--   ntd_monthly.parquet  this dataset's monthly file (build_ntd.sql), for the latest-12-month hours (Sep 2025 - Aug 2026).
-- Run from the folder holding the four CSVs, with MONTHLY pointing at ntd_monthly.parquet:
--   duckdb -c "SET VARIABLE monthly = '/path/to/ntd_monthly.parquet'" -c ".read build_ondemand_annual.sql"
-- Output: ondemand_annual.parquet in the current folder.
-- Note: the DT mode code ("demand response - taxi") no longer appears in 2022-2024; taxi-provided demand response is
-- DR with type of service TX.

CREATE TEMP TABLE sched AS
SELECT ntd_id, service_type_code AS tos_code,
       count(*)                                    AS schedule_days_2024,
       count(*) FILTER (WHERE only_ada_flag)       AS ada_only_days_2024,
       count(*) FILTER (WHERE gen_population_flag) AS general_public_days_2024
FROM read_csv('sched_2024.csv') GROUP BY ALL;

CREATE TEMP TABLE elig AS
SELECT ntd_id, service_type_code AS tos_code, bool_or(has_psgnr_elig_rqmt_flag) AS eligibility_required_2024
FROM read_csv('elig_2024.csv') GROUP BY ALL;

CREATE TEMP TABLE monthly AS
SELECT ntd_id, tos_code,
       sum(vehicle_revenue_hours) FILTER (WHERE report_month >= DATE '2025-09-01' AND report_month < DATE '2026-09-01') AS hours_latest_12m,
       count(DISTINCT report_month) FILTER (WHERE report_month >= DATE '2025-09-01' AND report_month < DATE '2026-09-01'
                                            AND vehicle_revenue_hours > 0) AS months_reported_latest_12m,
       sum(vehicle_revenue_hours) FILTER (WHERE year(report_month) = 2024) AS hours_2024_monthly_file
FROM read_parquet(getvariable('monthly')) WHERE mode_code = 'DR' GROUP BY ALL;

CREATE TEMP TABLE metrics AS
SELECT ntd_id, type_of_service AS tos_code, report_year, vehicle_revenue_hours AS m_vrh, total_operating_expenses
FROM read_csv('metrics_dr.csv');

-- Agency name, city and state as of its latest report year (names change between years: "Metropolitan Transit Authority of Harris
-- County" in 2022, "METRO" in 2023-2024), so one agency keeps one name across years.
CREATE TEMP TABLE names AS
SELECT _5_digit_ntd_id AS ntd_id,
       arg_max(trim(CASE WHEN agency LIKE '%dba:%' THEN split_part(agency, 'dba:', 2) ELSE agency END), report_year) AS agency_name,
       arg_max(agency, report_year) AS agency_legal_name,
       arg_max(city, report_year)   AS city,
       arg_max(state, report_year)  AS state
FROM read_csv('service_dr.csv') WHERE mode = 'DR' AND time_period = 'Annual Total' GROUP BY 1;

COPY (
  SELECT
    s._5_digit_ntd_id                                         AS ntd_id,
    n.agency_legal_name,
    n.agency_name,
    n.city, n.state,
    s.primary_uza_name                                        AS urban_area,
    s.primary_uza_population                                  AS urban_area_population,
    s.reporter_type, s.organization_type,
    s.report_year,
    s.type_of_service                                         AS tos_code,
    CASE s.type_of_service WHEN 'DO' THEN 'Directly operated' WHEN 'PT' THEN 'Purchased transportation'
      WHEN 'TX' THEN 'Taxi' WHEN 'TN' THEN 'Transportation network company' ELSE s.type_of_service END AS type_of_service,
    s.unlinked_passenger_trips_upt                            AS trips,
    s.ada_upt                                                 AS ada_trips,
    s.sponsored_service_upt                                   AS sponsored_trips,
    s.actual_vehicles_passenger_car_revenue_hours             AS vehicle_revenue_hours,
    s.actual_vehicles_passenger_car_revenue_miles             AS vehicle_revenue_miles,
    s.mode_voms                                               AS vehicles_max_service,
    m.total_operating_expenses                                AS operating_expenses,
    f.schedule_days_2024, f.ada_only_days_2024, f.general_public_days_2024,
    e.eligibility_required_2024,
    -- Monthly-file hours only on the 2024 row, so sums over years never double-count them.
    CASE WHEN s.report_year = 2024 THEN mo.hours_latest_12m END            AS hours_latest_12m,
    CASE WHEN s.report_year = 2024 THEN mo.months_reported_latest_12m END  AS months_reported_latest_12m,
    CASE WHEN s.report_year = 2024 THEN mo.hours_2024_monthly_file END     AS hours_2024_monthly_file
  FROM (SELECT *, row_number() OVER () AS row_id FROM read_csv('service_dr.csv')) s
  JOIN names n ON n.ntd_id = s._5_digit_ntd_id
  LEFT JOIN metrics m ON m.ntd_id = s._5_digit_ntd_id AND m.tos_code = s.type_of_service AND m.report_year = s.report_year
  LEFT JOIN sched f   ON f.ntd_id = s._5_digit_ntd_id AND f.tos_code = s.type_of_service
  LEFT JOIN elig e    ON e.ntd_id = s._5_digit_ntd_id AND e.tos_code = s.type_of_service
  LEFT JOIN monthly mo ON mo.ntd_id = s._5_digit_ntd_id AND mo.tos_code = s.type_of_service
  WHERE s.mode = 'DR' AND s.time_period = 'Annual Total'
  -- Two small agencies (10137 Advance Transit, 80188 START) file two rows per type of service and year; match each
  -- service row to the metrics row with the same hours.
  QUALIFY row_number() OVER (PARTITION BY s.row_id ORDER BY abs(coalesce(m.m_vrh, 0) - coalesce(s.actual_vehicles_passenger_car_revenue_hours, 0))) = 1
  ORDER BY state, ntd_id, tos_code, report_year
) TO 'ondemand_annual.parquet' (FORMAT parquet, COMPRESSION zstd);
