import type { IpPoint, SignalsSummary, Sourced } from "../types";

// Monthly semiconductor industrial-production index (modeled on FRED IPG3344S,
// 2017 = 100), Jan 2019 → Jun 2026, with the COVID recession flagged for shading.
function genIpTrend(): IpPoint[] {
  const pts: IpPoint[] = [];
  for (let i = 0; i < 90; i++) {
    const total = 2019 * 12 + i;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    let v = 96 + i * 0.45 + 5 * Math.sin(i / 8);
    if (year === 2020 && month >= 2 && month <= 4) v -= 22;
    else if (year === 2020 && month >= 5 && month <= 9) v -= 10;
    if (year === 2023) v -= 7;
    if (year === 2024) v += 4;
    if (year === 2025) v += 12;
    if (year === 2026) v += 20;
    pts.push({
      date: `${year}-${String(month).padStart(2, "0")}`,
      value: Math.round(v * 10) / 10,
      recession: year === 2020 && month >= 2 && month <= 4,
    });
  }
  return pts;
}

export function getSignals(): Sourced<SignalsSummary> {
  const ipTrend = genIpTrend();
  const last = ipTrend[ipTrend.length - 1].value;
  const prev = ipTrend[ipTrend.length - 2].value;
  const last12 = ipTrend.slice(-12).map((p) => p.value);

  const indicators = [
    { key: "semi_ip", label: "Semi Industrial Production", value: `${last}`, deltaPct: last / prev - 1, series: last12, source: "fred" as const },
    { key: "ism_pmi", label: "ISM Manufacturing PMI", value: "49.1", deltaPct: -0.018, series: [47.8, 48.2, 47.5, 48.6, 49.0, 48.4, 49.1], source: "fred" as const },
    { key: "ip_broad", label: "Industrial Production (total)", value: "102.5", deltaPct: 0.004, series: [100.1, 100.6, 101.0, 101.4, 101.9, 102.2, 102.5], source: "fred" as const },
    { key: "fed_funds", label: "Fed Funds Rate", value: "4.50%", deltaPct: -0.052, series: [5.33, 5.33, 5.08, 4.83, 4.83, 4.58, 4.5], source: "fred" as const },
    { key: "ust_10y", label: "10Y Treasury", value: "4.15%", deltaPct: 0.018, series: [3.9, 4.05, 4.2, 4.12, 4.0, 4.08, 4.15], source: "fred" as const },
    { key: "usd_dxy", label: "US Dollar Index (DXY)", value: "103.2", deltaPct: -0.011, series: [105.1, 104.7, 104.2, 103.9, 103.5, 103.4, 103.2], source: "fred" as const },
  ];

  const polymarket = [
    { id: "pm1", question: "Fed cuts rates at the next FOMC meeting", prob: 0.64, movePct: 0.06, volumeUsd: 2_400_000, category: "Rates", closes: "2026-07-29" },
    { id: "pm2", question: "Global semiconductor sales exceed $1T in 2026", prob: 0.69, movePct: 0.04, volumeUsd: 480_000, category: "Semis", closes: "2026-12-31" },
    { id: "pm3", question: "AI data-center capex grows >20% in 2026", prob: 0.77, movePct: 0.02, volumeUsd: 320_000, category: "AI", closes: "2026-12-31" },
    { id: "pm4", question: "US recession (NBER-dated) begins in 2026", prob: 0.21, movePct: -0.03, volumeUsd: 5_100_000, category: "Macro", closes: "2026-12-31" },
    { id: "pm5", question: "Fed funds rate below 3.5% by Dec 2026", prob: 0.52, movePct: 0.05, volumeUsd: 1_100_000, category: "Rates", closes: "2026-12-31" },
    { id: "pm6", question: "Taiwan Strait military conflict in 2026", prob: 0.07, movePct: -0.01, volumeUsd: 3_800_000, category: "Geopolitics", closes: "2026-12-31" },
  ];

  return {
    value: {
      semiIpIndex: last,
      semiIpDeltaPct: last / prev - 1,
      ismPmi: 49.1,
      fedFundsRate: 4.5,
      usdIndex: 103.2,
      bookToBill: 1.04,
      ipTrend,
      indicators,
      polymarket,
    },
    source: "fred",
    vintage: "FRED · monthly",
  };
}
