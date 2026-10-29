import { isJsonParam, oracleDialect, sqlSnapshots, sqlStore, type Dialect, type SqlClient, type SqlValue } from "./sql";

// The Oracle adapter: both stores over oracledb in thin mode (pure JavaScript, so
// no Oracle Instant Client to install). oracledb is loaded with a dynamic import
// the first time a statement runs, so it is only loaded when STORE_ADAPTER is
// "oracle". JSON documents are bound as CLOBs and CLOBs are fetched as text.
//
// Settings: ORACLE_USER, ORACLE_PASSWORD and ORACLE_CONNECT_STRING (an Easy Connect
// string such as dbhost.avnet.com:1521/servicename, or a TNS alias). Tables come
// from db/migrations/oracle/.
//
// Tested against a fake database and a fake oracledb only (sql.test.ts); not yet
// run against a real Oracle database. Server-only.

export interface OracleSettings {
  user: string;
  password: string;
  connectString: string;
}

/** Reads the ORACLE_* settings, or throws naming every one that's missing. */
export function oracleSettings(env: Record<string, string | undefined> = process.env): OracleSettings {
  const required = ["ORACLE_USER", "ORACLE_PASSWORD", "ORACLE_CONNECT_STRING"] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`STORE_ADAPTER is "oracle" but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not set.`);
  }
  return { user: env.ORACLE_USER!.trim(), password: env.ORACLE_PASSWORD!, connectString: env.ORACLE_CONNECT_STRING!.trim() };
}

// The parts of oracledb used here, so the rest of the module is typed.
interface Connection {
  execute(
    sql: string,
    binds: Record<string, unknown>,
    options: { outFormat: number; autoCommit: boolean },
  ): Promise<{ rows?: Record<string, unknown>[] }>;
  close(): Promise<void>;
}

interface Pool {
  getConnection(): Promise<Connection>;
  close(drainTime?: number): Promise<void>;
}

export interface OracleDb {
  CLOB: unknown;
  OUT_FORMAT_OBJECT: number;
  fetchAsString: unknown[];
  createPool(config: { user: string; password: string; connectString: string; poolMin: number; poolMax: number }): Promise<Pool>;
}

/**
 * A SqlClient over a pool from `load`, plus `close` to end the pool (the app never
 * needs to; a script does, so it can exit). Exported so a test can pass a fake oracledb.
 */
export function oracleClient(
  settings: OracleSettings,
  load: () => Promise<OracleDb>,
): SqlClient & { close(): Promise<void> } {
  let ready: Promise<{ db: OracleDb; pool: Pool }> | undefined;
  const connect = () =>
    (ready ??= (async () => {
      const db = await load();
      db.fetchAsString = [db.CLOB];
      const pool = await db.createPool({ ...settings, poolMin: 0, poolMax: 4 });
      return { db, pool };
    })().catch((e) => {
      ready = undefined; // try again on the next statement
      throw e;
    }));

  return {
    async close() {
      const open = ready;
      ready = undefined;
      if (open) await (await open).pool.close(0);
    },
    async query(sql, params = {}) {
      const { db, pool } = await connect();
      const binds = Object.fromEntries(
        Object.entries(params).map(([name, value]) => [name, bind(db, name, value)]),
      );
      const connection = await pool.getConnection();
      try {
        const result = await connection.execute(sql, binds, { outFormat: db.OUT_FORMAT_OBJECT, autoCommit: true });
        // Oracle gives unquoted column names in upper case; the stores use lower case.
        return (result.rows ?? []).map((row) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])),
        );
      } finally {
        await connection.close();
      }
    },
  };
}

function bind(db: OracleDb, name: string, value: SqlValue): unknown {
  if (isJsonParam(name) && typeof value === "string") return { val: value, type: db.CLOB };
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

/**
 * The client and dialect for the ORACLE_* settings, and a description of where they
 * point (no password). Throws naming any setting that's missing.
 */
export function oracleConnection(env: Record<string, string | undefined> = process.env): {
  client: SqlClient & { close(): Promise<void> };
  dialect: Dialect;
  target: string;
} {
  const settings = oracleSettings(env);
  // oracledb is in serverExternalPackages in next.config.mjs, so it is required at
  // run time from node_modules rather than bundled.
  const client = oracleClient(settings, async () => {
    const mod = (await import("oracledb")) as OracleDb & { default?: OracleDb };
    return mod.default ?? mod;
  });
  return { client, dialect: oracleDialect(), target: `${settings.user} at ${settings.connectString}` };
}

/** Both stores on Oracle, from the ORACLE_* settings. */
export function oracleStores(env: Record<string, string | undefined> = process.env) {
  const { client, dialect } = oracleConnection(env);
  return { kv: sqlStore(client, dialect), snapshots: sqlSnapshots(client, dialect) };
}
