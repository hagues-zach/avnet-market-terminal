// The Databricks adapter on fake view rows: the mock model written out as the
// terminal_* views would hold it comes back unchanged, passes the contract, and
// bad rows fail loudly. Run with: npx tsx src/lib/avnet/databricks/adapter.test.ts
import assert from "node:assert/strict";

import { checkContract } from "../contract";
import type { AvnetInputs } from "../contracts";
import { buildModel } from "../derive";
import { avnetSource, loadInputs, mockedDatasets, withMock } from "../index";
import { mockAccount, mockInputs } from "../mock";
import { ContractError, databricksSource, type Row, type RunQuery } from "./adapter";
import { QUERIES, type QueryName } from "./queries";

const m = mockInputs();
const ends = new Map(m.fiscalCalendar.map((q) => [q.label, q.end]));

/** The mock as view rows, in the order each query asks for. */
function viewRows(d: AvnetInputs): Record<QueryName, Row[]> {
  const p = d.pipeline;
  const groups = (grouping: string, rows: typeof p.bySupplier) =>
    rows.flatMap((g) =>
      (["submitted", "approved", "production", "billing"] as const).map((stage) => ({
        grouping,
        name: g.name,
        stage,
        registrations: g.funnel[stage].count,
        value_usd_m: g.funnel[stage].value,
        pipeline_change: g.change,
        billings_usd_m: g.billings,
        stalled: g.stalled,
      })),
    );
  const reg = (list: string, r: { reg: string; supplier: string; segment: string; value: number; months?: number; daysAgo?: number }) => ({
    list,
    registration: r.reg,
    supplier: r.supplier,
    segment: r.segment,
    value_usd_m: r.value,
    months_since_approval: r.months ?? null,
    days_since_approval: r.daysAgo ?? null,
  });
  const c = d.customers.concentration;
  return {
    fiscalCalendar: d.fiscalCalendar.map((q) => ({ fiscal_quarter: q.label, start_date: q.start, end_date: q.end })),
    performance: [...d.performance.quarters].reverse().map((q) => ({
      fiscal_quarter: q.quarter,
      quarter_end: ends.get(q.quarter)!,
      billings_usd_m: q.billings,
      bookings_usd_m: q.bookings,
      backlog_usd_m: q.backlog,
      book_to_bill: q.bookToBill,
      design_approved_share: d.performance.designApprovedShare,
    })),
    segments: d.segments.rows.map((s) => ({ segment: s.segment, is_semi: s.semi, billings_usd_m: s.billings, growth: s.growth, confidence: s.confidence, mapped_share: d.segments.mappedShare })),
    regions: d.regions.map((r) => ({ region: r.region, billings_usd_m: r.billings, ttm_usd_m: r.ttm, growth: r.growth, book_to_bill: r.bookToBill, backlog_usd_m: r.backlog })),
    suppliers: d.suppliers.map((s) => ({
      supplier: s.name,
      share: s.share,
      growth: s.growth,
      revenue_usd_b: s.revenue || null,
      revenue_confidence: s.confidence || null,
      billings_usd_m: s.billings,
    })),
    verticals: d.verticals.map((v) => ({ vertical: v.name, share: v.share, growth: v.growth, billings_usd_m: v.billings })),
    pipelineFunnel: Object.entries(p.funnel).map(([stage, f]) => ({ stage, registrations: f.count, value_usd_m: f.value })),
    pipelineSummary: [
      {
        approved_pipeline_year_ago_usd_m: p.approvedPipelineYearAgo,
        new_registrations_quarter: p.newRegistrations.thisQuarter,
        new_registrations_year_ago: p.newRegistrations.yearAgo,
        approval_rate_year_ago: p.approvalRateYearAgo,
        months_to_billing: p.monthsToBilling,
      },
    ],
    pipelineQuarterly: [...p.byQuarter].reverse().map((q) => ({ fiscal_quarter: q.quarter, pipeline_usd_m: q.pipeline, design_billings_usd_m: q.designBillings })),
    pipelineGroups: [...groups("segment", p.bySegment), ...groups("supplier", p.bySupplier), ...groups("vertical", p.byVertical)],
    pipelineRegistrations: [...p.recent.map((r) => reg("recent", r)), ...p.stalled.map((r) => reg("stalled", r))],
    concentration: [
      {
        top10_share: c.top10.now,
        top10_share_year_ago: c.top10.yearAgo,
        top100_share: c.top100.now,
        top100_share_year_ago: c.top100.yearAgo,
        active_customers: c.active,
        new_customer_growth: c.newCustomerGrowth,
      },
    ],
    topCustomers: d.customers.top.map((t) => ({ customer: t.name, vertical: t.vertical, region: t.region, billings_usd_m: t.billings, growth: t.growth, backlog_usd_m: t.backlog, pipeline_usd_m: t.pipeline })),
    codeMap: d.codeMap.map((x) => ({
      category_id: x.id,
      source: x.source,
      segment: x.segment,
      category: x.name,
      codes: JSON.stringify(x.codes),
      pcc: x.pcc,
      billings_usd_m: x.billings,
      confidence: x.confidence,
      status: x.status,
      waits_on: x.waitsOn,
      definition: x.definition,
      reason: x.reason,
      parts: JSON.stringify(x.parts),
      history: JSON.stringify(x.history.map((h) => ({ days_ago: h.daysAgo, event: h.event, by: h.by }))),
    })),
    supply: d.supply.leadTimes.map((l) => {
      const po = d.supply.purchasing.find((x) => x.category === l.category);
      return { category: l.category, lead_time_weeks: l.weeks, lead_time_change_weeks: l.change, po_value_usd_m: po?.poValue ?? null, po_change: po?.change ?? null };
    }),
    segmentMarkets: d.markets.segments.map((s) => ({
      segment: s.segment,
      market_usd_m: s.market,
      market_growth: s.marketGrowth,
      ...Object.fromEntries(d.markets.forecast[s.segment].map((v, i) => [`forecast_y${i + 1}`, v])),
    })),
    regionMarkets: d.markets.regions.map((r) => ({ region: r.region, market_usd_b: r.market, growth: r.growth })),
    marketSettings: [{ supplier_revenue_growth: d.markets.supplierRevenueGrowth, ...Object.fromEntries(d.markets.spread.map((v, i) => [`spread_y${i + 1}`, v])) }],
    aiDevices: d.markets.aiDevices.map((a) => ({ device: a.device, sales_usd_m: a.usdM, growth: a.yoy })),
    account: [],
  };
}

/** A fake run: answers each known statement from the rows; records what it was asked. */
function fakeRun(rows: Record<QueryName, Row[]>, asked: { sql: string; params?: object }[] = []): RunQuery {
  const byText = new Map<string, QueryName>(Object.entries(QUERIES).map(([name, sql]) => [sql, name as QueryName]));
  return async (sql, params) => {
    asked.push({ sql, params });
    const name = byText.get(sql);
    if (!name) throw new Error(`unexpected statement: ${sql}`);
    if (name === "account") {
      const supplier = Boolean(params?.supplier);
      const a = mockAccount({ slug: String(params?.name), name: String(params?.name), supplier });
      return params?.name === "Nobody" ? [] : [{ billings_usd_m: a.billings, backlog_usd_m: a.backlog, open_registrations: a.openRegistrations ?? null, open_quotes: a.openQuotes ?? null }];
    }
    return rows[name];
  };
}

async function main() {
  // The round trip: every dataset comes back as the mock had it.
  const asked: { sql: string; params?: object }[] = [];
  const source = databricksSource(fakeRun(viewRows(m), asked));
  const got = await loadInputs(source);
  for (const k of Object.keys(m) as (keyof AvnetInputs)[]) assert.deepEqual(got[k], m[k], k);
  assert.deepEqual(checkContract(got), []);
  assert.deepEqual(buildModel(got, "databricks").shareTrend, buildModel(m).shareTrend);
  assert.equal(buildModel(got, "databricks").status, "live");
  // Every query is a plain read of its view; the account one is parameterised.
  for (const { sql } of asked) assert.match(sql, /^\s*SELECT [\s\S]+ FROM terminal_\w+/);
  const acc = await source.account({ slug: "nxp", name: "NXP", supplier: true });
  assert.deepEqual(acc, mockAccount({ slug: "NXP", name: "NXP", supplier: true }));
  assert.deepEqual(asked.at(-1)!.params, { name: "NXP", supplier: true });
  assert.equal(await source.account({ slug: "x", name: "Nobody", supplier: false }), null);

  // Bad rows fail, naming the view, row and column.
  const broken = viewRows(m);
  broken.segments = broken.segments.map((r, i) => (i === 2 ? { ...r, billings_usd_m: "12" } : r));
  await assert.rejects(databricksSource(fakeRun(broken)).segments(), (e: ContractError) => e.code === "CONTRACT" && e.message === 'terminal_segments row 3: billings_usd_m should be a number, got "12"');
  const missing = viewRows(m);
  missing.regions = missing.regions.map(({ ttm_usd_m: _, ...r }) => r);
  await assert.rejects(databricksSource(fakeRun(missing)).regions(), /terminal_regions: column ttm_usd_m is missing/);
  const twoRows = viewRows(m);
  twoRows.marketSettings = [...twoRows.marketSettings, ...twoRows.marketSettings];
  await assert.rejects(databricksSource(fakeRun(twoRows)).markets(), /terminal_market_settings should have one row, has 2/);
  const noStage = viewRows(m);
  noStage.pipelineFunnel = noStage.pipelineFunnel.filter((r) => r.stage !== "billing");
  await assert.rejects(databricksSource(fakeRun(noStage)).pipeline(), /no row for stage billing/);

  // Without settings, AVNET_DATA=databricks fails clearly instead of showing mock numbers.
  const saved = { ...process.env };
  try {
    process.env.AVNET_DATA = "databricks";
    for (const k of ["DATABRICKS_HOST", "DATABRICKS_TOKEN", "DATABRICKS_WAREHOUSE_ID"]) delete process.env[k];
    await assert.rejects(avnetSource(), /Databricks is not set up: missing DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID/);
    process.env.AVNET_DATA = "postgres";
    await assert.rejects(avnetSource(), /Unknown AVNET_DATA "postgres"/);
  } finally {
    process.env = saved;
  }

  // Mock datasets only by name; the model then says mock.
  assert.deepEqual(mockedDatasets({ AVNET_MOCK_DATASETS: "markets, supply" }), ["markets", "supply"]);
  assert.throws(() => mockedDatasets({ AVNET_MOCK_DATASETS: "markets,wsts" }), /Unknown AVNET_MOCK_DATASETS wsts/);
  const noMarkets = viewRows(m);
  noMarkets.segmentMarkets = [];
  const mixed = withMock(databricksSource(fakeRun(noMarkets)), ["markets"]);
  const mixedInputs = await loadInputs(mixed);
  assert.deepEqual(mixedInputs.markets, m.markets);
  const mixedModel = buildModel(mixedInputs, mixed.name, ["markets"]);
  assert.equal(mixedModel.status, "mock");
  assert.deepEqual(mixedModel.mocked, ["markets"]);

  console.log("databricks adapter: all tests passed");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
