-- Load the CMS Hospital Readmissions Reduction Program (HRRP) FY 2026 and FY 2027 files into MotherDuck.
-- Run from units/ltools/public-data/hospital_readmissions/raw against md:ltools:
--   duckdb md:ltools -c ".read <model-repo>/datasets/hospital_readmissions/load_hospital_readmissions.sql"
-- Inputs (public, CMS, downloaded 2026-10-20; FY 2027 files and both Table 15s under fy2027/ and table15/):
--   FY_2026_HRRP_Hospital.csv  (Provider Data Catalog hospital file: one row per hospital per measure)
--   supplemental/FR FY 2026.txt and supplemental/FR FY 2026 Case Info.txt
--     from https://www.cms.gov/files/zip/fy2026-hospital-readmissions-reduction-program-supplemental-data-file.zip
--     (FY 2026 IPPS final rule supplemental file: payment adjustment factor, dual proportion, peer group,
--      unsuppressed eligible discharges, peer group median ERR, penalty indicator, DRG payment ratio).
-- Performance periods: FY 2026 rows (measure_results, hospitals) discharges 2021-07-01 to 2024-06-30, Medicare
-- fee-for-service; FY 2027 payment rows 2023-07-01 to 2025-06-30, fee-for-service and Medicare Advantage.
-- A local copy builds the same way: duckdb <dir>/ltools.duckdb -c ".read <this file>" (the database name must be ltools).
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

-- FY 2027 IPPS final rule supplemental file and both years' Table 15 (downloaded 2026-10-20 from the FY 2027 final rule
-- page; fy2027/). FY 2027: discharges July 2023 to June 2025, Medicare fee-for-service and Medicare Advantage.
CREATE OR REPLACE TEMP TABLE supp27_raw AS
SELECT * FROM read_csv('fy2027/supplemental/FY2027_HRRP_Supplemental_File - FR FY 2027 Tab.txt', delim = '\t', skip = 1,
                       header = true, all_varchar = true, null_padding = true, quote = '"')
WHERE trim("Hospital CCN") ~ '^[0-9A-Z]{6}$';
CREATE OR REPLACE TEMP TABLE t15 AS
SELECT 2026 AS fiscal_year, trim(column0) AS facility_id, TRY_CAST(trim(column1) AS DOUBLE) AS table15_factor
FROM read_csv('table15/FY2026_HRRP_Table_15.txt', delim = '\t', header = false, skip = 3, all_varchar = true, null_padding = true)
WHERE trim(column0) ~ '^[0-9A-Z]{6}$'
UNION ALL
SELECT 2027, trim(column0), TRY_CAST(trim(column1) AS DOUBLE)
FROM read_csv('fy2027/table15/Section 508 version of FY2027_HRRP_Table_15.txt', delim = '\t', header = false, skip = 3, all_varchar = true, null_padding = true)
WHERE trim(column0) ~ '^[0-9A-Z]{6}$';

-- Payment inputs, both fiscal years, one row per hospital per measure per year, every hospital in CMS's payment file
-- (FY 2026: 2,945, of which 8 have no row in the hospital file; FY 2027: 2,912).
CREATE OR REPLACE TEMP TABLE pay_long AS
WITH s AS (
  SELECT 2026 AS fiscal_year, trim("Hospital CCN") AS facility_id, * FROM supp_raw
  UNION ALL BY NAME
  SELECT 2027 AS fiscal_year, trim("Hospital CCN") AS facility_id, * FROM supp27_raw
), u AS (
  SELECT fiscal_year, facility_id, 'AMI' AS measure, "Number of eligible discharges for AMI" AS d, "ERR for AMI" AS err, "Peer group median ERR for AMI" AS med, "Penalty indicator for AMI" AS pi, "DRG payment ratio for AMI" AS drg FROM s
  UNION ALL SELECT fiscal_year, facility_id, 'COPD', "Number of eligible discharges for COPD", "ERR for COPD", "Peer group median ERR for COPD", "Penalty indicator for COPD", "DRG payment ratio for COPD" FROM s
  UNION ALL SELECT fiscal_year, facility_id, 'HF', "Number of eligible discharges for HF", "ERR for HF", "Peer group median ERR for HF", "Penalty indicator for HF", "DRG payment ratio for HF" FROM s
  UNION ALL SELECT fiscal_year, facility_id, 'PN', "Number of eligible discharges for pneumonia", "ERR for pneumonia", "Peer group median ERR for pneumonia", "Penalty indicator for pneumonia", "DRG payment ratio for pneumonia" FROM s
  UNION ALL SELECT fiscal_year, facility_id, 'CABG', "Number of eligible discharges for CABG", "ERR for CABG", "Peer group median ERR for CABG", "Penalty indicator for CABG", "DRG payment ratio for CABG" FROM s
  UNION ALL SELECT fiscal_year, facility_id, 'HIP-KNEE', "Number of eligible discharges for THA/TKA", "ERR for THA/TKA", "Peer group median ERR for THA/TKA", "Penalty indicator for THA/TKA", "DRG payment ratio for THA/TKA" FROM s
)
SELECT fiscal_year, facility_id, measure,
  TRY_CAST(replace(trim(d), ',', '') AS INTEGER) AS eligible_discharges,
  TRY_CAST(trim(err) AS DOUBLE) AS excess_readmission_ratio,
  TRY_CAST(trim(med) AS DOUBLE) AS peer_group_median_err,
  coalesce(trim(pi) = 'Y', false) AS penalty_indicator,
  TRY_CAST(trim(drg) AS DOUBLE) AS drg_payment_ratio
FROM u;

-- Hospital names and states from the hospital file; for the 10 payment-file hospitals without a row there, the state
-- comes from the CCN's first two digits (each prefix maps to one state in the hospital file).
CREATE OR REPLACE TEMP TABLE names AS
SELECT trim("Facility ID") AS facility_id, any_value(trim("Facility Name")) AS facility_name, any_value(trim("State")) AS state
FROM hrrp_file GROUP BY 1;
CREATE OR REPLACE TEMP TABLE prefix_state AS
SELECT left(facility_id, 2) AS prefix, any_value(state) AS state FROM names GROUP BY 1;

CREATE OR REPLACE TABLE ltools.hospital_readmissions.payment_hospitals AS
WITH s AS (
  SELECT 2026 AS fiscal_year, * FROM supp_raw
  UNION ALL BY NAME
  SELECT 2027 AS fiscal_year, * FROM supp27_raw
), h AS (
  SELECT fiscal_year, trim("Hospital CCN") AS facility_id,
    TRY_CAST(trim("Payment adjustment factor") AS DOUBLE) AS payment_adjustment_factor,
    TRY_CAST(replace(trim("Payment reduction percentage"), '%', '') AS DOUBLE) AS payment_reduction_pct,
    TRY_CAST(trim("Dual proportion") AS DOUBLE) AS dual_proportion,
    TRY_CAST(trim("Peer group assignment") AS INTEGER) AS peer_group,
    TRY_CAST(trim("Neutrality modifier") AS DOUBLE) AS neutrality_modifier
  FROM s
), sc AS (
  SELECT fiscal_year, facility_id, count(*) FILTER (WHERE eligible_discharges >= 25 AND excess_readmission_ratio IS NOT NULL) AS scored_measures
  FROM pay_long GROUP BY 1, 2
)
SELECT h.fiscal_year || '-' || h.facility_id AS hospital_year_key, h.*, n.facility_name,
  coalesce(n.state, ps.state) AS state, n.facility_id IS NOT NULL AS in_hospital_file,
  sc.scored_measures, t.table15_factor
FROM h
LEFT JOIN names n USING (facility_id)
LEFT JOIN prefix_state ps ON ps.prefix = left(h.facility_id, 2)
LEFT JOIN sc USING (fiscal_year, facility_id)
LEFT JOIN t15 t USING (fiscal_year, facility_id);

-- The hospital's neutrality modifier is repeated on each measure row so the cut formula reads one table.
CREATE OR REPLACE TABLE ltools.hospital_readmissions.payment_measures AS
SELECT p.fiscal_year || '-' || p.facility_id AS hospital_year_key, p.*, h.neutrality_modifier
FROM pay_long p
JOIN ltools.hospital_readmissions.payment_hospitals h USING (fiscal_year, facility_id);

-- FY 2026 -> FY 2027 chance baseline per FY 2026 measure (method and checks: outputs/ltp-part2/readmissions/fy2027/).
-- The two periods share July 2023 to June 2024 fee-for-service discharges. If the hospital's true rate sat at its peer
-- median in both periods, the chance that its FY 2027 count lands above the FY 2027 median count, given its FY 2026
-- count, is Phi(f x gap / sqrt(nB q26 (1 - q26) (1 - f) + nC q27 (1 - q27))): f = shared-year share of FY 2026 fee-for-
-- service cases (case info files), nB = f x FY 2026 eligible discharges, nC = the other FY 2027 discharges, q26 = FY 2026
-- expected rate x FY 2026 peer median, q27 = FY 2026 expected rate x FY 2027 peer median (FY 2027 expected rates are not
-- published; assumption), gap = FY 2026 count - peer-median count (hidden counts at 0 and at 10). Normal approximation;
-- an exact version agrees within 1 point on published rows (fy2027/q02).
CREATE OR REPLACE TEMP MACRO ncdf(z) AS
  CASE WHEN z >= 0 THEN 1 - 0.5 * (((((1.061405429 * (1 / (1 + 0.3275911 * z / sqrt(2))) - 1.453152027) * (1 / (1 + 0.3275911 * z / sqrt(2))) + 1.421413741) * (1 / (1 + 0.3275911 * z / sqrt(2))) - 0.284496736) * (1 / (1 + 0.3275911 * z / sqrt(2))) + 0.254829592) * (1 / (1 + 0.3275911 * z / sqrt(2)))) * exp(-z * z / 2)
       ELSE 0.5 * (((((1.061405429 * (1 / (1 - 0.3275911 * z / sqrt(2))) - 1.453152027) * (1 / (1 - 0.3275911 * z / sqrt(2))) + 1.421413741) * (1 / (1 - 0.3275911 * z / sqrt(2))) - 0.284496736) * (1 / (1 - 0.3275911 * z / sqrt(2))) + 0.254829592) * (1 / (1 - 0.3275911 * z / sqrt(2)))) * exp(-z * z / 2) END;
CREATE OR REPLACE TEMP TABLE case_long AS
WITH c AS (
  SELECT 2026 AS prog, * FROM (
    UNPIVOT (SELECT trim("Hospital CCN") AS facility_id, COLUMNS('^Number of .* cases in FY [0-9]{4}$')
             FROM read_csv('supplemental/FR FY 2026 Case Info.txt', delim = '\t', skip = 1, header = true, all_varchar = true, null_padding = true, quote = '"')
             WHERE trim("Hospital CCN") ~ '^[0-9A-Z]{6}$')
    ON COLUMNS('^Number of') INTO NAME col VALUE v)
  UNION ALL
  SELECT 2027, * FROM (
    UNPIVOT (SELECT trim("Hospital CCN") AS facility_id, COLUMNS('^Number of .* cases in FY [0-9]{4}$')
             FROM read_csv('fy2027/supplemental/FY2027_HRRP_Supplemental_File - FR FY 2027 Case Info Tab.txt', delim = '\t', skip = 1, header = true, all_varchar = true, null_padding = true, quote = '"')
             WHERE trim("Hospital CCN") ~ '^[0-9A-Z]{6}$')
    ON COLUMNS('^Number of') INTO NAME col VALUE v)
)
SELECT prog, facility_id,
  CASE regexp_extract(col, '^Number of (.*) cases in FY', 1)
    WHEN 'pneumonia' THEN 'PN' WHEN 'THA/TKA' THEN 'HIP-KNEE' ELSE regexp_extract(col, '^Number of (.*) cases in FY', 1) END AS measure,
  TRY_CAST(regexp_extract(col, 'FY ([0-9]{4})$', 1) AS INTEGER) AS fy,
  TRY_CAST(replace(trim(v), ',', '') AS INTEGER) AS n
FROM c;
CREATE OR REPLACE TEMP TABLE overlap AS
SELECT facility_id, measure,
  sum(n) FILTER (WHERE (prog = 2026 AND fy = 2024) OR (prog = 2027 AND fy = 2023))::DOUBLE / nullif(sum(n) FILTER (WHERE prog = 2026), 0) AS shared_year_share
FROM case_long GROUP BY 1, 2;

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

-- Same with binomial noise (a readmission is yes/no per stay): count ~ Binomial(eligible discharges, expected rate).
CREATE OR REPLACE TEMP TABLE chance_b AS
WITH r AS (
  SELECT facility_id, measure, eligible_discharges AS n, expected_rate_pct / 100 AS p,
         eligible_discharges * expected_rate_pct / 100 AS lam,
         sqrt(eligible_discharges * (expected_rate_pct / 100) * (1 - expected_rate_pct / 100)) AS sd
  FROM mr_base WHERE excess_readmission_ratio IS NOT NULL AND eligible_discharges IS NOT NULL
), pk AS (
  SELECT r.facility_id, r.measure, r.lam, t.k,
         exp(lgamma(r.n + 1) - lgamma(t.k + 1) - lgamma(r.n - t.k + 1) + t.k * ln(r.p) + (r.n - t.k) * ln(1 - r.p)) AS pmf
  FROM r, range(0, 4000) t(k)
  WHERE t.k <= r.n AND t.k >= greatest(0, floor(r.lam - 12 * r.sd - 5)) AND t.k <= r.lam + 12 * r.sd + 25
)
SELECT facility_id, measure,
  sum(pmf * greatest(k - lam, 0)) AS chance_excess_b,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE 0 END) AS chance_excess_b_floor,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ^ 2 ELSE 0 END)
    - sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE 0 END) ^ 2 AS chance_excess_b_floor_var,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE greatest(10 - lam, 0) END) AS chance_excess_b_ceiling,
  sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ^ 2 ELSE greatest(10 - lam, 0) ^ 2 END)
    - sum(pmf * CASE WHEN k >= 11 THEN greatest(k - lam, 0) ELSE greatest(10 - lam, 0) END) ^ 2 AS chance_excess_b_ceiling_var,
  -- The count as the file shows it, read with hidden counts at 0 (floor) or at 10 (ceiling): its mean and variance at
  -- the expected rate, so a group's floor (or ceiling) total can be tested against chance with the suppression built in.
  sum(pmf * CASE WHEN k >= 11 THEN k ELSE 0 END) AS null_count_floor_mean,
  sum(pmf * CASE WHEN k >= 11 THEN k * k ELSE 0 END) - sum(pmf * CASE WHEN k >= 11 THEN k ELSE 0 END) ^ 2 AS null_count_floor_var,
  sum(pmf * CASE WHEN k >= 11 THEN k ELSE 10 END) AS null_count_ceiling_mean,
  sum(pmf * CASE WHEN k >= 11 THEN k * k ELSE 100 END) - sum(pmf * CASE WHEN k >= 11 THEN k ELSE 10 END) ^ 2 AS null_count_ceiling_var
FROM pk GROUP BY facility_id, measure;

CREATE OR REPLACE TEMP TABLE repeat_chance AS
WITH b AS (
  SELECT m.facility_id, m.measure, o.shared_year_share AS f, m.eligible_discharges AS n26, p27.eligible_discharges AS n27,
    m.expected_rate_pct / 100 * m.peer_group_median_err AS q26,
    m.expected_rate_pct / 100 * p27.peer_group_median_err AS q27,
    m.eligible_discharges * m.expected_rate_pct / 100 * m.peer_group_median_err AS medcount26,
    coalesce(m.readmissions_published, CASE WHEN m.readmissions_status = 'Too Few to Report' THEN 0 END) AS o_lo,
    coalesce(m.readmissions_published, CASE WHEN m.readmissions_status = 'Too Few to Report' THEN 10 END) AS o_hi
  FROM mr_base m
  JOIN pay_long p27 ON p27.fiscal_year = 2027 AND p27.facility_id = m.facility_id AND p27.measure = m.measure
  LEFT JOIN overlap o ON o.facility_id = m.facility_id AND o.measure = m.measure
  WHERE m.expected_rate_pct IS NOT NULL AND m.eligible_discharges IS NOT NULL AND m.peer_group_median_err IS NOT NULL
    AND p27.peer_group_median_err IS NOT NULL
), c AS (
  SELECT *, sqrt(f * n26 * q26 * (1 - q26) * (1 - f) + greatest(n27 - f * n26, 0) * q27 * (1 - q27)) AS sd_cond FROM b
)
SELECT facility_id, measure, f AS shared_year_share,
  ncdf(f * (o_lo - medcount26) / nullif(sd_cond, 0)) AS repeat_chance_min,
  ncdf(f * (o_hi - medcount26) / nullif(sd_cond, 0)) AS repeat_chance_max
FROM c;

-- Prior for the empirical-Bayes posterior: each measure's spread (relative SD of true ratios, centred) and offset of the
-- mean true ratio from expected, method of moments with binomial noise on rows with an expected count of 25 or more
-- (outputs/ltp-part2/readmissions/queries/r4/vc.py; the model's `spread_tau_live` and `spread_mean_offset` recompute
-- them). The model reads this table for `spread_tau` and `spread_offset`.
CREATE OR REPLACE TABLE ltools.hospital_readmissions.spread_prior AS
SELECT * FROM (VALUES ('AMI', 0.1200, -0.0141), ('CABG', 0.1702, -0.0753), ('COPD', 0.0780, 0.0245),
  ('HF', 0.0947, -0.0067), ('HIP-KNEE', 0.1559, -0.2935), ('PN', 0.1043, 0.0172)) t(measure, spread_tau, spread_offset);

-- Posterior per hospital-measure (heart attack, heart failure, pneumonia, COPD only: their CMS ratio stays within 0.02
-- of 1 at every volume, so one prior centre holds; hip/knee runs 0.78 at 500+ discharges and 1.03 under 50). True ratio
-- ~ Normal(1 + offset, tau^2); observed ratio O/E with binomial noise (1 - p)/E; hidden counts at 0 (_min) and 10 (_max).
CREATE OR REPLACE TEMP TABLE posterior AS
WITH a AS (
  SELECT m.facility_id, m.measure, m.eligible_discharges * m.expected_rate_pct / 100 AS e, (1 - m.expected_rate_pct / 100) AS q,
    coalesce(m.readmissions_published, CASE WHEN m.readmissions_status = 'Too Few to Report' THEN 0 END) AS omin,
    coalesce(m.readmissions_published, CASE WHEN m.readmissions_status = 'Too Few to Report' THEN 10 END) AS omax,
    sp.spread_tau AS tau, sp.spread_offset AS off
  FROM mr_base m JOIN ltools.hospital_readmissions.spread_prior sp USING (measure)
  WHERE m.measure IN ('AMI', 'HF', 'PN', 'COPD') AND m.excess_readmission_ratio IS NOT NULL AND m.eligible_discharges IS NOT NULL
), b AS (
  SELECT *, q / e AS nv, tau * tau / (tau * tau + q / e) AS w FROM a
), c AS (
  SELECT *, 1 + off + w * (omin / e - 1 - off) AS rmin, 1 + off + w * (omax / e - 1 - off) AS rmax, sqrt(w * nv) AS s FROM b
), d AS (
  SELECT *, (rmin - 1) / s AS umin, (rmax - 1) / s AS umax FROM c
), f AS (
  SELECT *, ncdf(umin) AS pmin, ncdf(umax) AS pmax,
    0.3989422804 * exp(-umin * umin / 2) AS dmin, 0.3989422804 * exp(-umax * umax / 2) AS dmax FROM d
)
SELECT facility_id, measure,
  rmin AS posterior_ratio_min, rmax AS posterior_ratio_max, s AS posterior_ratio_sd,
  pmin AS prob_worse_than_expected_min, pmax AS prob_worse_than_expected_max,
  e * (s * dmin + (rmin - 1) * pmin) AS posterior_excess_row_min,
  e * (s * dmax + (rmax - 1) * pmax) AS posterior_excess_row_max,
  e * e * (((rmin - 1) * (rmin - 1) + s * s) * pmin + (rmin - 1) * s * dmin - (s * dmin + (rmin - 1) * pmin) * (s * dmin + (rmin - 1) * pmin)) AS posterior_excess_var_row_min,
  e * e * (((rmax - 1) * (rmax - 1) + s * s) * pmax + (rmax - 1) * s * dmax - (s * dmax + (rmax - 1) * pmax) * (s * dmax + (rmax - 1) * pmax)) AS posterior_excess_var_row_max
FROM f;

CREATE OR REPLACE TABLE ltools.hospital_readmissions.measure_results AS
SELECT b.*, c.chance_excess, c.chance_excess_var, c.chance_excess_floor, c.chance_excess_floor_var,
  c.chance_excess_ceiling, c.chance_excess_ceiling_var,
  cb.chance_excess_b, cb.chance_excess_b_floor, cb.chance_excess_b_floor_var, cb.chance_excess_b_ceiling, cb.chance_excess_b_ceiling_var,
  cb.null_count_floor_mean, cb.null_count_floor_var, cb.null_count_ceiling_mean, cb.null_count_ceiling_var,
  rc.shared_year_share, rc.repeat_chance_min, rc.repeat_chance_max,
  po.posterior_ratio_min, po.posterior_ratio_max, po.posterior_ratio_sd, po.prob_worse_than_expected_min, po.prob_worse_than_expected_max,
  po.posterior_excess_row_min, po.posterior_excess_row_max, po.posterior_excess_var_row_min, po.posterior_excess_var_row_max
FROM mr_base b LEFT JOIN chance c USING (facility_id, measure) LEFT JOIN chance_b cb USING (facility_id, measure)
LEFT JOIN repeat_chance rc USING (facility_id, measure) LEFT JOIN posterior po USING (facility_id, measure);

-- Null simulation for the selection effect (Monte Carlo, 200 replicates; results vary by about 1% between runs).
-- Every program hospital sits exactly at its peer-median rate on every scored measure: count ~ Binomial(eligible
-- discharges, expected rate x peer median ERR), drawn by inverse CDF. A measure counts as "penalized" when its count
-- lands above the median count (a proxy for CMS's rule on the shrunken ratio). Per hospital and replicate: gap = sum
-- over those measures of (count - median count); chance SD = sqrt of the summed binomial variances on those measures.
SELECT setseed(0.20261020);
CREATE OR REPLACE TEMP TABLE nr AS
SELECT row_number() OVER () AS rid, m.facility_id, m.eligible_discharges AS n,
       m.expected_rate_pct / 100 * m.peer_group_median_err AS q
FROM mr_base m JOIN (SELECT trim("Hospital CCN") AS facility_id FROM supp_raw) s USING (facility_id)
WHERE m.excess_readmission_ratio IS NOT NULL AND m.eligible_discharges IS NOT NULL;
CREATE OR REPLACE TEMP TABLE ncdf AS
WITH b AS (SELECT rid, n, q, n * q AS mu, sqrt(n * q * (1 - q)) AS sd FROM nr),
pk AS (
  SELECT rid, k, exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * ln(q) + (n - k) * ln(1 - q)) AS pmf
  FROM b, range(0, 4000) t(k)
  WHERE k <= n AND k >= greatest(0, floor(mu - 12 * sd - 5)) AND k <= mu + 12 * sd + 25
)
SELECT rid, k, sum(pmf) OVER (PARTITION BY rid ORDER BY k) AS c FROM pk;
CREATE OR REPLACE TEMP TABLE ndraws AS SELECT nr.rid, t.r AS rep, random() AS u FROM nr, range(200) t(r);
CREATE OR REPLACE TEMP TABLE nsim AS
SELECT nr.facility_id, d.rep, c.k AS cnt, nr.n * nr.q AS mu, nr.n * nr.q * (1 - nr.q) AS v
FROM ndraws d ASOF JOIN ncdf c ON d.rid = c.rid AND d.u <= c.c JOIN nr ON nr.rid = d.rid;
CREATE OR REPLACE TABLE ltools.hospital_readmissions.null_selection AS
WITH h AS (
  SELECT facility_id, rep, sum(cnt - mu) FILTER (WHERE cnt > mu) AS gap, sqrt(sum(v) FILTER (WHERE cnt > mu)) AS sd
  FROM nsim GROUP BY facility_id, rep
)
SELECT facility_id,
  avg(CASE WHEN gap IS NOT NULL THEN 1.0 ELSE 0.0 END) AS null_prob_selected,
  avg(CASE WHEN gap > sd THEN 1.0 ELSE 0.0 END) AS null_prob_beyond_one,
  avg(CASE WHEN gap > 2 * sd THEN 1.0 ELSE 0.0 END) AS null_prob_beyond_two,
  avg(CASE WHEN gap > 3 * sd THEN 1.0 ELSE 0.0 END) AS null_prob_beyond_three,
  avg(coalesce(greatest(gap - 2 * sd, 0), 0)) AS null_beyond_two_part
FROM h GROUP BY facility_id;

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
