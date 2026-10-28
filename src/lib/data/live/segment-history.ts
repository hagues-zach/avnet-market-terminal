import { unstable_cache } from "next/cache";
import { calendarLabel, quarterly, type Fact as PeriodFact } from "./earnings";
import { COMPANIES, isUsFiler, type Company } from "./earnings-model";
import {
  BROAD_REGION,
  CONSOLIDATION_AXIS,
  DATA_USER_AGENT,
  GEOGRAPHY_AXIS,
  SEGMENT_AXIS,
  fetchSec,
  labelOf,
  messiness,
  parseContexts,
  signature,
  type Context,
  type Labels,
} from "./revenue-mix";

// Quarter-by-quarter segment and region history for one company, built from its
// last several 10-Q and 10-K documents. A single filing only covers its own
// period, and a 10-K only the full year, so several are read and the fourth
// quarter is backed out of the annual figure. Server-only; needs SEC_USER_AGENT.

const REVALIDATE_SECONDS = 12 * 60 * 60;
// Five filings span two fiscal years of quarters (each carries the year-ago
// comparative); the sixth is slack for an amended or late filing.
const FILINGS_READ = 6;
const QUARTERS_KEPT = 8;

type Measure = "revenue" | "cost" | "operatingIncome";

export interface SeriesPoint {
  end: string;
  label: string; // calendar quarter, e.g. "CY26 Q2"
  revenue?: number;
  /** Change in revenue on the same quarter a year earlier. */
  yoy?: number;
  grossMargin?: number;
  operatingMargin?: number;
}

export interface MemberSeries {
  key: string; // XBRL member, e.g. "avt:ElectronicComponentsMember"
  label: string;
  points: SeriesPoint[]; // oldest → newest
}

export interface SegmentHistory {
  company: Company;
  segments: MemberSeries[];
  regions: MemberSeries[];
  error?: string;
}

interface DimFact {
  measure: Measure;
  ctx: Context;
  value: number;
}

// Segment profit goes by different names; companies that adjust it use their own
// element that still begins "OperatingIncomeLoss".
const MEASURE_OF: [RegExp, Measure][] = [
  [/^us-gaap:(RevenueFromContractWithCustomerExcludingAssessedTax|Revenues|SalesRevenueNet|RevenueFromContractWithCustomerIncludingAssessedTax)$/, "revenue"],
  [/^us-gaap:(CostOfRevenue|CostOfGoodsAndServicesSold)$/, "cost"],
  [/^[a-z0-9-]+:OperatingIncomeLoss\w*$/, "operatingIncome"],
];

function parseDimFacts(xml: string, contexts: Map<string, Context>): DimFact[] {
  const out: DimFact[] = [];
  for (const m of xml.matchAll(/<([a-z0-9-]+:\w+)\s[^>]*?contextRef="([^"]+)"[^>]*>\s*(-?[0-9.]+)\s*</g)) {
    const measure = MEASURE_OF.find(([re]) => re.test(m[1]))?.[1];
    const ctx = contexts.get(m[2]);
    const value = Number(m[3]);
    if (measure && ctx?.start && ctx.dims.length && Number.isFinite(value)) out.push({ measure, ctx, value });
  }
  return out;
}

/** member → measure → period facts, for one axis of one filing. */
type AxisFacts = Map<string, Record<Measure, PeriodFact[]>>;

function collect(into: AxisFacts, facts: DimFact[], axis: string, keep: (member: string) => boolean, filed: string) {
  const eligible = facts.filter(
    (f) =>
      f.ctx.dims.some(([a, m]) => a === axis && keep(m)) && f.ctx.dims.every(([a, m]) => a !== CONSOLIDATION_AXIS || m === "us-gaap:OperatingSegmentsMember"),
  );
  for (const measure of ["revenue", "cost", "operatingIncome"] as const) {
    const ofMeasure = eligible.filter((f) => f.measure === measure);
    if (!ofMeasure.length) continue;
    // Use the cleanest way the filing reports this split, so nothing is counted twice.
    const sig = Array.from(new Set(ofMeasure.map((f) => signature(f.ctx)))).sort((a, b) => messiness(a, axis) - messiness(b, axis))[0];
    // Sum across any other axis in that form (e.g. region × segment → region).
    const cells = new Map<string, { member: string; start: string; end: string; value: number }>();
    for (const f of ofMeasure) {
      if (signature(f.ctx) !== sig) continue;
      const member = f.ctx.dims.find(([a]) => a === axis)![1];
      const cell = `${f.ctx.dims.map(([a, m]) => `${a}=${m}`).sort().join("&")}|${f.ctx.start}|${f.ctx.end}`;
      cells.set(cell, { member, start: f.ctx.start!, end: f.ctx.end, value: f.value });
    }
    const totals = new Map<string, { member: string; start: string; end: string; value: number }>();
    for (const c of cells.values()) {
      const k = `${c.member}|${c.start}|${c.end}`;
      const prev = totals.get(k);
      totals.set(k, prev ? { ...prev, value: prev.value + c.value } : c);
    }
    for (const t of totals.values()) {
      const entry = into.get(t.member) ?? { revenue: [], cost: [], operatingIncome: [] };
      entry[measure].push({ start: t.start, end: t.end, val: t.value, filed });
      into.set(t.member, entry);
    }
  }
}

function toSeries(axisFacts: AxisFacts, labels: Labels): MemberSeries[] {
  const out: MemberSeries[] = [];
  for (const [member, measures] of axisFacts) {
    const revenue = quarterly(measures.revenue);
    const cost = quarterly(measures.cost);
    const income = quarterly(measures.operatingIncome);
    const ends = Array.from(revenue.keys()).sort();
    const all: SeriesPoint[] = ends.map((end) => {
      const rev = revenue.get(end)!.val;
      const c = cost.get(end)?.val;
      const op = income.get(end)?.val;
      return {
        end,
        label: calendarLabel(end),
        revenue: rev,
        grossMargin: c !== undefined && rev ? (rev - c) / rev : undefined,
        operatingMargin: op !== undefined && rev ? op / rev : undefined,
      };
    });
    for (const p of all) {
      const target = Date.parse(p.end) - 364 * 86_400_000;
      const prior = all.find((q) => Math.abs(Date.parse(q.end) - target) <= 20 * 86_400_000);
      if (prior?.revenue && p.revenue !== undefined) p.yoy = p.revenue / prior.revenue - 1;
    }
    if (all.length) out.push({ key: member, label: labelOf(member, labels), points: all.slice(-QUARTERS_KEPT) });
  }
  const latest = (s: MemberSeries) => s.points[s.points.length - 1]?.revenue ?? 0;
  return out.sort((a, b) => latest(b) - latest(a));
}

interface Submissions {
  filings?: { recent?: { form: string[]; accessionNumber: string[]; primaryDocument: string[]; filingDate: string[] } };
}

async function load(slug: string, declaredAgent: string): Promise<SegmentHistory> {
  const company = COMPANIES.find((c) => c.slug === slug)!;
  const recent = ((await (await fetchSec(`https://data.sec.gov/submissions/CIK${String(company.cik).padStart(10, "0")}.json`, DATA_USER_AGENT)).json()) as Submissions)
    .filings?.recent;
  if (!recent) throw new Error("No filings found");
  const filings = recent.form
    .map((form, i) => ({ form, i }))
    .filter((f) => f.form === "10-K" || f.form === "10-Q")
    .slice(0, FILINGS_READ)
    .map(({ i }) => ({
      folder: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${recent.accessionNumber[i].replace(/-/g, "")}`,
      doc: recent.primaryDocument[i],
      filed: recent.filingDate[i],
    }));
  if (!filings.length) throw new Error("No 10-K or 10-Q found");

  // Member names come from the newest filing; a company rarely renames a segment.
  const [labels, ...documents] = await Promise.all([
    fetchSec(`${filings[0].folder}/MetaLinks.json`, declaredAgent)
      .then((r) => r.json() as Promise<{ instance?: Record<string, { tag?: Labels }> }>)
      .then((m) => Object.values(m.instance ?? {})[0]?.tag ?? {})
      .catch((): Labels => ({})),
    ...filings.map((f) =>
      fetchSec(`${f.folder}/${f.doc.replace(/\.htm$/i, "_htm.xml")}`, declaredAgent)
        .then((r) => r.text())
        .catch(() => ""),
    ),
  ]);
  if (documents.every((d) => !d)) throw new Error("No filing documents could be read");

  const segments: AxisFacts = new Map();
  const regions: AxisFacts = new Map();
  documents.forEach((xml, n) => {
    if (!xml) return;
    const facts = parseDimFacts(xml, parseContexts(xml));
    collect(segments, facts, SEGMENT_AXIS, () => true, filings[n].filed);
    collect(regions, facts, GEOGRAPHY_AXIS, (m) => BROAD_REGION.test(m), filings[n].filed);
  });
  return { company, segments: toSeries(segments, labels), regions: toSeries(regions, labels) };
}

// Failures throw, so they are never cached; the next request retries.
const loadCached = unstable_cache(load, ["segment-history-v1"], { revalidate: REVALIDATE_SECONDS });

export async function getSegmentHistory(slug: string): Promise<SegmentHistory> {
  const company = COMPANIES.find((c) => c.slug === slug) ?? COMPANIES[0];
  if (!isUsFiler(company)) return { company, segments: [], regions: [], error: `Segment history is read from 10-Q and 10-K filings, which ${company.name} doesn't file.` };
  const declaredAgent = process.env.SEC_USER_AGENT;
  if (!declaredAgent) return { company, segments: [], regions: [], error: "SEC_USER_AGENT is not set, so filing documents on sec.gov cannot be read." };
  try {
    return await loadCached(company.slug, declaredAgent);
  } catch (e) {
    return { company, segments: [], regions: [], error: e instanceof Error ? e.message : "Unavailable" };
  }
}
