/* store kv.get */ SELECT item_value FROM `avnet_dev`.`market_terminal`.`store_kv` WHERE ns = :ns AND item_key = :item_key;
-- {"ns":"ask-claude-v3","item_key":"2026-10-26 what is the book to bill"}

/* store kv.getAll */ SELECT item_key, item_value FROM `avnet_dev`.`market_terminal`.`store_kv` WHERE ns = :ns;
-- {"ns":"news-angles-v1"}

/* store kv.upsert */ MERGE INTO `avnet_dev`.`market_terminal`.`store_kv` t USING (SELECT :ns AS ns, :k0 AS item_key, :json0 AS item_value, CAST(:d0 AS DATE) AS entry_date UNION ALL SELECT :ns AS ns, :k1 AS item_key, :json1 AS item_value, CAST(:d1 AS DATE) AS entry_date) s ON (t.ns = s.ns AND t.item_key = s.item_key) WHEN MATCHED THEN UPDATE SET t.item_value = s.item_value, t.entry_date = s.entry_date, t.written_at = current_timestamp() WHEN NOT MATCHED THEN INSERT (ns, item_key, item_value, entry_date, written_at) VALUES (s.ns, s.item_key, s.item_value, s.entry_date, current_timestamp());
-- {"ns":"qbr-points-v1","k0":"arrow|q3","json0":"{\"n\":1}","d0":"2026-10-26","k1":"arrow|q4","json1":"{\"n\":2}","d1":null}

/* store kv.expire */ DELETE FROM `avnet_dev`.`market_terminal`.`store_kv` WHERE ns = :ns AND (entry_date IS NULL OR entry_date < CAST(:cutoff AS DATE));
-- {"ns":"ask-claude-v3","cutoff":"2026-10-19"}

/* store snap.distributors */ SELECT DISTINCT distributor FROM `avnet_dev`.`market_terminal`.`store_snapshots` ORDER BY distributor;
-- {}

/* store snap.dates */ SELECT CAST(snap_date AS STRING) AS snap_date FROM `avnet_dev`.`market_terminal`.`store_snapshots` WHERE distributor = :distributor ORDER BY snap_date;
-- {"distributor":"arrow"}

/* store snap.read */ SELECT document FROM `avnet_dev`.`market_terminal`.`store_snapshots` WHERE distributor = :distributor AND snap_date = CAST(:snap_date AS DATE);
-- {"distributor":"arrow","snap_date":"2026-10-01"}

/* store snap.write */ MERGE INTO `avnet_dev`.`market_terminal`.`store_snapshots` t USING (SELECT :distributor AS distributor, CAST(:snap_date AS DATE) AS snap_date, :json AS document) s ON (t.distributor = s.distributor AND t.snap_date = s.snap_date) WHEN MATCHED THEN UPDATE SET t.document = s.document, t.written_at = current_timestamp() WHEN NOT MATCHED THEN INSERT (distributor, snap_date, document, written_at) VALUES (s.distributor, s.snap_date, s.document, current_timestamp());
-- {"distributor":"arrow","snap_date":"2026-10-01","json":"{\"lines\":[]}"}
