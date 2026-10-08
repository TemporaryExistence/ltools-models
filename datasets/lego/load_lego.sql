-- Load the 12 Rebrickable CSV downloads (2026-10-08) into MotherDuck (ltools.lego).
-- Run from units/ltools/public-data/lego/raw. Data: Rebrickable (rebrickable.com), used with credit.
CREATE SCHEMA IF NOT EXISTS ltools.lego;
CREATE OR REPLACE TABLE ltools.lego.themes AS SELECT id::INTEGER AS id, name, TRY_CAST(nullif(parent_id,'') AS INTEGER) AS parent_id FROM read_csv('themes.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.colors AS SELECT id::INTEGER AS id, name, rgb, (is_trans='True') AS is_trans, num_parts::INTEGER AS num_parts, num_sets::INTEGER AS num_sets, TRY_CAST(y1 AS INTEGER) AS first_year, TRY_CAST(y2 AS INTEGER) AS last_year FROM read_csv('colors.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.part_categories AS SELECT id::INTEGER AS id, name FROM read_csv('part_categories.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.parts AS SELECT part_num, name, part_cat_id::INTEGER AS part_cat_id, part_material FROM read_csv('parts.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.part_relationships AS SELECT rel_type, child_part_num, parent_part_num FROM read_csv('part_relationships.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.elements AS SELECT element_id, part_num, color_id::INTEGER AS color_id, nullif(design_id,'') AS design_id FROM read_csv('elements.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.sets AS SELECT set_num, name, year::INTEGER AS year, theme_id::INTEGER AS theme_id, num_parts::INTEGER AS num_parts, img_url FROM read_csv('sets.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.minifigs AS SELECT fig_num, name, num_parts::INTEGER AS num_parts, img_url FROM read_csv('minifigs.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.inventories AS SELECT id::INTEGER AS id, version::INTEGER AS version, set_num FROM read_csv('inventories.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.inventory_parts AS SELECT inventory_id::INTEGER AS inventory_id, part_num, color_id::INTEGER AS color_id, quantity::INTEGER AS quantity, (is_spare='True') AS is_spare, img_url FROM read_csv('inventory_parts.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.inventory_sets AS SELECT inventory_id::INTEGER AS inventory_id, set_num, quantity::INTEGER AS quantity FROM read_csv('inventory_sets.csv.gz', header=true, all_varchar=true);
CREATE OR REPLACE TABLE ltools.lego.inventory_minifigs AS SELECT inventory_id::INTEGER AS inventory_id, fig_num, quantity::INTEGER AS quantity FROM read_csv('inventory_minifigs.csv.gz', header=true, all_varchar=true);
SELECT table_name, estimated_size FROM duckdb_tables() WHERE database_name='ltools' AND schema_name='lego' ORDER BY 1;
