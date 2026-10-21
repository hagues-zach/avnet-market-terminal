// Scenario Modeler maths: Avnet's mapped billings at a horizon, from each
// segment's market, its growth and Avnet's share. Pure, so the page and the
// test run the same arithmetic. Inputs are mock until WSTS, Gartner, the IP&E
// forecast, billings and the code map are hooked up.

export type MarketView = "base" | "upside" | "downside";

export const VIEWS: { value: MarketView; label: string }[] = [
  { value: "base", label: "Base" },
  { value: "upside", label: "Upside" },
  { value: "downside", label: "Downside" },
];

export interface SegmentInput {
  segment: string;
  /** Market today, $M. */
  market: number;
  /** Avnet billings ÷ market today. */
  share: number;
  /** Avnet billings today, $M. */
  billings: number;
  /** Forecast market growth for each year ahead (base case). */
  forecast: number[];
}

export interface Assumptions {
  /** Years ahead, 1 to 4. */
  years: number;
  view: MarketView;
  /** An annual growth rate that replaces the forecast for a segment. */
  growth: Record<string, number | undefined>;
  /** Share change at the horizon, in percentage points (0.25 is a quarter point). */
  shareChange: Record<string, number | undefined>;
}

export interface SegmentResult {
  segment: string;
  market: number;
  marketAt: number;
  /** Growth a year over the horizon. */
  growth: number;
  /** True when the growth is the user's, not the forecast's. */
  edited: boolean;
  share: number;
  shareAt: number;
  billings: number;
  billingsAt: number;
  /** Billings at the horizon if share holds. */
  holdAt: number;
}

export interface Projection {
  years: number;
  rows: SegmentResult[];
  billings: number;
  billingsAt: number;
  holdAt: number;
  market: number;
  marketAt: number;
  share: number;
  shareAt: number;
  /** Growth a year in billings. */
  cagr: number;
  /** Billings today to the horizon, split into market and share. */
  bridge: { today: number; market: number; share: number; scenario: number };
}

/** The spread from the base market at t years, interpolated from the yearly band (0 today). */
export function spreadAt(spread: number[], t: number): number {
  if (t <= 0) return 0;
  const i = Math.min(Math.floor(t), spread.length);
  const lo = i === 0 ? 0 : spread[i - 1];
  const hi = spread[Math.min(i, spread.length - 1)];
  return i >= spread.length ? spread[spread.length - 1] : lo + (hi - lo) * (t - i);
}

/** How much a segment's market grows by t years (fractional years compound within the year). */
export function growthFactor(forecast: number[], t: number, override?: number): number {
  if (override !== undefined) return (1 + override) ** t;
  let f = 1;
  for (let y = 0; y < Math.floor(t); y++) f *= 1 + (forecast[y] ?? forecast[forecast.length - 1]);
  const frac = t - Math.floor(t);
  if (frac > 0) f *= (1 + (forecast[Math.floor(t)] ?? forecast[forecast.length - 1])) ** frac;
  return f;
}

const viewFactor = (view: MarketView, spread: number[], t: number) =>
  view === "base" ? 1 : view === "upside" ? 1 + spreadAt(spread, t) : 1 - spreadAt(spread, t);

/** Billings at t years for one segment, with share change ramping in evenly to the horizon. */
function at(s: SegmentInput, a: Assumptions, spread: number[], t: number) {
  const market = s.market * growthFactor(s.forecast, t, a.growth[s.segment]) * viewFactor(a.view, spread, t);
  const pts = (a.shareChange[s.segment] ?? 0) / 100;
  const share = s.share + pts * (a.years ? t / a.years : 0);
  return { market, share, billings: market * share, hold: market * s.share };
}

export function project(segments: SegmentInput[], a: Assumptions, spread: number[]): Projection {
  const rows = segments.map((s) => {
    const end = at(s, a, spread, a.years);
    return {
      segment: s.segment,
      market: s.market,
      marketAt: end.market,
      growth: (end.market / s.market) ** (1 / a.years) - 1,
      edited: a.growth[s.segment] !== undefined,
      share: s.share,
      shareAt: end.share,
      billings: s.billings,
      billingsAt: end.billings,
      holdAt: end.hold,
    };
  });
  const sum = (k: keyof SegmentResult) => rows.reduce((n, r) => n + (r[k] as number), 0);
  const billings = sum("billings");
  const billingsAt = sum("billingsAt");
  const holdAt = sum("holdAt");
  const market = sum("market");
  const marketAt = sum("marketAt");
  return {
    years: a.years,
    rows,
    billings,
    billingsAt,
    holdAt,
    market,
    marketAt,
    share: billings / market,
    shareAt: billingsAt / marketAt,
    cagr: (billingsAt / billings) ** (1 / a.years) - 1,
    bridge: { today: billings, market: holdAt - billings, share: billingsAt - holdAt, scenario: billingsAt },
  };
}

/** Billings by quarter from today to the horizon: the scenario and holding share. */
export function path(segments: SegmentInput[], a: Assumptions, spread: number[]) {
  return Array.from({ length: a.years * 4 + 1 }, (_, q) => {
    const t = q / 4;
    const parts = segments.map((s) => at(s, a, spread, t));
    return { q, scenario: parts.reduce((n, p) => n + p.billings, 0), hold: parts.reduce((n, p) => n + p.hold, 0) };
  });
}

/**
 * The share gain in points, the same in every segment, that reaches a billings
 * target at the horizon. Null when it would take a segment below zero share or
 * above the whole market.
 */
export function goalSeek(p: Projection, target: number): number | null {
  if (!(target > 0) || p.marketAt <= 0) return null;
  const x = (target - p.holdAt) / p.marketAt;
  if (p.rows.some((r) => r.share + x < 0 || r.share + x > 1)) return null;
  return x * 100;
}

/** "$27.5B", "−$0.1B", "$850M". */
export function money(v: number, signed = false): string {
  const sign = v < 0 ? "−" : signed ? "+" : "";
  const a = Math.abs(v);
  return `${sign}$${a >= 1000 ? (a / 1000).toFixed(1) + "B" : Math.round(a) + "M"}`;
}

export const pct = (v: number, digits = 1, signed = false) => `${v < 0 ? "−" : signed ? "+" : ""}${Math.abs(v * 100).toFixed(digits)}%`;

const YEARS = ["", "one year", "two years", "three years", "four years"];
const pts = (v: number) => (Math.abs(v) === 0.25 ? "quarter-point" : Math.abs(v) === 0.5 ? "half-point" : `${Math.abs(v)}-point`);

/** The share assumption in words, or null when segments differ. */
export function shareWords(a: Assumptions, segments: string[]): string | null {
  const values = segments.map((s) => a.shareChange[s] ?? 0);
  if (values.some((v) => v !== values[0])) return null;
  const v = values[0];
  return v === 0 ? "share held" : `a ${pts(v)} share ${v > 0 ? "gain" : "loss"}`;
}

export function lead(p: Projection, a: Assumptions): string {
  const view = a.view === "base" ? "the base market" : a.view === "upside" ? "the upside market" : "the downside market";
  const share = shareWords(
    a,
    p.rows.map((r) => r.segment),
  );
  const edited = p.rows.some((r) => r.edited);
  const premise = `With ${view}${edited ? " and growth edited in some segments" : ""} and ${share ?? "share changed by segment"}`;
  const reach = `Avnet's mapped billings reach ${money(p.billingsAt)} in ${YEARS[a.years] ?? `${a.years} years`}`;
  const gap = p.billingsAt - p.holdAt;
  if (Math.abs(gap) < 0.5) return `${premise}, ${reach}. The market adds ${money(p.bridge.market)} on today's ${money(p.billings)}.`;
  const against = `${money(Math.abs(gap))} ${gap > 0 ? "more" : "less"} than holding share`;
  return `${premise}, ${reach}, ${against}. The market adds ${money(p.bridge.market)} and share ${gap > 0 ? "adds" : "takes away"} ${money(Math.abs(p.bridge.share))}.`;
}
