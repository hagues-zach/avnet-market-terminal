import type { SqlClient, SqlValue } from "@/lib/store/sql";

// A small client for Databricks' SQL Statement Execution API (REST, plain fetch,
// no driver). A statement is posted to a SQL warehouse; if it hasn't finished
// within the first wait it is polled until it does, up to a total timeout. Results
// come back inline as JSON arrays and are turned into one object per row, with
// numbers, booleans and timestamps converted by column type.
//
// Settings: DATABRICKS_HOST (the workspace URL), DATABRICKS_TOKEN (a personal access
// token or service principal token) and DATABRICKS_WAREHOUSE_ID. The token is only
// ever sent in the Authorization header; it is never logged or put in an error.
//
// Tested against a fake fetch only (client.test.ts); not yet run against a real
// workspace. Server-only.
//
// API reference: https://docs.databricks.com/api/workspace/statementexecution

export interface DatabricksSettings {
  /** Workspace URL, such as https://adb-1234567890123456.7.azuredatabricks.net */
  host: string;
  token: string;
  warehouseId: string;
  /** Default catalog and schema for unqualified table names. */
  catalog?: string;
  schema?: string;
}

/** A parameter with an explicit SQL type, such as { type: "DATE", value: "2026-10-26" }. */
export interface TypedParam {
  type: string;
  value: string | null;
}

export type DatabricksParam = SqlValue | Date | TypedParam;

export interface QueryOptions {
  /** Defaults to the DATABRICKS_* settings in the environment. */
  settings?: DatabricksSettings;
  /** Total time allowed for the statement, polling included. Default 60 seconds. */
  timeoutMs?: number;
  /** For tests. */
  fetch?: typeof fetch;
  /** First and longest pause between polls. Default 250 ms, growing to 2 seconds. */
  pollMs?: { first: number; max: number };
}

export type DatabricksErrorKind = "settings" | "http" | "statement" | "timeout";

/** Every failure from this client: missing settings, an HTTP error, a failed statement or a timeout. */
export class DatabricksError extends Error {
  readonly kind: DatabricksErrorKind;
  /** HTTP status, for kind "http". */
  readonly status?: number;
  /** Statement state, for kind "statement" or "timeout": FAILED, CANCELED, CLOSED, PENDING or RUNNING. */
  readonly state?: string;
  /** Databricks error code, such as BAD_REQUEST or PERMISSION_DENIED. */
  readonly code?: string;
  readonly statementId?: string;

  constructor(
    kind: DatabricksErrorKind,
    message: string,
    detail: { status?: number; state?: string; code?: string; statementId?: string } = {},
  ) {
    super(message);
    this.name = "DatabricksError";
    this.kind = kind;
    Object.assign(this, detail);
  }
}

/** Reads the DATABRICKS_* settings, or throws a DatabricksError naming every one that's missing. */
export function databricksSettings(env: Record<string, string | undefined> = process.env): DatabricksSettings {
  const required = ["DATABRICKS_HOST", "DATABRICKS_TOKEN", "DATABRICKS_WAREHOUSE_ID"] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new DatabricksError("settings", `Databricks is not set up: missing ${missing.join(", ")}.`);
  }
  return {
    host: env.DATABRICKS_HOST!.trim(),
    token: env.DATABRICKS_TOKEN!.trim(),
    warehouseId: env.DATABRICKS_WAREHOUSE_ID!.trim(),
  };
}

/**
 * Runs one SQL statement and returns its rows as objects keyed by column name.
 * Parameters are named: write `:name` in the SQL and pass { name: value }.
 * Strings, numbers, booleans and null are typed for you; pass { type, value } for
 * anything else (a DATE, a DECIMAL). Throws a DatabricksError on any failure.
 */
export async function databricksQuery(
  sql: string,
  params: Record<string, DatabricksParam> = {},
  options: QueryOptions = {},
): Promise<Record<string, unknown>[]> {
  const settings = options.settings ?? databricksSettings();
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const poll = options.pollMs ?? { first: 250, max: 2_000 };
  const base = baseUrl(settings.host);
  const deadline = Date.now() + timeoutMs;

  const call = async (method: "GET" | "POST", path: string, body?: unknown): Promise<StatementResponse> => {
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${settings.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now() + 5_000)),
      });
    } catch (e) {
      // fetch says only "fetch failed"; the reason (DNS, refused, TLS) is in its cause.
      const cause = (e as { cause?: { message?: string } }).cause?.message;
      const why = `${(e as Error).message}${cause ? ` (${cause})` : ""}`;
      throw new DatabricksError("http", scrub(`Databricks request failed: ${why}`, settings.token));
    }
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      const err = json as { error_code?: string; message?: string };
      const why = err.message ?? (text.slice(0, 200) || res.statusText);
      throw new DatabricksError("http", scrub(`Databricks returned HTTP ${res.status}: ${why}`, settings.token), {
        status: res.status,
        code: err.error_code,
      });
    }
    return json as StatementResponse;
  };

  // Wait up to 10 seconds on the first call (the API allows 5 to 50), then poll.
  const firstWait = Math.min(10, Math.max(5, Math.floor(timeoutMs / 1000)));
  let response = await call("POST", "/api/2.0/sql/statements", {
    statement: sql,
    warehouse_id: settings.warehouseId,
    ...(settings.catalog ? { catalog: settings.catalog } : {}),
    ...(settings.schema ? { schema: settings.schema } : {}),
    parameters: Object.entries(params).map(([name, value]) => toParameter(name, value)),
    disposition: "INLINE",
    format: "JSON_ARRAY",
    wait_timeout: `${firstWait}s`,
    on_wait_timeout: "CONTINUE",
  });

  const id = response.statement_id;
  let pause = poll.first;
  while (isRunning(response)) {
    if (Date.now() + pause > deadline) {
      // Best effort: don't leave the statement running on the warehouse.
      await call("POST", `/api/2.0/sql/statements/${id}/cancel`).catch(() => undefined);
      throw new DatabricksError("timeout", `Databricks statement did not finish within ${timeoutMs} ms.`, {
        state: response.status?.state,
        statementId: id,
      });
    }
    await new Promise((r) => setTimeout(r, pause));
    pause = Math.min(poll.max, pause * 2);
    response = await call("GET", `/api/2.0/sql/statements/${id}`);
  }

  const state = response.status?.state;
  if (state !== "SUCCEEDED") {
    const error = response.status?.error;
    throw new DatabricksError(
      "statement",
      scrub(`Databricks statement ${state ?? "ended"}${error?.message ? `: ${error.message}` : "."}`, settings.token),
      { state, code: error?.error_code, statementId: id },
    );
  }

  const columns = [...(response.manifest?.schema?.columns ?? [])].sort((a, b) => a.position - b.position);
  const rows: (string | null)[][] = [...(response.result?.data_array ?? [])];
  // Large results come in chunks; follow the links until there are no more.
  let next = response.result?.next_chunk_internal_link;
  while (next) {
    const chunk = (await call("GET", next)) as ResultChunk;
    rows.push(...(chunk.data_array ?? []));
    next = chunk.next_chunk_internal_link;
  }
  return rows.map((row) => Object.fromEntries(columns.map((c) => [c.name, convert(row[c.position], c.type_name)])));
}

/** A SqlClient over databricksQuery, for the storage adapters and anything else that wants one. */
export function databricksClient(options: QueryOptions = {}): SqlClient {
  return { query: (sql, params) => databricksQuery(sql, params, options) };
}

interface Column {
  name: string;
  type_name: string;
  position: number;
}

interface ResultChunk {
  data_array?: (string | null)[][];
  next_chunk_internal_link?: string;
}

interface StatementResponse {
  statement_id: string;
  status?: { state?: string; error?: { error_code?: string; message?: string } };
  manifest?: { schema?: { columns?: Column[] } };
  result?: ResultChunk;
}

const isRunning = (r: StatementResponse) => r.status?.state === "PENDING" || r.status?.state === "RUNNING";

function baseUrl(host: string): string {
  const withScheme = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}

function toParameter(name: string, value: DatabricksParam): { name: string; value?: string; type: string } {
  if (value === null) return { name, type: "STRING" };
  if (value instanceof Date) return { name, value: value.toISOString(), type: "TIMESTAMP" };
  if (typeof value === "object") return value.value === null ? { name, type: value.type } : { name, type: value.type, value: value.value };
  if (typeof value === "boolean") return { name, value: String(value), type: "BOOLEAN" };
  if (typeof value === "number") {
    return { name, value: String(value), type: Number.isInteger(value) ? "BIGINT" : "DOUBLE" };
  }
  return { name, value, type: "STRING" };
}

// JSON_ARRAY results carry every value as a string (or null). Integers outside
// the safe range and DATEs stay strings: a DATE has no time zone, so it is kept
// as YYYY-MM-DD rather than turned into a Date at some midnight. DECIMALs become
// numbers, which is fine for the money and counts this app reads.
function convert(value: string | null | undefined, type: string): unknown {
  if (value === null || value === undefined) return null;
  switch (type) {
    case "BYTE":
    case "SHORT":
    case "INT":
    case "LONG": {
      const n = Number(value);
      return Number.isSafeInteger(n) ? n : value;
    }
    case "FLOAT":
    case "DOUBLE":
    case "DECIMAL":
      return Number(value);
    case "BOOLEAN":
      return value === "true";
    // TIMESTAMP_NTZ has no time zone either, so it stays a string too.
    case "TIMESTAMP": {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d;
    }
    default:
      return value;
  }
}

function scrub(message: string, token: string): string {
  return token ? message.split(token).join("[token]") : message;
}
