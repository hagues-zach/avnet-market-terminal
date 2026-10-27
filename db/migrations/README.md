# Table scripts

The tables behind the database storage adapters in `src/lib/store` (see
`docs/storage.md`). There is one folder per database; run the one for the
`STORE_ADAPTER` you use. Scripts are numbered and run once each, in order.

Neither script has been run against a real database yet; the adapters are tested
against fakes only. After running one, check the adapter against it (next section).

| Script | Creates |
|---|---|
| `001_store.sql` | `store_kv` (namespace, key, JSON value, expiry date, written time) and `store_snapshots` (distributor, date, JSON document, written time), each with a primary key |

## Databricks

1. Choose the catalog and schema for the tables and set `DATABRICKS_CATALOG` and
   `DATABRICKS_SCHEMA` to them.
2. Edit the two `USE` lines at the top of `databricks/001_store.sql` to match.
3. Run the script in the Databricks SQL editor on the SQL warehouse the app uses
   (`DATABRICKS_WAREHOUSE_ID`), or with the Databricks CLI.
4. Grant the app's identity (the owner of `DATABRICKS_TOKEN`) `USE CATALOG`,
   `USE SCHEMA`, `SELECT` and `MODIFY` on the two tables.

The script uses `CREATE TABLE IF NOT EXISTS`, so running it again does nothing.

## Oracle

1. Connect as the app's user (`ORACLE_USER`), for example with SQLcl or SQL*Plus:

   ```bash
   sql "$ORACLE_USER@$ORACLE_CONNECT_STRING" @db/migrations/oracle/001_store.sql
   ```

2. The tables are created in that user's schema, which is where the adapter looks.

Oracle has no `CREATE TABLE IF NOT EXISTS` before 23ai, so running the script a
second time fails with ORA-00955 (name already used) and changes nothing.

## Check it works

With the settings in the environment or `.env.local`:

```bash
pnpm check:store databricks
```

(or `oracle`, or no argument to use `STORE_ADAPTER`). It connects, reads both
tables' row counts, runs the store contract on rows of its own (names starting
`zz-check-`) and deletes them again, printing a pass or fail line per step with a
hint for whatever failed. It never changes other rows. It needs the same rights
as the app: read, insert, update and delete on both tables.

## Seed data

The line card snapshots committed under `data/line-cards/<distributor>/<date>.json`
are the starting data for `store_snapshots`. Loading them is a one-time step that
isn't scripted yet.
