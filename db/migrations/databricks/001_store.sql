-- Storage layer tables on Databricks (Delta, Unity Catalog), for STORE_ADAPTER=databricks.
-- Run once, in the catalog and schema named by DATABRICKS_CATALOG and DATABRICKS_SCHEMA.
-- Change the two USE lines below to match them first. See db/migrations/README.md.
-- Not yet run against a real workspace.

USE CATALOG avnet_catalog;
USE SCHEMA market_terminal;

-- Saved results: one row per namespace and key. item_value is the JSON text.
-- entry_date is the date the app's expiry rule gives the row (null when the
-- namespace isn't pruned); expiry deletes by it. Primary keys are informational
-- on Databricks; the app's MERGE keeps (ns, item_key) unique.
CREATE TABLE IF NOT EXISTS store_kv (
  ns STRING NOT NULL COMMENT 'Namespace, such as ask-claude-v3',
  item_key STRING NOT NULL COMMENT 'Key within the namespace; can be a long URL',
  item_value STRING NOT NULL COMMENT 'The value as JSON text',
  entry_date DATE COMMENT 'Date used for expiry, from the key or the value',
  written_at TIMESTAMP NOT NULL COMMENT 'When the row was last written',
  CONSTRAINT store_kv_pk PRIMARY KEY (ns, item_key)
) USING DELTA
COMMENT 'Market Intelligence Terminal saved results (src/lib/store)';

-- Line card snapshots: one JSON document per distributor per day.
CREATE TABLE IF NOT EXISTS store_snapshots (
  distributor STRING NOT NULL COMMENT 'Distributor slug, such as arrow',
  snap_date DATE NOT NULL COMMENT 'The day the snapshot was taken',
  document STRING NOT NULL COMMENT 'The snapshot as JSON text',
  written_at TIMESTAMP NOT NULL COMMENT 'When the row was last written',
  CONSTRAINT store_snapshots_pk PRIMARY KEY (distributor, snap_date)
) USING DELTA
COMMENT 'Market Intelligence Terminal line card snapshots (src/lib/store)';
