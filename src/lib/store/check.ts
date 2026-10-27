import { storeContract } from "./contract";
import { sqlSnapshots, sqlStore, statements, type Dialect, type SqlClient, type Statement } from "./sql";

// The live check behind scripts/check-store.ts: runs against a real database what
// sql.test.ts runs against the fake. Steps, each reported as it finishes:
//   1. connect: one round trip.
//   2. tables: both tables can be read (their row counts).
//   3. contract: the shared store contract, on namespaces and distributors that
//      start with a prefix of the check's own, so real data is never touched.
//   4. cleanup: deletes every row under that prefix, whatever happened before.
// Needs the rights the app needs: read, insert, update and delete on both tables.

export interface Connection {
  client: SqlClient;
  dialect: Dialect;
  /** Where it points, for the report. Never holds a password or token. */
  target: string;
}

export interface CheckOptions {
  /** Every name the check writes starts with this. Default zz-check-<time>-. */
  prefix?: string;
  report?: (line: string) => void;
}

// What to look at when a step fails, per database.
const HINTS: Record<Dialect["name"], Record<"connect" | "tables" | "contract", string>> = {
  databricks: {
    connect:
      "Check DATABRICKS_HOST (the workspace URL), DATABRICKS_TOKEN (not expired) and DATABRICKS_WAREHOUSE_ID, and that the token's owner can use the warehouse.",
    tables:
      "Run db/migrations/databricks/001_store.sql in DATABRICKS_CATALOG and DATABRICKS_SCHEMA, and grant USE CATALOG, USE SCHEMA and SELECT to the token's owner.",
    contract:
      "Reads work but the store doesn't behave. A permissions error means the token's owner needs MODIFY on both tables; anything else, send the output above to whoever looks after the adapter.",
  },
  oracle: {
    connect:
      "Check ORACLE_CONNECT_STRING (host, port and service name), ORACLE_USER and ORACLE_PASSWORD, and that this machine can reach the database (VPN, firewall).",
    tables: "Run db/migrations/oracle/001_store.sql as ORACLE_USER; the tables must be in that user's schema.",
    contract:
      "Reads work but the store doesn't behave. ORA-01031 means ORACLE_USER lacks a right on the tables; anything else, send the output above to whoever looks after the adapter.",
  },
};

/** Runs the check and reports each step. Resolves true when every step passed. */
export async function checkStore(conn: Connection, options: CheckOptions = {}): Promise<boolean> {
  const { client, dialect } = conn;
  const report = options.report ?? console.log;
  const prefix = options.prefix ?? `zz-check-${Date.now().toString(36)}-`;
  const sql = statements(dialect);
  const run = (s: Statement) => client.query(s.sql, s.params);
  const hints = HINTS[dialect.name];

  report(`Checking the ${dialect.name} store: ${conn.target}`);

  async function step(name: string, body: () => Promise<string>, hint?: string): Promise<boolean> {
    const started = Date.now();
    try {
      const detail = await body();
      report(`  pass  ${name} (${Date.now() - started} ms)${detail ? `: ${detail}` : ""}`);
      return true;
    } catch (e) {
      report(`  FAIL  ${name} (${Date.now() - started} ms): ${(e as Error)?.message ?? e}`);
      if (hint) report(`        ${hint}`);
      return false;
    }
  }

  const connected = await step("connect", async () => {
    await run(sql.checkPing());
    return "";
  }, hints.connect);
  if (!connected) return false;

  const tables = await step("tables", async () => {
    const [kv] = await run(sql.checkCountKv());
    const [snaps] = await run(sql.checkCountSnapshots());
    return `${Number(kv?.n)} saved results, ${Number(snaps?.n)} snapshots`;
  }, hints.tables);
  if (!tables) return false;

  // The contract's failing writes are its own, against a database that's down by
  // design; keep their warnings out of the report, and show any others.
  const down: SqlClient = {
    query: async () => {
      throw new Error("down for the check");
    },
  };
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    const line = args.join(" ");
    if (!line.includes("down for the check")) warnings.push(line);
  };
  let passed = false;
  try {
    passed = await step("contract", async () => {
      await storeContract(
        {
          name: dialect.name,
          kv: () => sqlStore(client, dialect),
          snapshots: () => sqlSnapshots(client, dialect),
          broken: { kv: () => sqlStore(down, dialect), snapshots: () => sqlSnapshots(down, dialect) },
        },
        prefix,
      );
      return "reads, writes, expiry, large values and snapshots behave";
    }, hints.contract);
  } finally {
    console.warn = warn;
    for (const line of warnings) report(`        warning: ${line}`);
  }

  const cleaned = await step(`cleanup of ${prefix}*`, async () => {
    await run(sql.checkCleanupKv(prefix));
    await run(sql.checkCleanupSnapshots(prefix));
    return "";
  }, `Remove the check's rows by hand: ${sql.checkCleanupKv(prefix).sql} and ${sql.checkCleanupSnapshots(prefix).sql}, with :prefix = '${prefix}%'.`);

  return passed && cleaned;
}
