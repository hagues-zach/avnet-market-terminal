import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { TamTrend } from "@/components/charts/tam-trend";
import { ProductStackedArea } from "@/components/charts/product-stacked-area";
import { MarketDonut } from "@/components/charts/market-donut";
import { EndMarketBars } from "@/components/charts/endmarket-bars";
import { ProductTreemap } from "@/components/charts/product-treemap";
import { REGION_LABEL, ENDMARKET_LABEL } from "@/lib/data/types";
import { formatUsdMillions } from "@/lib/format";
import { formatPct } from "@/lib/utils";

export default function TamPage() {
  const { value: t } = dataProvider.getTam();

  const y2024 = t.trend.find((p) => p.year === 2024)!;
  const y2025 = t.trend.find((p) => p.year === 2025)!;
  const samYoY = y2025.samUsdM / y2024.samUsdM - 1;
  const somYoY = y2025.somUsdM / y2024.somUsdM - 1;
  const fcGrowth = t.forecastNextYearUsdM / t.tamUsdM - 1;

  const regionData = t.byRegion.map((r) => ({ name: REGION_LABEL[r.region], value: r.usdM }));
  const endMarketData = t.byEndMarket.map((e) => ({ name: ENDMARKET_LABEL[e.endMarket], value: e.usdM }));

  return (
    <div className="space-y-5 p-5">
      <PageHeader
        title="TAM / SAM / SOM"
        subtitle="World semiconductor market · distribution-served · Avnet share — WSTS Autumn 2025"
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="TAM (2025)" value={formatUsdMillions(t.tamUsdM, { precise: true })} delta={t.yoyGrowth} deltaLabel="YoY" source="wsts" />
        <KpiCard label="SAM (served)" value={formatUsdMillions(t.samUsdM, { precise: true })} delta={samYoY} deltaLabel="YoY" source="mock" />
        <KpiCard label="SOM (Avnet)" value={formatUsdMillions(t.somUsdM, { precise: true })} delta={somYoY} deltaLabel="YoY" source="mock" />
        <KpiCard label="SOM % of SAM" value={formatPct(t.somShareOfSam)} delta={somYoY - samYoY} deltaLabel="share Δ" source="mock" />
        <KpiCard label="YoY Growth" value={formatPct(t.yoyGrowth)} source="wsts" />
        <KpiCard label="2026 Forecast" value={formatUsdMillions(t.forecastNextYearUsdM, { precise: true })} delta={fcGrowth} deltaLabel="vs 2025" source="wsts" />
      </div>

      {/* trend + region */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="TAM / SAM / SOM Trend" subtitle="Total market · distribution-served · Avnet share — forecast dashed" source="mock">
          <TamTrend trend={t.trend} />
        </Card>
        <Card className="lg:col-span-2" title="Market by Region" subtitle="2025 billings — Asia-Pacific largest" source="wsts">
          <MarketDonut data={regionData} />
        </Card>
      </div>

      {/* product mix trend + end-market */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Market by Product Category" subtitle="WSTS taxonomy — Micro = MPU/MCU/DSP (distinct from Logic)" source="wsts">
          <ProductStackedArea data={t.productTrend} />
        </Card>
        <Card className="lg:col-span-2" title="Market by End-Market" subtitle="2025 — mix applied from SIA 2024" source="sia">
          <EndMarketBars data={endMarketData} />
        </Card>
      </div>

      {/* product treemap */}
      <Card title="Product Category Mix (2025)" subtitle="Relative size of each WSTS product category" source="wsts">
        <ProductTreemap data={t.byProduct} />
      </Card>

      {/* methodology */}
      <Card title="Methodology">
        <p className="text-sm text-muted">
          <span className="text-ink">TAM and segment values</span> are real published figures (WSTS Autumn 2025;
          end-market mix from SIA 2024), labeled with their vintage.{" "}
          <span className="text-ink">SAM</span> (the distribution-served slice) and{" "}
          <span className="text-ink">SOM</span> (Avnet&apos;s share) are modeled for this demo and carry a{" "}
          <span className="font-display uppercase tracking-wider text-accent-yellow">Mock</span> chip — in production they
          come from internal billings joined to the WSTS taxonomy. The canonical total is standardized on WSTS (not SIA)
          to match the existing TAM report.
        </p>
      </Card>
    </div>
  );
}
