// The live check (check.ts) against the fake database: it passes, leaves real
// data alone and removes its own rows, and a failing connection or missing
// tables stop it with a hint. Run with: npx tsx src/lib/store/check.test.ts
import assert from "node:assert/strict";
import { checkStore } from "./check";
import { fakeSql } from "./fake-sql";
import { databricksDialect, oracleDialect, sqlSnapshots, sqlStore, statements } from "./sql";

async function main() {
  for (const dialect of [databricksDialect("avnet_dev", "market_terminal"), oracleDialect()]) {
    // Real data already there.
    const db = fakeSql();
    await sqlStore(db, dialect).set("ask-claude-v3", "2026-10-27 q", { answer: "kept" });
    await sqlSnapshots(db, dialect).write("arrow", "2026-10-01", { lines: ["kept"] });

    const lines: string[] = [];
    const ok = await checkStore({ client: db, dialect, target: "the fake" }, { prefix: "zz-check-t-", report: (l) => lines.push(l) });
    assert.equal(ok, true, lines.join("\n"));
    assert.deepEqual(
      lines.map((l) => l.trim().split(/\s+/).slice(0, 2).join(" ")),
      [`Checking the`, "pass connect", "pass tables", "pass contract", "pass cleanup"],
    );
    assert.match(lines[2], /1 saved results, 1 snapshots/);

    // Its rows are gone and the real ones are untouched.
    const count = async (s: { sql: string; params: Record<string, string | number | boolean | null> }) =>
      Number((await db.query(s.sql, s.params))[0].n);
    const sql = statements(dialect);
    assert.equal(await count(sql.checkCountKv()), 1);
    assert.equal(await count(sql.checkCountSnapshots()), 1);
    assert.deepEqual(await sqlStore(db, dialect).get("ask-claude-v3", "2026-10-27 q"), { answer: "kept" });
    assert.deepEqual(await sqlSnapshots(db, dialect).distributors(), ["arrow"]);
    assert.ok(
      db.log.filter((s) => s.kind.startsWith("kv.") || s.kind.startsWith("snap.write")).every((s) =>
        String(s.params.ns ?? s.params.distributor).match(/^(zz-check-t-|ask-claude-v3$|arrow$)/),
      ),
      "every write is under the prefix, except the seed",
    );

    // A database that can't be reached stops at connect, with a hint for this database.
    const down = fakeSql();
    down.down = true;
    const failed: string[] = [];
    assert.equal(await checkStore({ client: down, dialect, target: "nowhere" }, { report: (l) => failed.push(l) }), false);
    assert.match(failed[1], /FAIL {2}connect/);
    assert.match(failed[2], dialect.name === "oracle" ? /ORACLE_CONNECT_STRING/ : /DATABRICKS_HOST/);
    assert.equal(failed.length, 3, "nothing after connect");

    // Missing tables stop at tables and point at the table script.
    const noTables = fakeSql();
    const missing: string[] = [];
    const client = {
      query: (text: string, params?: Record<string, string | number | boolean | null>) =>
        text.includes("COUNT(*)") ? Promise.reject(new Error("table not found")) : noTables.query(text, params),
    };
    assert.equal(await checkStore({ client, dialect, target: "empty" }, { report: (l) => missing.push(l) }), false);
    assert.match(missing[2], /FAIL {2}tables/);
    assert.match(missing[3], new RegExp(`db/migrations/${dialect.name}/001_store.sql`));
  }
  console.log("store check: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
