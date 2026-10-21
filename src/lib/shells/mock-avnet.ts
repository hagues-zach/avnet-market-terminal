// MOCK. One synthetic model of Avnet's own numbers, shared by every page so the
// figures agree with each other: Start Here, Performance Tracker, Market Share,
// TAM / SAM / SOM, Customers and the shell pages all read from here. None of
// these numbers are real. Each section that uses them names its hookup
// (src/lib/hookups.ts); replace this file with queries against those tables.
//
// How the pieces nest (trailing 12 months):
//   billings (all of Avnet)                        ≈ $24B
//   └ mapped billings (joined to a segment)        = MAPPED_SHARE of billings
//     └ semiconductor billings (TAM's SOM)         = the semiconductor segments
// Regions, suppliers, verticals and segments are shares of those totals, so
// every breakdown adds back up to its parent.

export const QUARTERS = ["FY25 Q2", "FY25 Q3", "FY25 Q4", "FY26 Q1", "FY26 Q2", "FY26 Q3", "FY26 Q4", "FY27 Q1"];

export const REGIONS = ["Americas", "EMEA", "Asia", "Farnell"] as const;

export const SEGMENTS = [
  "Analog",
  "Microcontrollers & processors",
  "Logic & FPGA",
  "Memory",
  "Discretes & power",
  "Optoelectronics",
  "Sensors",
  "Connectors",
  "Passives",
  "Electromechanical",
] as const;

/** Segments that are semiconductors (WSTS categories); the rest are IP&E. */
export const SEMI_SEGMENTS = SEGMENTS.slice(0, 7);

/* ---------- Billings, bookings and backlog by quarter ---------- */

// $M per fiscal quarter: a trough a year and a half ago, recovering since.
const BILLINGS = [5480, 5390, 5420, 5560, 5790, 6020, 6310, 6580];
const BOOK_TO_BILL = [0.94, 0.97, 1.0, 1.03, 1.06, 1.08, 1.1, 1.09];
const BACKLOG = [8900, 8650, 8600, 8750, 9100, 9550, 10100, 10600];

/** Billings, bookings and backlog by quarter, $M. */
export const PERFORMANCE = QUARTERS.map((quarter, i) => ({
  quarter,
  billings: BILLINGS[i],
  bookings: Math.round(BILLINGS[i] * BOOK_TO_BILL[i]),
  backlog: BACKLOG[i],
  bookToBill: BOOK_TO_BILL[i],
}));

/** Billings by quarter, $M, for charts that only need the one series. */
export const BILLINGS_BY_QUARTER = PERFORMANCE.map(({ quarter, billings }) => ({ quarter, billings }));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Trailing 12 months of billings, $M, now and a year earlier. */
export const TTM_BILLINGS = sum(BILLINGS.slice(-4));
export const TTM_BILLINGS_YEAR_AGO = sum(BILLINGS.slice(-8, -4));

/** Share of billings the code map joins to a market segment. */
export const MAPPED_SHARE = 0.85;
export const MAPPED_BILLINGS = TTM_BILLINGS * MAPPED_SHARE;

/** Share of billings on design-approved parts (DRMS status 04). */
export const DESIGN_APPROVED_SHARE = 0.38;

/* ---------- Segments ---------- */

// Share of mapped billings by segment (sums to 1), billings growth on a year ago,
// the segment's market size ($B) and that market's growth, and how much of the
// segment the code map covers.
const SEGMENT_MIX = [0.167, 0.176, 0.147, 0.127, 0.093, 0.039, 0.034, 0.118, 0.059, 0.04];
const SEGMENT_GROWTH = [0.09, 0.07, 0.15, 0.31, 0.02, -0.03, 0.06, 0.08, 0.05, 0.03];
const SEGMENT_MARKET = [85.6, 84.8, 40, 211.6, 31, 41.1, 22.2, 85, 40, 45];
const MARKET_GROWTH = [0.05, 0.12, 0.08, 0.35, -0.05, -0.04, 0.02, 0.06, 0.04, 0.03];
const CONFIDENCE = ["High", "High", "Medium", "Medium", "High", "Low", "Medium", "High", "Medium", "Low"];

export const SEGMENT_BILLINGS = SEGMENTS.map((segment, i) => {
  const billings = MAPPED_BILLINGS * SEGMENT_MIX[i]; // $M, trailing 12 months
  const market = SEGMENT_MARKET[i] * 1000; // $M
  const share = billings / market;
  const shareYearAgo = billings / (1 + SEGMENT_GROWTH[i]) / (market / (1 + MARKET_GROWTH[i]));
  return {
    segment,
    billings,
    growth: SEGMENT_GROWTH[i],
    market,
    marketGrowth: MARKET_GROWTH[i],
    share,
    shareChange: share - shareYearAgo,
    confidence: CONFIDENCE[i],
    semi: i < SEMI_SEGMENTS.length,
  };
});

/** Avnet's semiconductor billings, trailing 12 months, $M: TAM's SOM. */
export const SEMI_BILLINGS = sum(SEGMENT_BILLINGS.filter((s) => s.semi).map((s) => s.billings));

/* ---------- Regions ---------- */

// Share of billings, growth on a year ago, book-to-bill and backlog share by region.
const REGION_MIX = [0.24, 0.34, 0.37, 0.05];
const REGION_GROWTH = [0.16, 0.06, 0.24, 0.04];
const REGION_BTB = [1.11, 1.04, 1.13, 1.0];

export const REGION_PERFORMANCE = REGIONS.map((region, i) => {
  const latest = PERFORMANCE[PERFORMANCE.length - 1];
  return {
    region,
    billings: latest.billings * REGION_MIX[i], // $M, latest quarter
    ttm: TTM_BILLINGS * REGION_MIX[i],
    growth: REGION_GROWTH[i],
    bookToBill: REGION_BTB[i],
    backlog: latest.backlog * REGION_MIX[i],
  };
});

/* ---------- Suppliers ---------- */

// Share of billings and each supplier's own revenue ($B), latest four quarters.
export const SUPPLIERS = [
  { name: "Supplier A", share: 0.12, growth: 0.14, revenue: 14.2, confidence: "High" },
  { name: "Supplier B", share: 0.09, growth: 0.08, revenue: 9.8, confidence: "High" },
  { name: "Supplier C", share: 0.07, growth: 0.26, revenue: 6.1, confidence: "Medium" },
  { name: "Supplier D", share: 0.06, growth: -0.05, revenue: 7.9, confidence: "High" },
  { name: "Supplier E", share: 0.05, growth: 0.11, revenue: 4.4, confidence: "Medium" },
  { name: "All others", share: 0.61, growth: 0.12, revenue: 0, confidence: "" },
].map((s) => ({ ...s, billings: TTM_BILLINGS * s.share }));

/* ---------- Verticals (end markets Avnet sells into) ---------- */

const VERTICAL_MIX = [
  { name: "Industrial", share: 0.3, growth: 0.11 },
  { name: "Automotive", share: 0.18, growth: 0.04 },
  { name: "Communications", share: 0.16, growth: 0.18 },
  { name: "Data center & computing", share: 0.15, growth: 0.34 },
  { name: "Aerospace & defense", share: 0.09, growth: 0.12 },
  { name: "Medical", share: 0.07, growth: 0.06 },
  { name: "Consumer", share: 0.05, growth: -0.04 },
];
export const VERTICALS = VERTICAL_MIX.map((v) => ({ ...v, billings: TTM_BILLINGS * v.share }));

/* ---------- Formatting ---------- */

export const fmtM = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);
export const fmtPct = (v: number, signed = false) => `${signed && v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
