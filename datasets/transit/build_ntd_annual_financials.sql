-- One-time build of transit/ntd_annual_financials.parquet: fares, operating expense, trips and service by agency x mode
-- x type of service x report year, 2015-2024, plus each agency-year's operating funding split (2022-2024).
-- (SQL only lands and reshapes the data; every rate, comparison and ranking is done in the Malloy model.)
--
-- Sources (US Department of Transportation / FTA National Transit Database, Public Domain U.S. Government; downloaded
-- 2026-10-07 into units/ltools/public-data/transit/raw/):
--   ts21_long.csv      "NTD Annual Data - Time Series 2.1: Service and Operating Expenses Time Series by Mode",
--                      data.transportation.gov npsm-38gk, long format (one row per agency x mode x tos x year x field),
--                      fields Fares, Operating Expenses, Unlinked Passenger Trips, Vehicle Revenue Hours/Miles.
--                      https://data.transportation.gov/resource/npsm-38gk.csv?$select=ntd_id,agency_name,state,reporter_type,uace_code,uza_population,mode,type_of_service,field,report_year,value&$where=field in('Fares','Operating Expenses','Unlinked Passenger Trips','Vehicle Revenue Hours','Vehicle Revenue Miles')&$limit=500000
--   funding_sources.csv "2022-2024 NTD Annual Data - Funding Sources (by Expense Type)", 4tmr-gwuu (operations rows).
--                      https://data.transportation.gov/resource/4tmr-gwuu.csv?$limit=100000
--   ts21_extra.csv     same dataset, the remaining fields (added 2026-10-07 for the cost-per-rider study):
--                      https://data.transportation.gov/resource/npsm-38gk.csv?$select=ntd_id,mode,type_of_service,field,report_year,value&$where=field in('Passenger Miles Traveled','Vehicles Operated in Maximum Service','Operating Expenses - Vehicle Operations','Operating Expenses - General Administration')&$limit=500000
--   ts21_agency.csv    same dataset, one row per agency: city, reporting module, primary UZA name and land area.
--                      https://data.transportation.gov/resource/npsm-38gk.csv?$select=ntd_id,agency_name,city,state,reporting_module,primary_uza_name,uace_code,uza_area_sq_miles,uza_population,agency_status&$group=ntd_id,agency_name,city,state,reporting_module,primary_uza_name,uace_code,uza_area_sq_miles,uza_population,agency_status&$limit=50000
--   agency_info_2024.csv FTA region (1-10) from "2024 NTD Annual Data - Reporter Agency Information", ccvf-fykn.
--   CPI-U annual averages (BLS CUUR0000SA0, api.bls.gov v1, fetched 2026-10-07): cpi_to_2024 = 313.689 / year's CPI.
-- KNOWN TRAP: an agency that collected no fares reports Fares as BLANK, not 0. Blank fares on a row that ran service
-- (operating expense > 0) are stored as 0 here, so fare-free years stay in every average instead of dropping out.
-- Run from raw/:  duckdb -c ".read /path/to/build_ntd_annual_financials.sql"  (writes ../ntd_annual_financials.parquet)

CREATE TEMP TABLE w AS
SELECT ntd_id, any_value(agency_name) AS agency_name, any_value(state) AS state, any_value(reporter_type) AS reporter_type,
       any_value(uace_code) AS uace_code, max(try_cast(uza_population AS BIGINT)) AS uza_population,
       mode AS mode_code, type_of_service AS tos_code, CAST(report_year AS INTEGER) AS report_year,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Fares')                    AS fares_raw,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Operating Expenses')       AS operating_expenses,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Unlinked Passenger Trips') AS trips,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Vehicle Revenue Hours')    AS vehicle_revenue_hours,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Vehicle Revenue Miles')    AS vehicle_revenue_miles
FROM read_csv('ts21_long.csv', all_varchar = true)
GROUP BY ntd_id, mode, type_of_service, report_year;

CREATE TEMP TABLE x AS
SELECT ntd_id, mode AS mode_code, type_of_service AS tos_code, CAST(report_year AS INTEGER) AS report_year,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Passenger Miles Traveled')                     AS passenger_miles,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Vehicles Operated in Maximum Service')         AS vehicles_max_service,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Operating Expenses - Vehicle Operations')      AS opex_vehicle_operations,
       max(try_cast(value AS DOUBLE)) FILTER (WHERE field = 'Operating Expenses - General Administration')  AS opex_general_admin
FROM read_csv('ts21_extra.csv', all_varchar = true)
GROUP BY ALL;

CREATE TEMP TABLE ag AS
SELECT t.ntd_id, nullif(trim(t.city), '') AS city, t.reporting_module, nullif(trim(t.primary_uza_name), '') AS uza_name,
       try_cast(t.uza_area_sq_miles AS DOUBLE) AS uza_area_sq_miles, try_cast(i."Region" AS INTEGER) AS fta_region
FROM read_csv('ts21_agency.csv', all_varchar = true) t
LEFT JOIN (SELECT "NTD ID", any_value("Region") AS "Region" FROM read_csv('agency_info_2024.csv', all_varchar = true) GROUP BY 1) i
  ON i."NTD ID" = t.ntd_id;

CREATE TEMP TABLE cpi AS SELECT * FROM (VALUES (2015, 237.017), (2016, 240.007), (2017, 245.120), (2018, 251.107),
  (2019, 255.657), (2020, 258.811), (2021, 270.970), (2022, 292.655), (2023, 304.702), (2024, 313.689)) v(y, cpi);

CREATE TEMP TABLE fund AS
SELECT ntd_id, CAST(report_year AS INTEGER) AS report_year,
       sum(try_cast(fares_and_other_directly AS DOUBLE))     AS fund_fares_and_directly_generated,
       sum(try_cast(taxes_fees_levied_by_transit AS DOUBLE)) AS fund_transit_taxes,
       sum(try_cast(local AS DOUBLE))                        AS fund_local,
       sum(try_cast(state_1 AS DOUBLE))                      AS fund_state,
       sum(try_cast(federal AS DOUBLE))                      AS fund_federal,
       sum(try_cast(total AS DOUBLE))                        AS fund_total
FROM read_csv('funding_sources.csv', all_varchar = true)
WHERE fund_expenditure_type = 'Funds Expended on Operations'
GROUP BY ALL;

COPY (
  SELECT w.ntd_id, trim(w.agency_name) AS agency_name, w.state, w.reporter_type, w.uace_code, w.uza_population,
    w.mode_code,
    CASE w.mode_code
      WHEN 'MB' THEN 'Bus' WHEN 'DR' THEN 'Demand response' WHEN 'VP' THEN 'Vanpool'
      WHEN 'CB' THEN 'Commuter bus' WHEN 'RB' THEN 'Bus rapid transit' WHEN 'TB' THEN 'Trolleybus'
      WHEN 'PB' THEN 'Publico' WHEN 'LR' THEN 'Light rail' WHEN 'CR' THEN 'Commuter rail'
      WHEN 'HR' THEN 'Heavy rail (subway/metro)' WHEN 'SR' THEN 'Streetcar' WHEN 'MG' THEN 'Automated guideway'
      WHEN 'YR' THEN 'Hybrid rail' WHEN 'IP' THEN 'Inclined plane' WHEN 'CC' THEN 'Cable car'
      WHEN 'AR' THEN 'Alaska Railroad' WHEN 'TR' THEN 'Aerial tramway' WHEN 'FB' THEN 'Ferry'
      WHEN 'DT' THEN 'Demand response - taxi' WHEN 'OR' THEN 'Other rail' ELSE w.mode_code END AS mode,
    w.tos_code, w.report_year,
    -- Blank fares on a row that ran service = fare-free = 0 (the known trap). Rows with no expense keep null.
    CASE WHEN w.fares_raw IS NULL AND coalesce(w.operating_expenses, 0) > 0 THEN 0 ELSE w.fares_raw END AS fares,
    (w.fares_raw IS NULL AND coalesce(w.operating_expenses, 0) > 0) AS fares_was_blank,
    w.operating_expenses, w.trips, w.vehicle_revenue_hours, w.vehicle_revenue_miles,
    -- Added 2026-10-07 (cost per rider): passenger miles (full reporters only), peak vehicles, two expense functions,
    -- agency city / UZA name / UZA land area / UZA density / FTA region, and the CPI-U factor to 2024 dollars.
    x.passenger_miles, x.vehicles_max_service, x.opex_vehicle_operations, x.opex_general_admin,
    ag.city, ag.reporting_module, ag.uza_name, ag.uza_area_sq_miles,
    CASE WHEN ag.uza_area_sq_miles > 0 AND w.uza_population > 0 AND ag.reporting_module = 'Urban'
         THEN w.uza_population / ag.uza_area_sq_miles END AS uza_density,
    ag.fta_region, 313.689 / cpi.cpi AS cpi_to_2024,
    -- Agency-year funding for operations (2022-2024 only), repeated on each of the agency's rows that year:
    -- sum it with max-per-agency logic in the model, never across rows.
    f.fund_fares_and_directly_generated, f.fund_transit_taxes, f.fund_local, f.fund_state, f.fund_federal, f.fund_total
  FROM w LEFT JOIN fund f ON f.ntd_id = w.ntd_id AND f.report_year = w.report_year
  LEFT JOIN x ON x.ntd_id = w.ntd_id AND x.mode_code = w.mode_code AND x.tos_code = w.tos_code AND x.report_year = w.report_year
  LEFT JOIN ag ON ag.ntd_id = w.ntd_id
  LEFT JOIN cpi ON cpi.y = w.report_year
  WHERE coalesce(w.operating_expenses, 0) > 0 OR coalesce(w.trips, 0) > 0
  ORDER BY w.ntd_id, w.mode_code, w.tos_code, w.report_year
) TO '../ntd_annual_financials.parquet' (FORMAT parquet, COMPRESSION zstd);
