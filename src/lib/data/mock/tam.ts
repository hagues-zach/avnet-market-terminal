import type {
  EndMarket,
  ProductCategory,
  Region,
  Sourced,
  TamSummary,
  UsdMillions,
} from "../types";

// Annual world semiconductor TAM ($M), anchored to WSTS/SIA history; 2026 = WSTS
// Autumn-2025 forecast. Vintage labeled everywhere.
const TAM_HISTORY: { year: number; tam: number; forecast?: boolean }[] = [
  { year: 2019, tam: 412_300 },
  { year: 2020, tam: 440_400 },
  { year: 2021, tam: 555_900 },
  { year: 2022, tam: 574_100 },
  { year: 2023, tam: 526_900 },
  { year: 2024, tam: 630_500 },
  { year: 2025, tam: 772_200 },
  { year: 2026, tam: 975_500, forecast: true },
];

// SAM = distribution-served slice of TAM (~18%, ties to ECIA channel size).
// SOM = Avnet's share of SAM (mock; real value comes from internal billings).
const SAM_SHARE_OF_TAM = 0.18;
const SOM_SHARE_OF_SAM: Record<number, number> = {
  2019: 0.088, 2020: 0.09, 2021: 0.094, 2022: 0.096,
  2023: 0.092, 2024: 0.095, 2025: 0.096, 2026: 0.097,
};

// 2025 product-category shares of TAM (sum = 1.0). Micro = MPU/MCU/DSP.
const PRODUCT_SHARE_2025: Record<ProductCategory, number> = {
  logic: 295_900 / 772_200,
  memory: 211_600 / 772_200,
  analog: 85_600 / 772_200,
  micro: 84_800 / 772_200,
  optoelectronics: 41_100 / 772_200,
  discretes: 31_000 / 772_200,
  sensors: 22_200 / 772_200,
};
// memory is the most cyclical category — bend its share through the cycle
const MEMORY_CYCLE: Record<number, number> = {
  2019: 0.78, 2020: 0.84, 2021: 1.18, 2022: 1.0,
  2023: 0.68, 2024: 0.95, 2025: 1.0, 2026: 1.06,
};

function productSplit(year: number, tam: number): Partial<Record<ProductCategory, UsdMillions>> {
  const adj: Record<string, number> = {};
  let total = 0;
  (Object.keys(PRODUCT_SHARE_2025) as ProductCategory[]).forEach((p) => {
    const s = PRODUCT_SHARE_2025[p] * (p === "memory" ? MEMORY_CYCLE[year] ?? 1 : 1);
    adj[p] = s;
    total += s;
  });
  const out: Partial<Record<ProductCategory, UsdMillions>> = {};
  (Object.keys(adj) as ProductCategory[]).forEach((p) => {
    out[p] = Math.round((adj[p] / total) * tam);
  });
  return out;
}

export function getTam(): Sourced<TamSummary> {
  const trend = TAM_HISTORY.map(({ year, tam, forecast }) => {
    const sam = Math.round(tam * SAM_SHARE_OF_TAM);
    return {
      year,
      tamUsdM: tam,
      samUsdM: sam,
      somUsdM: Math.round(sam * (SOM_SHARE_OF_SAM[year] ?? 0.095)),
      isForecast: !!forecast,
    };
  });

  const y2025 = trend.find((t) => t.year === 2025)!;
  const y2024 = trend.find((t) => t.year === 2024)!;
  const y2026 = trend.find((t) => t.year === 2026)!;

  const byProduct: { product: ProductCategory; usdM: number; yoy: number }[] = [
    { product: "logic", usdM: 295_900, yoy: 0.399 },
    { product: "memory", usdM: 211_600, yoy: 0.348 },
    { product: "analog", usdM: 85_600, yoy: 0.05 },
    { product: "micro", usdM: 84_800, yoy: 0.12 },
    { product: "optoelectronics", usdM: 41_100, yoy: -0.04 },
    { product: "discretes", usdM: 31_000, yoy: -0.05 },
    { product: "sensors", usdM: 22_200, yoy: 0.02 },
  ];

  const byRegion: { region: Region; usdM: number; yoy: number }[] = [
    { region: "asiapac", usdM: 440_000, yoy: 0.3 },
    { region: "americas", usdM: 170_000, yoy: 0.28 },
    { region: "europe", usdM: 92_000, yoy: 0.08 },
    { region: "japan", usdM: 70_200, yoy: 0.06 },
  ];

  // SIA 2024 end-market mix applied to 2025 TAM
  const endMix: { endMarket: EndMarket; share: number; yoy: number }[] = [
    { endMarket: "computer", share: 0.349, yoy: 0.4 },
    { endMarket: "comms", share: 0.33, yoy: 0.2 },
    { endMarket: "automotive", share: 0.127, yoy: 0.05 },
    { endMarket: "consumer", share: 0.099, yoy: 0.1 },
    { endMarket: "industrial", share: 0.084, yoy: 0.03 },
    { endMarket: "government", share: 0.01, yoy: 0.05 },
  ];
  const byEndMarket = endMix.map((e) => ({
    endMarket: e.endMarket,
    usdM: Math.round(e.share * y2025.tamUsdM),
    yoy: e.yoy,
  }));

  return {
    value: {
      latestYear: 2025,
      tamUsdM: y2025.tamUsdM,
      samUsdM: y2025.samUsdM,
      somUsdM: y2025.somUsdM,
      somShareOfSam: y2025.somUsdM / y2025.samUsdM,
      yoyGrowth: y2025.tamUsdM / y2024.tamUsdM - 1,
      forecastNextYearUsdM: y2026.tamUsdM,
      trend,
      byProduct,
      byRegion,
      byEndMarket,
      productTrend: TAM_HISTORY.map(({ year, tam }) => ({
        year,
        values: productSplit(year, tam),
      })),
    },
    source: "wsts",
    vintage: "WSTS Autumn 2025",
  };
}
