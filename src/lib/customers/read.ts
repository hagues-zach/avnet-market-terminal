import type { Cohort } from "@/lib/data/live/earnings-model";

// The Customers & End Markets read: which end market added the most growth, how
// Avnet's growth in each market compares with its customers' demand, and how
// concentrated billings are. Pure, so the page and its tests read the same rule.

/** Avnet's end markets against the customer groups whose filings show demand there. Shared with Design Pipeline. */
export const MARKET_GROUP: Record<string, Cohort | undefined> = {
  "Data center & computing": "hyperscaler",
  Communications: "systems",
  Consumer: "systems",
  Automotive: "auto",
  Industrial: "industrial",
};

/** Points of difference, as a share, beyond which Avnet is ahead of or behind its customers. */
export const DEMAND_THRESHOLD = 0.05;

export interface Market {
  name: string;
  /** Billings in the last 12 months, $M. */
  billings: number;
  /** Billings growth on a year ago. */
  growth: number;
}

/** Billings a market added over the year, $M: this year's billings less last year's. */
export const added = (m: Market) => (m.billings * m.growth) / (1 + m.growth);

/** "a third", "half" when the share is close to a simple fraction; otherwise a percentage. */
export function fraction(v: number): string {
  const words: [number, string][] = [
    [1 / 4, "a quarter"],
    [1 / 3, "a third"],
    [1 / 2, "half"],
    [2 / 3, "two thirds"],
    [3 / 4, "three quarters"],
  ];
  const hit = words.find(([f]) => Math.abs(v - f) <= 0.02);
  return hit ? hit[1] : `${Math.round(v * 100)}%`;
}

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;

/**
 * The market that added the most billings, in words:
 * "Data center & computing added the most growth: billings up 34% on a year ago, a third of Avnet's growth from 15% of its billings."
 */
export function lead(markets: Market[]): string {
  if (!markets.length) return "";
  const total = markets.reduce((n, m) => n + m.billings, 0);
  const growth = markets.reduce((n, m) => n + added(m), 0);
  const top = [...markets].sort((a, b) => added(b) - added(a))[0];
  const dir = top.growth >= 0 ? "up" : "down";
  const part = growth > 0 ? `, ${fraction(added(top) / growth)} of Avnet's growth from ${pct(top.billings / total)} of its billings` : "";
  return `${top.name} added the most growth: billings ${dir} ${pct(top.growth)} on a year ago${part}.`;
}

/**
 * A customer group's growth over the same span as Avnet's trailing 12 months:
 * the mean of its last four quarters' growth on a year ago. Needs three of the four.
 */
export function trailingGrowth(points: { growth?: number }[]): number | undefined {
  const last = points
    .slice(-4)
    .map((p) => p.growth)
    .filter((g): g is number => g !== undefined);
  return last.length >= 3 ? last.reduce((a, b) => a + b, 0) / last.length : undefined;
}

export type Demand = "ahead" | "with" | "behind";

export const DEMAND_WORDS: Record<Demand, string> = {
  ahead: "Ahead of demand",
  with: "With demand",
  behind: "Behind demand",
};

/** Avnet's billings growth against its customers' revenue growth; null where no customer group matches. */
export function againstDemand(avnet: number, customers: number | undefined): Demand | null {
  if (customers === undefined) return null;
  const gap = avnet - customers;
  if (gap > DEMAND_THRESHOLD) return "ahead";
  if (gap < -DEMAND_THRESHOLD) return "behind";
  return "with";
}

/** "The top 10 customers are 18% of billings, up 0.9 points on a year ago." */
export function concentration(now: number, yearAgo: number): string {
  const pts = (now - yearAgo) * 100;
  const change = Math.abs(pts) < 0.05 ? "unchanged on a year ago" : `${pts > 0 ? "up" : "down"} ${Math.abs(pts).toFixed(1)} points on a year ago`;
  return `The top 10 customers are ${Math.round(now * 100)}% of billings, ${change}.`;
}
