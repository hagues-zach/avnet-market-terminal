import type { SqlClient, SqlValue, StatementKind } from "./sql";

// A fake SqlClient for tests: it carries out the SQL adapter's statements in
// memory, keyed on the comment that names each statement rather than by parsing
// the SQL. It does check that the SQL's `:name` markers and the parameters passed
// match exactly, and it keeps every statement it ran. The same fake serves both
// dialects, since they share statement kinds and parameter names. Test-only.

interface KvRow {
  value: string;
  date: string | null;
}

export interface FakeSql extends SqlClient {
  /** Every statement run, in order. */
  log: { kind: StatementKind; sql: string; params: Record<string, SqlValue> }[];
  /** When set, every statement rejects, as if the database were down. */
  down: boolean;
}

export function fakeSql(): FakeSql {
  const kv = new Map<string, Map<string, KvRow>>();
  const snaps = new Map<string, Map<string, string>>();
  const ns = (name: string) => {
    let m = kv.get(name);
    if (!m) kv.set(name, (m = new Map()));
    return m;
  };

  const fake: FakeSql = {
    log: [],
    down: false,
    async query(sql, params = {}) {
      const kind = /^\/\* store (\S+) \*\//.exec(sql)?.[1] as StatementKind | undefined;
      if (!kind) throw new Error(`fake sql: statement has no store tag: ${sql.slice(0, 60)}`);
      const markers = new Set([...sql.matchAll(/:([A-Za-z_]\w*)/g)].map((m) => m[1]));
      const passed = new Set(Object.keys(params));
      for (const m of markers) if (!passed.has(m)) throw new Error(`fake sql: ${kind} uses :${m} but it wasn't passed`);
      for (const p of passed) if (!markers.has(p)) throw new Error(`fake sql: ${kind} was passed ${p} but doesn't use it`);
      fake.log.push({ kind, sql, params });
      // Let other writes interleave, as a real round trip would.
      await new Promise((r) => setImmediate(r));
      if (fake.down) throw new Error("fake sql: the database is down");

      const p = params as Record<string, string | null>;
      switch (kind) {
        case "kv.get": {
          const row = ns(p.ns!).get(p.item_key!);
          return row ? [{ item_value: row.value }] : [];
        }
        case "kv.getAll":
          return [...ns(p.ns!)].map(([item_key, row]) => ({ item_key, item_value: row.value }));
        case "kv.upsert": {
          for (let i = 0; `k${i}` in p; i++) ns(p.ns!).set(p[`k${i}`]!, { value: p[`json${i}`]!, date: p[`d${i}`] });
          return [];
        }
        case "kv.expire": {
          const m = ns(p.ns!);
          for (const [k, row] of [...m]) if (row.date === null || row.date < p.cutoff!) m.delete(k);
          return [];
        }
        case "snap.distributors":
          return [...snaps.keys()].sort().map((distributor) => ({ distributor }));
        case "snap.dates":
          return [...(snaps.get(p.distributor!)?.keys() ?? [])].sort().map((snap_date) => ({ snap_date }));
        case "snap.read": {
          const doc = snaps.get(p.distributor!)?.get(p.snap_date!);
          return doc === undefined ? [] : [{ document: doc }];
        }
        case "snap.write": {
          let m = snaps.get(p.distributor!);
          if (!m) snaps.set(p.distributor!, (m = new Map()));
          m.set(p.snap_date!, p.json!);
          return [];
        }
      }
    },
  };
  return fake;
}
