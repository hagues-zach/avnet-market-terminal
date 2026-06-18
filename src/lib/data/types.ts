// Semiconductor market domain types for the Market Intelligence Terminal.
// v1 served by mock providers anchored to real WSTS/SIA figures; live
// WSTS/Gartner/FRED/internal adapters implement the same shapes later.

export type DataSource =
  | "wsts"
  | "sia"
  | "gartner"
  | "fred"
  | "ecia"
  | "semi"
  | "polymarket"
  | "internal"
  | "mock";

export interface Sourced<T> {
  value: T;
  source: DataSource;
  vintage: string; // e.g. "WSTS Autumn 2025"
}

export type UsdMillions = number;

// WSTS product taxonomy. Top-level: discretes, optoelectronics, sensors, + IC
// sub-categories analog/micro/logic/memory. NOTE: micro = MPU/MCU/DSP (NOT logic).
export type ProductCategory =
  | "discretes"
  | "optoelectronics"
  | "sensors"
  | "analog"
  | "micro"
  | "logic"
  | "memory";

export type Region = "americas" | "europe" | "japan" | "asiapac";

export type EndMarket =
  | "computer"
  | "comms"
  | "automotive"
  | "industrial"
  | "consumer"
  | "government";

export const PRODUCT_LABEL: Record<ProductCategory, string> = {
  discretes: "Discretes",
  optoelectronics: "Optoelectronics",
  sensors: "Sensors",
  analog: "Analog",
  micro: "Micro (MPU/MCU/DSP)",
  logic: "Logic",
  memory: "Memory",
};
export const REGION_LABEL: Record<Region, string> = {
  americas: "Americas",
  europe: "Europe",
  japan: "Japan",
  asiapac: "Asia-Pacific",
};
export const ENDMARKET_LABEL: Record<EndMarket, string> = {
  computer: "Computer",
  comms: "Communications",
  automotive: "Automotive",
  industrial: "Industrial",
  consumer: "Consumer",
  government: "Government",
};

export interface TamPoint {
  year: number;
  tamUsdM: UsdMillions;
  samUsdM: UsdMillions;
  somUsdM: UsdMillions;
  isForecast: boolean;
}

export interface TamSummary {
  latestYear: number;
  tamUsdM: UsdMillions;
  samUsdM: UsdMillions;
  somUsdM: UsdMillions;
  somShareOfSam: number;
  yoyGrowth: number;
  forecastNextYearUsdM: UsdMillions;
  trend: TamPoint[];
  byProduct: { product: ProductCategory; usdM: UsdMillions; yoy: number }[];
  byRegion: { region: Region; usdM: UsdMillions; yoy: number }[];
  byEndMarket: { endMarket: EndMarket; usdM: UsdMillions; yoy: number }[];
  productTrend: { year: number; values: Partial<Record<ProductCategory, UsdMillions>> }[];
}

// ---- Market Overview (exec cockpit) ----

export interface NewsItem {
  id: string;
  title: string;
  outlet: string;
  tag: string;
  date: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  outlet: string;
  tag: string;
  date: string;
}

export interface SegmentMomentum {
  product: ProductCategory;
  usdM: UsdMillions;
  yoy: number;
  series: number[]; // trailing trend for sparkline
}

export interface MarketChange {
  label: string;
  detail: string;
  dir: 1 | -1;
}

export interface OverviewSummary {
  tamUsdM: UsdMillions;
  yoyGrowth: number;
  forecastNextYearUsdM: UsdMillions;
  somUsdM: UsdMillions;
  somShareOfSam: number;
  bookToBill: number;
  bookToBillTrend: number[];
  whatChanged: MarketChange[];
  segments: SegmentMomentum[];
  byRegion: { region: Region; usdM: UsdMillions }[];
  news: NewsItem[];
}

// ---- Forecast & Scenario ----

export type Scenario = "bull" | "base" | "bear";

export interface ForecastPoint {
  year: number;
  actual?: UsdMillions;
  base?: UsdMillions;
  bull?: UsdMillions;
  bear?: UsdMillions;
  low?: UsdMillions; // confidence band (base)
  high?: UsdMillions;
}

export interface ForecastSummary {
  points: ForecastPoint[];
  scenarios: Record<Scenario, { label: string; value2028: UsdMillions; cagr: number }>;
  vintages: { vintage: string; proj2026: UsdMillions; isCurrent: boolean }[];
  cagrBase: number;
  base2026: UsdMillions;
}

// ---- Economic Signals ----

export interface IpPoint {
  date: string; // "YYYY-MM"
  value: number; // index, 2017 = 100
  recession: boolean;
}

export interface IndicatorRow {
  key: string;
  label: string;
  value: string;
  deltaPct: number;
  series: number[];
  source: DataSource;
}

export interface PolymarketOdds {
  id: string;
  question: string;
  prob: number; // 0..1 implied probability
  movePct: number; // change vs prior week (points)
  volumeUsd: number;
  category: string;
  closes: string;
}

export interface SignalsSummary {
  semiIpIndex: number;
  semiIpDeltaPct: number;
  ismPmi: number;
  fedFundsRate: number;
  usdIndex: number;
  bookToBill: number;
  ipTrend: IpPoint[];
  indicators: IndicatorRow[];
  polymarket: PolymarketOdds[];
}

// ---- Competitive & Channel ----

export interface ChannelSummary {
  channelSizeUsdM: UsdMillions;
  channelYoY: number;
  semisSharePct: number;
  avnetChannelSharePct: number;
  avnetRank: number;
  top10SupplierSharePct: number;
  distributors: { name: string; revenueUsdM: UsdMillions; isAvnet: boolean }[];
  channelTrend: { year: number; usdM: UsdMillions; isForecast: boolean }[];
  componentMix: { type: string; usdM: UsdMillions }[];
  suppliers: { name: string; revenueUsdM: UsdMillions }[];
}
