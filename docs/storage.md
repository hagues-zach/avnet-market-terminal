# Storage

Everything the app saves goes through `src/lib/store`. Today that is local files.
There are also adapters for Avnet's provisioned database, Databricks or Oracle
(which one isn't decided yet). Switching is a setting: no caller knows where its
data lives.

**Both database adapters are tested against fakes only. Neither has been run
against a real Databricks workspace or Oracle database yet.**

## The interface

`src/lib/store/types.ts`:

```ts
interface Store {
  get<T>(ns: string, key: string): Promise<T | undefined>;
  getAll<T>(ns: string): Promise<Record<string, T>>;
  set<T>(ns: string, key: string, value: T, expire?: Expiry<T>): Promise<void>;
  setMany<T>(ns: string, entries: Record<string, T>, expire?: Expiry<T>): Promise<void>;
}

interface Expiry<T> {
  days: number;
  dateOf: (key: string, value: T) => string | undefined; // YYYY-MM-DD
}
```

- Values are plain JSON.
- `setMany` adds or replaces the given entries and keeps the rest.
- `expire`, when given on a write, drops every entry in the namespace whose date is
  older than `days` ago (or that has no date). Callers that prune pass it on every
  write, so the namespace never grows without bound.
- Writes never throw. A lost write only costs a repeat call to Claude next time.

The adapter is chosen once in `src/lib/store/index.ts` from `STORE_ADAPTER`:
`file` (the default), `databricks` or `oracle`. It exports `store` and `snapshots`.
A missing setting for the chosen adapter stops the app at startup with an error
naming the setting.

## The file adapter

`src/lib/store/file.ts`. One JSON object per namespace at `.cache/ai/<ns>.json`
(not committed). Each process keeps what it wrote or read in memory in front of the
files, so on a read-only or per-instance disk (Vercel) results still last for the
life of the instance. Reads also go to the file, so another process's writes are
seen. Writes to one namespace run one at a time within a process.

Tests: `npx tsx src/lib/store/file.test.ts` (the shared contract, then the file layout).

## The database adapters

`src/lib/store/sql.ts` holds both stores over a small `SqlClient`
(`query(sql, params)` with `:name` parameters, returning rows as objects) and a
dialect per database. `databricks.ts` and `oracle.ts` supply the client and the
dialect.

| | Databricks | Oracle |
|---|---|---|
| `STORE_ADAPTER` | `databricks` | `oracle` |
| Client | `src/lib/databricks/client.ts`: the SQL Statement Execution REST API with plain fetch, no driver | `oracledb` in thin mode (pure JavaScript, no Instant Client), loaded with a dynamic import only when chosen |
| Settings | `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABRICKS_WAREHOUSE_ID`, and `DATABRICKS_CATALOG`, `DATABRICKS_SCHEMA` for where the tables are | `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING`; the tables are in that user's schema |
| Tables | Delta tables `store_kv` and `store_snapshots` | `STORE_KV` and `STORE_SNAPSHOTS` |
| JSON values | `STRING` | `CLOB` with an `IS JSON` check, bound as a CLOB |
| Table script | `db/migrations/databricks/001_store.sql` | `db/migrations/oracle/001_store.sql` |

How they work:

- **Writes** are `MERGE` upserts, 50 rows per statement, so `setMany` of many
  entries is a few round trips.
- **Expiry** stores the date `dateOf` gives each row in `entry_date` when it is
  written, then runs one `DELETE` of the namespace's rows dated before the cutoff
  or with no date. So a row written without an expiry is dropped by the
  namespace's next expiring write. Callers that prune pass the same expiry on
  every write, so this matches the file adapter for them.
- **Memory in front**: like the file adapter, each process keeps what it wrote or
  read, so a failed write still keeps its result for the life of the process.
- **Errors**: key-value reads and writes never throw; they log a warning
  (`store (databricks): write to ns failed: ...`) and carry on. Snapshot writes
  throw, and so do snapshot reads, so an outage isn't mistaken for having no
  snapshots.
- **Statements** start with a comment naming them, such as `/* store kv.upsert */`,
  which makes them easy to find in a warehouse's query history.

The Databricks client is usable on its own (the Avnet data layer uses it):

```ts
import { databricksQuery } from "@/lib/databricks/client";

const rows = await databricksQuery(
  "SELECT region, SUM(units) AS units FROM sales WHERE day >= :from GROUP BY region",
  { from: { type: "DATE", value: "2026-10-01" } },
);
```

It posts the statement, polls while it is `PENDING` or `RUNNING` (60 seconds in
all by default, then cancels it), follows result chunks, and converts values by
column type: integers, decimals and doubles to numbers, booleans to booleans,
`TIMESTAMP` to `Date`. `DATE` and `TIMESTAMP_NTZ` stay text, since neither has a
time zone. Failures throw a `DatabricksError` with a `kind` (`settings`, `http`,
`statement` or `timeout`), the statement state and the Databricks error code. The
token is never logged or put in an error. `databricksClient()` wraps it as a
`SqlClient`.

Oracle needs `oracledb` in `serverExternalPackages` in `next.config.mjs`, so it is
required from `node_modules` at run time and traced into a standalone build rather
than bundled.

Tests, all against fakes:

- `npx tsx src/lib/store/sql.test.ts`: the shared contract for both dialects over
  an in-memory fake database (`fake-sql.ts`, which carries out each statement by
  the comment that names it), the generated SQL against saved copies in
  `src/lib/store/sql-snapshots/`, batching, and the Oracle binds against a fake
  `oracledb`. After a deliberate change to the SQL, rerun with
  `UPDATE_SNAPSHOTS=1` and review the diff.
- `npx tsx src/lib/databricks/client.test.ts`: the client against a fake fetch.

The shared contract is `src/lib/store/contract.ts`. A new adapter should pass it.

## Namespaces today

| Namespace | Written by | Read by | Key | Value | Size seen | Pruned |
|---|---|---|---|---|---|---|
| `ask-claude-v3` | `src/lib/ask/claude.ts` | same | `YYYY-MM-DD question` (lower case, spaces collapsed) | Ask the Terminal `Answer` | about 3 KB each, a handful a day | 7 days, by the date in the key |
| `qbr-points-v1` | `src/lib/qbr/talking-points.ts` (QBR Prep, and the deck builder on a miss) | same, `src/lib/deck/preview.ts` | `slug\|meeting\|focus\|filed\|YYYY-Www` | `TalkingPoints` with `writtenAt` | about 3 KB each | 21 days, by `writtenAt` |
| `news-angles-v1` | `src/lib/ai/news-angles.ts` | same, `src/lib/qbr/gather.ts`, `src/lib/ask/answer.ts`, `src/components/overview/sections.tsx` | the story's URL | `{ relevance, angle }` | about 150 bytes each, 440 entries and growing | never |
| `commentary-v1` | `src/lib/ai/commentary.ts` | same | SEC accession number (`0000827054-26-000037`; the first ten digits are the filer's CIK) | `{ digest, filed, releaseUrl }` | about 2 to 3 KB each | never |

`ask-claude-v2` may still be on disk from before; nothing reads it.

Keys can be long (story URLs run to a few hundred characters) and contain any
character, so a database should store them as text, not as part of an identifier.

## Line card snapshots

`src/lib/store/snapshots.ts`, used only by `src/lib/line-cards/store.ts`. These stay
off the key-value `Store` because their files are part of the repo: snapshots under
`data/line-cards/<distributor>/<date>.json` are committed, shipped with the app,
pretty-printed for readable diffs and found by listing folders. The interface is:

```ts
interface SnapshotStore {
  distributors(): Promise<string[]>;
  dates(distributor: string): Promise<string[]>; // oldest first
  read<T>(distributor: string, date: string): Promise<T | null>;
  write<T>(distributor: string, date: string, snapshot: T): Promise<void>; // throws on failure
}
```

A snapshot is about 8 to 36 KB. Distributor slugs and dates are checked by the caller.

## Adding another adapter

1. Write `src/lib/store/<name>.ts` returning a `Store` (and a `SnapshotStore`). For
   another SQL database, this is a `SqlClient` and a `Dialect` for `sql.ts`.
2. Add a `case` for it in `choose()` in `src/lib/store/index.ts` and set `STORE_ADAPTER`.
3. Run `storeContract` from `src/lib/store/contract.ts` against it.

What it must do:

- **Key-value table**: one row per `(ns, key)` with a JSON value and a write time.
  `get` and `set` are a single row; `getAll` reads one namespace (hundreds of rows,
  under 100 KB in total today); `setMany` is an upsert of several rows.
- **Expiry**: either delete rows older than `days` by applying `dateOf` to each row
  on write, or store the date it returns in a column and delete by that. The second
  is cheaper; `dateOf` reads only the key or the value already being written.
- **Never throw on write**: log and carry on, as the file adapter does.
- **Snapshots**: one row per `(distributor, date)` with the snapshot as JSON. The
  committed files under `data/line-cards` are the seed data to load once.
- Keep a small in-process memory in front if round trips are slow; results are
  immutable once written, so it needs no invalidation.

Do not point an adapter at the production Supabase project; it is read only.
