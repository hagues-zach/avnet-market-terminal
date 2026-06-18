import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { IpTrendChart } from "@/components/charts/ip-trend-chart";
import { PolymarketPanel } from "@/components/charts/polymarket-panel";
import { Sparkline } from "@/components/charts/sparkline";
import { SourceChip } from "@/components/ui/source-chip";
import { AVNET } from "@/lib/colors";
import { formatPctSigned } from "@/lib/format";

export default function SignalsPage() {
  const { value: s } = dataProvider.getSignals();
  const recession = s.polymarket.find((m) => m.category === "Macro");

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Economic Signals" subtitle="Leading indicators, rates & market-implied odds for the semiconductor cycle" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Semi IP Index" value={`${s.semiIpIndex}`} delta={s.semiIpDeltaPct} deltaLabel="MoM" source="fred" />
        <KpiCard label="ISM PMI" value={`${s.ismPmi}`} delta={-0.018} deltaLabel="MoM" source="fred" />
        <KpiCard label="Fed Funds" value="4.50%" delta={-0.052} deltaLabel="QoQ" source="fred" />
        <KpiCard label="USD Index" value={`${s.usdIndex}`} delta={-0.011} deltaLabel="MoM" invertDelta source="fred" />
        <KpiCard label="Book-to-Bill" value={s.bookToBill.toFixed(2)} delta={0.02} deltaLabel="QoQ" source="mock" />
        {recession && (
          <KpiCard label="2026 Recession Odds" value={`${Math.round(recession.prob * 100)}%`} delta={recession.movePct} deltaLabel="wk" invertDelta source="polymarket" />
        )}
      </div>

      {/* IP trend + Polymarket */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Semiconductor Industrial Production" subtitle="FRED IPG3344S (2017=100) — recession shaded" source="fred">
          <IpTrendChart data={s.ipTrend} />
        </Card>
        <Card className="lg:col-span-2" title="Polymarket — Forward Odds" subtitle="Market-implied probabilities" source="polymarket">
          <PolymarketPanel markets={s.polymarket} />
        </Card>
      </div>

      {/* indicator small-multiples */}
      <Card title="Macro Indicators" subtitle="Rates, FX & activity — trailing trend">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {s.indicators.map((ind) => {
            const up = ind.deltaPct >= 0;
            return (
              <div key={ind.key} className="rounded border border-line px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs uppercase tracking-wider text-muted">{ind.label}</span>
                  <SourceChip source={ind.source} />
                </div>
                <div className="mt-0.5 flex items-baseline justify-between">
                  <span className="font-display text-base tabular text-ink">{ind.value}</span>
                  <span className={up ? "text-2xs tabular text-avnet-greenDark" : "text-2xs tabular text-danger"}>
                    {formatPctSigned(ind.deltaPct)}
                  </span>
                </div>
                <div className="mt-1">
                  <Sparkline data={ind.series} color={AVNET.blueDark} width={140} height={24} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="px-1 text-2xs text-muted">
        FRED series are public; Polymarket odds shown are modeled for this demo (live via the Polymarket API later). Book-to-bill is internal.
      </p>
    </div>
  );
}
