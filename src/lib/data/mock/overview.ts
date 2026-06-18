import type { OverviewSummary, ProductCategory, Sourced } from "../types";
import { getTam } from "./tam";

export function getOverview(): Sourced<OverviewSummary> {
  const tam = getTam().value;

  const segments = tam.byProduct.map((p) => ({
    product: p.product,
    usdM: p.usdM,
    yoy: p.yoy,
    series: tam.productTrend.map((pt) => pt.values[p.product] ?? 0),
  }));

  const whatChanged = [
    { label: "Logic", detail: "+39.9% YoY — AI & data-center demand", dir: 1 as const },
    { label: "Memory", detail: "+34.8% YoY — pricing & HBM recovery", dir: 1 as const },
    { label: "Book-to-bill", detail: "1.04 — orders outpacing billings", dir: 1 as const },
    { label: "Discretes", detail: "−5% — industrial/auto softness", dir: -1 as const },
  ];

  const news = [
    { id: "n1", title: "WSTS lifts 2026 outlook to ~$975B on AI accelerator demand", outlet: "WSTS", tag: "Forecast", date: "2026-06-12" },
    { id: "n2", title: "Memory pricing firms as HBM capacity stays tight into 2026", outlet: "DigiTimes", tag: "Memory", date: "2026-06-10" },
    { id: "n3", title: "Auto MCU inventories normalize; lead times back near pre-shortage", outlet: "EE Times", tag: "Automotive", date: "2026-06-07" },
    { id: "n4", title: "Distribution channel returns to growth after 2023–24 correction", outlet: "ECIA", tag: "Channel", date: "2026-06-05" },
    { id: "n5", title: "Foundry utilization climbs on leading-edge AI silicon", outlet: "Reuters", tag: "Supply", date: "2026-06-03" },
  ];

  return {
    value: {
      tamUsdM: tam.tamUsdM,
      yoyGrowth: tam.yoyGrowth,
      forecastNextYearUsdM: tam.forecastNextYearUsdM,
      somUsdM: tam.somUsdM,
      somShareOfSam: tam.somShareOfSam,
      bookToBill: 1.04,
      bookToBillTrend: [0.94, 0.97, 1.0, 1.01, 1.03, 1.04],
      whatChanged,
      segments,
      byRegion: tam.byRegion.map((r) => ({ region: r.region, usdM: r.usdM })),
      news,
    },
    source: "mock",
    vintage: "WSTS Autumn 2025",
  };
}
