import { unstable_cache } from "next/cache";
import {
  COMPANIES,
  FLOW_CONCEPTS,
  INSTANT_CONCEPTS,
  type Company,
  type CompanyEarnings,
  type Filing,
  type FlowMetric,
  type InstantMetric,
  type Metric,
  type PeerRow,
  type Quarter,
} from "./earnings-model";

// SEC EDGAR "company facts": every number a company has tagged in its 10-Q and
// 10-K filings, as one JSON document per company. Server-only. The documents are
// several MB each, so the reduced result is cached rather than the raw response.

const REVALIDATE_SECONDS = 6 * 60 * 60;
const USER_AGENT = "MarketTerminal/0.1 (news reader)";
const TIMEOUT_MS = 20_000;
const QUARTERS_KEPT = 12;
// SEC asks for no more than 10 requests/second; stay well under it.
const BATCH = 6;
const DAY = 86_400_000;

export interface Fact {
  start?: string;
  end: string;
  val: number;
  form?: string;
  filed?: string;
  accn?: string;
}

interface CompanyFacts {
  facts?: { "us-gaap"?: Record<string, { units?: Record<string, Fact[]> }> };
}

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
const isQuarter = (days: number) => days >= 80 && days <= 100;
const isYear = (days: number) => days >= 350 && days <= 380;

function factsFor(doc: CompanyFacts, concept: string): Fact[] {
  const units = doc.facts?.["us-gaap"]?.[concept]?.units;
  if (!units) return [];
  return Object.values(units)
    .flat()
    .filter((f) => f.form?.startsWith("10-Q") || f.form?.startsWith("10-K"));
}

/** Per (start,end) period keep the most recently filed value, so restatements win. */
function latestByPeriod(facts: Fact[]): Fact[] {
  const byPeriod = new Map<string, Fact>();
  for (const f of facts) {
    const key = `${f.start ?? ""}|${f.end}`;
    const prev = byPeriod.get(key);
    if (!prev || (f.filed ?? "") > (prev.filed ?? "")) byPeriod.set(key, f);
  }
  return Array.from(byPeriod.values());
}

interface QuarterValue {
  val: number;
  backedOut: boolean;
}

/**
 * Turn a concept's duration facts into single-quarter values keyed by quarter end.
 * Filings report some items only year-to-date (cash flow always; Q4 everywhere,
 * since the 10-K carries the full year), so those quarters are backed out as
 * YTD(this quarter) − YTD(previous quarter) within the same fiscal year.
 */
export function quarterly(facts: Fact[]): Map<string, QuarterValue> {
  const periods = latestByPeriod(facts.filter((f) => f.start));
  const out = new Map<string, QuarterValue>();
  for (const f of periods) {
    if (isQuarter(daysBetween(f.start!, f.end) + 1)) out.set(f.end, { val: f.val, backedOut: false });
  }
  const byStart = new Map<string, Fact[]>();
  for (const f of periods) byStart.set(f.start!, [...(byStart.get(f.start!) ?? []), f]);
  for (const sameYear of byStart.values()) {
    sameYear.sort((a, b) => a.end.localeCompare(b.end));
    for (let i = 1; i < sameYear.length; i++) {
      const cur = sameYear[i];
      if (out.has(cur.end)) continue;
      const prev = sameYear[i - 1];
      if (isQuarter(daysBetween(prev.end, cur.end))) out.set(cur.end, { val: cur.val - prev.val, backedOut: true });
    }
  }
  // Full year with no nine-month total: subtract the three reported quarters.
  for (const f of periods) {
    if (out.has(f.end) || !isYear(daysBetween(f.start!, f.end) + 1)) continue;
    const inYear = Array.from(out.entries()).filter(([end]) => end > f.start! && end < f.end);
    if (inYear.length === 3) out.set(f.end, { val: f.val - inYear.reduce((s, [, q]) => s + q.val, 0), backedOut: true });
  }
  return out;
}

/**
 * Merge concepts in priority order: per quarter end, the first concept with a value
 * wins. Revenue is the exception — some filers tag a contract-revenue subtotal next
 * to total revenue, so the largest value is the total.
 */
function mergeFlow(doc: CompanyFacts, concepts: string[], takeLargest = false): Map<string, QuarterValue> {
  const merged = new Map<string, QuarterValue>();
  for (const concept of concepts) {
    for (const [end, v] of quarterly(factsFor(doc, concept))) {
      const prev = merged.get(end);
      if (!prev || (takeLargest && v.val > prev.val)) merged.set(end, v);
    }
  }
  return merged;
}

function mergeInstant(doc: CompanyFacts, concepts: string[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const concept of concepts) {
    for (const f of latestByPeriod(factsFor(doc, concept).filter((x) => !x.start))) {
      if (!merged.has(f.end)) merged.set(f.end, f.val);
    }
  }
  return merged;
}

/** Fiscal year ends, taken from the company's own full-year revenue periods. */
function fiscalYearEnds(doc: CompanyFacts): string[] {
  const ends = new Set<string>();
  for (const concept of FLOW_CONCEPTS.revenue) {
    for (const f of factsFor(doc, concept)) {
      if (f.start && isYear(daysBetween(f.start, f.end) + 1)) ends.add(f.end);
    }
  }
  return Array.from(ends).sort();
}

function fiscalLabel(end: string, yearEnds: string[]): string {
  if (!yearEnds.length) return end;
  // The fiscal year this quarter belongs to: the first year end on or after it,
  // projected forward a year at a time when that year hasn't been reported yet.
  let fy = yearEnds.find((y) => y >= end && daysBetween(end, y) < 330);
  if (!fy) {
    let t = ms(yearEnds[yearEnds.length - 1]);
    while (t < ms(end) - 20 * DAY) t += 365.25 * DAY;
    fy = new Date(t).toISOString().slice(0, 10);
  }
  // 52/53-week years can close in the first days of January and are still named
  // for the year just ended, so name the year from a date shortly before the close.
  const year = new Date(ms(fy) - 10 * DAY).getUTCFullYear();
  const q = 4 - Math.round(Math.max(0, daysBetween(end, fy)) / 91.3);
  return `FY${String(year).slice(2)} Q${Math.min(4, Math.max(1, q))}`;
}

export function calendarLabel(end: string): string {
  const mid = new Date(ms(end) - 45 * DAY);
  return `CY${String(mid.getUTCFullYear()).slice(2)} Q${Math.floor(mid.getUTCMonth() / 3) + 1}`;
}

function nearest<T>(map: Map<string, T>, end: string, toleranceDays: number): T | undefined {
  if (map.has(end)) return map.get(end);
  let best: { gap: number; v: T } | undefined;
  for (const [k, v] of map) {
    const gap = Math.abs(daysBetween(k, end));
    if (gap <= toleranceDays && (!best || gap < best.gap)) best = { gap, v };
  }
  return best?.v;
}

const ratio = (a: number | undefined, b: number | undefined) =>
  a !== undefined && b !== undefined && b !== 0 ? a / b : undefined;

function build(company: Company, doc: CompanyFacts): CompanyEarnings {
  const flow = {} as Record<FlowMetric, Map<string, QuarterValue>>;
  for (const m of Object.keys(FLOW_CONCEPTS) as FlowMetric[]) flow[m] = mergeFlow(doc, FLOW_CONCEPTS[m], m === "revenue");
  const instant = {} as Record<InstantMetric, Map<string, number>>;
  for (const m of Object.keys(INSTANT_CONCEPTS) as InstantMetric[]) instant[m] = mergeInstant(doc, INSTANT_CONCEPTS[m]);

  const yearEnds = fiscalYearEnds(doc);
  const ends = Array.from(flow.revenue.keys()).sort();
  const all: Quarter[] = ends.map((end) => {
    const values: Partial<Record<Metric, number>> = {};
    const backedOut: FlowMetric[] = [];
    for (const m of Object.keys(flow) as FlowMetric[]) {
      const q = flow[m].get(end);
      if (!q) continue;
      values[m] = q.val;
      if (q.backedOut) backedOut.push(m);
    }
    for (const m of Object.keys(instant) as InstantMetric[]) {
      const v = nearest(instant[m], end, 3);
      if (v !== undefined) values[m] = v;
    }

    const { revenue, operatingIncome, netIncome, rd, sga, operatingCashFlow, capex, inventory, receivables, payables } = values;
    // Not every filer tags both; either one implies the other.
    if (values.grossProfit === undefined && revenue !== undefined && values.costOfRevenue !== undefined) {
      values.grossProfit = revenue - values.costOfRevenue;
    }
    if (values.costOfRevenue === undefined && revenue !== undefined && values.grossProfit !== undefined) {
      values.costOfRevenue = revenue - values.grossProfit;
    }
    const cost = values.costOfRevenue;
    const set = (m: Metric, v: number | undefined) => {
      if (v !== undefined && Number.isFinite(v)) values[m] = v;
    };
    set("grossMargin", ratio(values.grossProfit, revenue));
    set("operatingMargin", ratio(operatingIncome, revenue));
    set("netMargin", ratio(netIncome, revenue));
    set("rdPct", ratio(rd, revenue));
    set("sgaPct", ratio(sga, revenue));
    if (operatingCashFlow !== undefined && capex !== undefined) set("freeCashFlow", operatingCashFlow - capex);
    set("fcfMargin", ratio(values.freeCashFlow, revenue));
    // Days metrics use the quarter-end balance against one quarter (91 days) of activity.
    const days = (balance: number | undefined, activity: number | undefined) => {
      const r = ratio(balance, activity);
      return r === undefined ? undefined : r * 91;
    };
    set("inventoryDays", days(inventory, cost));
    set("receivableDays", days(receivables, revenue));
    set("payableDays", days(payables, cost));
    if (values.inventoryDays !== undefined && values.receivableDays !== undefined && values.payableDays !== undefined) {
      set("cashCycleDays", values.inventoryDays + values.receivableDays - values.payableDays);
    }
    return { end, fiscalLabel: fiscalLabel(end, yearEnds), calendarLabel: calendarLabel(end), values, backedOut };
  });

  // Growth compares against the quarter ending about a year / a quarter earlier.
  const revenueNear = (end: string, daysBack: number) => {
    const target = new Date(ms(end) - daysBack * DAY).toISOString().slice(0, 10);
    return nearest(new Map(all.map((q) => [q.end, q.values.revenue])), target, 20);
  };
  for (const q of all) {
    const yoy = ratio(q.values.revenue, revenueNear(q.end, 364));
    const qoq = ratio(q.values.revenue, revenueNear(q.end, 91));
    if (yoy !== undefined) q.values.revenueYoY = yoy - 1;
    if (qoq !== undefined) q.values.revenueQoQ = qoq - 1;
  }

  const quarters = all.slice(-QUARTERS_KEPT);
  return { company, quarters, latestFiling: latestFiling(company, doc, quarters[quarters.length - 1]?.end) };
}

/** The filing that first reported the latest quarter's revenue. */
function latestFiling(company: Company, doc: CompanyFacts, end: string | undefined): Filing | null {
  if (!end) return null;
  const candidates = FLOW_CONCEPTS.revenue
    .flatMap((c) => factsFor(doc, c))
    .filter((f) => f.end === end && f.filed && f.accn)
    .sort((a, b) => a.filed!.localeCompare(b.filed!));
  const first = candidates[0];
  if (!first) return null;
  return {
    form: first.form ?? "",
    filed: first.filed!,
    url: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${first.accn!.replace(/-/g, "")}/`,
  };
}

async function load(company: Company): Promise<CompanyEarnings> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(company.cik).padStart(10, "0")}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SEC returned ${res.status} for ${company.name}`);
  return build(company, (await res.json()) as CompanyFacts);
}

// Failures throw, so they are never cached; the next request retries. Once a
// result is cached, later requests are served from it while it refreshes.
const loadCached = unstable_cache(async (slug: string) => load(COMPANIES.find((c) => c.slug === slug)!), ["earnings-v4"], {
  revalidate: REVALIDATE_SECONDS,
});

export async function getCompanyEarnings(slug: string): Promise<CompanyEarnings> {
  const company = COMPANIES.find((c) => c.slug === slug) ?? COMPANIES[0];
  try {
    return await loadCached(company.slug);
  } catch (e) {
    return { company, quarters: [], latestFiling: null, error: e instanceof Error ? e.message : "Unavailable" };
  }
}

/** Full quarterly history for every company. Slow on a cold cache (one multi-MB document each). */
export async function getAllEarnings(): Promise<CompanyEarnings[]> {
  const all: CompanyEarnings[] = [];
  for (let i = 0; i < COMPANIES.length; i += BATCH) {
    all.push(...(await Promise.all(COMPANIES.slice(i, i + BATCH).map((c) => getCompanyEarnings(c.slug)))));
  }
  return all;
}

/** Latest quarter for every company. Slow on a cold cache (one multi-MB document each). */
export async function getPeerRows(): Promise<PeerRow[]> {
  return (await getAllEarnings()).map((e) => ({ company: e.company, latest: e.quarters[e.quarters.length - 1] ?? null }));
}
