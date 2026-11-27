// Layout rules for the explainer diagrams, kept pure so the components and their
// tests read the same arithmetic. No data and no React here.

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** One to nine in words, ten and up in figures (DESIGN.md, copy). */
export const count = (n: number): string => WORDS[n] ?? String(n);

// Ratio scale --------------------------------------------------------------

export interface Range {
  min: number;
  max: number;
}

/** Where a value sits on a scale, 0 to 1, pinned to the ends. */
export function position(value: number, scale: Range): number {
  if (scale.max === scale.min) return 0;
  const t = (value - scale.min) / (scale.max - scale.min);
  return Math.min(1, Math.max(0, t));
}

// Waterfall ----------------------------------------------------------------

export interface WaterfallStep {
  label: string;
  /** A total is drawn from zero; a step is drawn from the running total, by its signed amount. */
  kind: "total" | "step";
  /** For a total, the total. For a step, the signed change (cost of sales is negative). */
  value: number;
}

export interface WaterfallBar extends WaterfallStep {
  /** The bar's two ends in value terms, low first. */
  from: number;
  to: number;
  /** The running total after this row. */
  running: number;
}

/** Each row's span. Totals reset the running figure, so a stated total wins over the arithmetic. */
export function waterfall(steps: WaterfallStep[]): { bars: WaterfallBar[]; domain: Range } {
  let running = 0;
  const bars = steps.map((s) => {
    const start = s.kind === "total" ? 0 : running;
    const end = s.kind === "total" ? s.value : running + s.value;
    running = end;
    return { ...s, from: Math.min(start, end), to: Math.max(start, end), running: end };
  });
  const ends = bars.flatMap((b) => [b.from, b.to]);
  return { bars, domain: { min: Math.min(0, ...ends), max: Math.max(0, ...ends) } };
}

/** A total as a share of the first total, e.g. gross profit over revenue. */
export function shareOfFirst(steps: WaterfallStep[], index: number): number {
  const base = steps.find((s) => s.kind === "total")?.value ?? 0;
  const v = waterfall(steps).bars[index]?.running ?? 0;
  return base === 0 ? 0 : v / base;
}

// Funnel -------------------------------------------------------------------

export interface FunnelStage {
  label: string;
  value: number;
}

export interface FunnelRow extends FunnelStage {
  /** Width against the first stage, 0 to 1. */
  width: number;
  /** This stage over the one before, or null for the first. */
  conversion: number | null;
}

export function funnel(stages: FunnelStage[]): FunnelRow[] {
  const top = Math.max(...stages.map((s) => s.value), 0);
  return stages.map((s, i) => {
    const prev = i > 0 ? stages[i - 1].value : 0;
    return {
      ...s,
      width: top > 0 ? Math.max(0, s.value) / top : 0,
      conversion: i === 0 ? null : prev > 0 ? s.value / prev : 0,
    };
  });
}

/** The stage that loses the largest share of what reaches it. */
export function weakestStep(rows: FunnelRow[]): number | null {
  let worst: number | null = null;
  rows.forEach((r, i) => {
    if (r.conversion === null) return;
    if (worst === null || r.conversion < (rows[worst].conversion ?? 1)) worst = i;
  });
  return worst;
}

// Nested boxes -------------------------------------------------------------

export interface NestLevel {
  label: string;
  value: number;
}

/**
 * Each level's side as a fraction of the outer box's, so areas are to scale:
 * a level worth 4% of the outer one gets a box with 20% of its side. Pinned to
 * 0 to 1, and never larger than the level that holds it.
 */
export function nested(levels: NestLevel[]): number[] {
  const outer = levels[0]?.value ?? 0;
  let cap = 1;
  return levels.map((l) => {
    const side = outer > 0 ? Math.sqrt(Math.max(0, l.value) / outer) : 0;
    cap = Math.min(cap, side);
    return cap;
  });
}

// Dot strip ----------------------------------------------------------------

/**
 * A row for each dot so none overlap: dots in x order, each in the lowest row
 * whose last dot is at least `gap` pixels to its left. Returns rows in the
 * order the xs were given.
 */
export function dotRows(xs: number[], gap: number): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const ends: number[] = [];
  const rows = new Array<number>(xs.length);
  for (const d of order) {
    let r = ends.findIndex((e) => d.x - e >= gap);
    if (r === -1) r = ends.length;
    ends[r] = d.x;
    rows[d.i] = r;
  }
  return rows;
}

/** The median of a list, or undefined when it is empty. */
export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
