import { addMonths, type Series } from "./transform";

// Composite indexes, the Conference Board way: each component's monthly change
// (a symmetric percent change for levels, a simple difference for spreads,
// ratios and diffusion indexes), weighted by the inverse of its volatility so no
// noisy series dominates, summed, and chained into an index of 100 in the base
// year. Months where a component hasn't started yet reweight the ones present.
// Growth is EPB's 6-month smoothed annualised rate on the index level. Pure.

export interface Component {
  key: string;
  /** The level the change is taken on: the raw series for growth measures, the value itself otherwise. */
  level: Series;
  change: "percent" | "difference";
  /** -1 for a series where a rise is bad news, so every component points the same way. */
  sign: 1 | -1;
}

export interface Composite {
  index: Series;
  /** Each component's weighted change by month, for "what moved it". */
  contributions: Map<string, { key: string; value: number }[]>;
  weights: Record<string, number>;
}

export function monthlyChanges(c: Component): Series {
  const out: Series = [];
  for (let i = 1; i < c.level.length; i++) {
    const a = c.level[i - 1];
    const b = c.level[i];
    if (addMonths(a.month, 1) !== b.month) continue;
    const v = c.change === "percent" ? (a.value + b.value === 0 ? 0 : (200 * (b.value - a.value)) / (b.value + a.value)) : b.value - a.value;
    out.push({ month: b.month, value: v * c.sign });
  }
  return out;
}

const sd = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

/** Inverse-volatility weights, summing to one. */
export function weights(changes: Series[]): number[] {
  // A floor on the volatility: a component that changes by the same amount every
  // month would otherwise get an unbounded weight from rounding noise.
  const inv = changes.map((c) => (c.length ? 1 / Math.max(sd(c.map((p) => p.value)), 1e-9) : 0));
  const total = inv.reduce((a, b) => a + b, 0);
  return inv.map((w) => (total ? w / total : 0));
}

export function composite(components: Component[], baseYear = "2017", minShare = 0.5): Composite {
  const changes = components.map(monthlyChanges);
  const w = weights(changes);
  const maps = changes.map((c) => new Map(c.map((p) => [p.month, p.value])));
  const months = [...new Set(changes.flatMap((c) => c.map((p) => p.month)))].sort();
  const index: Series = [];
  const contributions = new Map<string, { key: string; value: number }[]>();
  let level = 100;
  for (const m of months) {
    const present = components.map((c, i) => ({ key: c.key, w: w[i], v: maps[i].get(m) })).filter((x) => x.v !== undefined && x.w > 0);
    const share = present.reduce((a, x) => a + x.w, 0);
    if (share < minShare) continue;
    const parts = present.map((x) => ({ key: x.key, value: (x.w / share) * x.v! }));
    const move = parts.reduce((a, x) => a + x.value, 0);
    level = (level * (200 + move)) / (200 - move);
    index.push({ month: m, value: level });
    contributions.set(m, parts);
  }
  // Rebase so the base year averages 100.
  const base = index.filter((p) => p.month.startsWith(baseYear));
  const scale = base.length ? 100 / (base.reduce((a, p) => a + p.value, 0) / base.length) : 1;
  return { index: index.map((p) => ({ ...p, value: p.value * scale })), contributions, weights: Object.fromEntries(components.map((c, i) => [c.key, w[i]])) };
}

/** EPB's 6-month smoothed annualised growth: this month over the average of the prior twelve, annualised. */
export function smoothedGrowth(index: Series): Series {
  const out: Series = [];
  for (let i = 12; i < index.length; i++) {
    const prior = index.slice(i - 12, i);
    const avg = prior.reduce((a, p) => a + p.value, 0) / 12;
    out.push({ month: index[i].month, value: (index[i].value / avg) ** (12 / 6.5) - 1 });
  }
  return out;
}
