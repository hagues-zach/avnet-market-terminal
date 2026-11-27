import { formatUsdMillions } from "@/lib/format";
import { count, type WaterfallStep } from "./diagrams";

// What a company's financial KPIs say, in words and diagram steps, for the
// explainers on company profiles and the earnings view. Pure: the server builds
// the quarters (see financials-data.ts), the client reads them here.

export type FinMetric =
  | "revenue"
  | "costOfRevenue"
  | "grossProfit"
  | "operatingIncome"
  | "netIncome"
  | "epsDiluted"
  | "operatingCashFlow"
  | "capex"
  | "freeCashFlow"
  | "grossMargin"
  | "operatingMargin"
  | "inventoryDays"
  | "revenueYoY";

export interface FinQuarter {
  /** The company's own fiscal label, e.g. "FY26 Q4". */
  label: string;
  v: Partial<Record<FinMetric, number>>;
  /** The same quarter a year earlier, when there is one. */
  yearAgo?: { label: string; revenue?: number; inventoryDays?: number };
  /** EPS backed out of the annual report (fourth quarters), so approximate. */
  epsDerived?: boolean;
  /** The company's peer group medians for the same calendar quarter, when the group reported enough. */
  peer?: PeerFigures;
}

export interface PeerFigures {
  /** The group as the app names it, e.g. "Distributors". */
  group: string;
  companies: number;
  grossMargin?: number;
  operatingMargin?: number;
  inventoryDays?: number;
  /** The median company's revenue growth on a year ago. */
  growth?: number;
}

/** Which peer group a margin should be read against. */
export type Group = "distributor" | "chipMaker" | "other";

export interface Subject {
  name: string;
  slug: string;
  group: Group;
}

export interface FinReading {
  /** The answer in one short line. */
  lead: string;
  /** The figures in a sentence, read out when the quarter changes. */
  sentence: string;
  /** One more line of context, when the figures earn it. */
  note?: string;
}

/** Dollars in, "$5.90B" or "$412M" out. Amounts are given as positive numbers. */
export const usd = (dollars: number) => formatUsdMillions(Math.abs(dollars) / 1e6, { precise: true });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
/** "eleven cents" stays in figures from ten up, as the copy rule asks. */
const cents = (share: number) => {
  const n = Math.round(share * 100);
  return `${count(n)} ${n === 1 ? "cent" : "cents"}`;
};
const days = (n: number) => `${count(n)} ${n === 1 ? "day" : "days"}`;

// Gross margin --------------------------------------------------------------

const GROUP_NOTE: Record<Group, string> = {
  distributor: "Distributors resell parts at a small markup, so they run near 10 to 12%. Compare with other distributors, not chip makers.",
  chipMaker: "Chip makers design what they sell and usually keep above 50%. Compare with other chip makers, not distributors.",
  other: "Margins differ a lot between industries, so compare with companies in the same group.",
};

export function grossMarginSteps(q: FinQuarter): WaterfallStep[] | null {
  const { revenue, grossProfit } = q.v;
  if (revenue === undefined || grossProfit === undefined) return null;
  return [
    { label: "Revenue", kind: "total", value: revenue },
    { label: "Cost of sales", kind: "step", value: grossProfit - revenue },
    { label: "Gross profit", kind: "total", value: grossProfit },
  ];
}

export function readGrossMargin(q: FinQuarter, s: Subject): FinReading | null {
  const { revenue, grossProfit, grossMargin } = q.v;
  if (revenue === undefined || grossProfit === undefined || grossMargin === undefined) return null;
  return {
    lead: `${s.name} kept ${cents(grossMargin)} of every revenue dollar after the cost of what it sold.`,
    sentence: `In ${q.label}, revenue of ${usd(revenue)} less cost of sales of ${usd(revenue - grossProfit)} left gross profit of ${usd(grossProfit)}, a gross margin of ${pct(grossMargin)}.`,
    note: GROUP_NOTE[s.group],
  };
}

// Operating margin ----------------------------------------------------------

export function operatingMarginSteps(q: FinQuarter): WaterfallStep[] | null {
  const { revenue, grossProfit, operatingIncome } = q.v;
  if (revenue === undefined || grossProfit === undefined || operatingIncome === undefined) return null;
  return [
    { label: "Revenue", kind: "total", value: revenue },
    { label: "Cost of sales", kind: "step", value: grossProfit - revenue },
    { label: "Gross profit", kind: "total", value: grossProfit },
    { label: "Operating costs", kind: "step", value: operatingIncome - grossProfit },
    { label: operatingIncome < 0 ? "Operating loss" : "Operating profit", kind: "total", value: operatingIncome },
  ];
}

export function readOperatingMargin(q: FinQuarter, s: Subject): FinReading | null {
  const { grossProfit, operatingIncome, operatingMargin } = q.v;
  if (grossProfit === undefined || operatingIncome === undefined || operatingMargin === undefined) return null;
  const costs = usd(grossProfit - operatingIncome);
  if (operatingIncome < 0) {
    return {
      lead: `${s.name}'s operating costs were more than its gross profit, so it ran at a loss.`,
      sentence: `In ${q.label}, gross profit of ${usd(grossProfit)} less operating costs of ${costs} left an operating loss of ${usd(operatingIncome)}, an operating margin of ${pct(operatingMargin)}.`,
    };
  }
  return {
    lead: `${s.name} kept ${cents(operatingMargin)} of every revenue dollar after running the business.`,
    sentence: `In ${q.label}, gross profit of ${usd(grossProfit)} less operating costs of ${costs} left operating profit of ${usd(operatingIncome)}, an operating margin of ${pct(operatingMargin)}.`,
  };
}

// Free cash flow ------------------------------------------------------------

export function freeCashFlowSteps(q: FinQuarter): WaterfallStep[] | null {
  const { operatingCashFlow, capex, freeCashFlow } = q.v;
  if (operatingCashFlow === undefined || capex === undefined || freeCashFlow === undefined) return null;
  return [
    { label: operatingCashFlow < 0 ? "Cash used in operations" : "Cash from operations", kind: "total", value: operatingCashFlow },
    { label: "Capital spending", kind: "step", value: -capex },
    { label: freeCashFlow < 0 ? "Free cash outflow" : "Free cash flow", kind: "total", value: freeCashFlow },
  ];
}

export function readFreeCashFlow(q: FinQuarter, s: Subject): FinReading | null {
  const { operatingCashFlow, capex, freeCashFlow, revenueYoY } = q.v;
  if (operatingCashFlow === undefined || capex === undefined || freeCashFlow === undefined) return null;
  const lead =
    freeCashFlow >= 0
      ? `${s.name} brought in ${usd(freeCashFlow)} of cash after paying for its equipment and buildings.`
      : `${s.name} paid out ${usd(freeCashFlow)} more than its operations brought in.`;
  const ops = operatingCashFlow >= 0 ? `cash from operations of ${usd(operatingCashFlow)}` : `an operating cash outflow of ${usd(operatingCashFlow)}`;
  const left = freeCashFlow >= 0 ? `left free cash flow of ${usd(freeCashFlow)}` : `left a free cash outflow of ${usd(freeCashFlow)}`;
  let note: string | undefined;
  if (s.group === "distributor" && revenueYoY !== undefined) {
    if (revenueYoY < 0 && freeCashFlow > 0)
      note = "Revenue fell on a year ago, yet cash came in. A distributor releases cash in a downturn as it sells inventory it no longer replaces.";
    else if (revenueYoY > 0 && freeCashFlow < 0)
      note = "Revenue grew on a year ago, and cash went into the inventory that growth needs. Distributors often use cash on the way up.";
  }
  return { lead, sentence: `In ${q.label}, ${ops} less capital spending of ${usd(capex)} ${left}.`, note };
}

// Diluted EPS ---------------------------------------------------------------

export function epsSteps(q: FinQuarter): WaterfallStep[] | null {
  const { revenue, netIncome } = q.v;
  if (revenue === undefined || netIncome === undefined) return null;
  return [
    { label: "Revenue", kind: "total", value: revenue },
    { label: "All costs, interest and tax", kind: "step", value: netIncome - revenue },
    { label: netIncome < 0 ? "Net loss" : "Net income", kind: "total", value: netIncome },
  ];
}

/** Diluted shares implied by net income and EPS, in millions; null when EPS is zero. */
export function impliedShares(netIncome: number, eps: number): number | null {
  if (eps === 0) return null;
  const m = netIncome / eps / 1e6;
  return m > 0 ? m : null;
}

export function readEps(q: FinQuarter, s: Subject): FinReading | null {
  const { netIncome, epsDiluted } = q.v;
  if (netIncome === undefined || epsDiluted === undefined) return null;
  const per = `$${Math.abs(epsDiluted).toFixed(2)}`;
  const shares = impliedShares(netIncome, epsDiluted);
  const sharesText = shares === null ? "" : ` over about ${Math.round(shares).toLocaleString("en-US")} million diluted shares`;
  return {
    lead: epsDiluted >= 0 ? `${s.name} earned ${per} for each share in ${q.label}.` : `${s.name} lost ${per} for each share in ${q.label}.`,
    sentence: `In ${q.label}, ${netIncome >= 0 ? "net income" : "a net loss"} of ${usd(netIncome)}${sharesText} came to ${epsDiluted < 0 ? "a loss of " : ""}${per} a share.`,
    note: q.epsDerived ? "This quarter's figure is backed out of the annual report, so treat it as approximate." : undefined,
  };
}

// Inventory days ------------------------------------------------------------

/** The reference the scale draws: about one quarter of sales on the shelf. */
export const INVENTORY_REFERENCE = 90;

/** A scale wide enough for every quarter and the reference, rounded out to tens. */
export function inventoryScale(values: number[]): { min: number; max: number } {
  const all = [...values, INVENTORY_REFERENCE];
  const lo = Math.max(0, Math.floor((Math.min(...all) * 0.85) / 10) * 10);
  // Rounded first, so 200 × 1.1 stays 220 rather than tipping to 230 on float error.
  const hi = Math.ceil(Math.round(Math.max(...all) * 11) / 100) * 10;
  return { min: lo, max: Math.max(hi, lo + 10) };
}

export function readInventoryDays(q: FinQuarter, s: Subject): FinReading | null {
  const d = q.v.inventoryDays;
  if (d === undefined) return null;
  const n = Math.round(d);
  const prev = q.yearAgo?.inventoryDays;
  const change = prev === undefined ? undefined : n - Math.round(prev);
  const vs =
    change === undefined || !q.yearAgo
      ? ""
      : change === 0
        ? `, level with ${q.yearAgo.label}`
        : `, ${change > 0 ? "up" : "down"} ${days(Math.abs(change))} on ${q.yearAgo.label}`;
  return {
    lead: `${s.name}'s inventory would last ${days(n)} at its current rate of sales.`,
    sentence: `In ${q.label}, ${s.name} held ${days(n)} of inventory${vs}.`,
    note:
      change !== undefined && change >= 10
        ? "Rising days mean inventory is building faster than it sells. Early in a downturn, that is the warning sign."
        : undefined,
  };
}

// Revenue growth ------------------------------------------------------------

export function readRevenueGrowth(q: FinQuarter, s: Subject): (FinReading & { gapText: string }) | null {
  const revenue = q.v.revenue;
  const prev = q.yearAgo?.revenue;
  if (revenue === undefined || prev === undefined || !q.yearAgo || prev === 0) return null;
  // The tile's growth figure wins. For a foreign filer it is in local currency,
  // while the bars are in dollars, so say so when the two differ.
  const inUsd = revenue / prev - 1;
  const g = q.v.revenueYoY ?? inUsd;
  const gap = revenue - prev;
  const fx = Math.abs(g - inUsd) > 0.005;
  const move = Math.abs(g) < 0.0005 ? "level with" : `${g > 0 ? "up" : "down"} ${pct(Math.abs(g))} on`;
  return {
    lead: `Revenue was ${move} the same quarter a year ago.`,
    sentence: `${s.name} took in ${usd(revenue)} in ${q.label}, against ${usd(prev)} in ${q.yearAgo.label}.`,
    note: fx
      ? `Growth is measured in ${s.name}'s own currency. The bars are in dollars, so the exchange rate moves them apart.`
      : "Comparing with the same quarter a year earlier cancels out the seasons, which a quarter on quarter change would not.",
    gapText: Math.round(gap / 1e6) === 0 ? "Level with a year ago" : `${usd(gap)} ${gap > 0 ? "more" : "less"} than a year ago`,
  };
}

// Peer group ----------------------------------------------------------------

/** The KPIs a peer median means something for: ratios, not amounts. */
export type PeerKind = "grossMargin" | "operatingMargin" | "inventoryDays" | "revenueGrowth";

const PEER_METRIC: Record<PeerKind, { value: (q: FinQuarter) => number | undefined; median: (p: PeerFigures) => number | undefined; what: string; days?: boolean; close: number }> = {
  grossMargin: { value: (q) => q.v.grossMargin, median: (p) => p.grossMargin, what: "gross margin", close: 0.005 },
  operatingMargin: { value: (q) => q.v.operatingMargin, median: (p) => p.operatingMargin, what: "operating margin", close: 0.005 },
  inventoryDays: { value: (q) => q.v.inventoryDays, median: (p) => p.inventoryDays, what: "inventory", days: true, close: 3 },
  revenueGrowth: { value: (q) => q.v.revenueYoY, median: (p) => p.growth, what: "revenue growth", close: 0.005 },
};

/** The company's figure and its group's median for the quarter, or null when either is missing or the group is too small. */
export function peerPair(kind: PeerKind, q: FinQuarter): { value: number; median: number; peer: PeerFigures } | null {
  const m = PEER_METRIC[kind];
  const value = m.value(q);
  const median = q.peer ? m.median(q.peer) : undefined;
  if (value === undefined || median === undefined || !q.peer || q.peer.companies < 3) return null;
  return { value, median, peer: q.peer };
}

/** "Avnet's gross margin of 10.8% is below the 11.6% median of the six Distributors." */
export function readPeer(kind: PeerKind, q: FinQuarter, s: Subject): string | null {
  const p = peerPair(kind, q);
  if (!p) return null;
  const m = PEER_METRIC[kind];
  const fmt = (v: number) => (m.days ? `${Math.round(v)} days` : `${v < 0 ? "minus " : ""}${pct(Math.abs(v))}`);
  const where = Math.abs(p.value - p.median) < m.close ? "in line with" : p.value > p.median ? "above" : "below";
  // "Distributors" reads as "distributors" mid-sentence; "AI & connectivity" keeps its capitals.
  const group = p.peer.group.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());
  return `${s.name}'s ${m.what} of ${fmt(p.value)} is ${where} the ${fmt(p.median)} median of the ${count(p.peer.companies)} companies in ${group}.`;
}

/**
 * A scale centred on the group median, twice as wide as the company's distance
 * from it, so the median's label sits clear of the end labels and the company
 * never lands on an end. `least` is the smallest half-width (1 point, 5 days).
 */
export function peerScale(value: number, median: number, least: number): { min: number; max: number } {
  const half = Math.max(Math.abs(value - median) * 2, Math.abs(median) * 0.25, least);
  return { min: median - half, max: median + half };
}
