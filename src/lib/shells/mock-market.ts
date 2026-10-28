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
export const SUPPLIER_REVENUE_GROWTH = 0.08; // assumed; replace with each supplier's reported growth

export const SHARE_BY_SUPPLIER = SUPPLIERS.filter((s) => s.revenue > 0).map((s) => {
  const billings = TTM_BILLINGS * s.share;
  const share = billings / (s.revenue * 1000);
  return { name: s.name, tam: s.revenue, share, shareChange: share - (share / (1 + s.growth)) * (1 + SUPPLIER_REVENUE_GROWTH), confidence: s.confidence };
});

// WSTS regional markets ($B, 2025), matching TAM / SAM / SOM: Asia here is
// Asia-Pacific plus Japan. Farnell sells worldwide, so it has no region.
export const REGION_MARKET: Record<string, number> = { Americas: 170, EMEA: 92, Asia: 510.2 };
export const REGION_MARKET_GROWTH: Record<string, number> = { Americas: 0.28, EMEA: 0.08, Asia: 0.25 };
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


/** MOCK. Avnet purchase orders placed by category, latest quarter ($M), and the change on the quarter before. */
export const PURCHASING = [
  { category: "MCUs", poValue: 620, change: 0.12 },
  { category: "Analog", poValue: 540, change: 0.05 },
  { category: "Discretes & power", poValue: 410, change: 0.21 },
  { category: "Memory", poValue: 380, change: 0.34 },
  { category: "FPGAs", poValue: 260, change: -0.08 },
  { category: "Connectors", poValue: 300, change: 0.02 },
  { category: "Passives (MLCC)", poValue: 220, change: 0.06 },
  { category: "Electromechanical", poValue: 180, change: -0.03 },
];

/**
 * MOCK. Forecast market growth by segment for each of the next four years, the
 * Scenario Modeler's base case. Stands in for the WSTS and Gartner forecasts
 * (semiconductor segments) and the IP&E forecast (connectors, passives and
 * electromechanical); replace with those once they are hooked up.
 */
export const SEGMENT_FORECAST: Record<(typeof SEGMENT_BILLINGS)[number]["segment"], number[]> = {
  Analog: [0.07, 0.06, 0.05, 0.05],
  "Microcontrollers & processors": [0.08, 0.07, 0.06, 0.06],
  "Logic & FPGA": [0.11, 0.09, 0.08, 0.07],
  Memory: [0.22, 0.12, 0.06, 0.04],
  "Discretes & power": [0.03, 0.05, 0.06, 0.05],
  Optoelectronics: [0.02, 0.03, 0.04, 0.04],
  Sensors: [0.05, 0.05, 0.05, 0.05],
  Connectors: [0.06, 0.05, 0.05, 0.05],
  Passives: [0.05, 0.05, 0.04, 0.04],
  Electromechanical: [0.04, 0.04, 0.04, 0.03],
};

/** MOCK. How far the upside and downside sit from the base market at each horizon, from the WSTS forecast's band. */
export const FORECAST_SPREAD = [0.05, 0.09, 0.13, 0.17];

/**
 * MOCK. 2025 sales ($M) and growth on 2024 for the devices AI spending lands on:
 * DRAM, Flash, MPUs, GPUs and AI accelerators. Synthetic: the published WSTS
 * figures in the app stop at its top-level categories, so these stand in for
 * WSTS Blue Book detail (DRAM, NAND Flash, MPU) and the Gartner forecast by
 * device type (GPUs, AI accelerators) until both are hooked up (build plan 5.5).
 * They sit inside the published 2025 market; everything else is the rest.
 */
export const AI_DEVICES: { device: string; usdM: number; yoy: number }[] = [
  { device: "DRAM", usdM: 128_000, yoy: 0.48 },
  { device: "Flash", usdM: 72_000, yoy: 0.22 },
  { device: "MPUs", usdM: 60_000, yoy: 0.06 },
  { device: "GPUs", usdM: 140_000, yoy: 0.52 },
  { device: "AI accelerators", usdM: 48_000, yoy: 0.75 },
];
