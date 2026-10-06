-- One-time build of transit/ntd_monthly.parquet (the only SQL in this dataset; it lands the data).
-- Sources (US Department of Transportation, Public Domain U.S. Government, https://www.usa.gov/government-works):
--   ntd_monthly.csv      FTA NTD "Complete Monthly Ridership (with Adjustments and Estimates)"
--                        https://data.transportation.gov/api/views/8bui-9xvu/rows.csv?accessType=DOWNLOAD
--   agency_info_2024.csv FTA NTD "2024 NTD Annual Data - Reporter Agency Information" (city, brand name, population)
--                        https://data.transportation.gov/api/views/ccvf-fykn/rows.csv?accessType=DOWNLOAD
-- Run from the folder holding both CSVs:  duckdb < build_ntd.sql   (writes ntd_monthly.parquet there)
-- Output: one row per agency x mode x type of service x month (tidy long format).

CREATE TEMP TABLE agency AS
SELECT "NTD ID" AS ntd_id,
       nullif(trim("Doing Business As"), '') AS brand,
       nullif(trim(City), '') AS city,
       try_cast(replace("Service Area Pop", ',', '') AS BIGINT) AS service_area_pop
FROM read_csv('agency_info_2024.csv', all_varchar = true)
QUALIFY row_number() OVER (PARTITION BY "NTD ID"
                           ORDER BY try_cast(replace("Service Area Pop", ',', '') AS BIGINT) DESC NULLS LAST) = 1;

COPY (
  SELECT
    m."NTD ID"                                   AS ntd_id,
    m.Agency                                     AS agency,
    coalesce(a.brand, m.Agency)                  AS agency_name,
    a.city                                       AS city,
    m.State                                      AS state,
    m."UZA Name"                                 AS urban_area,
    m."Reporter Type"                            AS reporter_type,
    m.Mode                                       AS mode_code,
    CASE m.Mode
      WHEN 'MB' THEN 'Bus' WHEN 'DR' THEN 'Demand response' WHEN 'VP' THEN 'Vanpool'
      WHEN 'CB' THEN 'Commuter bus' WHEN 'RB' THEN 'Bus rapid transit' WHEN 'TB' THEN 'Trolleybus'
      WHEN 'PB' THEN 'Publico' WHEN 'LR' THEN 'Light rail' WHEN 'CR' THEN 'Commuter rail'
      WHEN 'HR' THEN 'Heavy rail (subway/metro)' WHEN 'SR' THEN 'Streetcar' WHEN 'MG' THEN 'Automated guideway'
      WHEN 'YR' THEN 'Hybrid rail' WHEN 'IP' THEN 'Inclined plane' WHEN 'CC' THEN 'Cable car'
      WHEN 'AR' THEN 'Alaska Railroad' WHEN 'TR' THEN 'Aerial tramway' WHEN 'FB' THEN 'Ferry'
      WHEN 'OR' THEN 'Other rail' ELSE m.Mode END AS mode,
    m."3 Mode"                                   AS mode_group,
    m.TOS                                        AS tos_code,
    CASE m.TOS
      WHEN 'DO' THEN 'Directly operated' WHEN 'PT' THEN 'Purchased transportation'
      WHEN 'TX' THEN 'Taxi' WHEN 'TN' THEN 'Transportation network company' ELSE m.TOS END AS type_of_service,
    m."Mode/Type of Service Status"              AS service_status,
    CAST(strptime(m.Date, '%B %Y') AS DATE)      AS report_month,
    try_cast(m.UPT  AS BIGINT)                   AS trips,
    try_cast(m.VRM  AS BIGINT)                   AS vehicle_revenue_miles,
    try_cast(m.VRH  AS BIGINT)                   AS vehicle_revenue_hours,
    try_cast(m.VOMS AS INTEGER)                  AS vehicles_max_service,
    a.service_area_pop                           AS service_area_pop_2024
  FROM read_csv('ntd_monthly.csv', all_varchar = true) m
  LEFT JOIN agency a ON a.ntd_id = m."NTD ID"
  ORDER BY state, ntd_id, mode_code, tos_code, report_month
) TO 'ntd_monthly.parquet' (FORMAT parquet, COMPRESSION zstd);
