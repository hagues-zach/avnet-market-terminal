import type { AvnetInputs, Funnel, PipelineRow } from "./contracts";
import { PIPELINE_STAGES } from "./format";

// The contract suite: what any adapter's data must satisfy before a page shows
// it. Returns the problems found, empty when the data passes. Run against the
// mock in mock.contract.test.ts, against fake Databricks rows in
// databricks/adapter.test.ts, and against real data at Avnet with
// `AVNET_DATA=databricks npx tsx scripts/check-avnet-data.ts`.

const LABEL = /^FY\d\d Q[1-4]$/;
const REGIONS = new Set(["Americas", "EMEA", "Asia", "Farnell"]);
const RATINGS = new Set(["High", "Medium", "Low"]);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Within `rel` of each other, relative to the larger. */
const close = (a: number, b: number, rel: number) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b), 1e-9);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fraction = (v: unknown) => finite(v) && v >= 0 && v <= 1;
const growth = (v: unknown) => finite(v) && v > -1 && v < 10;

export function checkContract(d: AvnetInputs): string[] {
  const problems: string[] = [];
  const fail = (dataset: string, message: string) => problems.push(`${dataset}: ${message}`);

  // Fiscal calendar
  const calendar = d.fiscalCalendar;
  const order = new Map(calendar.map((q, i) => [q.label, i]));
  calendar.forEach((q, i) => {
    if (!LABEL.test(q.label)) fail("fiscalCalendar", `"${q.label}" isn't a label like "FY27 Q1"`);
    if (!(q.start <= q.end)) fail("fiscalCalendar", `${q.label} ends before it starts`);
    if (i > 0 && !(calendar[i - 1].end < q.start)) fail("fiscalCalendar", `${q.label} isn't after ${calendar[i - 1].label}`);
  });
  const inCalendar = (dataset: string, labels: string[]) => {
    labels.forEach((l, i) => {
      if (!order.has(l)) fail(dataset, `quarter "${l}" isn't in the fiscal calendar`);
      else if (i > 0 && order.has(labels[i - 1]) && order.get(l)! <= order.get(labels[i - 1])!) fail(dataset, `quarters aren't oldest first at ${l}`);
    });
  };

  // Performance
  const quarters = d.performance.quarters;
  if (quarters.length < 8) fail("performance", `${quarters.length} quarters; at least 8 are needed for growth on a year ago`);
  inCalendar("performance", quarters.map((q) => q.quarter));
  for (const q of quarters) {
    for (const k of ["billings", "bookings", "backlog"] as const) if (!finite(q[k]) || q[k] <= 0) fail("performance", `${q.quarter} ${k} is ${q[k]}`);
    if (!finite(q.bookToBill) || !close(q.bookToBill, q.bookings / q.billings, 0.01)) fail("performance", `${q.quarter} book-to-bill ${q.bookToBill} doesn't match bookings ÷ billings`);
  }
  if (!fraction(d.performance.designApprovedShare)) fail("performance", `designApprovedShare ${d.performance.designApprovedShare} isn't a fraction`);
  const ttm = sum(quarters.slice(-4).map((q) => q.billings));

  // Segments and their markets
  const segs = d.segments.rows;
  const names = new Set(segs.map((s) => s.segment));
  if (names.size !== segs.length) fail("segments", "segment names repeat");
  if (!fraction(d.segments.mappedShare) || d.segments.mappedShare === 0) fail("segments", `mappedShare ${d.segments.mappedShare} isn't a fraction above 0`);
  for (const s of segs) {
    if (!finite(s.billings) || s.billings < 0) fail("segments", `${s.segment} billings is ${s.billings}`);
    if (!growth(s.growth)) fail("segments", `${s.segment} growth ${s.growth} is out of range`);
    if (!RATINGS.has(s.confidence)) fail("segments", `${s.segment} confidence "${s.confidence}"`);
  }
  if (segs.length && !close(sum(segs.map((s) => s.billings)), ttm * d.segments.mappedShare, 0.01)) {
    fail("segments", "segment billings don't add to mapped billings (trailing 12-month billings × mappedShare)");
  }
  for (const s of segs) {
    const m = d.markets.segments.find((x) => x.segment === s.segment);
    if (!m) fail("markets", `no market size for segment ${s.segment}`);
    else if (!finite(m.market) || m.market <= 0 || !growth(m.marketGrowth)) fail("markets", `${s.segment} market ${m.market}, growth ${m.marketGrowth}`);
    const f = d.markets.forecast[s.segment];
    if (!f || f.length !== 4 || !f.every(growth)) fail("markets", `forecast for ${s.segment} needs four years of growth`);
  }
  if (d.markets.spread.length !== 4 || !d.markets.spread.every(fraction)) fail("markets", "spread needs four fractions, one per forecast year");
  for (const r of d.markets.regions) if (!REGIONS.has(r.region) || !finite(r.market) || r.market <= 0) fail("markets", `region market ${r.region} ${r.market}`);

  // Regions, suppliers, verticals: shares of all billings
  for (const r of d.regions) {
    if (!REGIONS.has(r.region)) fail("regions", `unknown region "${r.region}"`);
    if (!growth(r.growth) || !finite(r.bookToBill) || r.bookToBill <= 0) fail("regions", `${r.region} growth or book-to-bill out of range`);
  }
  if (d.regions.length && !close(sum(d.regions.map((r) => r.ttm)), ttm, 0.01)) fail("regions", "regions' trailing 12-month billings don't add to the total");
  const shares = (dataset: string, rows: { name: string; share: number; billings: number }[]) => {
    if (!rows.length) return fail(dataset, "no rows");
    if (!close(sum(rows.map((r) => r.share)), 1, 0.01)) fail(dataset, "shares don't add to 1");
    for (const r of rows) if (!fraction(r.share) || !close(r.billings, r.share * ttm, 0.01)) fail(dataset, `${r.name} billings don't match its share of the total`);
  };
  shares("suppliers", d.suppliers);
  shares("verticals", d.verticals);
  for (const s of d.suppliers) if (!finite(s.revenue) || s.revenue < 0) fail("suppliers", `${s.name} revenue ${s.revenue}`);

  // Design pipeline
  const p = d.pipeline;
  const narrowing = (where: string, f: Funnel) => {
    for (let i = 1; i < PIPELINE_STAGES.length; i++) {
      const [a, b] = [PIPELINE_STAGES[i - 1].id, PIPELINE_STAGES[i].id];
      if (f[b].count > f[a].count) fail("pipeline", `${where}: more ${b} than ${a}`);
    }
  };
  narrowing("funnel", p.funnel);
  const view = (name: string, rows: PipelineRow[]) => {
    for (const { id } of PIPELINE_STAGES) {
      if (!close(sum(rows.map((r) => r.funnel[id].value)), p.funnel[id].value, 0.001)) fail("pipeline", `${name} ${id} values don't add to the funnel`);
      if (Math.abs(sum(rows.map((r) => r.funnel[id].count)) - p.funnel[id].count) > rows.length) fail("pipeline", `${name} ${id} counts don't add to the funnel`);
    }
    for (const r of rows) {
      narrowing(`${name} ${r.name}`, r.funnel);
      if (!close(r.pipeline, r.funnel.approved.value - r.funnel.billing.value, 1e-6)) fail("pipeline", `${name} ${r.name} pipeline isn't approved minus billing`);
    }
  };
  view("by supplier", p.bySupplier);
  view("by segment", p.bySegment);
  view("by vertical", p.byVertical);
  for (const r of p.bySegment) if (!names.has(r.name)) fail("pipeline", `segment "${r.name}" isn't in segments`);
  const pq = p.byQuarter.map((q) => q.quarter);
  if (pq.join() !== quarters.map((q) => q.quarter).join()) fail("pipeline", "byQuarter quarters differ from performance");
  if (!fraction(p.approvalRateYearAgo)) fail("pipeline", "approvalRateYearAgo isn't a fraction");

  // Customers
  const c = d.customers;
  if (!fraction(c.concentration.top10.now) || !fraction(c.concentration.top100.now)) fail("customers", "concentration shares aren't fractions");
  if (c.concentration.top10.now > c.concentration.top100.now) fail("customers", "top 10 share exceeds top 100");
  if (c.top.length > 10) fail("customers", `${c.top.length} top customers; the contract is the ten largest`);
  c.top.forEach((t, i) => {
    if (i > 0 && t.billings > c.top[i - 1].billings) fail("customers", "top customers aren't largest first");
    if (!d.verticals.some((v) => v.name === t.vertical)) fail("customers", `${t.name} vertical "${t.vertical}" isn't in verticals`);
    if (!REGIONS.has(t.region)) fail("customers", `${t.name} region "${t.region}"`);
  });
  if (c.top.length === 10 && !close(sum(c.top.map((t) => t.billings)), ttm * c.concentration.top10.now, 0.01)) fail("customers", "top 10 billings don't match the top-10 share");

  // Code map
  const ids = new Set(d.codeMap.map((m) => m.id));
  if (ids.size !== d.codeMap.length) fail("codeMap", "ids repeat");
  for (const m of d.codeMap) {
    if (!names.has(m.segment)) fail("codeMap", `${m.id} segment "${m.segment}" isn't in segments`);
    if (m.status === "unmapped" ? m.billings !== 0 || m.codes.length > 0 : m.codes.length === 0) fail("codeMap", `${m.id} codes and billings don't match its status`);
  }
  if (d.codeMap.length) {
    for (const s of segs) {
      const mapped = sum(d.codeMap.filter((m) => m.segment === s.segment).map((m) => m.billings));
      if (!close(mapped, s.billings, 0.01)) fail("codeMap", `${s.segment} mappings don't add to the segment's billings`);
    }
  }

  // Supply
  const { leadTimes, purchasing } = d.supply;
  if (leadTimes.some((l) => !finite(l.weeks) || l.weeks <= 0)) fail("supply", "a lead time isn't a positive number of weeks");
  purchasing.forEach((po, i) => {
    if (leadTimes[i] && leadTimes[i].category !== po.category) fail("supply", `purchasing row ${i + 1} (${po.category}) isn't in lead-time order`);
  });

  return problems;
}
