import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
import { fetchDart, parseSegmentCsv } from "./foreign/dart";
import { convert, FRED_RATE } from "./foreign/fx";
import { parseInterim, type ConceptFact } from "./foreign/st-6k";
import { fred } from "./fred";
import { fetchSec } from "./revenue-mix";

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
  /** The document the figure was read from, when it isn't an SEC filing folder. */
  url?: string;
}

interface CompanyFacts {
  facts?: { "us-gaap"?: Record<string, { units?: Record<string, Fact[]> }> };
}

// 10-Q/10-K, a 20-F filer's annual report and interim 6-Ks, and DART reports.
// "Manual" is a segment kept by hand from the group's own releases.
const PERIODIC_FORMS = /^(10-Q|10-K|20-F|6-K|DART|Manual)/;

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
const isQuarter = (days: number) => days >= 80 && days <= 100;
const isYear = (days: number) => days >= 350 && days <= 380;

function factsFor(doc: CompanyFacts, concept: string): Fact[] {
  const units = doc.facts?.["us-gaap"]?.[concept]?.units;
  if (!units) return [];
  return Object.values(units)
    .flat()
    .filter((f) => PERIODIC_FORMS.test(f.form ?? ""));
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

function build(company: Company, doc: CompanyFacts, keep = QUARTERS_KEPT): CompanyEarnings {
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

  const quarters = all.slice(-keep);
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
    url: first.url ?? `https://www.sec.gov/Archives/edgar/data/${company.cik}/${first.accn!.replace(/-/g, "")}/`,
  };
}

async function secFacts(company: Company): Promise<CompanyFacts> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(company.cik).padStart(10, "0")}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SEC returned ${res.status} for ${company.name}`);
  return (await res.json()) as CompanyFacts;
}

// Three years of first-to-third-quarter interim reports; the fourth quarter is
// the 20-F's full year less the nine months.
const INTERIM_REPORTS = 9;

/**
 * Add facts read outside company facts to a document. Each goes under the concept
 * the document already uses for the same metric, so a quarter and the full year
 * it is backed out of are always one concept.
 */
export function mergeFacts(doc: CompanyFacts, extra: ConceptFact[], unit = "USD"): CompanyFacts {
  const gaap = { ...(doc.facts?.["us-gaap"] ?? {}) };
  const lists = [...Object.values(FLOW_CONCEPTS), ...Object.values(INSTANT_CONCEPTS)];
  for (const { concept, ...fact } of extra) {
    const list = lists.find((l) => l.includes(concept));
    const target = list?.find((c) => gaap[c]?.units) ?? concept;
    const units = { ...(gaap[target]?.units ?? {}) };
    units[unit] = [...(units[unit] ?? []), fact];
    gaap[target] = { units };
  }
  return { facts: { ...doc.facts, "us-gaap": gaap } };
}

/** A 20-F filer: annual facts from the SEC, quarters from its interim 6-Ks. */
async function twentyFFacts(company: Company & { foreign: { source: "sec-20f"; interim: string } }): Promise<CompanyFacts> {
  const declaredAgent = process.env.SEC_USER_AGENT;
  if (!declaredAgent) throw new Error(`SEC_USER_AGENT is not set, so ${company.name}'s quarterly 6-K reports on sec.gov cannot be read.`);
  const [doc, submissions] = await Promise.all([
    secFacts(company),
    fetchSec(`https://data.sec.gov/submissions/CIK${String(company.cik).padStart(10, "0")}.json`, USER_AGENT).then(
      (r) => r.json() as Promise<{ filings?: { recent?: { form: string[]; accessionNumber: string[]; primaryDocument: string[]; filingDate: string[] } } }>,
    ),
  ]);
  const recent = submissions.filings?.recent;
  if (!recent) return doc;
  const pattern = new RegExp(company.foreign.interim, "i");
  const reports = recent.form
    .map((form, i) => ({ form, i }))
    .filter(({ form, i }) => form === "6-K" && pattern.test(recent.primaryDocument[i]))
    .slice(0, INTERIM_REPORTS)
    .map(({ i }) => ({
      accn: recent.accessionNumber[i],
      filed: recent.filingDate[i],
      url: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${recent.accessionNumber[i].replace(/-/g, "")}/${recent.primaryDocument[i]}`,
    }));
  const read = await Promise.all(
    reports.map((r) =>
      fetchSec(r.url, declaredAgent)
        .then((res) => res.text())
        .then((html) => parseInterim(html, r))
        .catch((): ConceptFact[] => []),
    ),
  );
  return mergeFacts(doc, read.flat());
}

type DartCompany = Company & { foreign: { source: "dart"; stockCode: string; currency: "KRW"; segment?: "DS" } };

/** A DART filer's facts in won: the group's statements, or a segment kept by hand. */
async function dartFacts(company: DartCompany): Promise<ConceptFact[]> {
  if (company.foreign.segment) {
    const file = path.join(process.cwd(), "data", "foreign", `${company.slug}.csv`);
    const { facts } = existsSync(file) ? parseSegmentCsv(readFileSync(file, "utf8"), `data/foreign/${company.slug}.csv`) : { facts: [] };
    if (!facts.length) throw new Error(`No quarters yet: add ${company.name}'s figures to data/foreign/${company.slug}.csv.`);
    return facts;
  }
  const key = process.env.DART_API_KEY;
  if (!key) throw new Error("DART_API_KEY is not set, so Korean filings can't be read.");
  return fetchDart(company.foreign.stockCode, key);
}

/** Built in the reporting currency, so every ratio is exact, then converted to dollars. */
async function loadDart(company: DartCompany, keep: number): Promise<CompanyEarnings> {
  const currency = company.foreign.currency;
  const local = build(company, mergeFacts({}, await dartFacts(company), currency), keep);
  const first = local.quarters[0]?.end;
  if (!first) return local;
  const since = new Date(Date.parse(`${first}T00:00:00Z`) - 120 * DAY).toISOString().slice(0, 10);
  const { quarters, localYoY } = convert(local.quarters, await fred(FRED_RATE[currency], since));
  return { ...local, quarters, local: { currency, revenueYoY: localYoY } };
}

async function load(company: Company, keep = QUARTERS_KEPT): Promise<CompanyEarnings> {
  const foreign = company.foreign;
  if (foreign?.source === "sec-20f") return build(company, await twentyFFacts({ ...company, foreign }), keep);
  if (foreign?.source === "dart") return loadDart({ ...company, foreign }, keep);
  return build(company, await secFacts(company), keep);
}

/** One company's filings straight from SEC, uncached, with every quarter they hold: for scripts that run outside Next (scripts/fetch-history.ts). */
export const loadFromSec = (company: Company) => load(company, Infinity);

// Failures throw, so they are never cached; the next request retries. Once a
// result is cached, later requests are served from it while it refreshes.
const loadCached = unstable_cache(async (slug: string) => load(COMPANIES.find((c) => c.slug === slug)!), ["earnings-v5"], {
  revalidate: REVALIDATE_SECONDS,
});
// Foreign reporters change once a quarter, and DART limits calls per day.
const loadForeignCached = unstable_cache(async (slug: string) => load(COMPANIES.find((c) => c.slug === slug)!), ["earnings-foreign-v1"], {
  revalidate: 24 * 60 * 60,
});

export async function getCompanyEarnings(slug: string): Promise<CompanyEarnings> {
  const company = COMPANIES.find((c) => c.slug === slug) ?? COMPANIES[0];
  try {
    return await (company.foreign ? loadForeignCached : loadCached)(company.slug);
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
