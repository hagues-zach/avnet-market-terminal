// The Databricks SQL client against a fake fetch: the request, parameters,
// polling to SUCCEEDED, result chunks, type conversion, a FAILED statement, an
// HTTP 401, a timeout and missing settings. Not yet run against a real workspace.
// Run with: npx tsx src/lib/databricks/client.test.ts
import assert from "node:assert/strict";
import { databricksClient, databricksQuery, databricksSettings, DatabricksError, type DatabricksSettings } from "./client";

const settings: DatabricksSettings = {
  host: "adb-123.4.azuredatabricks.net/",
  token: "dapi-secret-token",
  warehouseId: "wh-1",
};

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

/** A fake fetch answering each call with the next response in the list. */
function fakeFetch(responses: { status?: number; body: unknown }[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({
      method: init.method ?? "GET",
      url,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = responses.shift();
    if (!next) throw new Error(`fake fetch: no response left for ${init.method} ${url}`);
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetch: f, calls };
}

const manifest = {
  schema: {
    column_count: 6,
    columns: [
      { name: "region", type_name: "STRING", type_text: "STRING", position: 0 },
      { name: "units", type_name: "LONG", type_text: "BIGINT", position: 1 },
      { name: "revenue", type_name: "DECIMAL", type_text: "DECIMAL(18,2)", position: 2 },
      { name: "booked", type_name: "BOOLEAN", type_text: "BOOLEAN", position: 3 },
      { name: "day", type_name: "DATE", type_text: "DATE", position: 4 },
      { name: "at", type_name: "TIMESTAMP", type_text: "TIMESTAMP", position: 5 },
    ],
  },
};

const fast = { first: 1, max: 2 };

async function main() {
  // The request, then polling while PENDING and RUNNING, then rows by column.
  {
    const { fetch, calls } = fakeFetch([
      { body: { statement_id: "st-1", status: { state: "PENDING" } } },
      { body: { statement_id: "st-1", status: { state: "RUNNING" } } },
      {
        body: {
          statement_id: "st-1",
          status: { state: "SUCCEEDED" },
          manifest,
          result: {
            data_array: [["EMEA", "12", "1234.50", "true", "2026-10-26", "2026-10-26T12:30:00.000Z"]],
            next_chunk_internal_link: "/api/2.0/sql/statements/st-1/result/chunks/1",
          },
        },
      },
      { body: { chunk_index: 1, data_array: [["APAC", "9007199254740993", null, "false", null, null]] } },
    ]);
    const rows = await databricksQuery(
      "SELECT * FROM sales WHERE region = :region AND units > :min AND share < :share AND live = :live AND note = :note AND day = :day",
      { region: "EMEA", min: 10, share: 0.5, live: true, note: null, day: { type: "DATE", value: "2026-10-26" } },
      { settings, fetch, pollMs: fast },
    );

    const post = calls[0];
    assert.equal(post.method, "POST");
    assert.equal(post.url, "https://adb-123.4.azuredatabricks.net/api/2.0/sql/statements");
    assert.equal(post.headers.Authorization, "Bearer dapi-secret-token");
    assert.deepEqual(post.body, {
      statement:
        "SELECT * FROM sales WHERE region = :region AND units > :min AND share < :share AND live = :live AND note = :note AND day = :day",
      warehouse_id: "wh-1",
      parameters: [
        { name: "region", value: "EMEA", type: "STRING" },
        { name: "min", value: "10", type: "BIGINT" },
        { name: "share", value: "0.5", type: "DOUBLE" },
        { name: "live", value: "true", type: "BOOLEAN" },
        { name: "note", type: "STRING" },
        { name: "day", value: "2026-10-26", type: "DATE" },
      ],
      disposition: "INLINE",
      format: "JSON_ARRAY",
      wait_timeout: "10s",
      on_wait_timeout: "CONTINUE",
    });
    assert.deepEqual(
      calls.slice(1).map((c) => `${c.method} ${c.url}`),
      [
        "GET https://adb-123.4.azuredatabricks.net/api/2.0/sql/statements/st-1",
        "GET https://adb-123.4.azuredatabricks.net/api/2.0/sql/statements/st-1",
        "GET https://adb-123.4.azuredatabricks.net/api/2.0/sql/statements/st-1/result/chunks/1",
      ],
    );
    assert.deepEqual(rows, [
      {
        region: "EMEA",
        units: 12,
        revenue: 1234.5,
        booked: true,
        day: "2026-10-26",
        at: new Date("2026-10-26T12:30:00.000Z"),
      },
      { region: "APAC", units: "9007199254740993", revenue: null, booked: false, day: null, at: null },
    ]);
  }

  // A statement that finishes on the first call is not polled; the SqlClient wrapper passes through.
  {
    const { fetch, calls } = fakeFetch([
      {
        body: {
          statement_id: "st-2",
          status: { state: "SUCCEEDED" },
          manifest: { schema: { columns: [{ name: "n", type_name: "INT", position: 0 }] } },
          result: { data_array: [["1"]] },
        },
      },
    ]);
    assert.deepEqual(await databricksClient({ settings, fetch }).query("SELECT 1 AS n"), [{ n: 1 }]);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body?.parameters, []);
  }

  // A FAILED statement: a typed error with the state, code and message.
  {
    const { fetch } = fakeFetch([
      { body: { statement_id: "st-3", status: { state: "RUNNING" } } },
      {
        body: {
          statement_id: "st-3",
          status: {
            state: "FAILED",
            error: { error_code: "BAD_REQUEST", message: "[TABLE_OR_VIEW_NOT_FOUND] The table `nope` cannot be found." },
          },
        },
      },
    ]);
    await assert.rejects(databricksQuery("SELECT * FROM nope", {}, { settings, fetch, pollMs: fast }), (e) => {
      assert.ok(e instanceof DatabricksError);
      assert.equal(e.kind, "statement");
      assert.equal(e.state, "FAILED");
      assert.equal(e.code, "BAD_REQUEST");
      assert.equal(e.statementId, "st-3");
      assert.match(e.message, /FAILED: \[TABLE_OR_VIEW_NOT_FOUND\]/);
      return true;
    });
  }

  // CANCELED and CLOSED are failures too.
  for (const state of ["CANCELED", "CLOSED"]) {
    const { fetch } = fakeFetch([{ body: { statement_id: "st-4", status: { state } } }]);
    await assert.rejects(databricksQuery("SELECT 1", {}, { settings, fetch }), { kind: "statement", state });
  }

  // An HTTP 401: a typed error with the status, and the token appears nowhere in it.
  {
    const { fetch } = fakeFetch([
      { status: 401, body: { error_code: "UNAUTHENTICATED", message: "Invalid access token dapi-secret-token." } },
    ]);
    await assert.rejects(databricksQuery("SELECT 1", {}, { settings, fetch }), (e) => {
      assert.ok(e instanceof DatabricksError);
      assert.equal(e.kind, "http");
      assert.equal(e.status, 401);
      assert.equal(e.code, "UNAUTHENTICATED");
      assert.match(e.message, /HTTP 401/);
      assert.ok(!JSON.stringify({ ...e, message: e.message, stack: e.stack }).includes("dapi-secret-token"));
      return true;
    });
  }

  // A network failure says why, from fetch's cause.
  {
    const refused = (async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: new Error("connect ECONNREFUSED 10.0.0.1:443") });
    }) as unknown as typeof fetch;
    await assert.rejects(databricksQuery("SELECT 1", {}, { settings, fetch: refused }), {
      kind: "http",
      message: "Databricks request failed: fetch failed (connect ECONNREFUSED 10.0.0.1:443)",
    });
  }

  // A statement still running at the deadline is canceled, and the error says so.
  {
    const running = { body: { statement_id: "st-5", status: { state: "RUNNING" } } };
    const { fetch, calls } = fakeFetch([running, running, running, running, { body: {} }]);
    await assert.rejects(
      databricksQuery("SELECT slow()", {}, { settings, fetch, timeoutMs: 30, pollMs: { first: 10, max: 10 } }),
      { kind: "timeout", state: "RUNNING", statementId: "st-5" },
    );
    assert.equal(calls.at(-1)?.url, "https://adb-123.4.azuredatabricks.net/api/2.0/sql/statements/st-5/cancel");
  }

  // Missing settings name each one, and nothing is fetched.
  {
    assert.throws(() => databricksSettings({ DATABRICKS_HOST: "h" }), (e) => {
      assert.ok(e instanceof DatabricksError);
      assert.equal(e.kind, "settings");
      assert.match(e.message, /missing DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID/);
      return true;
    });
    const saved = { ...process.env };
    delete process.env.DATABRICKS_HOST;
    delete process.env.DATABRICKS_TOKEN;
    delete process.env.DATABRICKS_WAREHOUSE_ID;
    const { fetch, calls } = fakeFetch([]);
    await assert.rejects(databricksQuery("SELECT 1", {}, { fetch }), { kind: "settings" });
    assert.equal(calls.length, 0);
    process.env = saved;
  }

  console.log("databricks client: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
