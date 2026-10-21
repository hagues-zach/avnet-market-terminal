// MOCK. Synthetic market sizes, shares and lead times for the shell pages. The
// real values come from WSTS, Gartner, the IP&E forecast and lead-time feeds
// (licensed), divided into Avnet billings through the code map.

import { BILLINGS_BY_QUARTER, REGION_PERFORMANCE, SEGMENT_BILLINGS, SEMI_BILLINGS, SUPPLIERS, TTM_BILLINGS } from "./mock-avnet";

// Every share here is derived from the shared Avnet model in ./mock-avnet, so
// Market Share, TAM / SAM / SOM and Start Here agree with each other.

/** Market size (TAM, $B) and Avnet share by segment, latest four quarters. */
export const SHARE_BY_SEGMENT = SEGMENT_BILLINGS.map((s) => ({
  segment: s.segment,
  tam: Math.round(s.market / 100) / 10,
  share: s.share,
  shareChange: s.shareChange,
  confidence: s.confidence,
}));

const mappedMarket = SEGMENT_BILLINGS.reduce((a, s) => a + s.market, 0);
const mappedBillings = SEGMENT_BILLINGS.reduce((a, s) => a + s.billings, 0);
const marketGrowth = SEGMENT_BILLINGS.reduce((a, s) => a + s.market * s.marketGrowth, 0) / mappedMarket;
const shareNow = mappedBillings / mappedMarket;

/**
 * Share of the mapped market by quarter. The latest point is the trailing
 * 12-month share above; earlier points follow quarterly billings against a
 * market growing at the mapped segments' blended rate.
 */
export const SHARE_TREND = BILLINGS_BY_QUARTER.map(({ quarter, billings }, i, all) => {
  const last = all[all.length - 1].billings;
  const quartersBack = all.length - 1 - i;
  return {
    label: quarter,
    "Avnet share of mapped TAM": shareNow * (billings / last) * (1 + marketGrowth) ** (quartersBack / 4),
  };
});

/**
 * Avnet billings of each supplier's parts ÷ that supplier's reported revenue,
 * latest four quarters. "Market size" is the supplier's revenue, $B.
 */
const SUPPLIER_REVENUE_GROWTH = 0.08; // assumed; replace with each supplier's reported growth

export const SHARE_BY_SUPPLIER = SUPPLIERS.filter((s) => s.revenue > 0).map((s) => {
  const billings = TTM_BILLINGS * s.share;
  const share = billings / (s.revenue * 1000);
  return { name: s.name, tam: s.revenue, share, shareChange: share - (share / (1 + s.growth)) * (1 + SUPPLIER_REVENUE_GROWTH), confidence: s.confidence };
});

// WSTS regional markets ($B, 2025), matching TAM / SAM / SOM: Asia here is
// Asia-Pacific plus Japan. Farnell sells worldwide, so it has no region.
const REGION_MARKET: Record<string, number> = { Americas: 170, EMEA: 92, Asia: 510.2 };
const REGION_MARKET_GROWTH: Record<string, number> = { Americas: 0.28, EMEA: 0.08, Asia: 0.25 };
const semiShare = SEMI_BILLINGS / TTM_BILLINGS;

/** Avnet semiconductor billings in a region ÷ that region's market, latest four quarters. */
export const SHARE_BY_REGION = REGION_PERFORMANCE.filter((r) => REGION_MARKET[r.region]).map((r) => {
  const share = (r.ttm * semiShare) / (REGION_MARKET[r.region] * 1000);
  return { name: r.region, tam: REGION_MARKET[r.region], share, shareChange: share - (share / (1 + r.growth)) * (1 + REGION_MARKET_GROWTH[r.region]), confidence: "High" };
});

export const LEAD_TIMES = [
  { category: "MCUs", weeks: 18, change: 4 },
  { category: "Analog", weeks: 16, change: 2 },
  { category: "Discretes & power", weeks: 22, change: 6 },
  { category: "Memory", weeks: 26, change: 9 },
  { category: "FPGAs", weeks: 30, change: -2 },
  { category: "Connectors", weeks: 14, change: 1 },
  { category: "Passives (MLCC)", weeks: 12, change: 3 },
  { category: "Electromechanical", weeks: 15, change: 0 },
];

