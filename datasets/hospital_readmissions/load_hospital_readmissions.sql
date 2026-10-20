-- Load the CMS Hospital Readmissions Reduction Program (HRRP) FY 2026 files into MotherDuck.
-- Run from units/ltools/public-data/hospital_readmissions/raw against md:ltools:
--   duckdb md:ltools -c ".read <model-repo>/datasets/hospital_readmissions/load_hospital_readmissions.sql"
-- Inputs (public, CMS, downloaded 2026-10-20):
--   FY_2026_HRRP_Hospital.csv  (Provider Data Catalog hospital file: one row per hospital per measure)
--   supplemental/FR FY 2026.txt and supplemental/FR FY 2026 Case Info.txt
--     from https://www.cms.gov/files/zip/fy2026-hospital-readmissions-reduction-program-supplemental-data-file.zip
--     (FY 2026 IPPS final rule supplemental file: payment adjustment factor, dual proportion, peer group,
--      unsuppressed eligible discharges, peer group median ERR, penalty indicator, DRG payment ratio).
-- Performance period for every row: discharges 2021-07-01 to 2024-06-30, Medicare fee-for-service.
CREATE SCHEMA IF NOT EXISTS ltools.hospital_readmissions;

CREATE OR REPLACE TEMP TABLE hrrp_file AS
SELECT * FROM read_csv('FY_2026_HRRP_Hospital.csv', all_varchar = true, header = true);

CREATE OR REPLACE TEMP TABLE supp_raw AS
SELECT * FROM read_csv('supplemental/FR FY 2026.txt', delim = '\t', skip = 1, header = true,
                       all_varchar = true, null_padding = true, quote = '"')
WHERE trim("Hospital CCN") ~ '^[0-9A-Z]{6}$';

CREATE OR REPLACE TEMP TABLE supp_long AS
WITH s AS (SELECT trim("Hospital CCN") AS facility_id, * FROM supp_raw)
SELECT facility_id, 'AMI' AS measure, "Number of eligible discharges for AMI" AS d, "ERR for AMI" AS err, "Peer group median ERR for AMI" AS med, "Penalty indicator for AMI" AS pi, "DRG payment ratio for AMI" AS drg FROM s
UNION ALL SELECT facility_id, 'COPD', "Number of eligible discharges for COPD", "ERR for COPD", "Peer group median ERR for COPD", "Penalty indicator for COPD", "DRG payment ratio for COPD" FROM s
UNION ALL SELECT facility_id, 'HF', "Number of eligible discharges for HF", "ERR for HF", "Peer group median ERR for HF", "Penalty indicator for HF", "DRG payment ratio for HF" FROM s
UNION ALL SELECT facility_id, 'PN', "Number of eligible discharges for pneumonia", "ERR for pneumonia", "Peer group median ERR for pneumonia", "Penalty indicator for pneumonia", "DRG payment ratio for pneumonia" FROM s
UNION ALL SELECT facility_id, 'CABG', "Number of eligible discharges for CABG", "ERR for CABG", "Peer group median ERR for CABG", "Penalty indicator for CABG", "DRG payment ratio for CABG" FROM s
UNION ALL SELECT facility_id, 'HIP-KNEE', "Number of eligible discharges for THA/TKA", "ERR for THA/TKA", "Peer group median ERR for THA/TKA", "Penalty indicator for THA/TKA", "DRG payment ratio for THA/TKA" FROM s;

-- One row per hospital per measure (18,330 rows: 3,055 hospitals x 6 measures).
CREATE OR REPLACE TEMP TABLE mr_base AS
SELECT
  trim(h."Facility ID") AS facility_id,
  trim(h."Facility Name") AS facility_name,
  trim(h."State") AS state,
  replace(replace(h."Measure Name", 'READM-30-', ''), '-HRRP', '') AS measure,
  h."Measure Name" AS measure_code,
  TRY_CAST(h."Number of Discharges" AS INTEGER) AS discharges_published,
  TRY_CAST(replace(trim(s.d), ',', '') AS INTEGER) AS eligible_discharges,
  nullif(trim(h."Footnote"), '') AS footnote,
  TRY_CAST(h."Excess Readmission Ratio" AS DOUBLE) AS excess_readmission_ratio,
  TRY_CAST(h."Predicted Readmission Rate" AS DOUBLE) AS predicted_rate_pct,
  TRY_CAST(h."Expected Readmission Rate" AS DOUBLE) AS expected_rate_pct,
  TRY_CAST(h."Number of Readmissions" AS INTEGER) AS readmissions_published,
  CASE WHEN TRY_CAST(h."Number of Readmissions" AS INTEGER) IS NOT NULL THEN 'Reported'
       ELSE trim(h."Number of Readmissions") END AS readmissions_status,
  TRY_CAST(trim(s.med) AS DOUBLE) AS peer_group_median_err,
  coalesce(trim(s.pi) = 'Y', false) AS penalty_indicator,
  TRY_CAST(trim(s.drg) AS DOUBLE) AS drg_payment_ratio,
  s.facility_id IS NOT NULL AS in_payment_file,
  strptime(h."Start Date", '%m/%d/%Y')::DATE AS period_start,
  strptime(h."End Date", '%m/%d/%Y')::DATE AS period_end
FROM hrrp_file h
LEFT JOIN supp_long s
  ON s.facility_id = trim(h."Facility ID")
 AND s.measure = replace(replace(h."Measure Name", 'READM-30-', ''), '-HRRP', '');

-- Chance-only expectation per row: if the hospital sat exactly at its expected rate, its readmissions would be
-- Poisson(lambda = eligible discharges x expected rate / 100). Exact sums over the Poisson distribution give the
-- expected positive excess, and the same under the file's suppression rule (counts of 10 or fewer read as 0 or as 10),
-- with second moments for intervals.
CREATE OR REPLACE TEMP TABLE chance AS
WITH r AS (
  SELECT facility_id, measure, eligible_discharges * expected_rate_pct / 100 AS lam
  FROM mr_base WHERE excess_readmission_ratio IS NOT NULL AND eligible_discharges IS NOT NULL
), pk AS (
  SELECT r.facility_id, r.measure, r.lam, t.k, exp(t.k * ln(r.lam) - r.lam - lgamma(t.k + 1)) AS pmf
  FROM r, range(0, 1600) t(k) WHERE t.k <= r.lam + 12 * sqrt(r.lam) + 25
)
SELECT facility_id, measure,
  sum(pmf * greatest(k - lam, 0)) AS chance_excess,
  sum(pmf * greatest(k - lam, 0) ^ 2) - sum(pmf * greatest(k - lam, 0)) ^ 2 AS chance_excess_var,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE 0 END) AS chance_excess_floor,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ^ 2 ELSE 0 END)
    - sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE 0 END) ^ 2 AS chance_excess_floor_var,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE greatest(10 - lam, 0) END) AS chance_excess_ceiling,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ^ 2 ELSE greatest(10 - lam, 0) ^ 2 END)
    - sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE greatest(10 - lam, 0) END) ^ 2 AS chance_excess_ceiling_var
FROM pk GROUP BY facility_id, measure;

CREATE OR REPLACE TABLE ltools.hospital_readmissions.measure_results AS
SELECT b.*, c.chance_excess, c.chance_excess_var, c.chance_excess_floor, c.chance_excess_floor_var,
  c.chance_excess_ceiling, c.chance_excess_ceiling_var
FROM mr_base b LEFT JOIN chance c USING (facility_id, measure);

-- One row per hospital in the hospital file (3,055), with its FY 2026 payment result where CMS published one (2,937).
CREATE OR REPLACE TABLE ltools.hospital_readmissions.hospitals AS
WITH f AS (
  SELECT trim("Facility ID") AS facility_id, any_value(trim("Facility Name")) AS facility_name, any_value(trim("State")) AS state
  FROM hrrp_file GROUP BY 1
), p AS (
  SELECT trim("Hospital CCN") AS facility_id,
    TRY_CAST(trim("Payment adjustment factor") AS DOUBLE) AS payment_adjustment_factor,
    TRY_CAST(replace(trim("Payment reduction percentage"), '%', '') AS DOUBLE) AS payment_reduction_pct,
    TRY_CAST(trim("Dual proportion") AS DOUBLE) AS dual_proportion,
    TRY_CAST(trim("Peer group assignment") AS INTEGER) AS peer_group,
    TRY_CAST(trim("Neutrality modifier") AS DOUBLE) AS neutrality_modifier
  FROM supp_raw
), c AS (
  SELECT trim("Hospital CCN") AS facility_id,
    TRY_CAST(replace("Total cases in FY 2021", ',', '') AS INTEGER)
    + TRY_CAST(replace("Total cases in FY 2022", ',', '') AS INTEGER)
    + TRY_CAST(replace("Total cases in FY 2023", ',', '') AS INTEGER)
    + TRY_CAST(replace("Total cases in FY 2024", ',', '') AS INTEGER) AS total_cases_perf_period
  FROM read_csv('supplemental/FR FY 2026 Case Info.txt', delim = '\t', skip = 1, header = true,
                all_varchar = true, null_padding = true, quote = '"')
  WHERE trim("Hospital CCN") ~ '^[0-9A-Z]{6}$'
)
SELECT f.facility_id, f.facility_name, f.state,
  p.payment_adjustment_factor, p.payment_reduction_pct, p.dual_proportion, p.peer_group, p.neutrality_modifier,
  c.total_cases_perf_period,
  p.facility_id IS NOT NULL AS in_payment_file
FROM f LEFT JOIN p USING (facility_id) LEFT JOIN c USING (facility_id);
