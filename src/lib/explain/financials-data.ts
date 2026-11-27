import { comparableValue, type Company, type CompanyEarnings, type Metric } from "@/lib/data/live/earnings-model";
import { yearAgo } from "@/lib/earnings/season";
import type { FinMetric, FinQuarter, Group, Subject } from "./financials";

// Builds the quarters the financial explainers read from a company's earnings,
// with the same comparability rule as the tiles: a figure the tile hides, the
// explainer never shows.

const METRICS: FinMetric[] = [
  "revenue",
  "costOfRevenue",
  "grossProfit",
  "operatingIncome",
  "netIncome",
  "epsDiluted",
  "operatingCashFlow",
  "capex",
  "freeCashFlow",
  "grossMargin",
  "operatingMargin",
  "inventoryDays",
  "revenueYoY",
];

const CHIP_MAKERS = new Set(["manufacturer", "platform", "connectivity", "memory", "components"]);

export function subjectOf(c: Company): Subject {
  const group: Group = c.cohort === "distributor" ? "distributor" : CHIP_MAKERS.has(c.cohort) ? "chipMaker" : "other";
  return { name: c.slug === "avnet" ? "Avnet" : c.name, slug: c.slug, group };
}

/** The last `n` quarters, oldest first, ready for an explainer. */
export function finQuarters(e: CompanyEarnings, n = 8): FinQuarter[] {
  const c = e.company;
  const shown = (m: Metric, v: number | undefined) => comparableValue(c, m, v);
  return e.quarters.slice(-n).map((q) => {
    const v: FinQuarter["v"] = {};
    for (const m of METRICS) {
      const x = shown(m, q.values[m]);
      if (x !== undefined) v[m] = x;
    }
    const p = yearAgo(e.quarters, q);
    return {
      label: q.fiscalLabel,
      v,
      yearAgo: p
        ? { label: p.fiscalLabel, revenue: shown("revenue", p.values.revenue), inventoryDays: shown("inventoryDays", p.values.inventoryDays) }
        : undefined,
      epsDerived: q.backedOut.includes("epsDiluted") || undefined,
    };
  });
}
