import { unstable_cache } from "next/cache";
import { COMPANIES, type Company } from "./earnings-model";

// Revenue mix: how a company's revenue splits by segment, region, product, sales
// channel and major customer. The summary "company facts" feed drops these
// dimensional figures, so they are read from the XBRL instance document of the
// company's latest 10-Q or 10-K on www.sec.gov. Server-only.
//
// www.sec.gov rejects automated requests that do not declare a contact, so this
// needs SEC_USER_AGENT set (for example "Market Terminal you@example.com").

const REVALIDATE_SECONDS = 12 * 60 * 60;
const TIMEOUT_MS = 30_000;
const DATA_USER_AGENT = "MarketTerminal/0.1 (news reader)";
const DAY = 86_400_000;
const MAX_ITEMS = 10;
const MAX_CUSTOM_AXES = 2;

const REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
];

const SEGMENT_AXIS = "us-gaap:StatementBusinessSegmentsAxis";
const CONSOLIDATION_AXIS = "srt:ConsolidationItemsAxis";
const CUSTOMER_AXIS = "srt:MajorCustomersAxis";
const BENCHMARK_AXIS = "us-gaap:ConcentrationRiskByBenchmarkAxis";

// Standard axes worth showing, in display order. Company-specific axes (often an
// end-market split) are picked up after these.
const GEOGRAPHY_AXIS = "srt:StatementGeographicalAxis";
const FOREIGN_SUBTOTALS = new Set(["us-gaap:NonUsMember"]);
const BROAD_REGION = /^(srt|us-gaap):(Americas|NorthAmerica|SouthAmerica|LatinAmerica|EMEA|Europe|Asia|AsiaPacific|MiddleEast|Africa)Member$/;
const KNOWN_AXES: { axis: string; title: string }[] = [
  { axis: SEGMENT_AXIS, title: "By segment" },
  { axis: GEOGRAPHY_AXIS, title: "By region" },
  { axis: "srt:ProductOrServiceAxis", title: "By product" },
  { axis: "us-gaap:ContractWithCustomerSalesChannelAxis", title: "By sales channel" },
];
// Axes that only qualify another split; summing across them does not double count.
const PASSIVE_AXES = new Set([CONSOLIDATION_AXIS, BENCHMARK_AXIS, "us-gaap:ConcentrationRiskByTypeAxis"]);
const STANDARD_PREFIXES = new Set(["us-gaap", "srt", "dei", "country", "currency", "stpr", "naics", "sic", "exch", "ecd", "cyd"]);

export interface MixItem {
  key: string;
  label: string;
  value: number;
  /** Share of total company revenue for the period. */
  share?: number;
  /** Change against the same period a year earlier. */
  yoy?: number;
  /** Segment operating margin, where the company tags segment operating income. */
  margin?: number;
}

export interface Breakdown {
  axis: string;
  title: string;
  items: MixItem[];
  /** True when the items add to more than total revenue, i.e. the company reports subtotals alongside their parts. */
  overlapping: boolean;
}

export interface CustomerShare {
  label: string;
  share: number;
}

export interface RevenueMix {
  company: Company;
  form?: string;
  periodStart?: string;
  periodEnd?: string;
  /** "year" for a 10-K's fiscal year, "quarter" for a 10-Q's quarter. */
  periodKind?: "year" | "quarter";
  url?: string;
  total?: number;
  breakdowns: Breakdown[];
  customers: CustomerShare[];
  error?: string;
}

interface Context {
  dims: [axis: string, member: string][];
  start?: string;
  end: string;
}

interface Fact {
  concept: string;
  ctx: Context;
  value: number;
}

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const days = (c: { start?: string; end: string }) => (c.start ? Math.round((ms(c.end) - ms(c.start)) / DAY) + 1 : 0);

function parseContexts(xml: string): Map<string, Context> {
  const out = new Map<string, Context>();
  for (const m of xml.matchAll(/<(?:xbrli:)?context\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/(?:xbrli:)?context>/g)) {
    const body = m[2];
    const end = body.match(/<(?:xbrli:)?(?:endDate|instant)>\s*([^<\s]+)/)?.[1];
    if (!end) continue;
    const dims = Array.from(body.matchAll(/explicitMember\s+dimension="([^"]+)"[^>]*>\s*([^<\s]+)/g), (d): [string, string] => [d[1], d[2]]);
    out.set(m[1], { dims, start: body.match(/<(?:xbrli:)?startDate>\s*([^<\s]+)/)?.[1], end });
  }
  return out;
}

function parseFacts(xml: string, contexts: Map<string, Context>, concepts: string[]): Fact[] {
  const out: Fact[] = [];
  const re = new RegExp(`<us-gaap:(${concepts.join("|")})\\s[^>]*?contextRef="([^"]+)"[^>]*>\\s*(-?[0-9.]+)\\s*<`, "g");
  for (const m of xml.matchAll(re)) {
    const ctx = contexts.get(m[2]);
    const value = Number(m[3]);
    if (ctx && Number.isFinite(value)) out.push({ concept: m[1], ctx, value });
  }
  return out;
}

type Labels = Record<string, { lang?: Record<string, { role?: Record<string, string> }> }>;

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function labelOf(qname: string, labels: Labels): string {
  const role = labels[qname.replace(":", "_")]?.lang?.["en-us"]?.role;
  let text = role?.terseLabel ?? role?.label;
  if (!text) {
    // No label published: fall back to the element name, e.g. "GlobalComponentsMember".
    text = qname.split(":")[1].replace(/(Segment)?Member$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
  text = decode(text).replace(/\s*(\[(Member|Axis|Domain)\]|Member)\s*$/i, "").trim();
  // Country members are published in capitals ("UNITED STATES"); acronyms like EMEA stay as they are.
  if (qname.startsWith("country:") && text === text.toUpperCase()) text = text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return text;
}

const samePeriod = (a: Context, b: { start?: string; end: string }) => a.end === b.end && a.start === b.start;
/** `c` covers the same length of time as `cur`, ending about a year earlier. */
function isYearBefore(c: Context, cur: { start?: string; end: string }): boolean {
  const back = Math.round((ms(cur.end) - ms(c.end)) / DAY);
  return back >= 350 && back <= 380 && Math.abs(days(c) - days(cur)) <= 10;
}

/** Facts on `axis` that are not intersegment eliminations or other reconciling items. */
function onAxis(facts: Fact[], axis: string): Fact[] {
  return facts.filter(
    (f) => f.ctx.dims.some(([a]) => a === axis) && f.ctx.dims.every(([a, m]) => a !== CONSOLIDATION_AXIS || m === "us-gaap:OperatingSegmentsMember"),
  );
}

const signature = (c: Context) => c.dims.map(([a]) => a).sort().join("|");
/** Lower is cleaner: fewest other real axes first, then fewest axes overall. */
function messiness(sig: string, axis: string): number {
  const axes = sig.split("|");
  return axes.filter((a) => a !== axis && !PASSIVE_AXES.has(a)).length * 10 + axes.length;
}

function sumByMember(facts: Fact[], axis: string, period: (c: Context) => boolean): Map<string, number> {
  // Several revenue concepts can tag the same cell; keep one value per full context.
  const cells = new Map<string, { member: string; value: number }>();
  for (const f of facts) {
    if (!period(f.ctx)) continue;
    const member = f.ctx.dims.find(([a]) => a === axis)![1];
    const cell = f.ctx.dims.map(([a, m]) => `${a}=${m}`).sort().join("&");
    const prev = cells.get(cell);
    if (!prev || f.value > prev.value) cells.set(cell, { member, value: f.value });
  }
  const out = new Map<string, number>();
  for (const { member, value } of cells.values()) out.set(member, (out.get(member) ?? 0) + value);
  return out;
}

function breakdown(
  axis: string,
  title: string,
  allRevenue: Fact[],
  opIncome: Fact[],
  cur: Context,
  total: number | undefined,
  labels: Labels,
  /** Restrict to some of the axis's members, e.g. only countries. */
  keep: (member: string) => boolean = () => true,
): Breakdown | null {
  const revenue = allRevenue.filter((f) => f.ctx.dims.every(([a, m]) => a !== axis || keep(m)));
  const current = onAxis(revenue, axis).filter((f) => samePeriod(f.ctx, cur));
  if (!current.length) return null;
  // A company may report the same split several ways (alone, and crossed with
  // another axis). Use the cleanest one only, so nothing is counted twice.
  const sig = Array.from(new Set(current.map((f) => signature(f.ctx)))).sort((a, b) => messiness(a, axis) - messiness(b, axis))[0];
  const pool = onAxis(revenue, axis).filter((f) => signature(f.ctx) === sig);
  const now = sumByMember(pool, axis, (c) => samePeriod(c, cur));
  if (now.size < 2) return null;
  const before = sumByMember(pool, axis, (c) => isYearBefore(c, cur));
  const income =
    axis === SEGMENT_AXIS ? sumByMember(onAxis(opIncome, axis).filter((f) => signature(f.ctx) === sig), axis, (c) => samePeriod(c, cur)) : new Map<string, number>();

  const items: MixItem[] = Array.from(now, ([member, value]) => {
    const prior = before.get(member);
    const op = income.get(member);
    return {
      key: member,
      label: labelOf(member, labels),
      value,
      share: total ? value / total : undefined,
      yoy: prior ? value / prior - 1 : undefined,
      margin: op !== undefined && value ? op / value : undefined,
    };
  })
    .filter((i) => i.value !== 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_ITEMS);
  if (items.length < 2) return null;
  const sum = items.reduce((s, i) => s + i.value, 0);
  return { axis: `${axis}#${title}`, title, items, overlapping: total !== undefined && sum > total * 1.03 };
}

function customers(facts: Fact[], cur: Context, labels: Labels): CustomerShare[] {
  const best = new Map<string, number>();
  for (const f of facts) {
    if (f.concept !== "ConcentrationRiskPercentage" || !samePeriod(f.ctx, cur)) continue;
    const customer = f.ctx.dims.find(([a]) => a === CUSTOMER_AXIS)?.[1];
    const benchmark = f.ctx.dims.find(([a]) => a === BENCHMARK_AXIS)?.[1];
    // Concentration is also reported against receivables; keep the revenue measure.
    if (!customer || (benchmark && !/Revenue|Sales/i.test(benchmark))) continue;
    best.set(customer, Math.max(best.get(customer) ?? 0, f.value));
  }
  return Array.from(best, ([member, share]) => ({ label: labelOf(member, labels), share }))
    .filter((c) => c.share > 0 && c.share <= 1)
    .sort((a, b) => b.share - a.share)
    .slice(0, MAX_ITEMS);
}

async function fetchSec(url: string, userAgent: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`SEC returned ${res.status}`);
  return res;
}

interface Submissions {
  filings?: { recent?: { form: string[]; accessionNumber: string[]; primaryDocument: string[] } };
}

async function load(slug: string, declaredAgent: string): Promise<RevenueMix> {
  const company = COMPANIES.find((c) => c.slug === slug)!;
  const recent = ((await (await fetchSec(`https://data.sec.gov/submissions/CIK${String(company.cik).padStart(10, "0")}.json`, DATA_USER_AGENT)).json()) as Submissions)
    .filings?.recent;
  const i = recent?.form.findIndex((f) => f === "10-K" || f === "10-Q") ?? -1;
  if (!recent || i < 0) throw new Error("No 10-K or 10-Q found");
  const form = recent.form[i];
  const folder = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${recent.accessionNumber[i].replace(/-/g, "")}`;
  // Inline XBRL filings publish the extracted instance beside the main document.
  const instanceUrl = `${folder}/${recent.primaryDocument[i].replace(/\.htm$/i, "_htm.xml")}`;
  const [xml, meta] = await Promise.all([
    fetchSec(instanceUrl, declaredAgent).then((r) => r.text()),
    fetchSec(`${folder}/MetaLinks.json`, declaredAgent)
      .then((r) => r.json() as Promise<{ instance?: Record<string, { tag?: Labels }> }>)
      .catch(() => ({ instance: undefined })),
  ]);
  const labels: Labels = Object.values(meta.instance ?? {})[0]?.tag ?? {};

  const contexts = parseContexts(xml);
  const facts = parseFacts(xml, contexts, [...REVENUE_CONCEPTS, "OperatingIncomeLoss", "ConcentrationRiskPercentage"]);
  const revenue = facts.filter((f) => REVENUE_CONCEPTS.includes(f.concept));

  // The reporting period: the filing's own period (a year for a 10-K, a quarter
  // for a 10-Q), found from the undimensioned total-revenue facts.
  const totals = revenue.filter((f) => f.ctx.dims.length === 0 && f.ctx.start);
  if (!totals.length) throw new Error("No revenue reported in the filing's data");
  const end = totals.reduce((latest, f) => (f.ctx.end > latest ? f.ctx.end : latest), "");
  const atEnd = totals.filter((f) => f.ctx.end === end).sort((a, b) => days(a.ctx) - days(b.ctx));
  const cur = (form === "10-K" ? atEnd[atEnd.length - 1] : atEnd[0]).ctx;
  const total = Math.max(...totals.filter((f) => samePeriod(f.ctx, cur)).map((f) => f.value));
  const opIncome = facts.filter((f) => f.concept === "OperatingIncomeLoss");

  const breakdowns: Breakdown[] = [];
  for (const { axis, title } of KNOWN_AXES) {
    if (axis === GEOGRAPHY_AXIS) {
      // Filings mix broad regions, single countries and a "total foreign" subtotal on
      // one axis. When a company reports at least two broad regions, show those apart
      // from the country detail; otherwise it is one list of places.
      const notSubtotal = (m: string) => !FOREIGN_SUBTOTALS.has(m);
      const members = new Set(revenue.flatMap((f) => f.ctx.dims.filter(([a]) => a === axis).map(([, m]) => m)));
      if (Array.from(members).filter((m) => BROAD_REGION.test(m)).length >= 2) {
        const regions = breakdown(axis, title, revenue, opIncome, cur, total, labels, (m) => BROAD_REGION.test(m));
        if (regions) breakdowns.push(regions);
        const countries = breakdown(axis, "By country", revenue, opIncome, cur, total, labels, (m) => !BROAD_REGION.test(m) && notSubtotal(m));
        if (countries) breakdowns.push(countries);
      } else {
        const places = breakdown(axis, title, revenue, opIncome, cur, total, labels, notSubtotal) ?? breakdown(axis, title, revenue, opIncome, cur, total, labels);
        if (places) breakdowns.push(places);
      }
      continue;
    }
    const b = breakdown(axis, title, revenue, opIncome, cur, total, labels);
    if (b) breakdowns.push(b);
  }
  const customAxes = Array.from(new Set(revenue.flatMap((f) => f.ctx.dims.map(([a]) => a)))).filter((a) => !STANDARD_PREFIXES.has(a.split(":")[0]));
  for (const axis of customAxes.slice(0, MAX_CUSTOM_AXES)) {
    const b = breakdown(axis, `By ${labelOf(axis, labels).toLowerCase()}`, revenue, opIncome, cur, total, labels);
    if (b) breakdowns.push(b);
  }

  return {
    company,
    form,
    periodStart: cur.start,
    periodEnd: cur.end,
    periodKind: days(cur) > 200 ? "year" : "quarter",
    url: `${folder}/${recent.primaryDocument[i]}`,
    total,
    breakdowns,
    customers: customers(facts, cur, labels),
  };
}

// Failures throw, so they are never cached; the next request retries.
const loadCached = unstable_cache(load, ["revenue-mix-v3"], { revalidate: REVALIDATE_SECONDS });

export async function getRevenueMix(slug: string): Promise<RevenueMix> {
  const company = COMPANIES.find((c) => c.slug === slug) ?? COMPANIES[0];
  const declaredAgent = process.env.SEC_USER_AGENT;
  if (!declaredAgent) {
    return { company, breakdowns: [], customers: [], error: "SEC_USER_AGENT is not set, so filing documents on sec.gov cannot be read." };
  }
  try {
    return await loadCached(company.slug, declaredAgent);
  } catch (e) {
    return { company, breakdowns: [], customers: [], error: e instanceof Error ? e.message : "Unavailable" };
  }
}
