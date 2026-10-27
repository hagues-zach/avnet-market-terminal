import type { SnapshotStore } from "./snapshots";
import { cutoff, type Expiry, type Store } from "./types";

// Both stores over a database, through a small SqlClient, with a dialect per
// database (Databricks Delta tables or Oracle). The tables are created by the
// scripts in db/migrations/<dialect>/; see docs/storage.md.
//
// Key-value rows are (ns, item_key, item_value, entry_date, written_at). The value
// is the JSON text. entry_date is what the caller's Expiry.dateOf returns when the
// row is written, so expiry is one DELETE by date rather than reading every row
// back. A row written without an expiry has no date, and the namespace's next
// expiring write drops it, as the file adapter drops an entry dateOf can't date.
//
// Like the file adapter, each store keeps what it wrote or read in memory in front
// of the database: saved results never change once written, and a failed write
// still keeps its result for the life of the process. Key-value reads and writes
// never throw; they log and carry on. Snapshot writes throw, and so do snapshot
// reads, so a database outage isn't mistaken for having no snapshots.
//
// Tested against a fake SqlClient only (sql.test.ts); not yet run against a real
// Databricks or Oracle database. Server-only.

export type SqlValue = string | number | boolean | null;

/** Runs one statement with named parameters (`:name` in the SQL) and returns its rows. */
export interface SqlClient {
  query(sql: string, params?: Record<string, SqlValue>): Promise<Record<string, unknown>[]>;
}

/**
 * Parameters carrying JSON documents are named json, json0, json1 and so on, so an
 * adapter can bind them as large text (Oracle binds them as CLOBs).
 */
export const isJsonParam = (name: string) => /^json\d*$/.test(name);

/** What each statement does. Every statement starts with a comment naming it: `/* store kv.get *\/`. */
export type StatementKind =
  | "kv.get"
  | "kv.getAll"
  | "kv.upsert"
  | "kv.expire"
  | "snap.distributors"
  | "snap.dates"
  | "snap.read"
  | "snap.write";

export interface Statement {
  kind: StatementKind;
  sql: string;
  params: Record<string, SqlValue>;
}

export interface Dialect {
  name: "databricks" | "oracle";
  kvTable: string;
  snapshotTable: string;
  /** A YYYY-MM-DD text parameter as a DATE. */
  date(param: string): string;
  /** A DATE column as YYYY-MM-DD text. */
  dateText(column: string): string;
  now: string;
  /** What a SELECT with no table needs after it. */
  noTable: string;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function checkIdentifier(kind: string, name: string): string {
  if (!IDENTIFIER.test(name)) throw new Error(`Invalid ${kind} name "${name}": use letters, digits and underscores.`);
  return name;
}

/** Delta tables in Unity Catalog: <catalog>.<schema>.store_kv and store_snapshots. */
export function databricksDialect(catalog: string, schema: string): Dialect {
  const where = `\`${checkIdentifier("catalog", catalog)}\`.\`${checkIdentifier("schema", schema)}\``;
  return {
    name: "databricks",
    kvTable: `${where}.\`store_kv\``,
    snapshotTable: `${where}.\`store_snapshots\``,
    date: (p) => `CAST(:${p} AS DATE)`,
    dateText: (c) => `CAST(${c} AS STRING)`,
    now: "current_timestamp()",
    noTable: "",
  };
}

/** Oracle tables STORE_KV and STORE_SNAPSHOTS, in the connected user's schema unless one is given. */
export function oracleDialect(schema?: string): Dialect {
  const where = schema ? `${checkIdentifier("schema", schema).toUpperCase()}.` : "";
  return {
    name: "oracle",
    kvTable: `${where}STORE_KV`,
    snapshotTable: `${where}STORE_SNAPSHOTS`,
    date: (p) => `TO_DATE(:${p}, 'YYYY-MM-DD')`,
    dateText: (c) => `TO_CHAR(${c}, 'YYYY-MM-DD')`,
    now: "SYSTIMESTAMP",
    noTable: " FROM dual",
  };
}

/** Rows per MERGE, so one setMany of many entries is a few statements, not one huge one. */
export const UPSERT_BATCH = 50;

/** The statements an adapter runs, built per dialect. Exported for the SQL snapshot test. */
export function statements(d: Dialect) {
  const tag = (kind: StatementKind, sql: string, params: Record<string, SqlValue>): Statement => ({
    kind,
    sql: `/* store ${kind} */ ${sql}`,
    params,
  });

  return {
    kvGet: (ns: string, key: string) =>
      tag("kv.get", `SELECT item_value FROM ${d.kvTable} WHERE ns = :ns AND item_key = :item_key`, {
        ns,
        item_key: key,
      }),

    kvGetAll: (ns: string) =>
      tag("kv.getAll", `SELECT item_key, item_value FROM ${d.kvTable} WHERE ns = :ns`, { ns }),

    /** One MERGE for up to UPSERT_BATCH rows: [key, JSON text, YYYY-MM-DD or null]. */
    kvUpsert(ns: string, rows: [string, string, string | null][]) {
      const params: Record<string, SqlValue> = { ns };
      const source = rows
        .map(([key, json, date], i) => {
          params[`k${i}`] = key;
          params[`json${i}`] = json;
          params[`d${i}`] = date;
          return `SELECT :ns AS ns, :k${i} AS item_key, :json${i} AS item_value, ${d.date(`d${i}`)} AS entry_date${d.noTable}`;
        })
        .join(" UNION ALL ");
      return tag(
        "kv.upsert",
        `MERGE INTO ${d.kvTable} t USING (${source}) s ON (t.ns = s.ns AND t.item_key = s.item_key) ` +
          `WHEN MATCHED THEN UPDATE SET t.item_value = s.item_value, t.entry_date = s.entry_date, t.written_at = ${d.now} ` +
          `WHEN NOT MATCHED THEN INSERT (ns, item_key, item_value, entry_date, written_at) ` +
          `VALUES (s.ns, s.item_key, s.item_value, s.entry_date, ${d.now})`,
        params,
      );
    },

    /** Drops the namespace's rows dated before `from` (YYYY-MM-DD) or with no date. */
    kvExpire: (ns: string, from: string) =>
      tag(
        "kv.expire",
        `DELETE FROM ${d.kvTable} WHERE ns = :ns AND (entry_date IS NULL OR entry_date < ${d.date("cutoff")})`,
        { ns, cutoff: from },
      ),

    snapDistributors: () =>
      tag("snap.distributors", `SELECT DISTINCT distributor FROM ${d.snapshotTable} ORDER BY distributor`, {}),

    snapDates: (distributor: string) =>
      tag(
        "snap.dates",
        `SELECT ${d.dateText("snap_date")} AS snap_date FROM ${d.snapshotTable} WHERE distributor = :distributor ORDER BY snap_date`,
        { distributor },
      ),

    snapRead: (distributor: string, date: string) =>
      tag(
        "snap.read",
        `SELECT document FROM ${d.snapshotTable} WHERE distributor = :distributor AND snap_date = ${d.date("snap_date")}`,
        { distributor, snap_date: date },
      ),

    snapWrite: (distributor: string, date: string, json: string) =>
      tag(
        "snap.write",
        `MERGE INTO ${d.snapshotTable} t USING (SELECT :distributor AS distributor, ${d.date("snap_date")} AS snap_date, ` +
          `:json AS document${d.noTable}) s ON (t.distributor = s.distributor AND t.snap_date = s.snap_date) ` +
          `WHEN MATCHED THEN UPDATE SET t.document = s.document, t.written_at = ${d.now} ` +
          `WHEN NOT MATCHED THEN INSERT (distributor, snap_date, document, written_at) ` +
          `VALUES (s.distributor, s.snap_date, s.document, ${d.now})`,
        { distributor, snap_date: date, json },
      ),
  };
}

const run = (client: SqlClient, s: Statement) => client.query(s.sql, s.params);

// CLOBs can come back as something other than a string if a client isn't set to
// fetch them as text; JSON text is all this module stores.
const parse = <T>(value: unknown): T => JSON.parse(String(value)) as T;

function warn(d: Dialect, what: string, e: unknown) {
  console.warn(`store (${d.name}): ${what} failed: ${(e as Error)?.message ?? e}`);
}

/** The key-value Store over a database. */
export function sqlStore(client: SqlClient, dialect: Dialect): Store {
  const sql = statements(dialect);
  const memory = new Map<string, Map<string, unknown>>();
  const mem = (ns: string) => {
    let m = memory.get(ns);
    if (!m) memory.set(ns, (m = new Map()));
    return m;
  };

  async function write<T>(ns: string, entries: Record<string, T>, expire?: Expiry<T>): Promise<void> {
    const m = mem(ns);
    for (const [k, v] of Object.entries(entries)) m.set(k, v);
    const from = expire ? cutoff(expire.days) : "";
    if (expire) {
      for (const [k, v] of [...m]) if ((expire.dateOf(k, v as T) ?? "") < from) m.delete(k);
    }
    try {
      const rows = Object.entries(entries).map(
        ([k, v]): [string, string, string | null] => [k, JSON.stringify(v) ?? "null", expire?.dateOf(k, v) ?? null],
      );
      for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
        await run(client, sql.kvUpsert(ns, rows.slice(i, i + UPSERT_BATCH)));
      }
      if (expire) await run(client, sql.kvExpire(ns, from));
    } catch (e) {
      warn(dialect, `write to ${ns}`, e);
    }
  }

  return {
    async get<T>(ns: string, key: string) {
      const m = mem(ns);
      if (m.has(key)) return m.get(key) as T;
      try {
        const [row] = await run(client, sql.kvGet(ns, key));
        if (!row) return undefined;
        const value = parse<T>(row.item_value);
        m.set(key, value);
        return value;
      } catch (e) {
        warn(dialect, `read from ${ns}`, e);
        return undefined;
      }
    },
    async getAll<T>(ns: string) {
      const saved: Record<string, T> = {};
      try {
        for (const row of await run(client, sql.kvGetAll(ns))) saved[String(row.item_key)] = parse<T>(row.item_value);
      } catch (e) {
        warn(dialect, `read from ${ns}`, e);
      }
      return { ...saved, ...(Object.fromEntries(mem(ns)) as Record<string, T>) };
    },
    set: (ns, key, value, expire) => write(ns, { [key]: value }, expire),
    setMany: (ns, entries, expire) => write(ns, entries, expire),
  };
}

/** Line card snapshots over a database: one row per distributor per date. */
export function sqlSnapshots(client: SqlClient, dialect: Dialect): SnapshotStore {
  const sql = statements(dialect);
  return {
    async distributors() {
      return (await run(client, sql.snapDistributors())).map((r) => String(r.distributor));
    },
    async dates(distributor) {
      return (await run(client, sql.snapDates(distributor))).map((r) => String(r.snap_date)).sort();
    },
    async read<T>(distributor: string, date: string) {
      const [row] = await run(client, sql.snapRead(distributor, date));
      return row ? parse<T>(row.document) : null;
    },
    async write(distributor, date, snapshot) {
      await run(client, sql.snapWrite(distributor, date, JSON.stringify(snapshot)));
    },
  };
}
