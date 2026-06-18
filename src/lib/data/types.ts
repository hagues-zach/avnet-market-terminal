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
