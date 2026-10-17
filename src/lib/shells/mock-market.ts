// MOCK. Synthetic market sizes, shares and lead times for the shell pages. The
// real values come from WSTS, Gartner, the IP&E forecast and lead-time feeds
// (licensed), divided into Avnet billings through the code map.

import { SEGMENTS } from "./mock-avnet";

/** Market size (TAM, $B) and Avnet share by segment, latest four quarters. */
export const SHARE_BY_SEGMENT = SEGMENTS.map((segment, i) => ({
  segment,
  tam: [38, 21, 14, 52, 11, 6, 5, 9, 8, 6][i],
  share: [0.041, 0.052, 0.067, 0.012, 0.058, 0.044, 0.039, 0.071, 0.063, 0.055][i],
  shareChange: [0.003, -0.002, 0.004, 0.001, -0.003, 0.0, 0.002, 0.005, 0.001, -0.001][i],
  confidence: ["High", "High", "Medium", "Medium", "High", "Low", "Medium", "High", "Medium", "Low"][i],
}));

export const SHARE_TREND = ["FY25 Q2", "FY25 Q3", "FY25 Q4", "FY26 Q1", "FY26 Q2", "FY26 Q3", "FY26 Q4", "FY27 Q1"].map((label, i) => ({
  label,
  "Avnet share of mapped TAM": 0.036 + i * 0.0009 + (i % 3 === 0 ? -0.0006 : 0),
}));

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
