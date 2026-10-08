-- Load the TidyTuesday 2021-07-27 Olympic history files into MotherDuck (ltools.olympics).
-- Run from units/ltools/public-data/olympics/raw. Athlete names are NOT loaded (aggregate use only).
CREATE SCHEMA IF NOT EXISTS ltools.olympics;
CREATE OR REPLACE TABLE ltools.olympics.athlete_events AS
SELECT
  id::INTEGER AS athlete_id,
  sex,
  TRY_CAST(nullif(age, 'NA') AS INTEGER) AS age,
  TRY_CAST(nullif(height, 'NA') AS DOUBLE) AS height_cm,
  TRY_CAST(nullif(weight, 'NA') AS DOUBLE) AS weight_kg,
  team,
  noc,
  games,
  year::INTEGER AS year,
  season,
  city,
  sport,
  event,
  nullif(medal, 'NA') AS medal
FROM read_csv('olympics.csv', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.olympics.regions AS
SELECT "NOC" AS noc, region, nullif(notes, '') AS notes
FROM read_csv('regions.csv', header=true, all_varchar=true);
-- regions.csv lists Singapore as SIN, but the athlete file uses SGP (349 rows); add the mapping.
INSERT INTO ltools.olympics.regions VALUES ('SGP', 'Singapore', 'Code used in the athlete file; regions.csv lists Singapore as SIN');
SELECT 'athlete_events' t, count(*) FROM ltools.olympics.athlete_events
UNION ALL SELECT 'regions', count(*) FROM ltools.olympics.regions;
