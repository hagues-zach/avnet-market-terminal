// The contracts for Avnet's own data: what each source must return for the app
// to work, whichever adapter supplies it (mock today, Databricks at Avnet). Every
// record states its grain and units. docs/data-contracts.md describes each
// dataset for the data team, with its source tables and draft query.
//
// Conventions:
// - Money is US$ millions (US$ billions where a field says so).
// - Quarters are Avnet fiscal quarters labelled "FY27 Q1", oldest first. The
//   fiscal year ends on the Saturday nearest 30 June, so FY27 Q1 is about July
//   to September 2026. Labels must match fiscalCalendar().
// - Growth and shares are fractions: 0.12 is 12%.
// - "Trailing 12 months" is the latest four fiscal quarters.

export type FiscalLabel = string;
export type Region = "Americas" | "EMEA" | "Asia" | "Farnell";
export type Rating = "High" | "Medium" | "Low";

/** One fiscal quarter, with ISO dates (inclusive). */
export interface FiscalQuarter {
  label: FiscalLabel;
  start: string;
  end: string;
}

/* ---------- Performance: billings, bookings, backlog ---------- */

/** Grain: one row per fiscal quarter, at least the latest eight. */
export interface QuarterFigures {
  quarter: FiscalLabel;
  /** Billings in the quarter, $M. */
  billings: number;
  /** Bookings in the quarter, $M. */
  bookings: number;
  /** Backlog at quarter end, $M. */
  backlog: number;
  /** Bookings ÷ billings, as Avnet reports it. */
  bookToBill: number;
}

export interface PerformanceData {
  quarters: QuarterFigures[];
  /** Share of trailing 12-month billings on design-approved parts (DRMS status 04). */
  designApprovedShare: number;
}

/* ---------- Billings by segment, region, supplier and vertical ---------- */

/** Grain: one row per market segment, trailing 12 months. Segments come from the code map. */
export interface SegmentRow {
  segment: string;
  /** A semiconductor segment (WSTS category); the rest are IP&E. */
  semi: boolean;
  /** Billings joined to this segment through the code map, $M. */
  billings: number;
  /** Billings growth on the 12 months before. */
  growth: number;
  /** How much of the segment's billings sit on validated mappings. */
  confidence: Rating;
}

export interface SegmentsData {
  /** Share of all billings the code map joins to a segment. */
  mappedShare: number;
  rows: SegmentRow[];
}

/** Grain: one row per sales region. */
export interface RegionRow {
  region: Region;
  /** Billings in the latest quarter, $M. */
  billings: number;
  /** Billings in the trailing 12 months, $M. */
  ttm: number;
  /** Trailing 12-month billings growth on the 12 months before. */
  growth: number;
  bookToBill: number;
  /** Backlog at the latest quarter end, $M. */
  backlog: number;
}

/** Grain: one row per supplier (manufacturer), trailing 12 months, the largest first; the last row may be "All others". */
export interface SupplierRow {
  name: string;
  /** Share of all billings. */
  share: number;
  /** Billings growth on the 12 months before. */
  growth: number;
  /** The supplier's own reported revenue, US$ billions, latest four quarters. 0 for "All others". */
  revenue: number;
  /** Confidence in the supplier's revenue figure; empty for "All others". */
  confidence: string;
  /** Billings of the supplier's parts, $M. */
  billings: number;
}

/** Grain: one row per end market (vertical), trailing 12 months. */
export interface VerticalRow {
  name: string;
  /** Share of all billings. */
  share: number;
  growth: number;
  /** $M */
  billings: number;
}

/* ---------- Design pipeline (DRMS) ---------- */

export type PipelineStage = "submitted" | "approved" | "production" | "billing";

export interface StageFigures {
  count: number;
  /** Estimated annual billings, $M. */
  value: number;
}
export type Funnel = Record<PipelineStage, StageFigures>;

/** One group's pipeline (a supplier, segment or vertical). Groups in a view add back to the funnel. */
export interface PipelineRow {
  name: string;
  funnel: Funnel;
  /** Approved but not yet billing, $M. */
  pipeline: number;
  /** Change in approved pipeline on a year ago. */
  change: number;
  /** Billings in the trailing 12 months, $M, for the pipeline-to-billings ratio. */
  billings: number;
  /** Approved over 12 months ago and not yet in production. */
  stalled: number;
}

/** A design registration in a list. Customer names are withheld. */
export interface Registration {
  reg: string;
  supplier: string;
  segment: string;
  /** Estimated annual billings, $M. */
  value: number;
}

export interface PipelineData {
  /** Registrations submitted in the trailing 12 months, by how far each has got. */
  funnel: Funnel;
  /** Approved but not yet billing a year ago, $M. */
  approvedPipelineYearAgo: number;
  newRegistrations: { thisQuarter: number; yearAgo: number };
  /** Approved ÷ submitted a year ago. */
  approvalRateYearAgo: number;
  /** Median months from approval to first billing. */
  monthsToBilling: number;
  /** Grain: fiscal quarter, same quarters as performance. Billings on design-approved parts, $M. */
  byQuarter: { quarter: FiscalLabel; pipeline: number; designBillings: number }[];
  bySupplier: PipelineRow[];
  bySegment: PipelineRow[];
  byVertical: PipelineRow[];
  /** Approved over 12 months ago and not yet in production, oldest first. */
  stalled: (Registration & { months: number })[];
  /** Approved in the last 30 days, newest first. */
  recent: (Registration & { daysAgo: number })[];
}

/* ---------- Customers (customer master, parent company) ---------- */

export interface Concentration {
  top10: { now: number; yearAgo: number };
  top100: { now: number; yearAgo: number };
  /** Customers billed in the last 12 months, rolled up to parent company. */
  active: number;
  /** Change in customers billed for the first time, on a year ago. */
  newCustomerGrowth: number;
}

/** Grain: one row per parent company, the ten largest by trailing 12-month billings. Names withheld outside Avnet. */
export interface TopCustomer {
  name: string;
  vertical: string;
  region: Region;
  /** Billings in the last 12 months, $M. */
  billings: number;
  growth: number;
  /** $M */
  backlog: number;
  /** Approved design pipeline not yet billing, $M. */
  pipeline: number;
}

export interface CustomersData {
  concentration: Concentration;
  top: TopCustomer[];
}

/* ---------- Code map (gold.market_intelligence.gartner_avnet_code_map) ---------- */

export type MapStatus = "validated" | "suggested" | "review" | "unmapped";
export type Confidence = Rating;
export type Source = "WSTS" | "Gartner" | "IP&E forecast";

export interface HistoryEvent {
  daysAgo: number;
  event: string;
  by: string;
}

/** Grain: one row per external market category. */
export interface Mapping {
  id: string;
  source: Source;
  segment: string;
  name: string;
  /** Avnet technology codes; empty when not mapped. */
  codes: string[];
  /** PCC level used in APAC and Farnell; null when not mapped. */
  pcc: string | null;
  /** Billings through this mapping, trailing 12 months, $M. Zero when not mapped. */
  billings: number;
  /** Confidence in the mapping; null when not mapped. */
  confidence: Confidence | null;
  status: MapStatus;
  /** The role a decision waits on, for suggested and in-review mappings. */
  waitsOn: string | null;
  definition: string;
  /** Why the mapping was suggested. */
  reason: string | null;
  parts: string[];
  history: HistoryEvent[];
}

/* ---------- Supply: lead times and purchasing ---------- */

export interface SupplyData {
  /** Grain: product category. Quoted lead time in weeks, and the change on a quarter ago. */
  leadTimes: { category: string; weeks: number; change: number }[];
  /** Grain: product category, same order as leadTimes. Purchase orders placed in the latest quarter ($M) and the change on the quarter before. */
  purchasing: { category: string; poValue: number; change: number }[];
}

/* ---------- Markets: sizes and forecasts (licensed: WSTS, Gartner, IP&E forecast) ---------- */

export interface MarketsData {
  /** Grain: segment, same names as segments(). Market size $M, latest four quarters, and its growth. */
  segments: { segment: string; market: number; marketGrowth: number }[];
  /** Grain: region with a market of its own (not Farnell). WSTS regional market, US$ billions, and its growth. */
  regions: { region: Region; market: number; growth: number }[];
  /** Assumed growth in suppliers' own revenue, until each supplier's reported growth is joined. */
  supplierRevenueGrowth: number;
  /** Forecast market growth by segment for each of the next four years: the Scenario Modeler's base case. */
  forecast: Record<string, number[]>;
  /** How far the upside and downside sit from the base market at each horizon. */
  spread: number[];
  /** Sales ($M) and growth for the devices AI spending lands on. */
  aiDevices: { device: string; usdM: number; yoy: number }[];
}

/* ---------- One account: Avnet's business with a supplier or customer ---------- */

/** The company asked about. Suppliers are matched on manufacturer, customers on parent company. */
export interface AccountKey {
  slug: string;
  name: string;
  supplier: boolean;
}

/** Grain: one company, trailing 12 months. */
export interface AccountFigures {
  /** Billings of the supplier's parts, or to the customer, $M. */
  billings: number;
  /** $M */
  backlog: number;
  /** Suppliers: design registrations not yet billing. */
  openRegistrations?: number;
  /** Customers: quotes not yet won or lost. */
  openQuotes?: number;
}

/** Everything the app reads, one value per source method (account, asked per company, aside). */
export interface AvnetInputs {
  fiscalCalendar: FiscalQuarter[];
  performance: PerformanceData;
  segments: SegmentsData;
  regions: RegionRow[];
  suppliers: SupplierRow[];
  verticals: VerticalRow[];
  pipeline: PipelineData;
  customers: CustomersData;
  codeMap: Mapping[];
  supply: SupplyData;
  markets: MarketsData;
}
