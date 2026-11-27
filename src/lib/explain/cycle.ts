import { count, median, type Range } from "./diagrams";
import type { FinReading } from "./financials";

// What the cycle KPIs say (Market Cycle and Earnings Season), in words and
// diagram parts. Pure. Growth is a fraction (0.05 is 5%); capex is in dollars.

const pct = (v: number) => `${Math.round(v * 100)}%`;
const pct1 = (v: number) => `${(Math.abs(v) * 100).toFixed(1)}%`;
const grew = (v: number) => `${v < 0 ? "fell" : "grew"} ${pct1(v)}`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "Q3 '26" from "CY26 Q3", for steppers and sentences. */
export const shortQuarter = (label: string) => label.replace(/^CY(?:20)?(\d{2}) (Q\d)$/, "$2 '$1");

/** A growth scale even about zero, in steps of 5 points, so expansion and contraction look the same size. */
export function growthScale(values: number[]): Range {
  const m = Math.max(0.05, ...values.map(Math.abs));
  const top = Math.ceil(m * 20 - 1e-9) / 20;
  return { min: -top, max: top };
}

// Supply-chain revenue -----------------------------------------------------

export interface GrowthQuarter {
  label: string;
  growth: number;
  /** The phase the cycle engine gave the quarter, e.g. "Expansion, slowing". */
  phase: string | null;
}

export function readSupplyRevenue(qs: GrowthQuarter[], i: number): FinReading {
  const q = qs[i];
  const before = qs[i - 1];
  const label = shortQuarter(q.label);
  const lead = q.phase
    ? `The supply chain is in ${lower(q.phase)}: revenue ${grew(q.growth)} on a year ago.`
    : `Supply-chain revenue ${grew(q.growth)} on a year ago.`;
  const move = before
    ? Math.abs(q.growth - before.growth) < 0.0005
      ? `, the same as the quarter before`
      : `, ${q.growth > before.growth ? "up" : "down"} from ${before.growth < 0 ? "minus " : ""}${pct1(before.growth)} the quarter before`
    : "";
  return {
    lead: i === qs.length - 1 ? lead : lead.replace("is in", "was in"),
    sentence: `In ${label}, the supply chain's combined revenue ${grew(q.growth)}${move}.`,
    note: "Above zero is expansion and below is contraction. Growth rising from the quarter before is accelerating or easing; falling is slowing or deepening.",
  };
}

// Companies growing and median growth ---------------------------------------

export interface CompanyGrowth {
  slug: string;
  name: string;
  growth: number;
}

export function breadth(cs: CompanyGrowth[]) {
  const growing = cs.filter((c) => c.growth > 0).length;
  return { growing, shrinking: cs.length - growing, median: median(cs.map((c) => c.growth)) };
}

/** Where Avnet sits: "Avnet's 9.4% is above the median." */
function avnetLine(cs: CompanyGrowth[], m: number): string {
  const a = cs.find((c) => c.slug === "avnet");
  if (!a) return "";
  const where = Math.abs(a.growth - m) < 0.0005 ? "at" : a.growth > m ? "above" : "below";
  return ` Avnet's ${a.growth < 0 ? "fall of " : ""}${pct1(a.growth)} is ${where} the median.`;
}

export function readCompaniesGrowing(cs: CompanyGrowth[], label: string, combined?: number): FinReading {
  const b = breadth(cs);
  const share = cs.length ? b.growing / cs.length : 0;
  const m = b.median ?? 0;
  const gap = combined === undefined ? undefined : combined - m;
  return {
    lead: `${pct(share)} of supply-chain companies grew revenue on a year ago: ${b.growing} of ${cs.length}.`,
    sentence: `In ${shortQuarter(label)}, the median company ${grew(m)}${combined === undefined ? "" : ` and combined revenue ${grew(combined)}`}.${avnetLine(cs, m)}`,
    note:
      gap === undefined || Math.abs(gap) < 0.02
        ? "Breadth shows whether growth is broad or carried by a few. Here the median and the total agree, so it is broad."
        : gap > 0
          ? "Combined revenue grew faster than the median company, so a few large companies are carrying the total."
          : "The median company grew faster than combined revenue, so some of the largest companies are holding the total back.",
  };
}

export function readMedianGrowth(cs: CompanyGrowth[], quarter: string, total: number): FinReading {
  const b = breadth(cs);
  const m = b.median ?? 0;
  return {
    lead: `The median company that has filed ${shortQuarter(quarter)} ${grew(m)} on a year ago.`,
    sentence: `${cs.length} of ${total} companies have filed: ${b.growing} grew and ${b.shrinking} shrank.${avnetLine(cs, m)}`,
    note: "The median is the middle company, so one very large result can't pull it the way it pulls a combined total. It moves as more companies file.",
  };
}

// Distributor inventory ----------------------------------------------------

export interface DaysQuarter {
  label: string;
  days: number;
  /** Chip makers' combined revenue growth in the same quarter. */
  chipGrowth?: number;
}

export function readDistributorInventory(qs: DaysQuarter[], i: number, distributors: number): FinReading {
  const q = qs[i];
  const n = Math.round(q.days);
  const ago = qs[i - 4];
  const change = ago ? n - Math.round(ago.days) : undefined;
  const vs = change === undefined ? "" : change === 0 ? ", level with a year ago" : `, ${change > 0 ? "up" : "down"} ${Math.abs(change)} days on a year ago`;
  return {
    lead: `The median distributor holds ${n} days of inventory${vs}.`,
    sentence: `In ${shortQuarter(q.label)}, across ${count(distributors)} distributors, the middle one would run out in ${n} days at its rate of sales.${
      q.chipGrowth === undefined ? "" : ` Chip makers' revenue ${grew(q.chipGrowth)} on a year ago.`
    }`,
    note: "Distributor inventory turns before chip makers' revenue does. When days climb, distributors cut orders, and the makers feel it a quarter or two later.",
  };
}

// Hyperscaler capex --------------------------------------------------------

export interface CapexQuarter {
  label: string;
  total: number;
  yearAgo: number;
  chipGrowth?: number;
}

export function readCapex(q: CapexQuarter, hyperscalers: number, usd: (v: number) => string): FinReading {
  const g = q.yearAgo > 0 ? q.total / q.yearAgo - 1 : 0;
  const gap = q.chipGrowth === undefined ? undefined : g - q.chipGrowth;
  return {
    lead: `The ${count(hyperscalers)} hyperscalers spent ${usd(q.total)} on capital projects in ${shortQuarter(q.label)}, ${g < 0 ? "down" : "up"} ${pct(Math.abs(g))} on a year ago.`,
    sentence: `They spent ${usd(q.yearAgo)} a year earlier.${q.chipGrowth === undefined ? "" : ` Chip makers' revenue ${grew(q.chipGrowth)} over the same year.`}`,
    note:
      gap === undefined
        ? "Most of this spend is data centers for AI, and chips are a large part of it."
        : gap > 0
          ? `Capex grew ${Math.round(gap * 100)} pts faster than chip makers' revenue. That is the AI gap: spending that has not yet shown in chip revenue, or that went on buildings and power.`
          : "Chip makers' revenue grew at least as fast as capex, so the spending is reaching chip revenue.",
  };
}
