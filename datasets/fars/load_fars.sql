-- Load NHTSA FARS 2019-2024 (fatal US road crashes) into MotherDuck database ltools, schema fars.
-- Source: NHTSA FARS national CSV files, one zip per year (FARS20xxNationalCSV.zip), downloaded 2026-10-20.
--   2019-2023 are Final Files; 2024 is the Annual Report File (ARF): NHTSA revises it when the 2025 ARF is released.
-- Step 1 (local, once, from units/ltools/public-data/fars/raw): unzip accident, person, vehicle, MIACC, MIDRVACC, MIPER
--   for each year into csv/<year>/ (lower-case names), then re-encode to UTF-8 into utf8/<year>/
--   (2019 and 2020 accident.csv are Windows-1252; 2021-2022 accident.csv carry a UTF-8 byte-order mark).
-- Step 2 (local): FHWA Highway Statistics table VM-2 (vehicle-miles by state, rural/urban and functional system),
--   2019-2024 pages saved to fhwa/vm2_<year>.html and parsed to fhwa/vm2_2019_2024.csv (parse_vm2.py in the working notes).
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
    || ' points (z ' || round(z_share, 1) || '); other ' || CASE grain WHEN 'Road class' THEN 'classes' ELSE 'group' END
    || ' moved ' || offsetting_deaths::INT || ' deaths the other way' AS evidence
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
