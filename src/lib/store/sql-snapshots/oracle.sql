/* store kv.get */ SELECT item_value FROM STORE_KV WHERE ns = :ns AND item_key = :item_key;
-- {"ns":"ask-claude-v3","item_key":"2026-10-26 what is the book to bill"}

/* store kv.getAll */ SELECT item_key, item_value FROM STORE_KV WHERE ns = :ns;
-- {"ns":"news-angles-v1"}

/* store kv.upsert */ MERGE INTO STORE_KV t USING (SELECT :ns AS ns, :k0 AS item_key, :json0 AS item_value, TO_DATE(:d0, 'YYYY-MM-DD') AS entry_date FROM dual UNION ALL SELECT :ns AS ns, :k1 AS item_key, :json1 AS item_value, TO_DATE(:d1, 'YYYY-MM-DD') AS entry_date FROM dual) s ON (t.ns = s.ns AND t.item_key = s.item_key) WHEN MATCHED THEN UPDATE SET t.item_value = s.item_value, t.entry_date = s.entry_date, t.written_at = SYSTIMESTAMP WHEN NOT MATCHED THEN INSERT (ns, item_key, item_value, entry_date, written_at) VALUES (s.ns, s.item_key, s.item_value, s.entry_date, SYSTIMESTAMP);
-- {"ns":"qbr-points-v1","k0":"arrow|q3","json0":"{\"n\":1}","d0":"2026-10-26","k1":"arrow|q4","json1":"{\"n\":2}","d1":null}

/* store kv.expire */ DELETE FROM STORE_KV WHERE ns = :ns AND (entry_date IS NULL OR entry_date < TO_DATE(:cutoff, 'YYYY-MM-DD'));
-- {"ns":"ask-claude-v3","cutoff":"2026-10-19"}

/* store snap.distributors */ SELECT DISTINCT distributor FROM STORE_SNAPSHOTS ORDER BY distributor;
-- {}

/* store snap.dates */ SELECT TO_CHAR(snap_date, 'YYYY-MM-DD') AS snap_date FROM STORE_SNAPSHOTS WHERE distributor = :distributor ORDER BY snap_date;
-- {"distributor":"arrow"}

/* store snap.read */ SELECT document FROM STORE_SNAPSHOTS WHERE distributor = :distributor AND snap_date = TO_DATE(:snap_date, 'YYYY-MM-DD');
-- {"distributor":"arrow","snap_date":"2026-10-01"}

/* store snap.write */ MERGE INTO STORE_SNAPSHOTS t USING (SELECT :distributor AS distributor, TO_DATE(:snap_date, 'YYYY-MM-DD') AS snap_date, :json AS document FROM dual) s ON (t.distributor = s.distributor AND t.snap_date = s.snap_date) WHEN MATCHED THEN UPDATE SET t.document = s.document, t.written_at = SYSTIMESTAMP WHEN NOT MATCHED THEN INSERT (distributor, snap_date, document, written_at) VALUES (s.distributor, s.snap_date, s.document, SYSTIMESTAMP);
-- {"distributor":"arrow","snap_date":"2026-10-01","json":"{\"lines\":[]}"}

/* store check.ping */ SELECT 1 AS ok FROM dual;
-- {}

/* store check.countKv */ SELECT COUNT(*) AS n FROM STORE_KV;
-- {}

/* store check.countSnapshots */ SELECT COUNT(*) AS n FROM STORE_SNAPSHOTS;
-- {}

/* store check.cleanupKv */ DELETE FROM STORE_KV WHERE ns LIKE :prefix;
-- {"prefix":"zz-check-abc-%"}

/* store check.cleanupSnapshots */ DELETE FROM STORE_SNAPSHOTS WHERE distributor LIKE :prefix;
-- {"prefix":"zz-check-abc-%"}
