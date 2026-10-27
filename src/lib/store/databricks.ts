import { databricksClient, databricksSettings, type QueryOptions } from "@/lib/databricks/client";
import { databricksDialect, sqlSnapshots, sqlStore, type Dialect, type SqlClient } from "./sql";

// The Databricks adapter: both stores as Delta tables in Unity Catalog, through
// the SQL Statement Execution API client in src/lib/databricks. Values are JSON
// text in STRING columns.
//
// Settings: DATABRICKS_HOST, DATABRICKS_TOKEN and DATABRICKS_WAREHOUSE_ID for the
// client, and DATABRICKS_CATALOG and DATABRICKS_SCHEMA for where the tables live
// (created by db/migrations/databricks/).
//
// Tested against a fake database and a fake fetch only (sql.test.ts and
// src/lib/databricks/client.test.ts); not yet run against a real workspace.
// Server-only.

const SETTINGS = [
  "DATABRICKS_HOST",
  "DATABRICKS_TOKEN",
  "DATABRICKS_WAREHOUSE_ID",
  "DATABRICKS_CATALOG",
  "DATABRICKS_SCHEMA",
] as const;

/**
 * The client and dialect for the DATABRICKS_* settings, and a description of where
 * they point (no token). Throws naming any setting that's missing.
 */
export function databricksConnection(
  env: Record<string, string | undefined> = process.env,
  options: Pick<QueryOptions, "timeoutMs"> = {},
): { client: SqlClient; dialect: Dialect; target: string } {
  const missing = SETTINGS.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`STORE_ADAPTER is "databricks" but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set.`);
  }
  const settings = databricksSettings(env);
  const catalog = env.DATABRICKS_CATALOG!.trim();
  const schema = env.DATABRICKS_SCHEMA!.trim();
  return {
    client: databricksClient({ ...options, settings }),
    dialect: databricksDialect(catalog, schema),
    target: `${settings.host}, warehouse ${settings.warehouseId}, tables in ${catalog}.${schema}`,
  };
}

/** Both stores on Databricks, from the DATABRICKS_* settings. Throws naming any that are missing. */
export function databricksStores(env: Record<string, string | undefined> = process.env) {
  const { client, dialect } = databricksConnection(env);
  return { kv: sqlStore(client, dialect), snapshots: sqlSnapshots(client, dialect) };
}
