-- Storage layer tables on Oracle, for STORE_ADAPTER=oracle.
-- Run once as ORACLE_USER (the tables go in that user's schema). Needs Oracle
-- 12.2 or later for the IS JSON checks. See db/migrations/README.md.
-- Not yet run against a real database.

-- Saved results: one row per namespace and key. item_value is the JSON text.
-- entry_date is the date the app's expiry rule gives the row (null when the
-- namespace isn't pruned); expiry deletes by it. item_key is sized in bytes so
-- the primary key index fits an 8 KB block; keys today are a few hundred bytes.
CREATE TABLE store_kv (
  ns          VARCHAR2(100 BYTE)  NOT NULL,
  item_key    VARCHAR2(2000 BYTE) NOT NULL,
  item_value  CLOB                NOT NULL,
  entry_date  DATE,
  written_at  TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT store_kv_pk PRIMARY KEY (ns, item_key),
  CONSTRAINT store_kv_value_json CHECK (item_value IS JSON)
);

CREATE INDEX store_kv_expiry ON store_kv (ns, entry_date);

COMMENT ON TABLE store_kv IS 'Market Intelligence Terminal saved results (src/lib/store)';

-- Line card snapshots: one JSON document per distributor per day.
CREATE TABLE store_snapshots (
  distributor VARCHAR2(100 BYTE) NOT NULL,
  snap_date   DATE               NOT NULL,
  document    CLOB               NOT NULL,
  written_at  TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT store_snapshots_pk PRIMARY KEY (distributor, snap_date),
  CONSTRAINT store_snapshots_document_json CHECK (document IS JSON)
);

COMMENT ON TABLE store_snapshots IS 'Market Intelligence Terminal line card snapshots (src/lib/store)';
