import type { Metric, Quarter } from "@/lib/data/live/earnings-model";

// Avnet against Arrow: the scorecard rows, who leads on each, the verdict and
// the sentences under "Where Avnet is stronger". Rules over the two companies'
// reported figures, so every sentence is exact. Pure, so the page and its tests
// read the same rules.

export type Side = "Avnet" | "Arrow";
export type Kind = "usd" | "pct" | "growth" | "days";

export interface Measure {
  label: string;
  metric: Metric;
  kind: Kind;
  /** Which direction is the stronger position; null when neither is. */
  higherIsBetter: boolean | null;
  /** Why the two figures can't be compared, when they can't. */
  caveat?: string;
}

const GROSS =
  "Not comparable: Arrow reports some enterprise computing sales net while carrying the receivables and payables gross, which inflates its days.";

export const MEASURES: Measure[] = [
  { label: "Revenue", metric: "revenue", kind: "usd", higherIsBetter: null },
  { label: "Revenue growth YoY", metric: "revenueYoY", kind: "growth", higherIsBetter: true },
  { label: "Revenue growth QoQ", metric: "revenueQoQ", kind: "growth", higherIsBetter: true },
  { label: "Gross margin", metric: "grossMargin", kind: "pct", higherIsBetter: true },
  { label: "SG&A, % of revenue", metric: "sgaPct", kind: "pct", higherIsBetter: false },
  { label: "Operating margin", metric: "operatingMargin", kind: "pct", higherIsBetter: true },
  { label: "Net margin", metric: "netMargin", kind: "pct", higherIsBetter: true },
  { label: "Inventory days", metric: "inventoryDays", kind: "days", higherIsBetter: false },
  { label: "Free cash flow margin", metric: "fcfMargin", kind: "pct", higherIsBetter: true },
  { label: "Receivable days", metric: "receivableDays", kind: "days", higherIsBetter: null, caveat: GROSS },
  { label: "Payable days", metric: "payableDays", kind: "days", higherIsBetter: null, caveat: GROSS },
  { label: "Cash conversion cycle, days", metric: "cashCycleDays", kind: "days", higherIsBetter: null, caveat: GROSS },
  { label: "Long-term debt", metric: "longTermDebt", kind: "usd", higherIsBetter: null },
];

export interface ScoreRow extends Measure {
  avnet?: number;
  arrow?: number;
  /** Avnet minus Arrow (a ratio for dollar amounts). */
  gap?: number;
  gapYearAgo?: number;
  /** Null when neither direction is better, or a figure is missing. */
  leads: Side | "Even" | null;
}

const gapOf = (kind: Kind, a: number | undefined, b: number | undefined) =>
  a === undefined || b === undefined ? undefined : kind === "usd" ? (b ? a / b : undefined) : a - b;

/** Figures this close count as even: 0.05 points of a margin, half a day. */
const EVEN: Record<Kind, number> = { usd: 0, pct: 0.0005, growth: 0.0005, days: 0.5 };

export function scorecard(avnet: Quarter, arrow: Quarter, avnetYearAgo?: Quarter, arrowYearAgo?: Quarter): ScoreRow[] {
  return MEASURES.map((m) => {
    const a = avnet.values[m.metric];
    const b = arrow.values[m.metric];
    let leads: ScoreRow["leads"] = null;
    if (m.higherIsBetter !== null && a !== undefined && b !== undefined) {
      leads = Math.abs(a - b) < EVEN[m.kind] ? "Even" : a > b === m.higherIsBetter ? "Avnet" : "Arrow";
    }
    return {
      ...m,
      avnet: a,
      arrow: b,
      gap: gapOf(m.kind, a, b),
      gapYearAgo: gapOf(m.kind, avnetYearAgo?.values[m.metric], arrowYearAgo?.values[m.metric]),
      leads,
    };
  });
}

/** "Avnet grew faster in CY26 Q2, Arrow kept the higher margins." */
export function verdict(rows: ScoreRow[], quarter: string): string {
  const growth = rows.find((r) => r.metric === "revenueYoY")?.leads;
  const margin = rows.find((r) => r.metric === "operatingMargin")?.leads;
  const g = growth === "Avnet" || growth === "Arrow" ? growth : null;
  const m = margin === "Avnet" || margin === "Arrow" ? margin : null;
  if (g && m && g === m) return `${g} led on both growth and margins in ${quarter}.`;
  if (g && m) return `${g} grew faster in ${quarter}, ${m} kept the higher margins.`;
  if (g) return `${g} grew faster in ${quarter}; operating margins were level.`;
  if (m) return `${m} had the higher operating margin in ${quarter}; growth was level.`;
  return `Avnet and Arrow were level on growth and margins in ${quarter}.`;
}

/** How many of the measures with a clear better direction each side leads on. */
export function tally(rows: ScoreRow[]): { avnet: number; arrow: number; counted: number } {
  const counted = rows.filter((r) => r.leads !== null);
  return {
    avnet: counted.filter((r) => r.leads === "Avnet").length,
    arrow: counted.filter((r) => r.leads === "Arrow").length,
    counted: counted.length,
  };
}

/* ---------- Talking points ---------- */

const pct = (v: number) => `${(Math.abs(v) * 100).toFixed(1)}%`;
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${pct(v)}`;
const pts = (v: number) => `${(Math.abs(v) * 100).toFixed(1)} points`;
const days = (v: number) => `${Math.round(Math.abs(v))} ${Math.round(Math.abs(v)) === 1 ? "day" : "days"}`;

/** Is the leader's edge bigger or smaller than a year ago? Only for measures where a gap is a difference. */
function trendClause(row: ScoreRow, leader: Side): string {
  if (row.gap === undefined || row.gapYearAgo === undefined || row.kind === "usd") return "";
  // The leader's edge, positive when it is ahead.
  const sign = (leader === "Avnet" ? 1 : -1) * (row.higherIsBetter ? 1 : -1);
  const now = row.gap * sign;
  const then = row.gapYearAgo * sign;
  const unit = row.kind === "days" ? days : pts;
  if (then <= 0) return " A year ago it was the other way round.";
  const change = now - then;
  if (Math.abs(change) < EVEN[row.kind] * 2) return " The gap is about where it was a year ago.";
  return change > 0 ? ` The gap has widened from ${unit(then)} a year ago.` : ` The gap has narrowed from ${unit(then)} a year ago.`;
}

/** One plain sentence on a measure the given side leads, to use in a customer or supplier conversation. */
export function talkingPoint(row: ScoreRow): string {
  const leader = row.leads as Side;
  const other: Side = leader === "Avnet" ? "Arrow" : "Avnet";
  const x = leader === "Avnet" ? row.avnet! : row.arrow!;
  const y = leader === "Avnet" ? row.arrow! : row.avnet!;
  const d = x - y;
  let s: string;
  switch (row.metric) {
    case "revenueYoY":
      s =
        x > 0 && y > 0 && x / y >= 1.5
          ? `${leader} is growing about ${(x / y).toFixed(1)} times as fast as ${other} on a year ago (${signedPct(x)} against ${signedPct(y)}).`
          : `${leader}'s revenue grew ${signedPct(x)} on a year ago, against ${signedPct(y)} at ${other}.`;
      break;
    case "revenueQoQ":
      s = `${leader} grew ${signedPct(x)} on the quarter before, against ${signedPct(y)} at ${other}.`;
      break;
    case "sgaPct":
      s = `${leader} spends ${pts(d)} less of its revenue on selling and overheads than ${other}.`;
      break;
    case "inventoryDays":
      s = `${leader} carries ${days(d)} less inventory than ${other}, measured against cost of sales.`;
      break;
    case "fcfMargin":
      s = `${leader} turned ${pts(d)} more of its revenue into free cash flow than ${other}.`;
      break;
    default:
      s = `${leader}'s ${row.label.toLowerCase()} is ${pts(d)} higher than ${other}'s (${pct(x)} against ${pct(y)}).`;
  }
  return s + trendClause(row, leader);
}

/** The measures a side leads on, biggest edge first (relative to the size of the figure). */
export function strengths(rows: ScoreRow[], side: Side): ScoreRow[] {
  const edge = (r: ScoreRow) => Math.abs(r.gap ?? 0) / Math.max(Math.abs(r.avnet ?? 0), Math.abs(r.arrow ?? 0), 1e-9);
  return rows.filter((r) => r.leads === side).sort((a, b) => edge(b) - edge(a));
}
