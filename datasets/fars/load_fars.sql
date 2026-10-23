-- Load NHTSA FARS 2019-2024 (fatal US road crashes) into MotherDuck database ltools, schema fars.
-- Source: NHTSA FARS national CSV files, one zip per year (FARS20xxNationalCSV.zip), downloaded 2026-10-20.
--   2019-2023 are Final Files; 2024 is the Annual Report File (ARF): NHTSA revises it when the 2025 ARF is released.
-- Step 1 (local, once, from units/ltools/public-data/fars/raw): unzip accident, person, vehicle, MIACC, MIDRVACC, MIPER
--   for each year into csv/<year>/ (lower-case names), then re-encode to UTF-8 into utf8/<year>/
--   (2019 and 2020 accident.csv are Windows-1252; 2021-2022 accident.csv carry a UTF-8 byte-order mark).
-- Step 2 (local): FHWA Highway Statistics table VM-2 (vehicle-miles by state, rural/urban and functional system),
--   2019-2024 pages saved to fhwa/vm2_<year>.html and parsed to fhwa/vm2_2019_2024.csv (parse_vm2.py in the working notes).
-- Step 1b (2026-10-23, sections 11-15): also unzip Distract, Violatn and Drugs for each year into utf8/<year>/
--   (distract.csv, violatn.csv, drugs.csv; re-encoded the same way). FHWA Highway Statistics MV-1 (vehicle registrations)
--   and DL-22 (licensed drivers, the "Total" table, fifth on the page) for 2019, 2022, 2023 and 2024, pages
--   https://www.fhwa.dot.gov/policyinformation/statistics/<year>/mv1.cfm and .../<year>/dl22.cfm saved 2026-10-23 to
--   fhwa/mv1_<year>.html and fhwa/dl22_<year>.html, parsed by fhwa/parse_mv1.py and fhwa/parse_dl22.py to
--   fhwa/mv1_2019_2024.csv and fhwa/dl22_2019_2024.csv (2020 and 2021 tables not used).
-- Step 3: run this file from units/ltools/public-data/fars/raw with ltools attached:
--   duckdb -c "ATTACH 'md:ltools'; .read <this file>"
-- County population: 2020-2024 from ltools.libraries.county_population (Census Vintage 2025); 2019 from the Census 2010-2020 intercensal file (section 6).
-- Keys: ST_CASE repeats across years (41,852 distinct values over 222,695 crashes), so every key here includes the year:
--   crash_key = year * 1000000 + st_case; vehicle_key = crash_key * 1000 + veh_no; person_key = vehicle_key * 1000 + per_no.

CREATE SCHEMA IF NOT EXISTS ltools.fars;

-- Raw staging (kept as temp tables; only the shaped tables below are stored).
CREATE OR REPLACE TEMP TABLE acc_raw AS SELECT * FROM read_csv('utf8/*/accident.csv', union_by_name=true, sample_size=-1);
CREATE OR REPLACE TEMP TABLE per_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/person.csv', union_by_name=true, filename=true, sample_size=-1);
CREATE OR REPLACE TEMP TABLE veh_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/vehicle.csv', union_by_name=true, filename=true, sample_size=-1);
CREATE OR REPLACE TEMP TABLE midrvacc_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/midrvacc.csv', union_by_name=true, filename=true);
CREATE OR REPLACE TEMP TABLE miacc_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/miacc.csv', union_by_name=true, filename=true);
CREATE OR REPLACE TEMP TABLE miper_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/miper.csv', union_by_name=true, filename=true);
-- Used by sections 11-15 only. Distract: 2019 names the field MDRDSTRD, 2020+ DRDISTRACT; Violatn: 2019 MVIOLATN,
-- 2020+ VIOLATION; Drugs: DRUGRES codes are 3-digit to 2021 and 4-digit from 2022. Several rows per driver.
CREATE OR REPLACE TEMP TABLE distract_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/distract.csv', union_by_name=true, filename=true, sample_size=-1);
CREATE OR REPLACE TEMP TABLE violatn_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/violatn.csv', union_by_name=true, filename=true, sample_size=-1);
CREATE OR REPLACE TEMP TABLE drugs_raw AS SELECT *, regexp_extract(filename, 'utf8/(\d{4})/', 1)::INT AS data_year
  FROM read_csv('utf8/*/drugs.csv', union_by_name=true, filename=true, sample_size=-1);

-- 1. NHTSA multiple imputation of blood alcohol (BAC), one row per crash per imputation (10 per crash).
--    MIDRVACC = highest BAC among the crash's drivers (NHTSA's alcohol-impaired-driving definition uses this).
--    MIACC = highest BAC among drivers AND nonoccupants (pedestrians, cyclists). Values are BAC in hundredths (8 = .08 g/dL).
CREATE OR REPLACE TABLE ltools.fars.alcohol_imputations AS
WITH d AS (
  SELECT data_year AS year, ST_CASE AS st_case, imp, bac FROM midrvacc_raw
  UNPIVOT (bac FOR imp IN (A1, A2, A3, A4, A5, A6, A7, A8, A9, A10))
), a AS (
  SELECT data_year AS year, ST_CASE AS st_case, imp, bac FROM miacc_raw
  UNPIVOT (bac FOR imp IN (A1, A2, A3, A4, A5, A6, A7, A8, A9, A10))
)
SELECT
  a.year * 1000000 + a.st_case AS crash_key,
  a.year, a.st_case,
  substr(a.imp, 2)::INT AS imputation,
  d.bac / 100.0 AS max_driver_bac,
  a.bac / 100.0 AS max_driver_or_nonoccupant_bac
FROM a LEFT JOIN d USING (year, st_case, imp);

-- 2. Crashes: one row per fatal crash.
CREATE OR REPLACE TABLE ltools.fars.crashes AS
WITH v AS (
  SELECT data_year AS year, ST_CASE AS st_case,
    bool_or(SPEEDREL BETWEEN 2 AND 5) AS speeding_related,
    bool_or(DR_DRINK = 1) AS police_reported_drinking_driver,
    bool_or(HIT_RUN = 1) AS hit_and_run,
    bool_or(BODY_TYP BETWEEN 60 AND 79) AS large_truck_involved,
    bool_or(BODY_TYP BETWEEN 80 AND 89) AS motorcycle_involved,
    bool_or(TRAV_SP BETWEEN 0 AND 151 AND VSPD_LIM BETWEEN 5 AND 95 AND TRAV_SP >= VSPD_LIM + 10) AS vehicle_10_over_limit,
    count(*) FILTER (WHERE TRAV_SP BETWEEN 0 AND 151 AND VSPD_LIM BETWEEN 5 AND 95) AS vehicles_speed_known,
    count(*) AS vehicles_in_transport
  FROM veh_raw GROUP BY ALL
), drv AS (
  SELECT data_year AS year, ST_CASE AS st_case,
    bool_or(ALC_RES BETWEEN 80 AND 940) AS tested_driver_bac_08,
    count(*) AS drivers,
    count(*) FILTER (WHERE ALC_RES <= 940) AS drivers_with_bac_result
  FROM per_raw WHERE PER_TYP = 1 GROUP BY ALL
), imp AS (
  SELECT crash_key,
    avg((max_driver_bac >= 0.08)::INT) AS ai_share,
    avg((max_driver_bac >= 0.01)::INT) AS any_alcohol_share,
    avg((max_driver_or_nonoccupant_bac >= 0.08)::INT) AS ai_share_incl_nonoccupants
  FROM ltools.fars.alcohol_imputations GROUP BY ALL
)
SELECT
  a.YEAR * 1000000 + a.ST_CASE AS crash_key,
  a.YEAR AS year,
  a.ST_CASE AS st_case,
  CASE WHEN a.YEAR = 2024 THEN 'Annual Report File (2024, not final)' ELSE 'Final File' END AS file_status,
  a.STATE AS state_fips,
  a.STATENAME AS state_name,
  lpad(a.STATE::VARCHAR, 2, '0') || lpad(a.COUNTY::VARCHAR, 3, '0') AS county_fips,
  CASE WHEN a.COUNTY IN (0, 997, 998, 999) THEN NULL ELSE trim(regexp_replace(a.COUNTYNAME, '\s*\(\d+\)\s*$', '')) END AS county_name,
  CASE WHEN a.CITY IN (0, 9997, 9898, 9999) THEN NULL ELSE a.CITYNAME END AS city_name,
  a.MONTH AS month,
  make_date(a.YEAR, a.MONTH, 1) AS crash_month,
  a.DAY_WEEK AS day_of_week_code,
  a.DAY_WEEKNAME AS day_of_week,
  CASE WHEN a.HOUR = 99 THEN NULL ELSE a.HOUR END AS hour,
  CASE WHEN a.HOUR = 99 THEN 'Unknown'
       WHEN a.HOUR BETWEEN 6 AND 17 THEN 'Daytime (6am-5:59pm)'
       ELSE 'Nighttime (6pm-5:59am)' END AS day_night,
  CASE WHEN a.DAY_WEEK IN (7, 1) THEN 'Weekend (Fri 6pm-Mon 5:59am)'
       WHEN a.DAY_WEEK IN (3, 4, 5) THEN 'Weekday'
       WHEN a.DAY_WEEK NOT IN (2, 6) OR a.HOUR = 99 THEN 'Unknown'
       WHEN (a.DAY_WEEK = 6 AND a.HOUR >= 18) OR (a.DAY_WEEK = 2 AND a.HOUR < 6) THEN 'Weekend (Fri 6pm-Mon 5:59am)'
       ELSE 'Weekday' END AS weekend_weekday,
  CASE a.RUR_URB WHEN 1 THEN 'Rural' WHEN 2 THEN 'Urban' ELSE 'Unknown or not reported' END AS rural_urban,
  a.FUNC_SYS AS road_function_code,
  CASE a.FUNC_SYS
    WHEN 1 THEN '1 Interstate'
    WHEN 2 THEN '2 Other freeway or expressway'
    WHEN 3 THEN '3 Other principal arterial'
    WHEN 4 THEN '4 Minor arterial'
    WHEN 5 THEN '5 Major collector'
    WHEN 6 THEN '6 Minor collector'
    WHEN 7 THEN '7 Local road'
    ELSE '9 Unknown or not in inventory' END AS road_function,
  CASE WHEN a.FUNC_SYS IN (1, 2) THEN 'Interstate or freeway'
       WHEN a.FUNC_SYS IN (3, 4) THEN 'Arterial (not freeway)'
       WHEN a.FUNC_SYS IN (5, 6) THEN 'Collector'
       WHEN a.FUNC_SYS = 7 THEN 'Local road'
       ELSE 'Unknown' END AS road_class,
  CASE WHEN a.LGT_COND = 1 THEN 'Daylight'
       WHEN a.LGT_COND = 2 THEN 'Dark, not lighted'
       WHEN a.LGT_COND = 3 THEN 'Dark, lighted'
       WHEN a.LGT_COND = 6 THEN 'Dark, unknown lighting'
       WHEN a.LGT_COND IN (4, 5) THEN 'Dawn or dusk'
       ELSE 'Other or unknown' END AS light_condition,
  CASE WHEN a.WEATHER IN (98, 99) THEN 'Unknown or not reported' ELSE a.WEATHERNAME END AS weather,
  CASE WHEN a.RELJCT2 IN (2, 3) THEN 'Intersection or intersection-related'
       WHEN a.RELJCT2 IN (98, 99) THEN 'Unknown'
       WHEN a.RELJCT2 = 1 THEN 'Not at a junction'
       ELSE 'Other junction (driveway, ramp, interchange, rail crossing)' END AS junction,
  a.HARM_EVNAME AS first_harmful_event,
  a.MAN_COLLNAME AS manner_of_collision,
  a.WRK_ZONE <> 0 AS work_zone,
  CASE WHEN a.LATITUDE BETWEEN 17 AND 72 THEN a.LATITUDE END AS latitude,
  CASE WHEN a.LONGITUD BETWEEN -180 AND -60 THEN a.LONGITUD END AS longitude,
  a.FATALS AS fatalities,
  a.PEDS AS nonoccupants_involved,
  a.PERSONS AS occupants_involved,
  a.VE_TOTAL AS vehicles_total,
  coalesce(v.speeding_related, false) AS speeding_related,
  coalesce(v.police_reported_drinking_driver, false) AS police_reported_drinking_driver,
  coalesce(v.hit_and_run, false) AS hit_and_run,
  coalesce(v.large_truck_involved, false) AS large_truck_involved,
  coalesce(v.motorcycle_involved, false) AS motorcycle_involved,
  coalesce(v.vehicle_10_over_limit, false) AS vehicle_10_over_limit,
  coalesce(v.vehicles_speed_known, 0) AS vehicles_speed_known,
  coalesce(v.vehicles_in_transport, 0) AS vehicles_in_transport,
  coalesce(drv.tested_driver_bac_08, false) AS tested_driver_bac_08,
  coalesce(drv.drivers, 0) AS drivers,
  coalesce(drv.drivers_with_bac_result, 0) AS drivers_with_bac_result,
  coalesce(imp.ai_share, 0) AS ai_share,
  coalesce(imp.any_alcohol_share, 0) AS any_alcohol_share,
  coalesce(imp.ai_share_incl_nonoccupants, 0) AS ai_share_incl_nonoccupants
FROM acc_raw a
LEFT JOIN v ON v.year = a.YEAR AND v.st_case = a.ST_CASE
LEFT JOIN drv ON drv.year = a.YEAR AND drv.st_case = a.ST_CASE
LEFT JOIN imp ON imp.crash_key = a.YEAR * 1000000 + a.ST_CASE;

-- 3. Vehicles: one row per motor vehicle in transport.
CREATE OR REPLACE TABLE ltools.fars.vehicles AS
SELECT
  (data_year * 1000000 + ST_CASE) * 1000 + VEH_NO AS vehicle_key,
  data_year * 1000000 + ST_CASE AS crash_key,
  data_year AS year,
  VEH_NO AS veh_no,
  BODY_TYP AS body_type_code,
  CASE WHEN BODY_TYP BETWEEN 1 AND 13 OR BODY_TYP = 17 THEN 'Passenger car'
       WHEN BODY_TYP IN (14, 15, 16, 19) THEN 'SUV'
       WHEN BODY_TYP BETWEEN 20 AND 29 THEN 'Van'
       WHEN BODY_TYP BETWEEN 30 AND 39 THEN 'Pickup'
       WHEN BODY_TYP BETWEEN 40 AND 49 THEN 'Other light truck'
       WHEN BODY_TYP BETWEEN 50 AND 59 THEN 'Bus'
       WHEN BODY_TYP BETWEEN 60 AND 79 THEN 'Large truck'
       WHEN BODY_TYP BETWEEN 80 AND 89 THEN 'Motorcycle or moped'
       ELSE 'Other or unknown' END AS vehicle_type,
  BODY_TYP BETWEEN 1 AND 49 AS is_passenger_vehicle,
  CASE WHEN MOD_YEAR BETWEEN 1900 AND 2030 THEN MOD_YEAR END AS model_year,
  SPEEDREL BETWEEN 2 AND 5 AS speeding_related,
  CASE WHEN SPEEDREL IN (8, 9) THEN 'Unknown' ELSE SPEEDRELNAME END AS speeding_detail,
  CASE WHEN TRAV_SP BETWEEN 0 AND 151 THEN TRAV_SP END AS travel_speed_mph,
  CASE WHEN VSPD_LIM BETWEEN 5 AND 95 THEN VSPD_LIM END AS posted_speed_limit_mph,
  DR_DRINK = 1 AS police_reported_drinking_driver,
  HIT_RUN = 1 AS hit_and_run,
  DEATHS AS occupant_deaths
FROM veh_raw;

-- 4. Persons: one row per person (occupants of vehicles in transport, plus pedestrians, cyclists and other nonoccupants).
CREATE OR REPLACE TABLE ltools.fars.persons AS
WITH mp AS (
  SELECT data_year AS year, ST_CASE, VEH_NO, PER_NO,
    ((P1>=8)::INT+(P2>=8)::INT+(P3>=8)::INT+(P4>=8)::INT+(P5>=8)::INT+(P6>=8)::INT+(P7>=8)::INT+(P8>=8)::INT+(P9>=8)::INT+(P10>=8)::INT) / 10.0 AS bac08_share
  FROM miper_raw
)
SELECT
  ((p.data_year * 1000000 + p.ST_CASE) * 1000 + p.VEH_NO) * 1000 + p.PER_NO AS person_key,
  p.data_year * 1000000 + p.ST_CASE AS crash_key,
  CASE WHEN p.VEH_NO > 0 THEN (p.data_year * 1000000 + p.ST_CASE) * 1000 + p.VEH_NO END AS vehicle_key,
  p.data_year AS year,
  p.VEH_NO AS veh_no,
  p.PER_NO AS per_no,
  p.PER_TYP AS person_type_code,
  CASE p.PER_TYP WHEN 1 THEN 'Driver' WHEN 2 THEN 'Passenger' WHEN 3 THEN 'Occupant of a parked vehicle'
    WHEN 9 THEN 'Unknown occupant type' WHEN 5 THEN 'Pedestrian' WHEN 6 THEN 'Bicyclist' WHEN 7 THEN 'Other pedalcyclist'
    WHEN 8 THEN 'Person on a personal conveyance' WHEN 11 THEN 'Person on a personal conveyance'
    WHEN 12 THEN 'Person on a personal conveyance' WHEN 13 THEN 'Person on a personal conveyance'
    ELSE 'Other nonoccupant' END AS person_type,
  CASE WHEN p.PER_TYP IN (1, 2, 9) AND p.BODY_TYP BETWEEN 1 AND 49 THEN 'Passenger vehicle occupant'
       WHEN p.PER_TYP IN (1, 2, 9) AND p.BODY_TYP BETWEEN 80 AND 89 THEN 'Motorcyclist'
       WHEN p.PER_TYP IN (1, 2, 9) AND p.BODY_TYP BETWEEN 60 AND 79 THEN 'Large-truck occupant'
       WHEN p.PER_TYP IN (1, 2, 9) THEN 'Bus or other vehicle occupant'
       WHEN p.PER_TYP = 3 THEN 'Bus or other vehicle occupant'
       WHEN p.PER_TYP = 5 THEN 'Pedestrian'
       WHEN p.PER_TYP IN (6, 7) THEN 'Pedalcyclist'
       ELSE 'Other nonoccupant' END AS road_user,
  p.PER_TYP IN (1, 2, 3, 9) AS is_occupant,
  p.INJ_SEV AS injury_severity_code,
  CASE p.INJ_SEV WHEN 4 THEN 'Killed' WHEN 3 THEN 'Serious injury' WHEN 2 THEN 'Minor injury'
    WHEN 1 THEN 'Possible injury' WHEN 0 THEN 'No apparent injury' WHEN 6 THEN 'Died before the crash'
    ELSE 'Injured, severity unknown, or unknown' END AS injury_severity,
  p.INJ_SEV = 4 AS is_killed,
  CASE WHEN p.AGE BETWEEN 0 AND 120 THEN p.AGE END AS age,
  CASE WHEN p.AGE > 120 THEN 'Unknown' WHEN p.AGE < 15 THEN '0-14' WHEN p.AGE < 21 THEN '15-20'
       WHEN p.AGE < 25 THEN '21-24' WHEN p.AGE < 35 THEN '25-34' WHEN p.AGE < 45 THEN '35-44' WHEN p.AGE < 55 THEN '45-54'
       WHEN p.AGE < 65 THEN '55-64' WHEN p.AGE < 75 THEN '65-74' ELSE '75+' END AS age_band,
  CASE p.SEX WHEN 1 THEN 'Male' WHEN 2 THEN 'Female' ELSE 'Unknown' END AS sex,
  CASE WHEN p.PER_TYP IN (1, 2, 9) AND p.BODY_TYP BETWEEN 1 AND 49 THEN
    CASE WHEN p.REST_USE IN (1, 2, 3, 4, 8, 10, 11, 12, 97) THEN 'Restrained'
         WHEN p.REST_USE = 20 THEN 'Unrestrained'
         ELSE 'Unknown' END
  END AS restraint,
  CASE WHEN p.PER_TYP IN (1, 2, 9) AND p.BODY_TYP BETWEEN 80 AND 89 THEN
    CASE WHEN p.HELM_USE IN (5, 16, 19) THEN 'Helmet' WHEN p.HELM_USE = 17 THEN 'No helmet' ELSE 'Unknown' END
  END AS helmet,
  CASE WHEN p.EJECTION IN (1, 2, 3) THEN 'Ejected' WHEN p.EJECTION = 0 THEN 'Not ejected'
       WHEN p.PER_TYP IN (1, 2, 3, 9) THEN 'Unknown' END AS ejection,
  CASE WHEN p.PER_TYP IN (1, 2, 3, 9) THEN NULL
       WHEN p.LOCATION BETWEEN 1 AND 9 THEN 'At intersection'
       WHEN p.LOCATION IN (10, 11, 13) THEN 'Roadway, not at intersection'
       WHEN p.LOCATION IN (98, 99) THEN 'Unknown'
       ELSE 'Off the travel lanes (shoulder, sidewalk, median, driveway, lane, path)' END AS nonoccupant_location,
  CASE WHEN p.ALC_RES BETWEEN 0 AND 940 THEN p.ALC_RES / 1000.0 END AS tested_bac,
  CASE WHEN p.ALC_RES BETWEEN 0 AND 940 THEN 'Tested, result known'
       WHEN p.ALC_RES = 996 THEN 'Not tested'
       ELSE 'Tested result unknown or not reported' END AS bac_test_status,
  p.DRINKING = 1 AS police_reported_drinking,
  mp.bac08_share AS imputed_bac08_share,
  CASE WHEN p.LAG_HRS BETWEEN 0 AND 720 THEN p.LAG_HRS END AS hours_to_death
FROM per_raw p
LEFT JOIN mp ON mp.year = p.data_year AND mp.ST_CASE = p.ST_CASE AND mp.VEH_NO = p.VEH_NO AND mp.PER_NO = p.PER_NO;

-- 5. Exposure: vehicle-miles travelled (FHWA VM-2, millions) by state, year, rural/urban and functional system.
CREATE OR REPLACE TABLE ltools.fars.vmt AS
SELECT
  year,
  CASE WHEN state_name = 'U.S. Total' THEN 'United States' ELSE state_name END AS state_name,
  rural_urban,
  road_function_code,
  CASE WHEN road_function_code IN (1, 2) THEN 'Interstate or freeway'
       WHEN road_function_code IN (3, 4) THEN 'Arterial (not freeway)'
       WHEN road_function_code IN (5, 6) THEN 'Collector'
       ELSE 'Local road' END AS road_class,
  vmt_millions
FROM read_csv('fhwa/vm2_2019_2024.csv');

-- 6. Population: US Census county estimates, for per-resident rates. 2020-2024 are Vintage 2025 (copied from the
--    libraries dataset). 2019 is the Census 2010-2020 intercensal estimate for July 1, 2019 (consistent with the 2020
--    Census; the Vintage 2020 figure the libraries dataset holds is on the pre-2020-Census base and jumps by up to 5%
--    into 2020 in some states). File: census/cc-est2020int-agesex-all.csv from
--    https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/intercensal/county/asrh/ (downloaded
--    2026-10-20); YEAR code 11 = July 1, 2019 (code 12 = April 1, 2020, which matches the 2020 Census count). Its county
--    codes are the same 3,143 as the Vintage 2020 2019 rows. Names and state fields come from the libraries rows.
CREATE OR REPLACE TABLE ltools.fars.county_population AS
SELECT county_fips, state AS state_abbr, state_name, county_name, pop_year AS year, population, vintage,
  'Vintage 2025' AS estimate_series
FROM ltools.libraries.county_population
WHERE pop_year BETWEEN 2020 AND 2024
UNION ALL
SELECT l.county_fips, l.state, l.state_name, l.county_name, 2019, i.population, NULL, 'Intercensal 2010-2020'
FROM ltools.libraries.county_population l
JOIN (SELECT lpad(STATE, 2, '0') || lpad(COUNTY, 3, '0') AS county_fips, POPESTIMATE::BIGINT AS population
      FROM read_csv('census/cc-est2020int-agesex-all.csv', encoding = 'latin-1', all_varchar = true)
      WHERE YEAR = '11' AND STATE <> '72') i ON i.county_fips = l.county_fips
WHERE l.pop_year = 2019;

-- deaths_sq (sections 7, 8, 10) = sum over crashes of fatalities squared: the variance of a death count when crashes
--   occur at random and each kills one or more people (multi-death crashes make it larger than the count).
-- 7. Deaths and vehicle-miles on the same grain (year x state x rural/urban x road function), so a per-mile rate never
--    divides deaths by the wrong miles. 'United States' rows are the national sums. Deaths with unknown road function
--    or unknown rural/urban (490 in 2024) cannot be matched to miles and are left out of this table (they stay in crashes).
CREATE OR REPLACE TABLE ltools.fars.road_exposure AS
WITH d AS (
  SELECT year, state_name, rural_urban, road_function_code, sum(fatalities) AS deaths, sum(fatalities * fatalities) AS deaths_sq
  FROM ltools.fars.crashes
  WHERE rural_urban IN ('Rural', 'Urban') AND road_function_code BETWEEN 1 AND 7
  GROUP BY ALL
), d_all AS (
  SELECT * FROM d
  UNION ALL
  SELECT year, 'United States', rural_urban, road_function_code, sum(deaths), sum(deaths_sq) FROM d GROUP BY ALL
)
SELECT
  coalesce(v.year, d_all.year) AS year,
  coalesce(v.state_name, d_all.state_name) AS state_name,
  coalesce(v.rural_urban, d_all.rural_urban) AS rural_urban,
  coalesce(v.road_function_code, d_all.road_function_code) AS road_function_code,
  CASE coalesce(v.road_function_code, d_all.road_function_code)
    WHEN 1 THEN '1 Interstate' WHEN 2 THEN '2 Other freeway or expressway' WHEN 3 THEN '3 Other principal arterial'
    WHEN 4 THEN '4 Minor arterial' WHEN 5 THEN '5 Major collector' WHEN 6 THEN '6 Minor collector' ELSE '7 Local road' END AS road_function,
  CASE WHEN coalesce(v.road_function_code, d_all.road_function_code) IN (1, 2) THEN 'Interstate or freeway'
       WHEN coalesce(v.road_function_code, d_all.road_function_code) IN (3, 4) THEN 'Arterial (not freeway)'
       WHEN coalesce(v.road_function_code, d_all.road_function_code) IN (5, 6) THEN 'Collector'
       ELSE 'Local road' END AS road_class,
  coalesce(d_all.deaths, 0) AS deaths,
  coalesce(d_all.deaths_sq, 0) AS deaths_sq,
  coalesce(v.vmt_millions, 0) AS vmt_millions
FROM ltools.fars.vmt v
FULL JOIN d_all ON d_all.year = v.year AND d_all.state_name = v.state_name AND d_all.rural_urban = v.rural_urban
  AND d_all.road_function_code = v.road_function_code;

-- 7b. Known road-class coding breaks: the reference the model joins (one row per state, year pair, grain and class).
--     A break between consecutive years: a class's share of the state's classified deaths moves over 8 points
--     (two-proportion z over 3) while its share of VM-2 miles moves under 3 points, and the state's other classes move
--     at least half as many deaths the other way (deaths moved between classes, not a change on the road).
--     grain 'Road class' = the four classes (freeway, arterial, collector, local). grain 'Road group' = interstate or
--     freeway vs all other roads; there the offset condition is not used (with two groups a real rise on one side can hide
--     a move, Washington 2020-2021), so both groups are listed. Built from road_exposure (section 7). Same rule as
--     verify/coding_break_scan.sql's road-class check.
CREATE OR REPLACE TABLE ltools.fars.road_class_coding_breaks AS
WITH cls AS (
  SELECT 'Road class' AS grain, year, state_name, road_class, sum(deaths) AS d, sum(vmt_millions) AS v
  FROM ltools.fars.road_exposure WHERE state_name <> 'United States' GROUP BY ALL
  UNION ALL
  SELECT 'Road group', year, state_name,
    CASE WHEN road_class = 'Interstate or freeway' THEN 'Interstate or freeway' ELSE 'Other roads' END, sum(deaths), sum(vmt_millions)
  FROM ltools.fars.road_exposure WHERE state_name <> 'United States' GROUP BY ALL
), cls_s AS (
  SELECT *, d / sum(d) OVER (PARTITION BY grain, year, state_name) AS ds, v / sum(v) OVER (PARTITION BY grain, year, state_name) AS vs,
    sum(d) OVER (PARTITION BY grain, year, state_name) AS tot FROM cls
), pairs AS (
  SELECT a.grain, a.state_name, a.year AS year_from, b.year AS year_to, a.road_class, b.d - a.d AS deaths_change,
    (SELECT sum(greatest(-sign(b.d - a.d) * (b2.d - a2.d), 0)) FROM cls_s a2 JOIN cls_s b2 ON b2.grain = a2.grain
       AND b2.state_name = a2.state_name AND b2.road_class = a2.road_class AND b2.year = a2.year + 1
     WHERE a2.grain = a.grain AND a2.state_name = a.state_name AND a2.year = a.year AND a2.road_class <> a.road_class) AS offsetting_deaths,
    (b.ds - a.ds) / sqrt(((a.d + b.d) / (a.tot + b.tot)) * (1 - (a.d + b.d) / (a.tot + b.tot)) * (1 / a.tot + 1 / b.tot)) AS z_share,
    b.ds - a.ds AS death_share_change, b.vs - a.vs AS miles_share_change
  FROM cls_s a JOIN cls_s b ON b.grain = a.grain AND b.state_name = a.state_name AND b.road_class = a.road_class AND b.year = a.year + 1
)
SELECT state_name, year_from, year_to, grain, road_class,
  round(death_share_change, 4) AS death_share_change, round(miles_share_change, 4) AS miles_share_change, round(z_share, 2) AS z_share,
  deaths_change::INT AS deaths_change, offsetting_deaths::INT AS offsetting_deaths,
  road_class || ' share of deaths ' || CASE WHEN death_share_change > 0 THEN '+' ELSE '' END || round(100 * death_share_change, 1)
    || ' points, its share of VM-2 miles ' || CASE WHEN miles_share_change > 0 THEN '+' ELSE '' END || round(100 * miles_share_change, 1)
    || ' points (z ' || round(z_share, 1) || ')'
    || CASE grain WHEN 'Road class' THEN '; other classes moved ' || offsetting_deaths::INT || ' deaths the other way' ELSE '' END AS evidence
FROM pairs
WHERE abs(death_share_change) > 0.08 AND abs(miles_share_change) < 0.03 AND abs(z_share) > 3 AND (grain = 'Road group' OR offsetting_deaths >= 0.5 * abs(deaths_change))
ORDER BY grain, state_name, year_from, road_class;

-- 8. One row per state (and 'United States') per year: deaths, alcohol-impaired-driving deaths three ways, miles and
--    residents, for per-mile and per-resident rates and the 23 CFR 1300.23 impaired-driving tier. Run 7 and 7b first.
--    deaths_road_type_unknown: deaths with unknown road function or rural/urban (not in road_exposure); a coding break
--    shows here first (Missouri 2023-2024). Pedestrian deaths by state for per-resident pedestrian rates.
--    deaths_without_miles: deaths in road cells (rural/urban x road function) where FHWA's VM-2 shows no miles ('-');
--    their miles are missing from vmt_millions, so per-mile rates leave them out of the numerator (181 deaths over
--    2019-2024, 115 of them in 2021; none in North Carolina). Built from road_exposure (section 7), so run 7 first.
CREATE OR REPLACE TABLE ltools.fars.state_years AS
WITH d AS (
  SELECT year, state_name, sum(fatalities) AS deaths, sum(fatalities * fatalities) AS deaths_sq,
    sum(fatalities * ai_share) AS alcohol_impaired_deaths,
    sum(fatalities) FILTER (WHERE tested_driver_bac_08) AS alcohol_deaths_tested_only,
    sum(fatalities) FILTER (WHERE police_reported_drinking_driver) AS alcohol_deaths_police_reported,
    sum(fatalities) FILTER (WHERE NOT (rural_urban IN ('Rural', 'Urban') AND road_function_code BETWEEN 1 AND 7)) AS deaths_road_type_unknown
  FROM ltools.fars.crashes GROUP BY ALL
), d_all AS (
  SELECT * FROM d
  UNION ALL
  SELECT year, 'United States', sum(deaths), sum(deaths_sq), sum(alcohol_impaired_deaths), sum(alcohol_deaths_tested_only), sum(alcohol_deaths_police_reported), sum(deaths_road_type_unknown) FROM d GROUP BY ALL
), ped_s AS (
  SELECT cr.year, cr.state_name, count(*) AS pedestrian_deaths,
    count(*) FILTER (WHERE cr.light_condition LIKE 'Dark%') AS pedestrian_deaths_dark,
    count(*) FILTER (WHERE cr.light_condition LIKE 'Dark%' AND cr.road_class = 'Arterial (not freeway)') AS pedestrian_deaths_dark_arterial
  FROM ltools.fars.persons pe JOIN ltools.fars.crashes cr ON cr.crash_key = pe.crash_key
  WHERE pe.is_killed AND pe.road_user = 'Pedestrian' GROUP BY ALL
), ped AS (
  SELECT * FROM ped_s
  UNION ALL
  SELECT year, 'United States', sum(pedestrian_deaths), sum(pedestrian_deaths_dark), sum(pedestrian_deaths_dark_arterial) FROM ped_s GROUP BY ALL
), v AS (
  SELECT year, state_name, sum(vmt_millions) AS vmt_millions FROM ltools.fars.vmt GROUP BY ALL
), nm_s AS (
  SELECT year, state_name, sum(deaths) AS deaths_without_miles, sum(deaths_sq) AS deaths_sq_without_miles
  FROM ltools.fars.road_exposure WHERE vmt_millions = 0 AND deaths > 0 AND state_name <> 'United States' GROUP BY ALL
), nm AS (
  SELECT * FROM nm_s
  UNION ALL
  SELECT year, 'United States', sum(deaths_without_miles), sum(deaths_sq_without_miles) FROM nm_s GROUP BY ALL
), mix AS (
  -- Road-class coding check: a class holding 15%+ of the state's miles but under 1% of its classified deaths (Hawaii
  -- 2019, 2021, 2023, 2024 codes almost no collector or local deaths; DC 2022 local). Such a state-year's class rates
  -- move deaths between classes, so the model does not test or rank them.
  SELECT year, state_name, bool_or(vshare >= 0.15 AND dshare < 0.01) AS road_class_mix_suspect
  FROM (SELECT year, state_name, road_class,
          sum(deaths) / sum(sum(deaths)) OVER (PARTITION BY year, state_name) AS dshare,
          sum(vmt_millions) / sum(sum(vmt_millions)) OVER (PARTITION BY year, state_name) AS vshare
        FROM ltools.fars.road_exposure WHERE state_name <> 'United States' GROUP BY year, state_name, road_class)
  GROUP BY ALL
), brk AS (
  -- Road-class coding breaks (four classes) from the reference table built in section 7b.
  SELECT state_name, string_agg(DISTINCT year_from || '-' || year_to, ', ' ORDER BY year_from || '-' || year_to) AS road_class_coding_breaks
  FROM ltools.fars.road_class_coding_breaks WHERE grain = 'Road class' GROUP BY state_name
), p AS (
  SELECT year, state_name, sum(population) AS population FROM ltools.fars.county_population GROUP BY ALL
  UNION ALL
  SELECT year, 'United States', sum(population) FROM ltools.fars.county_population GROUP BY ALL
)
SELECT d_all.state_name || '-' || d_all.year AS state_year_key,
  d_all.year, d_all.state_name, d_all.deaths, d_all.deaths_sq, d_all.alcohol_impaired_deaths, coalesce(d_all.alcohol_deaths_tested_only, 0) AS alcohol_deaths_tested_only,
  coalesce(d_all.alcohol_deaths_police_reported, 0) AS alcohol_deaths_police_reported, v.vmt_millions, p.population,
  coalesce(nm.deaths_without_miles, 0) AS deaths_without_miles, coalesce(nm.deaths_sq_without_miles, 0) AS deaths_sq_without_miles,
  coalesce(d_all.deaths_road_type_unknown, 0) AS deaths_road_type_unknown,
  coalesce(ped.pedestrian_deaths, 0) AS pedestrian_deaths, coalesce(ped.pedestrian_deaths_dark, 0) AS pedestrian_deaths_dark,
  coalesce(ped.pedestrian_deaths_dark_arterial, 0) AS pedestrian_deaths_dark_arterial,
  coalesce(mix.road_class_mix_suspect, false) AS road_class_mix_suspect,
  brk.road_class_coding_breaks
FROM d_all
LEFT JOIN brk ON brk.state_name = d_all.state_name
LEFT JOIN mix ON mix.year = d_all.year AND mix.state_name = d_all.state_name
LEFT JOIN ped ON ped.year = d_all.year AND ped.state_name = d_all.state_name
LEFT JOIN v ON v.year = d_all.year AND v.state_name = d_all.state_name
LEFT JOIN nm ON nm.year = d_all.year AND nm.state_name = d_all.state_name
LEFT JOIN p ON p.year = d_all.year AND p.state_name = d_all.state_name;

-- 9. North Carolina speeding-related deaths as NCDOT publishes them (state crash data, officer-reported speeding as a
--    contributing circumstance), read from NCDOT's annual "Speeding in N.C." fact sheets
--    (https://connect.ncdot.gov/resources/safety/Documents/Crash%20Data%20and%20Information/<year>%20Speeding%20Fact%20Sheet.pdf,
--    read 2026-10-20), beside FARS's speeding-related deaths and deaths in crashes with a vehicle recorded 10+ mph over the limit.
CREATE OR REPLACE TABLE ltools.fars.nc_speeding_definitions AS
WITH ncdot(year, ncdot_speed_related_deaths, ncdot_sheet_updated) AS (VALUES
  (2019, 377, DATE '2020-06-03'), (2020, 416, DATE '2021-07-07'), (2021, 428, DATE '2022-05-27'),
  (2022, 426, DATE '2023-06-02'), (2023, 391, DATE '2024-07-24'), (2024, 378, DATE '2025-07-23'))
SELECT c.year,
  sum(c.fatalities) AS deaths,
  sum(c.fatalities) FILTER (WHERE c.speeding_related) AS fars_speeding_related_deaths,
  sum(c.fatalities) FILTER (WHERE c.vehicle_10_over_limit) AS deaths_vehicle_10_over_limit,
  any_value(n.ncdot_speed_related_deaths) AS ncdot_speed_related_deaths,
  any_value(n.ncdot_sheet_updated) AS ncdot_sheet_updated
FROM ltools.fars.crashes c JOIN ncdot n ON n.year = c.year
WHERE c.state_name = 'North Carolina'
GROUP BY c.year;

-- 10. One row per county per year: deaths, pedestrian deaths (all, in the dark, in the dark on non-freeway arterials),
--     alcohol-impaired-driving deaths (imputed) and residents, for per-resident county rates (there are no county miles).
--     Built from the shaped tables above, so it can be rebuilt alone. Deaths whose county is unknown (0-4 a year) are left
--     out. FARS keeps Shannon County SD as 46113; Census renamed it Oglala Lakota (46102) in 2015, same area: mapped here.
--     Left without residents (population null), with geography_note saying why: Connecticut 2020-2024 (Census uses nine
--     planning regions, FARS the eight old counties, about 300 deaths a year: both sets of rows are kept, neither has
--     residents, so Connecticut has no county rates for those years) and county codes with deaths but no Census
--     population (Alaska's retired 02201, 02261 Valdez-Cordova and 02270). State-level rates are in state_years.
CREATE OR REPLACE TABLE ltools.fars.county_years AS
WITH c AS (
  SELECT year, state_name,
    CASE WHEN county_fips = '46113' THEN '46102' ELSE county_fips END AS county_fips,
    any_value(county_name) AS fars_county_name,
    sum(fatalities) AS deaths,
    sum(fatalities * fatalities) AS deaths_sq,
    sum(fatalities * ai_share) AS alcohol_impaired_deaths
  FROM ltools.fars.crashes WHERE county_name IS NOT NULL GROUP BY ALL
), p AS (
  SELECT cr.year, cr.state_name,
    CASE WHEN cr.county_fips = '46113' THEN '46102' ELSE cr.county_fips END AS county_fips,
    count(*) AS pedestrian_deaths,
    count(*) FILTER (WHERE cr.light_condition LIKE 'Dark%') AS pedestrian_deaths_dark,
    count(*) FILTER (WHERE cr.light_condition LIKE 'Dark%' AND cr.road_class = 'Arterial (not freeway)') AS pedestrian_deaths_dark_arterial
  FROM ltools.fars.persons pe JOIN ltools.fars.crashes cr ON cr.crash_key = pe.crash_key
  WHERE pe.is_killed AND pe.road_user = 'Pedestrian' AND cr.county_name IS NOT NULL GROUP BY ALL
)
SELECT
  coalesce(pop.year, c.year) AS year,
  coalesce(pop.state_name, c.state_name) AS state_name,
  coalesce(pop.county_fips, c.county_fips) AS county_fips,
  coalesce(pop.county_name, c.fars_county_name) AS county_name,
  CASE WHEN coalesce(pop.state_name, c.state_name) = 'Connecticut' AND coalesce(pop.year, c.year) >= 2020 THEN NULL
       ELSE pop.population END AS population,
  CASE WHEN coalesce(pop.state_name, c.state_name) = 'Connecticut' AND coalesce(pop.year, c.year) >= 2020
         THEN 'Not comparable: Census planning regions vs FARS counties (Connecticut 2020-2024)'
       WHEN pop.population IS NULL THEN 'No Census population for this county code'
       END AS geography_note,
  coalesce(c.deaths, 0) AS deaths,
  coalesce(c.deaths_sq, 0) AS deaths_sq,
  coalesce(p.pedestrian_deaths, 0) AS pedestrian_deaths,
  coalesce(p.pedestrian_deaths_dark, 0) AS pedestrian_deaths_dark,
  coalesce(p.pedestrian_deaths_dark_arterial, 0) AS pedestrian_deaths_dark_arterial,
  coalesce(c.alcohol_impaired_deaths, 0) AS alcohol_impaired_deaths
FROM ltools.fars.county_population pop
FULL JOIN c ON c.year = pop.year AND c.county_fips = pop.county_fips
LEFT JOIN p ON p.year = coalesce(pop.year, c.year) AND p.county_fips = coalesce(pop.county_fips, c.county_fips);

-- ===== Sections 11-15 (2026-10-23): inferences from the verified inference list (fars/INFERENCES.md) =====
-- Each section is rebuildable alone after the raw staging block at the top and sections 2-4 and 8 (it reads crashes,
-- persons, vehicles, state_years). Run order: 11, 12, 13, 14, 15.

-- 11. Field coverage: one row per state x year x rural/urban, with the counts needed to see how completely each state
--     fills a field before comparing states on it. Weather (WEATHER 98, 99 = unknown or not reported); EMS times
--     (crash, notification, arrival, hospital; hour or minute 88, 97, 98, 99 = missing) as signed intervals wrapped across
--     midnight, ((b - a + 2160) % 1440) - 720, so a notification 3 minutes before the crash reads -3, not 1,437; belt use of
--     killed passenger-vehicle occupants (persons.restraint); recorded travel speed (vehicles.travel_speed_mph); drug
--     testing of killed drivers (person DSTATUS 2 = test given; DRUGS 1 = police-reported drug involvement; Drugs file
--     lab result positive: 2019-2021 codes 100-996 or 998, 2022+ codes 100-9994, 9996 or 9998, i.e. any drug including
--     medicines, and the list changed in 2022); driver distraction (one row per driver with a driver present, Distract
--     code 16 dropped; unknown = every code is 96 not reported or 99 reported as unknown if distracted; phone = codes 5, 6,
--     15); violations charged for surviving drivers tested at .08+ (any Violatn code other than 0 none, 95 no driver,
--     97 not reported, 99 unknown; unknown = every code is 97 or 99). An unknown is not a usable value (review 10 B1).
CREATE OR REPLACE TABLE ltools.fars.state_field_coverage AS
WITH a AS (
  SELECT YEAR AS year, YEAR * 1000000 + ST_CASE AS crash_key, STATENAME AS state_name,
    CASE RUR_URB WHEN 1 THEN 'Rural' WHEN 2 THEN 'Urban' ELSE 'Unknown or not reported' END AS rural_urban,
    FATALS AS fatalities, WEATHER AS weather_code, VE_FORMS AS vehicles_in_transport, LGT_COND AS light_code,
    CASE WHEN HOUR BETWEEN 0 AND 23 AND MINUTE BETWEEN 0 AND 59 THEN HOUR * 60 + MINUTE END AS t_crash,
    CASE WHEN NOT_HOUR BETWEEN 0 AND 23 AND NOT_MIN BETWEEN 0 AND 59 THEN NOT_HOUR * 60 + NOT_MIN END AS t_notified,
    CASE WHEN ARR_HOUR BETWEEN 0 AND 23 AND ARR_MIN BETWEEN 0 AND 59 THEN ARR_HOUR * 60 + ARR_MIN END AS t_arrived,
    CASE WHEN HOSP_HR BETWEEN 0 AND 23 AND HOSP_MN BETWEEN 0 AND 59 THEN HOSP_HR * 60 + HOSP_MN END AS t_hospital,
    HOSP_HR = 88 AS not_transported
  FROM acc_raw
), e AS (
  SELECT *, ((t_notified - t_crash + 2160) % 1440) - 720 AS crash_to_notified,
    ((t_arrived - t_notified + 2160) % 1440) - 720 AS notified_to_arrived,
    ((t_hospital - t_crash + 2160) % 1440) - 720 AS crash_to_hospital
  FROM a
), c AS (
  SELECT year, state_name, rural_urban,
    count(*) AS crashes, sum(fatalities) AS deaths,
    count(*) FILTER (WHERE weather_code IN (98, 99)) AS crashes_weather_unknown,
    coalesce(sum(fatalities) FILTER (WHERE weather_code IN (98, 99)), 0) AS deaths_weather_unknown,
    coalesce(sum(fatalities) FILTER (WHERE weather_code IN (2, 3, 4, 11, 12)), 0) AS deaths_precipitation,
    count(*) FILTER (WHERE notified_to_arrived BETWEEN 0 AND 720) AS crashes_response_time_valid,
    count(*) FILTER (WHERE notified_to_arrived BETWEEN 20 AND 720) AS crashes_response_20_plus,
    count(*) FILTER (WHERE crash_to_notified IS NOT NULL) AS crashes_notification_time_valid,
    count(*) FILTER (WHERE crash_to_notified < 0) AS crashes_notified_before_crash,
    count(*) FILTER (WHERE crash_to_notified BETWEEN 30 AND 720) AS crashes_notified_30_plus,
    count(*) FILTER (WHERE crash_to_notified IS NOT NULL AND vehicles_in_transport = 1 AND light_code IN (2, 3, 6)) AS dark_single_vehicle_notification_valid,
    count(*) FILTER (WHERE crash_to_notified BETWEEN 30 AND 720 AND vehicles_in_transport = 1 AND light_code IN (2, 3, 6)) AS dark_single_vehicle_notified_30_plus,
    count(*) FILTER (WHERE NOT coalesce(not_transported, false)) AS crashes_not_coded_untransported,
    count(*) FILTER (WHERE NOT coalesce(not_transported, false) AND crash_to_hospital BETWEEN 0 AND 720) AS crashes_hospital_time_valid,
    count(*) FILTER (WHERE NOT coalesce(not_transported, false) AND crash_to_hospital BETWEEN 60 AND 720) AS crashes_hospital_60_plus
  FROM e GROUP BY ALL
), pv AS (
  SELECT cr.year, cr.state_name, cr.rural_urban,
    count(*) AS killed_pv_occupants,
    count(*) FILTER (WHERE pe.restraint = 'Unrestrained') AS killed_pv_unrestrained,
    count(*) FILTER (WHERE pe.restraint = 'Unknown') AS killed_pv_restraint_unknown
  FROM ltools.fars.persons pe JOIN ltools.fars.crashes cr ON cr.crash_key = pe.crash_key
  WHERE pe.is_killed AND pe.restraint IS NOT NULL GROUP BY ALL
), sp AS (
  SELECT cr.year, cr.state_name, cr.rural_urban, count(*) AS vehicles, count(ve.travel_speed_mph) AS vehicles_speed_recorded
  FROM ltools.fars.vehicles ve JOIN ltools.fars.crashes cr ON cr.crash_key = ve.crash_key GROUP BY ALL
), lab AS (
  SELECT data_year AS year, ST_CASE, VEH_NO, PER_NO,
    bool_or(CASE WHEN data_year <= 2021 THEN DRUGRES BETWEEN 100 AND 996 OR DRUGRES = 998
                 ELSE DRUGRES BETWEEN 100 AND 9994 OR DRUGRES IN (9996, 9998) END) AS lab_positive
  FROM drugs_raw GROUP BY ALL
), kd AS (
  SELECT cr.year, cr.state_name, cr.rural_urban,
    count(*) AS killed_drivers,
    count(*) FILTER (WHERE p.DSTATUS = 2) AS killed_drivers_drug_tested,
    count(*) FILTER (WHERE p.DRUGS = 1) AS killed_drivers_drugs_police_reported,
    count(*) FILTER (WHERE p.DSTATUS = 2 AND lab.lab_positive) AS killed_drivers_drug_lab_positive
  FROM per_raw p
  JOIN ltools.fars.crashes cr ON cr.crash_key = p.data_year * 1000000 + p.ST_CASE
  LEFT JOIN lab ON lab.year = p.data_year AND lab.ST_CASE = p.ST_CASE AND lab.VEH_NO = p.VEH_NO AND lab.PER_NO = p.PER_NO
  WHERE p.PER_TYP = 1 AND p.INJ_SEV = 4 GROUP BY ALL
), dis AS (
  SELECT data_year * 1000000 + ST_CASE AS crash_key, VEH_NO, list(coalesce(DRDISTRACT, MDRDSTRD)) AS codes
  FROM distract_raw GROUP BY ALL
), dd AS (
  SELECT cr.year, cr.state_name, cr.rural_urban,
    count(*) AS drivers_distraction_rows,
    count(*) FILTER (WHERE list_has_all([96, 99], dis.codes)) AS drivers_distraction_unknown,
    count(*) FILTER (WHERE list_has_any(dis.codes, [5, 6, 15])) AS drivers_phone_distraction
  FROM dis JOIN ltools.fars.crashes cr ON cr.crash_key = dis.crash_key
  WHERE NOT list_contains(dis.codes, 16) GROUP BY ALL
), vio AS (
  SELECT data_year AS year, ST_CASE, VEH_NO, list(coalesce(VIOLATION, MVIOLATN)) AS codes FROM violatn_raw GROUP BY ALL
), sd AS (
  SELECT cr.year, cr.state_name, cr.rural_urban,
    count(*) AS surviving_drivers_08,
    count(*) FILTER (WHERE NOT list_has_all([0, 95, 97, 99], vio.codes)) AS surviving_drivers_08_charged,
    count(*) FILTER (WHERE list_has_all([97, 99], vio.codes)) AS surviving_drivers_08_charges_unknown
  FROM per_raw p
  JOIN vio ON vio.year = p.data_year AND vio.ST_CASE = p.ST_CASE AND vio.VEH_NO = p.VEH_NO
  JOIN ltools.fars.crashes cr ON cr.crash_key = p.data_year * 1000000 + p.ST_CASE
  WHERE p.PER_TYP = 1 AND p.INJ_SEV <> 4 AND p.ALC_RES BETWEEN 80 AND 940 GROUP BY ALL
)
SELECT c.state_name || '-' || c.year AS state_year_key, c.*,
  coalesce(pv.killed_pv_occupants, 0) AS killed_pv_occupants, coalesce(pv.killed_pv_unrestrained, 0) AS killed_pv_unrestrained,
  coalesce(pv.killed_pv_restraint_unknown, 0) AS killed_pv_restraint_unknown,
  coalesce(sp.vehicles, 0) AS vehicles, coalesce(sp.vehicles_speed_recorded, 0) AS vehicles_speed_recorded,
  coalesce(kd.killed_drivers, 0) AS killed_drivers, coalesce(kd.killed_drivers_drug_tested, 0) AS killed_drivers_drug_tested,
  coalesce(kd.killed_drivers_drugs_police_reported, 0) AS killed_drivers_drugs_police_reported,
  coalesce(kd.killed_drivers_drug_lab_positive, 0) AS killed_drivers_drug_lab_positive,
  coalesce(dd.drivers_distraction_rows, 0) AS drivers, coalesce(dd.drivers_distraction_unknown, 0) AS drivers_distraction_unknown,
  coalesce(dd.drivers_phone_distraction, 0) AS drivers_phone_distraction,
  coalesce(sd.surviving_drivers_08, 0) AS surviving_drivers_08, coalesce(sd.surviving_drivers_08_charged, 0) AS surviving_drivers_08_charged,
  coalesce(sd.surviving_drivers_08_charges_unknown, 0) AS surviving_drivers_08_charges_unknown
FROM c
LEFT JOIN pv USING (year, state_name, rural_urban)
LEFT JOIN sp USING (year, state_name, rural_urban)
LEFT JOIN kd USING (year, state_name, rural_urban)
LEFT JOIN dd USING (year, state_name, rural_urban)
LEFT JOIN sd USING (year, state_name, rural_urban);

-- 12. Holidays against matched ordinary days (national). One row per holiday occurrence x time window x compared date.
--     Holidays by rule, 2019-2024: New Year's Day, Independence Day (July 4), Memorial Day (last Monday of May) and the
--     Sunday before, Labor Day (first Monday of September) and the Sunday before, Thanksgiving (fourth Thursday of
--     November) with the Wednesday before and the Friday, Saturday and Sunday after, Christmas Eve, Christmas Day, New
--     Year's Eve. Matched days: the same weekday 1, 2 and 3 weeks before and after, leaving out every holiday date above;
--     for Memorial Day and Labor Day also the Sundays 1-3 weeks either side of the Sunday before. Each matched row carries
--     weight 1/n (n = matched dates for that occurrence), so a sum of deaths x weight is the matched average per date.
--     Windows: whole date (all hours, unknown hour included); daytime 6 am-5:59 pm; the date's night (midnight-5:59 am and
--     6 pm-11:59 pm of the same date); overnight from 6 pm to 5:59 am next morning, keyed to the evening's date (the
--     Thanksgiving-eve window). Hour 99 is left out of the hour windows. Overnight windows that need 2018-12-31 or
--     2025-01-01 hours are not built (New Year's Eve 2024 has no overnight row). Alcohol deaths = fatalities x the share of
--     NHTSA's ten imputations with a driver at .08+ (crashes.ai_share); sober-crash deaths = the rest.
--     Chance band: the six-year pooled ratio (date deaths / matched average) for every ordinary month-day that is at
--     least 4 days from any holiday in all six years and whose matched dates fall inside 2019-2024 (2019-01-22 to
--     2024-12-10); band_* = its 2.5th and 97.5th percentiles, per window and for all, alcohol and sober-crash deaths.
--     band5_* = the same for five-year pools (2019-2023), used when only five holidays are in a query (New Year's Eve
--     overnight, which has no 2024 row).
--     Daily counts vary 1.7 times as much as Poisson, so the band is used instead of a Poisson test.
CREATE OR REPLACE TABLE ltools.fars.holiday_comparison AS
WITH cr AS (
  SELECT make_date(a.YEAR, a.MONTH, a.DAY) AS crash_date, CASE WHEN a.HOUR BETWEEN 0 AND 23 THEN a.HOUR END AS hour,
    a.FATALS AS fatalities, c.ai_share
  FROM acc_raw a JOIN ltools.fars.crashes c ON c.crash_key = a.YEAR * 1000000 + a.ST_CASE
), w AS (
  SELECT 'Whole date' AS time_window, crash_date AS window_date, * FROM cr
  UNION ALL SELECT 'Daytime (6am-5:59pm)', crash_date, * FROM cr WHERE hour BETWEEN 6 AND 17
  UNION ALL SELECT 'Night of the date (midnight-5:59am and 6pm-11:59pm)', crash_date, * FROM cr WHERE hour < 6 OR hour >= 18
  UNION ALL SELECT 'Overnight from 6pm (to 5:59am next day)', CASE WHEN hour >= 18 THEN crash_date ELSE crash_date - 1 END, *
    FROM cr WHERE hour < 6 OR hour >= 18
), cal AS (
  SELECT tw.time_window, CAST(g AS DATE) AS window_date
  FROM generate_series(DATE '2019-01-01', DATE '2024-12-31', INTERVAL 1 DAY) t(g),
    (SELECT DISTINCT time_window FROM w) tw
  WHERE NOT (tw.time_window LIKE 'Overnight%' AND CAST(g AS DATE) = DATE '2024-12-31')
), dw AS (
  SELECT cal.time_window, cal.window_date, coalesce(sum(w.fatalities), 0) AS deaths,
    coalesce(sum(w.fatalities * w.fatalities), 0) AS deaths_sq,
    coalesce(sum(w.fatalities * w.ai_share), 0) AS alcohol_deaths, coalesce(sum(w.fatalities * (1 - w.ai_share)), 0) AS sober_deaths
  FROM cal LEFT JOIN w ON w.time_window = cal.time_window AND w.window_date = cal.window_date GROUP BY ALL
), base AS (
  SELECT yr, make_date(yr, 5, 31) - CAST((dayofweek(make_date(yr, 5, 31)) + 6) % 7 AS INT) AS memorial,
    make_date(yr, 9, 1) + CAST((8 - dayofweek(make_date(yr, 9, 1))) % 7 AS INT) AS labor,
    make_date(yr, 11, 1) + CAST((4 - dayofweek(make_date(yr, 11, 1)) + 7) % 7 AS INT) + 21 AS thanksgiving
  FROM (SELECT unnest(range(2019, 2025)) AS yr)
), hol AS (
  SELECT yr, 'New Year''s Day' AS holiday, make_date(yr, 1, 1) AS holiday_date FROM base
  UNION ALL SELECT yr, 'Independence Day (July 4)', make_date(yr, 7, 4) FROM base
  UNION ALL SELECT yr, 'Memorial Day', memorial FROM base
  UNION ALL SELECT yr, 'Sunday before Memorial Day', memorial - 1 FROM base
  UNION ALL SELECT yr, 'Labor Day', labor FROM base
  UNION ALL SELECT yr, 'Sunday before Labor Day', labor - 1 FROM base
  UNION ALL SELECT yr, 'Thanksgiving Wednesday', thanksgiving - 1 FROM base
  UNION ALL SELECT yr, 'Thanksgiving Day', thanksgiving FROM base
  UNION ALL SELECT yr, 'Friday after Thanksgiving', thanksgiving + 1 FROM base
  UNION ALL SELECT yr, 'Saturday after Thanksgiving', thanksgiving + 2 FROM base
  UNION ALL SELECT yr, 'Sunday after Thanksgiving', thanksgiving + 3 FROM base
  UNION ALL SELECT yr, 'Christmas Eve', make_date(yr, 12, 24) FROM base
  UNION ALL SELECT yr, 'Christmas Day', make_date(yr, 12, 25) FROM base
  UNION ALL SELECT yr, 'New Year''s Eve', make_date(yr, 12, 31) FROM base
), excl AS (SELECT DISTINCT holiday_date FROM hol
), offs AS (SELECT unnest([-21, -14, -7, 7, 14, 21]) AS k
), cmp AS (
  SELECT h.holiday, h.yr, h.holiday_date, 'Holiday' AS day_role, h.holiday_date AS compared_date FROM hol h
  UNION ALL
  SELECT h.holiday, h.yr, h.holiday_date, 'Same weekday, 1-3 weeks either side', h.holiday_date + o.k FROM hol h, offs o
  WHERE h.holiday_date + o.k NOT IN (SELECT holiday_date FROM excl)
  UNION ALL
  SELECT h.holiday, h.yr, h.holiday_date, 'Sunday, 1-3 weeks either side', h.holiday_date - 1 + o.k FROM hol h, offs o
  WHERE h.holiday IN ('Memorial Day', 'Labor Day') AND h.holiday_date - 1 + o.k NOT IN (SELECT holiday_date FROM excl)
), rows_ AS (
  SELECT cmp.holiday, cmp.yr AS holiday_year, cmp.holiday_date, dw.time_window, cmp.day_role, cmp.compared_date,
    dw.deaths, dw.deaths_sq, dw.alcohol_deaths, dw.sober_deaths
  FROM cmp JOIN dw ON dw.window_date = cmp.compared_date
  -- a matched date only counts when the holiday's own window exists (New Year's Eve 2024 overnight does not)
  WHERE EXISTS (SELECT 1 FROM dw d2 WHERE d2.time_window = dw.time_window AND d2.window_date = cmp.holiday_date)
), ordd AS (
  SELECT dw.time_window, dw.window_date, dw.deaths, dw.alcohol_deaths, dw.sober_deaths,
    avg(b.deaths) AS b_deaths, avg(b.alcohol_deaths) AS b_alcohol, avg(b.sober_deaths) AS b_sober
  FROM dw, offs o, dw b
  WHERE b.time_window = dw.time_window AND b.window_date = dw.window_date + o.k AND b.window_date NOT IN (SELECT holiday_date FROM excl)
    AND dw.window_date BETWEEN DATE '2019-01-22' AND DATE '2024-12-10'
    AND NOT EXISTS (SELECT 1 FROM hol h WHERE abs(datediff('day', h.holiday_date, dw.window_date)) <= 3)
  GROUP BY ALL
), ordmd AS (
  SELECT time_window, month(window_date) AS m, day(window_date) AS d,
    sum(deaths) / sum(b_deaths) AS r, sum(alcohol_deaths) / sum(b_alcohol) AS ra, sum(sober_deaths) / sum(b_sober) AS rs
  FROM ordd GROUP BY ALL HAVING count(*) = 6
), band AS (
  SELECT time_window, count(*) AS band_ordinary_dates,
    quantile_cont(r, 0.025) AS band_low, quantile_cont(r, 0.975) AS band_high,
    quantile_cont(ra, 0.025) AS band_alcohol_low, quantile_cont(ra, 0.975) AS band_alcohol_high,
    quantile_cont(rs, 0.025) AS band_sober_low, quantile_cont(rs, 0.975) AS band_sober_high
  FROM ordmd GROUP BY ALL
), ordmd5 AS (
  SELECT time_window, month(window_date) AS m, day(window_date) AS d,
    sum(deaths) / sum(b_deaths) AS r, sum(alcohol_deaths) / sum(b_alcohol) AS ra, sum(sober_deaths) / sum(b_sober) AS rs
  FROM ordd WHERE year(window_date) <= 2023 GROUP BY ALL HAVING count(*) = 5
), band5 AS (
  SELECT time_window, quantile_cont(r, 0.025) AS band5_low, quantile_cont(r, 0.975) AS band5_high,
    quantile_cont(ra, 0.025) AS band5_alcohol_low, quantile_cont(ra, 0.975) AS band5_alcohol_high,
    quantile_cont(rs, 0.025) AS band5_sober_low, quantile_cont(rs, 0.975) AS band5_sober_high
  FROM ordmd5 GROUP BY ALL
)
SELECT r.holiday, r.holiday_year, r.holiday_date, r.time_window, r.day_role, r.compared_date,
  CASE WHEN r.day_role = 'Holiday' THEN 1.0
       ELSE 1.0 / count(*) OVER (PARTITION BY r.holiday, r.holiday_year, r.time_window, r.day_role) END AS date_weight,
  r.deaths, r.deaths_sq, r.alcohol_deaths, r.sober_deaths,
  b.band_ordinary_dates, b.band_low, b.band_high, b.band_alcohol_low, b.band_alcohol_high, b.band_sober_low, b.band_sober_high,
  b5.band5_low, b5.band5_high, b5.band5_alcohol_low, b5.band5_alcohol_high, b5.band5_sober_low, b5.band5_sober_high
FROM rows_ r JOIN band b USING (time_window) JOIN band5 b5 USING (time_window);

-- 13. Two-vehicle crashes, one row per year x state x this vehicle's class x the other vehicle's class: crashes with
--     exactly two vehicles in transport (VE_FORMS = 2) and no one outside the two vehicles killed. Each crash appears
--     twice, once from each vehicle. Deaths = occupants (PER_TYP 1, 2, 9) with INJ_SEV 4. vehicle_class splits NHTSA body
--     type 67 (pickup over 10,000 lb gross vehicle weight, "Class 3" and up) out of the large-truck group (60-79) and
--     out of the pickup range (30-39), where neither grouping shows it.
CREATE OR REPLACE TABLE ltools.fars.two_vehicle_crashes AS
WITH vk AS (
  SELECT v.data_year AS year, v.ST_CASE, v.VEH_NO,
    CASE WHEN v.BODY_TYP BETWEEN 1 AND 13 OR v.BODY_TYP = 17 THEN 'Passenger car'
         WHEN v.BODY_TYP IN (14, 15, 16, 19) THEN 'SUV'
         WHEN v.BODY_TYP BETWEEN 20 AND 29 THEN 'Van'
         WHEN v.BODY_TYP BETWEEN 30 AND 39 THEN 'Pickup (up to 10,000 lb)'
         WHEN v.BODY_TYP BETWEEN 40 AND 49 THEN 'Other light truck'
         WHEN v.BODY_TYP BETWEEN 50 AND 59 THEN 'Bus'
         WHEN v.BODY_TYP = 67 THEN 'Heavy pickup (over 10,000 lb)'
         WHEN v.BODY_TYP BETWEEN 60 AND 79 THEN 'Large truck (not a pickup)'
         WHEN v.BODY_TYP BETWEEN 80 AND 89 THEN 'Motorcycle or moped'
         ELSE 'Other or unknown' END AS vehicle_class,
    count(p.PER_NO) FILTER (WHERE p.INJ_SEV = 4) AS killed
  FROM veh_raw v
  LEFT JOIN per_raw p ON p.data_year = v.data_year AND p.ST_CASE = v.ST_CASE AND p.VEH_NO = v.VEH_NO AND p.PER_TYP IN (1, 2, 9)
  GROUP BY ALL
), two AS (
  SELECT a.YEAR AS year, a.ST_CASE, a.STATENAME AS state_name FROM acc_raw a
  WHERE a.VE_FORMS = 2 AND NOT EXISTS (SELECT 1 FROM per_raw p WHERE p.data_year = a.YEAR AND p.ST_CASE = a.ST_CASE
    AND p.PER_TYP NOT IN (1, 2, 9) AND p.INJ_SEV = 4)
)
SELECT two.year, two.state_name, x.vehicle_class, y.vehicle_class AS other_vehicle_class,
  count(*) AS vehicles, sum(x.killed) AS own_occupant_deaths, sum(y.killed) AS other_vehicle_deaths
FROM two
JOIN vk x ON x.year = two.year AND x.ST_CASE = two.ST_CASE
JOIN vk y ON y.year = two.year AND y.ST_CASE = two.ST_CASE AND y.VEH_NO <> x.VEH_NO
GROUP BY ALL;

-- 14. Drivers' licence state and driving records, one row per state x year (crash state). A crash has an out-of-state
--     driver when any driver present (DR_PRES 1) holds a licence from another US state (L_STATE 1-56, not the crash
--     state; foreign 95-97 and unknown 0, 57, 98, 99 are not counted as out of state). Licence state is not residence.
--     Records (PREV_SPD speeding convictions, PREV_OTH other moving convictions, PREV_DWI impaired-driving convictions, in
--     the five years before the crash) are counted for drivers licensed in the crash state with both PREV_SPD and PREV_OTH
--     under 99 (99 = unknown, 998 = no driver).
CREATE OR REPLACE TABLE ltools.fars.driver_licence_by_state_year AS
WITH oos AS (
  SELECT a.YEAR AS year, a.ST_CASE, a.STATENAME AS state_name, a.FATALS AS fatalities,
    coalesce(bool_or(v.DR_PRES = 1 AND v.L_STATE BETWEEN 1 AND 56 AND v.L_STATE <> a.STATE), false) AS any_out_of_state
  FROM acc_raw a LEFT JOIN veh_raw v ON v.data_year = a.YEAR AND v.ST_CASE = a.ST_CASE GROUP BY ALL
), d AS (
  SELECT year, state_name, sum(fatalities) AS deaths, sum(fatalities * fatalities) AS deaths_sq,
    coalesce(sum(fatalities) FILTER (WHERE any_out_of_state), 0) AS deaths_out_of_state_driver,
    coalesce(sum(fatalities * fatalities) FILTER (WHERE NOT any_out_of_state), 0) AS deaths_sq_in_state_only
  FROM oos GROUP BY ALL
), drv AS (
  SELECT v.data_year AS year, a.STATENAME AS state_name,
    count(*) FILTER (WHERE v.DR_PRES = 1 AND v.L_STATE BETWEEN 1 AND 56) AS drivers_us_licence,
    count(*) FILTER (WHERE v.DR_PRES = 1 AND v.L_STATE BETWEEN 1 AND 56 AND v.L_STATE <> v.STATE) AS drivers_licensed_elsewhere,
    count(*) FILTER (WHERE v.L_STATE = v.STATE AND v.PREV_SPD < 99 AND v.PREV_OTH < 99) AS in_state_drivers_record_known,
    count(*) FILTER (WHERE v.L_STATE = v.STATE AND v.PREV_SPD < 99 AND v.PREV_OTH < 99 AND v.PREV_SPD > 0) AS in_state_drivers_speeding_conviction,
    count(*) FILTER (WHERE v.L_STATE = v.STATE AND v.PREV_SPD < 99 AND v.PREV_OTH < 99 AND (v.PREV_SPD > 0 OR v.PREV_OTH > 0)) AS in_state_drivers_moving_conviction,
    coalesce(sum(v.PREV_SPD) FILTER (WHERE v.L_STATE = v.STATE AND v.PREV_SPD < 99 AND v.PREV_OTH < 99), 0) AS in_state_speeding_convictions,
    coalesce(sum(v.PREV_OTH) FILTER (WHERE v.L_STATE = v.STATE AND v.PREV_SPD < 99 AND v.PREV_OTH < 99), 0) AS in_state_other_moving_convictions
  FROM veh_raw v JOIN acc_raw a ON a.YEAR = v.data_year AND a.ST_CASE = v.ST_CASE GROUP BY ALL
)
SELECT d.state_name || '-' || d.year AS state_year_key, d.*, drv.drivers_us_licence, drv.drivers_licensed_elsewhere,
  drv.in_state_drivers_record_known, drv.in_state_drivers_speeding_conviction, drv.in_state_drivers_moving_conviction,
  drv.in_state_speeding_convictions, drv.in_state_other_moving_convictions,
  sy.population, sy.vmt_millions
FROM d LEFT JOIN drv USING (year, state_name)
LEFT JOIN ltools.fars.state_years sy ON sy.year = d.year AND sy.state_name = d.state_name;

-- 15. Other denominators by state and year: FHWA MV-1 registered vehicles and motorcycles and DL-22 licensed drivers
--     (2019, 2022, 2023, 2024; the 2020 and 2021 tables are not loaded), beside VM-2 miles and Census residents from
--     state_years for every year, the same figures one year (or one table) earlier, and the US totals' changes.
--     MV-1 2022 has no Alabama row: taken as the US total less the listed states (125,810 motorcycles, 5,464,382 vehicles).
--     DL-22 names DC 'Dist. of Col.'. Motorcyclist deaths = killed riders and passengers on motorcycles (persons.road_user).
CREATE OR REPLACE TABLE ltools.fars.state_denominators AS
WITH mv AS (
  SELECT year, CASE WHEN state = 'Dist. of Columbia' THEN 'District of Columbia' ELSE state END AS state_name,
    mc AS registered_motorcycles, allv AS registered_vehicles
  FROM read_csv('fhwa/mv1_2019_2024.csv') WHERE state <> 'Total'
  UNION ALL
  SELECT 2022, 'Alabama', max(mc) FILTER (WHERE state = 'Total') - sum(mc) FILTER (WHERE state <> 'Total'),
    max(allv) FILTER (WHERE state = 'Total') - sum(allv) FILTER (WHERE state <> 'Total')
  FROM read_csv('fhwa/mv1_2019_2024.csv') WHERE year = 2022
), dl AS (
  SELECT year, CASE WHEN state IN ('Dist. of Col.', 'Dist. of Columbia') THEN 'District of Columbia' ELSE state END AS state_name,
    drivers AS licensed_drivers
  FROM read_csv('fhwa/dl22_2019_2024.csv') WHERE state <> 'Total'
), moto AS (
  SELECT cr.year, cr.state_name, count(*) AS motorcyclist_deaths
  FROM ltools.fars.persons pe JOIN ltools.fars.crashes cr ON cr.crash_key = pe.crash_key
  WHERE pe.is_killed AND pe.road_user = 'Motorcyclist' GROUP BY ALL
), s AS (
  SELECT sy.year, sy.state_name, sy.deaths, sy.deaths_sq, sy.population, sy.vmt_millions,
    coalesce(moto.motorcyclist_deaths, 0) AS motorcyclist_deaths,
    mv.registered_vehicles, mv.registered_motorcycles, dl.licensed_drivers
  FROM ltools.fars.state_years sy
  LEFT JOIN mv ON mv.year = sy.year AND mv.state_name = sy.state_name
  LEFT JOIN dl ON dl.year = sy.year AND dl.state_name = sy.state_name
  LEFT JOIN moto ON moto.year = sy.year AND moto.state_name = sy.state_name
  WHERE sy.state_name <> 'United States'
), us AS (
  SELECT year, sum(vmt_millions) AS us_vmt, sum(population) AS us_population FROM s GROUP BY year
)
SELECT s.state_name || '-' || s.year AS state_year_key, s.*,
  p.year AS prior_year, p.population AS prior_population, p.vmt_millions AS prior_vmt_millions,
  us.us_vmt / pu.us_vmt - 1 AS us_vmt_change,
  t.year AS prior_table_year, t.population AS prior_table_population, t.registered_vehicles AS prior_registered_vehicles,
  t.registered_motorcycles AS prior_registered_motorcycles, t.licensed_drivers AS prior_licensed_drivers
FROM s
JOIN us ON us.year = s.year
LEFT JOIN s p ON p.state_name = s.state_name AND p.year = s.year - 1
LEFT JOIN us pu ON pu.year = s.year - 1
LEFT JOIN s t ON t.state_name = s.state_name
  AND t.year = CASE s.year WHEN 2022 THEN 2019 WHEN 2023 THEN 2022 WHEN 2024 THEN 2023 END;
