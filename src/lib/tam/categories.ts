import type { ProductCategory, TamSummary } from "@/lib/data/types";

// MOCK. How much of each WSTS product category flows through distribution, and
// Avnet's share of that served slice. Weights only: they are scaled so the
// categories add up to the page's SAM and SOM totals. The real figures come
// from billings joined to the WSTS taxonomy through the code map.
const DIST_WEIGHT: Record<ProductCategory, number> = {
  logic: 0.1,
  memory: 0.08,
  analog: 0.38,
  micro: 0.4,
  optoelectronics: 0.3,
  discretes: 0.4,
  sensors: 0.3,
};
const AVNET_WEIGHT: Record<ProductCategory, number> = {
  logic: 0.13,
  memory: 0.05,
  analog: 0.11,
  micro: 0.1,
  optoelectronics: 0.08,
  discretes: 0.09,
  sensors: 0.08,
};

export interface CategoryRow {
  product: ProductCategory;
  /** $M, published (WSTS). */
  market: number;
  growth: number;
  shareOfTam: number;
  /** $M, mock. */
  served: number;
  /** $M, mock. */
  som: number;
  shareOfServed: number;
}

export function categoryRows(t: TamSummary): CategoryRow[] {
  const servedRaw = t.byProduct.map((p) => p.usdM * DIST_WEIGHT[p.product]);
  const servedScale = t.samUsdM / servedRaw.reduce((a, b) => a + b, 0);
  const served = servedRaw.map((v) => v * servedScale);
  const somRaw = t.byProduct.map((p, i) => served[i] * AVNET_WEIGHT[p.product]);
  const somScale = t.somUsdM / somRaw.reduce((a, b) => a + b, 0);
  return t.byProduct.map((p, i) => {
    const som = somRaw[i] * somScale;
    return {
      product: p.product,
      market: p.usdM,
      growth: p.yoy,
      shareOfTam: p.usdM / t.tamUsdM,
      served: served[i],
      som,
      shareOfServed: som / served[i],
    };
  });
}
