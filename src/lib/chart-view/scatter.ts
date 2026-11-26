// The window a growth-against-margin scatter shows, shared by the leaderboard's
// chart and its slide so both drop the same outliers. Pure.

export interface ScatterPoint {
  slug: string;
  name: string;
  growth: number;
  margin: number;
}

/** The 5th to 95th percentile of the values, padded a little, rounded out to whole percentage points. */
export function span(values: number[]): [number, number] {
  if (!values.length) return [0, 1];
  const s = [...values].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  const lo = at(0.05);
  const hi = at(0.95);
  const pad = (hi - lo) * 0.08 || 0.01;
  return [Math.floor((lo - pad) * 100) / 100, Math.ceil((hi + pad) * 100) / 100];
}

/**
 * A few extreme companies would squash the rest into a corner, so the axes fit the
 * middle 90% of companies; Avnet and Arrow always stay on the chart. Returns the
 * points shown, the axes' ranges, and how many are off the scale.
 */
export function scatterWindow<P extends ScatterPoint>(all: P[]): { shown: P[]; x: [number, number]; y: [number, number]; off: number } {
  const gx = span(all.map((p) => p.growth));
  const my = span(all.map((p) => p.margin));
  const inside = (p: P) => p.growth >= gx[0] && p.growth <= gx[1] && p.margin >= my[0] && p.margin <= my[1];
  const shown = all.filter((p) => inside(p) || p.slug === "avnet" || p.slug === "arrow");
  return {
    shown,
    x: [Math.min(gx[0], ...shown.map((p) => p.growth)), Math.max(gx[1], ...shown.map((p) => p.growth))],
    y: [Math.min(my[0], ...shown.map((p) => p.margin)), Math.max(my[1], ...shown.map((p) => p.margin))],
    off: all.length - shown.length,
  };
}
