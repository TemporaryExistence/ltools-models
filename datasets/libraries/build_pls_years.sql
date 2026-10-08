-- One-time build of the multi-year library tables (the only SQL in this dataset; it lands the data).
--
-- Sources (all US Government public data; IMLS and Census data are public domain, https://www.usa.gov/government-works):
--   IMLS Public Libraries Survey, administrative-entity (AE) and outlet files, FY2018 - FY2024
--     https://www.imls.gov/research-evaluation/surveys/public-libraries-survey-pls
--     FY2018 https://www.imls.gov/sites/default/files/pls_fy2018_data_files_csv.zip
--     FY2019 https://www.imls.gov/sites/default/files/2021-05/pls_fy2019_csv.zip
--     FY2020 https://www.imls.gov/sites/default/files/2022-07/pls_fy2020_csv.zip
--     FY2021 https://www.imls.gov/sites/default/files/2023-06/pls_fy2021_csv.zip
--     FY2022 https://www.imls.gov/sites/default/files/2024-06/pls_fy2022_csv.zip
--     FY2023 https://www.imls.gov/sites/default/files/2025-08/pls_fy2023_csv.zip
--     FY2024 https://www.imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip
--   US Census Bureau Population Estimates, county totals (July 1 estimates)
--     Vintage 2025 (2020-2025) https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv
--     Vintage 2020 (2010-2019) https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/counties/totals/co-est2020-alldata.csv
--
-- Prep (encodings differ by year, so convert everything to UTF-8 first):
--   For each year YY: unzip the AE file to ae_fy20YY.csv and the outlet file to ol_fy20YY.csv.
--   FY2021 is already UTF-8; every other PLS year is CP1252 -> iconv -f cp1252 -t utf-8.
--   The Census files are Latin-1 -> iconv -f latin1 -t utf-8 (co-est2025.csv, co-est2020.csv).
-- Run from the folder holding those files:  duckdb < build_pls_years.sql
-- Writes: library_systems_by_year.parquet, county_population.parquet, library_counties.parquet, library_outlets_by_year.parquet
--
-- Column map (survey variable -> column). Same names and meaning as library_systems.parquet (FY2023),
-- so FY2023 rows of library_systems_by_year equal library_systems row for row (plus two added columns at the end).
-- Columns absent in some years are left null (union_by_name):
--   physical_items  = TOTPHYS     absent FY2018-FY2020 (only books BKVOL + media were reported then)
--   age0_5_attendance = K0_5ATTEN absent FY2018-FY2020 (those years had KIDATTEN, ages 0-11: not comparable)
--   ebooks          = EBOOK       absent FY2024 (replaced by EBOOK_SL/_AE/_CO by source; not comparable)
--   kids_circulation = KIDCIRCL   absent FY2024 (replaced by KIDPHYSCIR, physical only; not comparable)
--   website_visits  = WEBVISIT    absent FY2024
-- Survey "missing" codes (negative numbers) become null. Latitude/longitude are kept as reported.
-- NOTE FY2024: 2,791 systems report total circulation (TOTCIR) and digital circulation (ELMATCIR) as -1
-- (not reported, flag U_24), including Chicago, Miami-Dade and Broward. Per-person measures in the model
-- therefore divide by the population of systems that reported each figure.

CREATE MACRO num(x) AS CASE WHEN try_cast(x AS DOUBLE) < 0 THEN NULL ELSE try_cast(x AS DOUBLE) END;

-- County-name key used on both sides of the join: upper case, accents and punctuation removed,
-- "County"/"Parish"/"Borough"/"Census Area"/"City and Borough"/"Municipality"/"Planning Region"/"Co" dropped,
-- "Saint" -> "ST" and "Sainte" -> "STE", then spaces removed (LA SALLE = LaSalle, DEWITT = De Witt). Independent cities keep "CITY"
-- (Virginia has both Fairfax County and Fairfax city).
CREATE MACRO county_key(s) AS
  replace(regexp_replace(
    regexp_replace(
      regexp_replace(upper(strip_accents(trim(s))), '[.''`]', '', 'g'),
      '\s+(CITY AND BOROUGH|CENSUS AREA|COUNTY|PARISH|BOROUGH|MUNICIPALITY|PLANNING REGION|CO)$', ''),
    '^SAINT(E?) ', 'ST\1'), ' ', '');

-- Survey county names that are misspelt or abbreviated in the PLS outlet files (state, PLS name -> Census key).
-- Anything not listed and not matched stays unmatched on purpose (e.g. pre-2019 Alaska census areas that no longer exist).
CREATE TEMP TABLE alias(state, pls_key, census_key) AS VALUES
 ('LA','STJOHNBAPTIST','STJOHNTHEBAPTIST'), ('VA','LOUDON','LOUDOUN'), ('SD','BENNET','BENNETT'),
 ('OH','FARIFIELD','FAIRFIELD'), ('AK','SEFAIRBANK','SOUTHEASTFAIRBANKS'), ('AK','SEFAIRBANKS','SOUTHEASTFAIRBANKS'),
 ('AK','PRWALES-OUTER','PRINCEOFWALES-HYDER'), ('AK','PRWALES-OUTERKE','PRINCEOFWALES-HYDER');

CREATE TEMP TABLE ae AS
SELECT CAST(regexp_extract(filename, 'fy(\d{4})', 1) AS INTEGER) AS fiscal_year, *
FROM read_csv(['ae_fy2018.csv','ae_fy2019.csv','ae_fy2020.csv','ae_fy2021.csv',
               'ae_fy2022.csv','ae_fy2023.csv','ae_fy2024.csv'],
              all_varchar = true, union_by_name = true, filename = true);

COPY (
  SELECT
    FSCSKEY || '-' || fiscal_year AS system_year_id,   -- one row per library system per fiscal year
    fiscal_year,
    STABR AS state, FSCSKEY AS library_id, LIBNAME AS library_name, CITY AS city, CNTY AS county,
    LOCALE_ADD AS locale_code,
    num(POPU_LSA) AS population_served,
    num(CENTLIB) AS central_libraries, num(BRANLIB) AS branches, num(BKMOB) AS bookmobiles,
    num(TOTSTAFF) AS staff_fte,
    num(TOTINCM) AS total_income, num(LOCGVT) AS local_gov_income, num(STGVT) AS state_gov_income,
    num(FEDGVT) AS federal_income,
    num(TOTOPEXP) AS operating_spend, num(STAFFEXP) AS staff_spend, num(TOTEXPCO) AS collection_spend,
    num(TOTPHYS) AS physical_items, num(EBOOK) AS ebooks,
    num(HRS_OPEN) AS hours_open, num(VISITS) AS visits, num(REFERENC) AS reference_questions,
    num(REGBOR) AS registered_borrowers,
    num(TOTCIR) AS circulation, num(KIDCIRCL) AS kids_circulation, num(PHYSCIR) AS physical_circulation,
    num(ELMATCIR) AS digital_circulation,
    num(TOTPRO) AS programs, num(TOTATTEN) AS program_attendance, num(K0_5ATTEN) AS age0_5_attendance,
    num(GPTERMS) AS public_computers, num(PITUSR) AS computer_sessions, num(WIFISESS) AS wifi_sessions,
    num(WEBVISIT) AS website_visits,
    try_cast(LATITUDE AS DOUBLE) AS latitude, try_cast(LONGITUD AS DOUBLE) AS longitude,
    -- Added for the multi-year table (not in library_systems.parquet):
    C_FSCS AS meets_public_library_definition,   -- Y/N: meets the FSCS public library definition
    C_LEGBAS AS legal_basis,                     -- CI city, CO county, LD library district, MJ multi-jurisdictional, NP non-profit, OT other, ...
    -- Added 2026-10-06 (appended so every earlier column keeps its position and values):
    num(PRMATEXP) AS print_spend,                -- print materials spend
    num(ELMATEXP) AS econtent_spend,             -- electronic materials spend: e-books, e-audio, e-video, databases, e-serials
    -- Added 2026-10-07 (appended; join keys to Census data). LSAGEO* exist from FY2022 on; null before.
    nullif(LSAGEOID, 'M') AS service_area_geoid,          -- Census GEOID of the legal service area (place, county subdivision,
                                                          -- county or unified school district); 'N' (not one geography) kept as reported
    LSAGEOTYPE AS service_area_geo_type,                  -- PLACE, COUNTY SUBDIVISION, COUNTY, SCHOOL DISTRICT (UNIFIED), MULTI-COUNTY, MULTI-PLACE, ...
    num(LSAGEORATIO) AS service_area_pop_ratio,           -- POPU_LSA / that geography's Census population (about 1 = a clean match)
    CENTRACT AS admin_tract,                              -- Census tract of the administrative entity's address
    CBSA AS cbsa                                          -- metro / micro area code of that address ('N' = none)
  FROM ae
  ORDER BY state, library_id, fiscal_year
) TO 'library_systems_by_year.parquet' (FORMAT parquet, COMPRESSION zstd);

-- State FIPS -> postal abbreviation (the Census file only has names and FIPS).
CREATE TEMP TABLE st(fips, abbr) AS VALUES
 ('01','AL'),('02','AK'),('04','AZ'),('05','AR'),('06','CA'),('08','CO'),('09','CT'),('10','DE'),('11','DC'),
 ('12','FL'),('13','GA'),('15','HI'),('16','ID'),('17','IL'),('18','IN'),('19','IA'),('20','KS'),('21','KY'),
 ('22','LA'),('23','ME'),('24','MD'),('25','MA'),('26','MI'),('27','MN'),('28','MS'),('29','MO'),('30','MT'),
 ('31','NE'),('32','NV'),('33','NH'),('34','NJ'),('35','NM'),('36','NY'),('37','NC'),('38','ND'),('39','OH'),
 ('40','OK'),('41','OR'),('42','PA'),('44','RI'),('45','SC'),('46','SD'),('47','TN'),('48','TX'),('49','UT'),
 ('50','VT'),('51','VA'),('53','WA'),('54','WV'),('55','WI'),('56','WY');

CREATE TEMP TABLE pop AS
WITH v25 AS (
  UNPIVOT (SELECT * FROM read_csv('co-est2025.csv', all_varchar = true) WHERE SUMLEV = '050')
  ON POPESTIMATE2020, POPESTIMATE2021, POPESTIMATE2022, POPESTIMATE2023, POPESTIMATE2024, POPESTIMATE2025
  INTO NAME k VALUE v
), v20 AS (
  UNPIVOT (SELECT * FROM read_csv('co-est2020.csv', all_varchar = true) WHERE SUMLEV = '050')
  ON POPESTIMATE2010, POPESTIMATE2011, POPESTIMATE2012, POPESTIMATE2013, POPESTIMATE2014,
     POPESTIMATE2015, POPESTIMATE2016, POPESTIMATE2017, POPESTIMATE2018, POPESTIMATE2019
  INTO NAME k VALUE v
)
SELECT st.abbr AS state, STNAME AS state_name, CTYNAME AS county_name, STATE || COUNTY AS county_fips,
       county_key(CTYNAME) AS county_key,
       CAST(right(k, 4) AS INTEGER) AS pop_year, CAST(v AS BIGINT) AS population, vintage
FROM (SELECT *, 2025 AS vintage FROM v25 UNION ALL BY NAME SELECT *, 2020 AS vintage FROM v20) u
JOIN st ON st.fips = u.STATE;

-- pop_year, not year: `year` is a reserved word in Malloy (friction F17).
COPY (SELECT county_fips || '-' || pop_year AS county_year_id, * FROM pop ORDER BY state, county_fips, pop_year)
  TO 'county_population.parquet' (FORMAT parquet, COMPRESSION zstd);

-- System -> county mapping, one row per library system x county x fiscal year, from the counties
-- its outlets (central library, branches, bookmobiles) sit in. Regional systems get one row per member
-- county. pop_weight = that county's population / the summed population of all the system's matched
-- counties that year, so a regional system's visits and spend can be shared out by county.
-- A county name that doesn't match the Census file falls back to " CITY" (Virginia independent cities);
-- rows still unmatched are KEPT with county_fips null and pop_weight null (counted in the build notes).
CREATE TEMP TABLE ol AS
SELECT CAST(regexp_extract(filename, 'fy(\d{4})', 1) AS INTEGER) AS fiscal_year, STABR, FSCSKEY, CNTY
FROM read_csv(['ol_fy2018.csv','ol_fy2019.csv','ol_fy2020.csv','ol_fy2021.csv',
               'ol_fy2022.csv','ol_fy2023.csv','ol_fy2024.csv'],
              all_varchar = true, union_by_name = true, filename = true);

CREATE TEMP TABLE olk AS
SELECT o.*,
       CASE WHEN o.STABR = 'DC' THEN 'DISTRICTOFCOLUMBIA'           -- DC is one county; the survey spells it 3 ways
            ELSE coalesce(a.census_key, county_key(o.CNTY)) END AS k
FROM ol o LEFT JOIN alias a ON a.state = o.STABR AND a.pls_key = county_key(o.CNTY)
WHERE o.FSCSKEY IN (SELECT FSCSKEY FROM ae);

CREATE TEMP TABLE sc AS
SELECT o.fiscal_year, o.STABR AS state, o.FSCSKEY AS library_id, o.CNTY AS county, count(*) AS outlets,
       coalesce(p1.county_fips, p2.county_fips) AS county_fips,
       coalesce(p1.population, p2.population) AS county_population
FROM olk o
LEFT JOIN pop p1 ON p1.state = o.STABR AND p1.pop_year = o.fiscal_year AND p1.county_key = o.k
LEFT JOIN pop p2 ON p1.county_fips IS NULL AND p2.state = o.STABR AND p2.pop_year = o.fiscal_year
                AND p2.county_key = o.k || 'CITY'
GROUP BY ALL;

COPY (
  SELECT library_id || '-' || fiscal_year AS system_year_id,
         county_fips || '-' || fiscal_year AS county_year_id,
         fiscal_year, state, library_id, county, county_fips, outlets, county_population,
         county_population / sum(county_population) OVER (PARTITION BY fiscal_year, library_id) AS pop_weight,
         count(*) OVER (PARTITION BY fiscal_year, library_id) AS counties_served
  FROM sc
  ORDER BY state, library_id, fiscal_year, county
) TO 'library_counties.parquet' (FORMAT parquet, COMPRESSION zstd);

-- Every outlet (central library, branch, bookmobile, books-by-mail) per fiscal year with its Census tract and location
-- (added 2026-10-07: the earlier build dropped CENTRACT/CENBLOCK). Tract GEOID = 11 digits (state+county+tract).
COPY (
  SELECT
    FSCSKEY || '-' || FSCS_SEQ || '-' || fiscal_year AS outlet_year_id,
    fiscal_year, STABR AS state, FSCSKEY AS library_id, FSCS_SEQ AS outlet_seq, LIBNAME AS outlet_name,
    C_OUT_TY AS outlet_type,                         -- CE central, BR branch, BS bookmobile, BM books-by-mail
    CITY AS city, CNTY AS county,
    num(HOURS) AS hours_per_year, num(WKS_OPEN) AS weeks_open, num(SQ_FEET) AS square_feet,
    try_cast(LATITUDE AS DOUBLE) AS latitude, try_cast(LONGITUD AS DOUBLE) AS longitude,
    CENTRACT AS tract_geoid, CENBLOCK AS block_geoid, CBSA AS cbsa, LOCALE AS locale_code
  FROM (SELECT CAST(regexp_extract(filename, 'fy(\d{4})', 1) AS INTEGER) AS fiscal_year, *
        FROM read_csv(['ol_fy2018.csv','ol_fy2019.csv','ol_fy2020.csv','ol_fy2021.csv',
                       'ol_fy2022.csv','ol_fy2023.csv','ol_fy2024.csv'],
                      all_varchar = true, union_by_name = true, filename = true))
  ORDER BY state, library_id, outlet_seq, fiscal_year
) TO 'library_outlets_by_year.parquet' (FORMAT parquet, COMPRESSION zstd);
