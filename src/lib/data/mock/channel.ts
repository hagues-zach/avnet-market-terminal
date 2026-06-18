import type { ChannelSummary, Sourced } from "../types";

// Authorized-distribution channel. AGGREGATE figures are real (ECIA Top-50): 2022
// $194.6B → 2023 $178.0B (−8.5%), semis 78.6% of channel. Per-distributor and
// per-supplier rankings are MODELED (the published per-name figures were unverified).
export function getChannel(): Sourced<ChannelSummary> {
  const channelTrend = [
    { year: 2021, usdM: 190_000, isForecast: false },
    { year: 2022, usdM: 194_600, isForecast: false },
    { year: 2023, usdM: 178_000, isForecast: false },
    { year: 2024, usdM: 161_500, isForecast: false },
    { year: 2025, usdM: 176_000, isForecast: true },
  ];
  const channelSize = 176_000;

  // ECIA component-type mix (semis dominant at ~78.6%)
  const mixShares: { type: string; share: number }[] = [
    { type: "Semiconductors", share: 0.786 },
    { type: "Passives", share: 0.066 },
    { type: "Interconnect", share: 0.054 },
    { type: "Electromechanical", share: 0.05 },
    { type: "Other", share: 0.044 },
  ];
  const componentMix = mixShares.map((m) => ({ type: m.type, usdM: Math.round(m.share * channelSize) }));

  // Modeled global distributor ranking (illustrative — Avnet highlighted)
  const distributors = [
    { name: "WT Microelectronics", revenueUsdM: 20_400, isAvnet: false },
    { name: "WPG Holdings", revenueUsdM: 19_800, isAvnet: false },
    { name: "Arrow Electronics", revenueUsdM: 18_900, isAvnet: false },
    { name: "Avnet", revenueUsdM: 17_300, isAvnet: true },
    { name: "Future Electronics", revenueUsdM: 6_200, isAvnet: false },
    { name: "Digi-Key", revenueUsdM: 5_100, isAvnet: false },
    { name: "Mouser", revenueUsdM: 4_700, isAvnet: false },
  ];

  // Modeled top semiconductor suppliers (concept: Gartner top-10 ~ two-thirds of market)
  const suppliers = [
    { name: "NVIDIA", revenueUsdM: 132_000 },
    { name: "Samsung", revenueUsdM: 71_000 },
    { name: "Intel", revenueUsdM: 54_000 },
    { name: "SK Hynix", revenueUsdM: 48_000 },
    { name: "Qualcomm", revenueUsdM: 39_000 },
    { name: "Broadcom", revenueUsdM: 35_000 },
    { name: "Micron", revenueUsdM: 30_000 },
  ];

  return {
    value: {
      channelSizeUsdM: channelSize,
      channelYoY: 176_000 / 161_500 - 1,
      semisSharePct: 0.786,
      avnetChannelSharePct: 17_300 / channelSize,
      avnetRank: 4,
      top10SupplierSharePct: 0.67,
      distributors,
      channelTrend,
      componentMix,
      suppliers,
    },
    source: "ecia",
    vintage: "ECIA Top-50 · 2023",
  };
}
