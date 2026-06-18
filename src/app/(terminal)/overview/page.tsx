import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sparkline } from "@/components/charts/sparkline";
import { BookToBillGauge } from "@/components/charts/book-to-bill-gauge";
import { MarketDonut } from "@/components/charts/market-donut";
import { AVNET } from "@/lib/colors";
import { PRODUCT_LABEL, REGION_LABEL } from "@/lib/data/types";
import { formatUsdMillions, formatPctSigned } from "@/lib/format";
import { formatPct } from "@/lib/utils";

export default function OverviewPage() {
  const { value: o } = dataProvider.getOverview();
  const regionData = o.byRegion.map((r) => ({ name: REGION_LABEL[r.region], value: r.usdM }));

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Market Overview" subtitle="Semiconductor market snapshot — WSTS Autumn 2025" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Global TAM" value={formatUsdMillions(o.tamUsdM, { precise: true })} delta={o.yoyGrowth} deltaLabel="YoY" source="wsts" />
        <KpiCard label="YoY Growth" value={formatPct(o.yoyGrowth)} source="wsts" />
        <KpiCard label="2026 Forecast" value={formatUsdMillions(o.forecastNextYearUsdM, { precise: true })} delta={o.forecastNextYearUsdM / o.tamUsdM - 1} deltaLabel="vs 2025" source="wsts" />
        <KpiCard label="Book-to-Bill" value={o.bookToBill.toFixed(2)} delta={0.02} deltaLabel="QoQ" source="mock" />
        <KpiCard label="Avnet SOM" value={formatUsdMillions(o.somUsdM, { precise: true })} delta={0.238} deltaLabel="YoY" source="mock" />
        <KpiCard label="SOM % of SAM" value={formatPct(o.somShareOfSam)} delta={0.013} deltaLabel="share Δ" source="mock" />
      </div>

      {/* what changed */}
      <Card title="What Changed This Quarter" subtitle="The signals an exec should see first" source="mock">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {o.whatChanged.map((c) => {
            const Arrow = c.dir > 0 ? ArrowUpRight : ArrowDownRight;
            return (
              <div key={c.label} className="flex items-start gap-2 rounded border border-line px-3 py-2.5">
                <Arrow className={c.dir > 0 ? "h-4 w-4 shrink-0 text-avnet-greenDark" : "h-4 w-4 shrink-0 text-danger"} />
                <div>
                  <p className="font-display text-sm uppercase tracking-wide text-ink">{c.label}</p>
                  <p className="text-2xs text-muted">{c.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* segment momentum + book-to-bill */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Segment Momentum" subtitle="Each WSTS product category — 2019→2026 trend & YoY" source="wsts">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {o.segments.map((s) => {
              const up = s.yoy >= 0;
              return (
                <div key={s.product} className="rounded border border-line px-3 py-2.5">
                  <p className="text-2xs uppercase tracking-wider text-muted">{PRODUCT_LABEL[s.product]}</p>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <span className="font-display text-base tabular text-ink">{formatUsdMillions(s.usdM)}</span>
                    <span className={up ? "text-2xs tabular text-avnet-greenDark" : "text-2xs tabular text-danger"}>
                      {formatPctSigned(s.yoy, 0)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Sparkline data={s.series} color={AVNET.blueDark} width={140} height={24} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="lg:col-span-2" title="Book-to-Bill" subtitle="Orders vs. billings — 1.0 = balance" source="mock">
          <BookToBillGauge value={o.bookToBill} trend={o.bookToBillTrend} />
        </Card>
      </div>

      {/* news + region */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Market News" subtitle="Curated & source-attributed" source="mock">
          <ul className="divide-y divide-line">
            {o.news.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="mt-0.5 rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-muted">
                  {n.tag}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">{n.title}</p>
                  <p className="text-2xs text-muted">{n.outlet} · {n.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2" title="Market by Region" subtitle="2025 billings" source="wsts">
          <MarketDonut data={regionData} />
        </Card>
      </div>
    </div>
  );
}
