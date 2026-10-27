// Checks a database storage adapter against the real database: it connects, finds
// both tables, runs the store contract on rows of its own and deletes them again.
// Real data is never read beyond row counts or changed. See src/lib/store/check.ts.
//
//   npx tsx scripts/check-store.ts             the adapter in STORE_ADAPTER
//   npx tsx scripts/check-store.ts oracle      a named one: databricks or oracle
//
// Settings come from the environment, then .env.local, then .env (the first one
// found wins for each setting). Exits 0 when every step passes, 1 when one fails,
// and 2 for a missing setting or an unknown adapter.

import { existsSync } from "node:fs";
import path from "node:path";
import { checkStore, type Connection } from "../src/lib/store/check";
import { databricksConnection } from "../src/lib/store/databricks";
import { oracleConnection } from "../src/lib/store/oracle";

const ROOT = path.resolve(__dirname, "..");

for (const file of [".env.local", ".env"]) {
  // loadEnvFile keeps a setting that's already there, so the environment wins.
  if (existsSync(path.join(ROOT, file))) process.loadEnvFile(path.join(ROOT, file));
}

async function main(): Promise<number> {
  const adapter = (process.argv[2] ?? process.env.STORE_ADAPTER ?? "").trim() || "file";
  if (adapter === "file") {
    console.log(
      "STORE_ADAPTER is \"file\" (local JSON), so there's no database to check. Set STORE_ADAPTER, or name one: npx tsx scripts/check-store.ts databricks",
    );
    return 0;
  }

  let conn: Connection & { close?: () => Promise<void> };
  try {
    if (adapter === "databricks") {
      // Five minutes per statement, so a stopped warehouse has time to start.
      conn = databricksConnection(process.env, { timeoutMs: 300_000 });
    } else if (adapter === "oracle") {
      const oracle = oracleConnection();
      conn = { ...oracle, close: () => oracle.client.close() };
    } else {
      console.error(`Unknown adapter "${adapter}". Use "databricks" or "oracle".`);
      return 2;
    }
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }

  try {
    const ok = await checkStore(conn);
    console.log(ok ? "All steps passed." : "The check failed; see above.");
    return ok ? 0 : 1;
  } finally {
    await conn.close?.().catch(() => undefined);
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
