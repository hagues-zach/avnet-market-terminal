import { count, type Range } from "./diagrams";
import type { FinReading } from "./financials";

// What the market share KPIs say (Market Share, Code Mapping and the Scenario
// Modeler), in words and diagram parts. Pure. Amounts are $M unless named $B.

const pct = (v: number) => `${Math.round(v * 100)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
/** A change in percentage points, signed in words. */
const pts = (v: number) => {
  const p = Math.round(v * 1000) / 10;
  return p === 0 ? "level with" : `${p > 0 ? "up" : "down"} ${Math.abs(p).toFixed(1)} pts on`;
};
const billion = (v: number) => `$${v.toFixed(1)}B`;
/** $M in the tiles' own format: "$21.0B", "$640M". */
export const money = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
const fmtM = money;
const join = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

// Share of mapped market --------------------------------------------------

export type Confidence = "High" | "Medium" | "Low";
export const CONFIDENCES: Confidence[] = ["High", "Medium", "Low"];

export interface SegmentShare {
  segment: string;
  /** Market size, $B. */
  tam: number;
  share: number;
  confidence: string;
}

/** Mapped billings, $B, by the confidence of the segment's mapping, High first. Adds to one. */
export function confidenceShares(segments: SegmentShare[]): number[] {
  const billings = (c: string) => segments.filter((s) => s.confidence === c).reduce((a, s) => a + s.tam * s.share, 0);
  const total = segments.reduce((a, s) => a + s.tam * s.share, 0);
  return CONFIDENCES.map((c) => (total > 0 ? billings(c) / total : 0));
}

export function readMappedShare(f: { share: number; shareYearAgo: number; mappedShare: number; segments: SegmentShare[] }): FinReading {
  const market = f.segments.reduce((a, s) => a + s.tam, 0);
  const mapped = f.segments.reduce((a, s) => a + s.tam * s.share, 0);
  const low = f.segments.filter((s) => s.confidence === "Low");
  const lowShare = confidenceShares(f.segments)[2];
  return {
    lead: `Avnet wins ${pct1(f.share)} of the market its billings map to, ${pts(f.share - f.shareYearAgo)} a year ago.`,
    sentence: `${billion(mapped)} of Avnet's billings map to segments worth ${billion(market)}, and ${billion(mapped)} ÷ ${billion(market)} is ${pct1(mapped / market)}.`,
    note: `The other ${pct(1 - f.mappedShare)} of billings have no market category, so they are left out.${
      low.length
        ? ` ${pct(lowShare)} of mapped billings are in ${join(low.map((s) => s.segment))}, where the mapping has low confidence, so their share is the least certain.`
        : ""
    }`,
  };
}

// Mapped billings ----------------------------------------------------------

export interface MappingFigures {
  /** Trailing 12-month billings, $M. */
  ttm: number;
  mappedShare: number;
  /** Billings on validated mappings, and on mappings waiting for review, $M. */
  validatedBillings: number;
  reviewBillings: number;
}

export const MAPPING_SEGMENTS = ["Validated", "Awaiting review", "Not mapped"];

/** All billings split by mapping status. Adds to one. */
export function mappingShares(f: MappingFigures): number[] {
  if (f.ttm <= 0) return [0, 0, 1];
  const validated = f.validatedBillings / f.ttm;
  const review = Math.max(0, f.mappedShare - validated);
  return [validated, review, Math.max(0, 1 - validated - review)];
}

export function readMappedBillings(f: MappingFigures, focus: "amount" | "share"): FinReading {
  const mapped = f.ttm * f.mappedShare;
  const [validated] = mappingShares(f);
  return {
    lead:
      focus === "amount"
        ? `${fmtM(mapped)} of Avnet's billings map to a market category, ${pct(f.mappedShare)} of the total.`
        : `${pct(f.mappedShare)} of Avnet's billings map to a market category: ${fmtM(mapped)} of ${fmtM(f.ttm)}.`,
    sentence: `${pct(validated)} of billings are on validated mappings, ${pct(f.mappedShare - validated)} on mappings awaiting review, and ${pct(1 - f.mappedShare)} have no category.`,
    note: "Every share figure goes through the code map. Billings with no category count toward no market, and billings awaiting review could still move to another one.",
  };
}

// Validated categories -----------------------------------------------------

export interface CategoryFigures {
  categories: number;
  validated: number;
  review: number;
  unmapped: number;
  validatedMonthAgo: number;
}

/** Categories split by status. Adds to one. */
export const categoryShares = (c: CategoryFigures): number[] =>
  c.categories > 0 ? [c.validated, c.review, c.unmapped].map((n) => n / c.categories) : [0, 0, 0];

const more = (n: number) =>
  n === 0 ? "level with a month ago" : `${count(Math.abs(n))} ${n > 0 ? "more" : "fewer"} than a month ago`;

export function readValidated(c: CategoryFigures, billings: MappingFigures, weakest?: { segment: string; validatedShare: number }): FinReading {
  const noun = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;
  return {
    lead: `${c.validated} of ${c.categories} market categories have a validated mapping, ${more(c.validated - c.validatedMonthAgo)}.`,
    sentence: `${noun(c.review, "category waits", "categories wait")} for review and ${noun(c.unmapped, "has", "have")} no Avnet code. Validated mappings carry ${pct(mappingShares(billings)[0])} of billings.`,
    note: weakest
      ? `${weakest.segment} has the smallest share of billings on validated mappings, ${pct(weakest.validatedShare)}, so its market share is the least certain.`
      : undefined,
  };
}

// Share of Avnet and Arrow ---------------------------------------------------

export interface PeerQuarter {
  label: string;
  avnet: number;
  avnetRevenue: number;
  arrowRevenue: number;
}

export function readPeerShare(q: PeerQuarter, yearAgo?: PeerQuarter): FinReading {
  const gap = q.avnetRevenue - q.arrowRevenue;
  const vs = Math.abs(gap) < 0.5 ? "the same revenue as Arrow" : `${fmtM(Math.abs(gap))} ${gap > 0 ? "more" : "less"} revenue than Arrow`;
  return {
    lead: `Avnet took ${pct1(q.avnet)} of the two companies' combined revenue${yearAgo ? `, ${pts(q.avnet - yearAgo.avnet)} a year ago` : ""}.`,
    sentence: `In ${q.label}, Avnet reported ${fmtM(q.avnetRevenue)} and Arrow ${fmtM(q.arrowRevenue)}, so Avnet had ${vs}.`,
    note: "Both sell the same makers' parts to the same kinds of customer, so a rising share of the pair is a live sign of gaining share while Avnet's own share figures are mock.",
  };
}

// Growth over makers -------------------------------------------------------

export interface GrowthGap {
  label: string;
  avnet: number;
  makers: number;
}

/** A scale for the gap that is even about zero, so ahead and behind look the same size. */
export function gapScale(gaps: number[]): Range {
  const m = Math.max(0.05, ...gaps.map(Math.abs));
  const top = Math.ceil(m * 20) / 20;
  return { min: -top, max: top };
}

export function readGrowthGap(g: GrowthGap, makers: number): FinReading {
  const gap = g.avnet - g.makers;
  const p = Math.abs(gap * 100).toFixed(1);
  const grew = (v: number) => `${v < 0 ? "fell" : "grew"} ${pct(Math.abs(v))}`;
  return {
    lead:
      Math.abs(gap) < 0.0005
        ? "Avnet's revenue grew as fast as the revenue of the makers whose parts it sells."
        : `Avnet's revenue grew ${p} pts ${gap > 0 ? "faster" : "slower"} than the revenue of the makers whose parts it sells.`,
    sentence: `In ${g.label}, Avnet's revenue ${grew(g.avnet)} on a year ago and the makers' combined revenue ${grew(g.makers)}.`,
    note: `Growing faster than the ${count(makers)} makers means Avnet is selling a bigger share of what they make. Growing slower means it is losing share, even when its own revenue rises.`,
  };
}

// Scenario Modeler ---------------------------------------------------------

export interface ScenarioFigures {
  years: number;
  /** Mapped billings today and at the horizon, and at the horizon if share holds, $M. */
  billings: number;
  billingsAt: number;
  holdAt: number;
  market: number;
  marketAt: number;
  share: number;
  shareAt: number;
  cagr: number;
}

const inYears = (n: number) => (n === 1 ? "in one year" : `in ${count(n)} years`);

export function readScenarioShare(p: ScenarioFigures): FinReading {
  const change = p.shareAt - p.share;
  return {
    lead: `The scenario takes Avnet's share of the mapped market to ${pct1(p.shareAt)} ${inYears(p.years)}, from ${pct1(p.share)} today.`,
    sentence: `Mapped billings of ${fmtM(p.billingsAt)} against a mapped market of ${fmtM(p.marketAt)} is ${pct1(p.shareAt)}, ${pts(change)} today.`,
    note: "Share moves only when billings grow faster or slower than the market. Growth in the market alone leaves it where it is.",
  };
}

export function readAgainstHold(p: ScenarioFigures): FinReading {
  const gap = p.billingsAt - p.holdAt;
  const word = Math.abs(gap) < 0.5 ? "the same as" : `${fmtM(Math.abs(gap))} ${gap > 0 ? "more" : "less"} than`;
  return {
    lead: `The scenario bills ${word} Avnet would if it kept today's share.`,
    sentence: `Holding share, the market's growth takes billings to ${fmtM(p.holdAt)} ${inYears(p.years)}. The share change ${gap >= 0 ? "adds" : "takes away"} ${fmtM(Math.abs(gap))}, for ${fmtM(p.billingsAt)}.`,
    note: "Holding share is the baseline: Avnet grows exactly with each segment's market. Only the share assumption moves the scenario away from it.",
  };
}

export function readScenarioGrowth(p: ScenarioFigures): FinReading {
  const total = p.billings > 0 ? p.billingsAt / p.billings - 1 : 0;
  return {
    lead: `The scenario grows Avnet's mapped billings ${pct1(p.cagr)} a year, compounded.`,
    sentence: `From ${fmtM(p.billings)} today to ${fmtM(p.billingsAt)} ${inYears(p.years)}, ${total >= 0 ? "up" : "down"} ${pct(Math.abs(total))} in all.`,
    note:
      p.years === 1
        ? "Over one year, the rate a year is simply the growth."
        : `Compounded means each year grows on the one before, so ${count(p.years)} years at ${pct1(p.cagr)} adds up to ${pct(Math.abs(total))}, not ${pct(Math.abs(p.cagr * p.years))}.`,
  };
}
