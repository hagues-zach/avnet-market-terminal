import type { Cycle } from "@/lib/data/live/cycle";
import type { CompanyEarnings, Quarter } from "@/lib/data/live/earnings-model";

// Live stand-ins for market share while billings and the code map are mock.
// Both come from SEC filings: Avnet's reported revenue against Arrow's, and
// Avnet's growth against the component makers it distributes. They are a proxy
// for share, not share, and the page says so. Server-only.

const QUARTERS_SHOWN = 8;

const order = (label: string) => {
  const m = label.match(/^CY(\d+) Q(\d)$/);
  return m ? Number(m[1]) * 4 + Number(m[2]) : -1;
};
const yearBefore = (label: string) => label.replace(/^CY(\d+)/, (_, y: string) => `CY${String(Number(y) - 1).padStart(y.length, "0")}`);

/** "CY26 Q2" → "Q2 '26" for chart axes. */
export const shortQuarter = (label: string) => label.replace(/^CY(?:20)?(\d{2}) (Q\d)$/, "$2 '$1");
/** "CY26 Q2" → "CY2026 Q2" for as-of lines. */
export const fullQuarter = (label: string) => label.replace(/^CY(\d{2}) /, "CY20$1 ");

const revenueBy = (e: CompanyEarnings) =>
  new Map(e.quarters.filter((q): q is Quarter & { values: { revenue: number } } => q.values.revenue !== undefined).map((q) => [q.calendarLabel, q.values.revenue]));

export interface PeerSharePoint {
  label: string;
  /** Avnet revenue ÷ (Avnet + Arrow revenue). */
  avnet: number;
  arrow: number;
}

/** Each company's share of the two companies' combined revenue, by calendar quarter. */
export function peerShare(avnet: CompanyEarnings, arrow: CompanyEarnings): PeerSharePoint[] {
  const a = revenueBy(avnet);
  const b = revenueBy(arrow);
  return Array.from(a.keys())
    .filter((l) => b.has(l))
    .sort((x, y) => order(x) - order(y))
    .slice(-QUARTERS_SHOWN)
    .map((label) => {
      const share = a.get(label)! / (a.get(label)! + b.get(label)!);
      return { label, avnet: share, arrow: 1 - share };
    });
}

export interface GrowthPoint {
  label: string;
  avnet?: number;
  makers?: number;
}

/** Avnet's revenue growth on a year ago against the component makers' combined growth. */
export function growthAgainstMakers(avnet: CompanyEarnings, cycle: Cycle): GrowthPoint[] {
  const a = revenueBy(avnet);
  const makers = cycle.groups.find((g) => g.cohort === "manufacturer");
  return cycle.labels.map((label) => {
    const now = a.get(label);
    const before = a.get(yearBefore(label));
    return {
      label,
      avnet: now !== undefined && before ? now / before - 1 : undefined,
      makers: makers?.points.find((p) => p.label === label)?.growth,
    };
  });
}

/** Latest quarter where both growth figures exist, and the gap between them in points. */
export function latestGap(points: GrowthPoint[]) {
  const p = [...points].reverse().find((x) => x.avnet !== undefined && x.makers !== undefined);
  return p ? { label: p.label, avnet: p.avnet!, makers: p.makers!, gap: p.avnet! - p.makers! } : null;
}
