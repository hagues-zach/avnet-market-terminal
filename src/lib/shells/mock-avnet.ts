// MOCK. One synthetic model of Avnet's own numbers, shared by every page so the
// figures agree with each other: Start Here, Performance Tracker, Market Share,
// TAM / SAM / SOM, Customers and the shell pages all read from here. None of
// these numbers are real. Each section that uses them names its hookup
// (src/lib/hookups.ts). The app reads it through the mock adapter in
// src/lib/avnet/mock.ts; at Avnet, AVNET_DATA=databricks replaces it.
//
// How the pieces nest (trailing 12 months):
//   billings (all of Avnet)                        ≈ $24B
//   └ mapped billings (joined to a segment)        = MAPPED_SHARE of billings
//     └ semiconductor billings (TAM's SOM)         = the semiconductor segments
// Regions, suppliers, verticals and segments are shares of those totals, so
// every breakdown adds back up to its parent.

import type { Funnel, PipelineRow, StageFigures, TopCustomer } from "@/lib/avnet/contracts";
import { PIPELINE_STAGES } from "@/lib/avnet/format";

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

// Growth rates are set so the billings each vertical added sum to the growth in
// total billings (mock-avnet.test.ts checks it).
const VERTICAL_MIX = [
  { name: "Industrial", share: 0.3, growth: 0.13 },
  { name: "Automotive", share: 0.18, growth: 0.04 },
  { name: "Communications", share: 0.16, growth: 0.18 },
  { name: "Data center & computing", share: 0.15, growth: 0.34 },
  { name: "Aerospace & defense", share: 0.09, growth: 0.12 },
  { name: "Medical", share: 0.07, growth: 0.06 },
  { name: "Consumer", share: 0.05, growth: -0.04 },
];
export const VERTICALS = VERTICAL_MIX.map((v) => ({ ...v, billings: TTM_BILLINGS * v.share }));

/* ---------- Design pipeline (DRMS) ---------- */

// Design registrations submitted in the trailing 12 months, by how far each has
// got. Values are estimated annual billings ($M). "Approved pipeline" is the
// value approved but not yet billing: approved minus billing. Groups (supplier,
// segment, vertical) take shares of the same totals, so every view adds back up.

export const PIPELINE: Funnel = {
  submitted: { count: 4200, value: 6100 },
  approved: { count: 2730, value: 4000 },
  production: { count: 1450, value: 2200 },
  billing: { count: 1180, value: 1600 },
};
/** Approved but not yet billing, $M, now and a year ago. */
export const APPROVED_PIPELINE = PIPELINE.approved.value - PIPELINE.billing.value;
export const APPROVED_PIPELINE_YEAR_AGO = APPROVED_PIPELINE / 1.11;
export const NEW_REGISTRATIONS = { thisQuarter: 1120, yearAgo: 1037 };
export const APPROVAL_RATE = { now: PIPELINE.approved.count / PIPELINE.submitted.count, yearAgo: 0.63 };
/** Median months from approval to first billing. */
export const MONTHS_TO_BILLING = 14;

/** Approved pipeline and billings on design-approved parts, by quarter ($M). The pipeline moves first. */
const PIPELINE_TREND = [1880, 1960, 2010, 2080, 2150, 2210, 2300, APPROVED_PIPELINE];
export const PIPELINE_BY_QUARTER = QUARTERS.map((quarter, i) => ({
  quarter,
  pipeline: PIPELINE_TREND[i],
  designBillings: Math.round(BILLINGS[i] * DESIGN_APPROVED_SHARE),
}));

/** One group's funnel: its share of each stage's total, nudged so conversion differs between groups. */
function funnelFor(share: number, tilt: number): Funnel {
  const scale = (f: StageFigures, k: number) => ({ count: Math.round(f.count * share * k), value: f.value * share * k });
  return {
    submitted: scale(PIPELINE.submitted, 1),
    approved: scale(PIPELINE.approved, 1 + tilt * 0.5),
    production: scale(PIPELINE.production, 1 + tilt),
    billing: scale(PIPELINE.billing, 1 + tilt),
  };
}

/** Rows for one view, rescaled stage by stage so the groups add back to the totals. */
function rows(names: string[], shares: number[], tilts: number[], changes: number[], billings: number[]): PipelineRow[] {
  const funnels = names.map((_, i) => funnelFor(shares[i], tilts[i]));
  for (const { id } of PIPELINE_STAGES) {
    const count = sum(funnels.map((f) => f[id].count));
    const value = sum(funnels.map((f) => f[id].value));
    for (const f of funnels) f[id] = { count: Math.round((f[id].count * PIPELINE[id].count) / count), value: (f[id].value * PIPELINE[id].value) / value };
  }
  return names.map((name, i) => {
    const funnel = funnels[i];
    const stalled = Math.max(0, Math.round(funnel.approved.count * (0.04 - tilts[i] * 0.05)));
    return { name, funnel, pipeline: funnel.approved.value - funnel.billing.value, change: changes[i], billings: billings[i], stalled };
  });
}

// Supplier shares of the pipeline differ from their shares of billings: that gap is the point of the view.
const SUPPLIER_PIPE = [0.15, 0.11, 0.1, 0.05, 0.06, 0.53];
const SUPPLIER_TILT = [0.06, -0.04, 0.1, -0.08, 0.02, 0];
const SUPPLIER_CHANGE = [0.142, 0.094, 0.21, -0.031, 0.118, 0.087];
export const PIPELINE_BY_SUPPLIER = rows(SUPPLIERS.map((s) => s.name), SUPPLIER_PIPE, SUPPLIER_TILT, SUPPLIER_CHANGE, SUPPLIERS.map((s) => s.billings));

const SEGMENT_PIPE = [0.17, 0.2, 0.12, 0.09, 0.13, 0.04, 0.05, 0.11, 0.05, 0.04];
const SEGMENT_TILT = [0.02, 0.05, -0.03, -0.06, 0.08, -0.02, 0.04, 0, -0.04, 0.01];
const SEGMENT_CHANGE = [0.09, 0.16, 0.05, -0.04, 0.21, -0.02, 0.12, 0.07, 0.03, 0.04];
export const PIPELINE_BY_SEGMENT = rows([...SEGMENTS], SEGMENT_PIPE, SEGMENT_TILT, SEGMENT_CHANGE, SEGMENT_BILLINGS.map((s) => s.billings));

const VERTICAL_PIPE = [0.27, 0.2, 0.17, 0.2, 0.08, 0.05, 0.03];
const VERTICAL_TILT = [0.03, -0.02, 0.04, 0.07, 0.01, -0.03, -0.05];
const VERTICAL_CHANGE = [0.08, 0.05, 0.13, 0.27, 0.1, 0.04, -0.06];
export const PIPELINE_BY_VERTICAL = rows(VERTICALS.map((v) => v.name), VERTICAL_PIPE, VERTICAL_TILT, VERTICAL_CHANGE, VERTICALS.map((v) => v.billings));

const SEG = (i: number) => SEGMENTS[i];
/** Approved over 12 months ago and not yet in production, oldest first. Names withheld. */
export const STALLED_REGISTRATIONS = [
  { reg: "DR-004512", supplier: "Supplier A", segment: SEG(1), value: 4.2, months: 19 },
  { reg: "DR-004180", supplier: "Supplier B", segment: SEG(0), value: 2.8, months: 17 },
  { reg: "DR-005219", supplier: "Supplier C", segment: SEG(4), value: 1.9, months: 15 },
  { reg: "DR-005844", supplier: "Supplier D", segment: SEG(3), value: 1.4, months: 14 },
  { reg: "DR-006102", supplier: "Supplier E", segment: SEG(2), value: 1.1, months: 13 },
];
/** Approved in the last 30 days, newest first. Dates are days ago so the mock never goes stale. */
export const RECENT_APPROVALS = [
  { reg: "DR-009842", supplier: "Supplier B", segment: SEG(0), value: 3.5, daysAgo: 3 },
  { reg: "DR-009811", supplier: "Supplier A", segment: SEG(1), value: 2.1, daysAgo: 6 },
  { reg: "DR-009764", supplier: "Supplier C", segment: SEG(6), value: 1.8, daysAgo: 9 },
  { reg: "DR-009710", supplier: "Supplier E", segment: SEG(7), value: 0.95, daysAgo: 13 },
  { reg: "DR-009685", supplier: "Supplier D", segment: SEG(4), value: 2.4, daysAgo: 17 },
];

/* ---------- Customers (customer master) ---------- */

// Concentration by parent company: the share of billings that the largest
// customers take, now and a year ago, and the size of the customer base.
export const CONCENTRATION = {
  top10: { now: 0.18, yearAgo: 0.171 },
  top100: { now: 0.41, yearAgo: 0.408 },
  /** Customers billed in the last 12 months, rolled up to parent company. */
  active: 1_400_000,
  /** Change in customers billed for the first time, on a year ago. */
  newCustomerGrowth: 0.062,
};

// The ten largest customers by parent company. Names withheld. Shares of billings
// sum to the top-10 share; backlog and approved pipeline are each customer's own.
const TOP_CUSTOMER_MIX = [
  { name: "Customer A", vertical: "Data center & computing", region: "Americas", share: 0.031, growth: 0.41, backlog: 0.58, pipe: 1.3 },
  { name: "Customer B", vertical: "Industrial", region: "EMEA", share: 0.026, growth: 0.09, backlog: 0.44, pipe: 0.9 },
  { name: "Customer C", vertical: "Communications", region: "Asia", share: 0.022, growth: 0.22, backlog: 0.47, pipe: 1.1 },
  { name: "Customer D", vertical: "Automotive", region: "EMEA", share: 0.02, growth: 0.03, backlog: 0.52, pipe: 0.8 },
  { name: "Customer E", vertical: "Data center & computing", region: "Americas", share: 0.017, growth: 0.36, backlog: 0.61, pipe: 1.4 },
  { name: "Customer F", vertical: "Industrial", region: "Americas", share: 0.016, growth: 0.14, backlog: 0.41, pipe: 1.0 },
  { name: "Customer G", vertical: "Aerospace & defense", region: "Americas", share: 0.014, growth: 0.12, backlog: 0.72, pipe: 1.2 },
  { name: "Customer H", vertical: "Communications", region: "Asia", share: 0.013, growth: 0.17, backlog: 0.39, pipe: 1.0 },
  { name: "Customer I", vertical: "Medical", region: "EMEA", share: 0.011, growth: 0.05, backlog: 0.46, pipe: 0.9 },
  { name: "Customer J", vertical: "Automotive", region: "Asia", share: 0.01, growth: -0.02, backlog: 0.37, pipe: 0.7 },
];

export const TOP_CUSTOMERS: TopCustomer[] = TOP_CUSTOMER_MIX.map((c) => {
  const billings = TTM_BILLINGS * c.share;
  const v = VERTICALS.find((x) => x.name === c.vertical)!;
  const p = PIPELINE_BY_VERTICAL.find((x) => x.name === c.vertical)!;
  // The customer's slice of its market's pipeline, by its share of the market's billings, tilted.
  const pipeline = p.pipeline * (billings / v.billings) * c.pipe;
  return { name: c.name, vertical: c.vertical, region: c.region as TopCustomer["region"], billings, growth: c.growth, backlog: billings * c.backlog, pipeline };
});
