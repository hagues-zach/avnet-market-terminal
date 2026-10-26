// The SQL adapters over a fake database: the shared store contract for each
// dialect, the generated SQL against a saved copy per dialect, batching and
// expiry order, the Oracle binds, and the settings errors. None of this has run
// against a real Databricks or Oracle database.
// Run with: npx tsx src/lib/store/sql.test.ts
// After a deliberate change to the SQL: UPDATE_SNAPSHOTS=1 npx tsx src/lib/store/sql.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { storeContract } from "./contract";
import { databricksStores } from "./databricks";
import { fakeSql } from "./fake-sql";
import { oracleClient, oracleStores, type OracleDb } from "./oracle";
import { databricksDialect, oracleDialect, sqlSnapshots, sqlStore, statements, UPSERT_BATCH, type Dialect } from "./sql";

const dialects: Dialect[] = [databricksDialect("avnet_dev", "market_terminal"), oracleDialect()];

async function main() {
  // Writes that fail log a warning; keep them out of the test output but check they happen.
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args.join(" "));
  try {
    for (const dialect of dialects) {
      const db = fakeSql();
      const down = fakeSql();
      down.down = true;
      await storeContract({
        name: dialect.name,
        kv: () => sqlStore(db, dialect),
        snapshots: () => sqlSnapshots(db, dialect),
        broken: { kv: () => sqlStore(down, dialect), snapshots: () => sqlSnapshots(down, dialect) },
      });
      assert.ok(warnings.some((w) => w.includes(`store (${dialect.name}): write to ns failed`)), "failed writes are logged");

      // A big setMany is split into batches, and expiry runs after the upsert.
      const log = fakeSql();
      await sqlStore(log, dialect).setMany(
        "batch",
        Object.fromEntries(Array.from({ length: UPSERT_BATCH + 1 }, (_, i) => [`k${i}`, i])),
        { days: 7, dateOf: () => "2026-10-26" },
      );
      assert.deepEqual(
        log.log.map((s) => s.kind),
        ["kv.upsert", "kv.upsert", "kv.expire"],
      );

      // Reads that fail don't throw for the key-value store, and do for snapshots.
      assert.equal(await sqlStore(down, dialect).get("ns", "k"), undefined);
      assert.deepEqual(await sqlStore(down, dialect).getAll("ns"), {});
      await assert.rejects(sqlSnapshots(down, dialect).dates("arrow"));
    }
  } finally {
    console.warn = warn;
  }

  // The generated SQL, per dialect, against a saved copy.
  for (const dialect of dialects) {
    const sql = statements(dialect);
    const all = [
      sql.kvGet("ask-claude-v3", "2026-10-26 what is the book to bill"),
      sql.kvGetAll("news-angles-v1"),
      sql.kvUpsert("qbr-points-v1", [
        ["arrow|q3", '{"n":1}', "2026-10-26"],
        ["arrow|q4", '{"n":2}', null],
      ]),
      sql.kvExpire("ask-claude-v3", "2026-10-19"),
      sql.snapDistributors(),
      sql.snapDates("arrow"),
      sql.snapRead("arrow", "2026-10-01"),
      sql.snapWrite("arrow", "2026-10-01", '{"lines":[]}'),
    ];
    const text = all.map((s) => `${s.sql};\n-- ${JSON.stringify(s.params)}\n`).join("\n");
    const saved = path.join(__dirname, "sql-snapshots", `${dialect.name}.sql`);
    if (process.env.UPDATE_SNAPSHOTS || !existsSync(saved)) writeFileSync(saved, text);
    assert.equal(text, readFileSync(saved, "utf8"), `${dialect.name} SQL changed; rerun with UPDATE_SNAPSHOTS=1 if meant`);
  }

  // Names that would break out of a quoted identifier are refused.
  assert.throws(() => databricksDialect("avnet`; DROP", "x"), /Invalid catalog name/);
  assert.throws(() => oracleDialect("a.b"), /Invalid schema name/);

  // The Oracle client: JSON documents bound as CLOBs, booleans as numbers, column
  // names lower-cased, autoCommit on, the connection closed, CLOBs fetched as text.
  const executed: { sql: string; binds: Record<string, unknown>; options: unknown }[] = [];
  let closed = 0;
  let pools = 0;
  const fakeOracle: OracleDb = {
    CLOB: "CLOB",
    OUT_FORMAT_OBJECT: 4002,
    fetchAsString: [],
    async createPool(config) {
      pools++;
      assert.deepEqual(config, { user: "u", password: "p", connectString: "db:1521/svc", poolMin: 0, poolMax: 4 });
      return {
        async getConnection() {
          return {
            async execute(sql, binds, options) {
              executed.push({ sql, binds, options });
              return { rows: [{ ITEM_KEY: "k", ITEM_VALUE: '{"n":1}' }] };
            },
            async close() {
              closed++;
            },
          };
        },
      };
    },
  };
  const client = oracleClient({ user: "u", password: "p", connectString: "db:1521/svc" }, async () => fakeOracle);
  const rows = await client.query("SELECT 1 FROM dual", { json0: '{"n":1}', k0: "k", flag: true, none: null });
  await client.query("SELECT 2 FROM dual", {});
  assert.deepEqual(rows, [{ item_key: "k", item_value: '{"n":1}' }]);
  assert.deepEqual(executed[0].binds, { json0: { val: '{"n":1}', type: "CLOB" }, k0: "k", flag: 1, none: null });
  assert.deepEqual(executed[0].options, { outFormat: 4002, autoCommit: true });
  assert.deepEqual(fakeOracle.fetchAsString, ["CLOB"]);
  assert.equal(closed, 2);
  assert.equal(pools, 1, "one pool for the process");

  // Missing settings name every one that's missing, before anything connects.
  assert.throws(
    () => oracleStores({ ORACLE_USER: "u" }),
    /STORE_ADAPTER is "oracle" but ORACLE_PASSWORD, ORACLE_CONNECT_STRING are not set/,
  );
  assert.throws(
    () => databricksStores({ DATABRICKS_HOST: "h", DATABRICKS_TOKEN: "t", DATABRICKS_WAREHOUSE_ID: "w" }),
    /STORE_ADAPTER is "databricks" but DATABRICKS_CATALOG, DATABRICKS_SCHEMA are not set/,
  );
  assert.ok(databricksStores({
    DATABRICKS_HOST: "h",
    DATABRICKS_TOKEN: "t",
    DATABRICKS_WAREHOUSE_ID: "w",
    DATABRICKS_CATALOG: "c",
    DATABRICKS_SCHEMA: "s",
  }).kv);

  console.log("sql stores: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
