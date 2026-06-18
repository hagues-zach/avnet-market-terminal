import { dataProvider } from "@/lib/data/provider";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { RankBars } from "@/components/charts/rank-bars";
import { ChannelTrend } from "@/components/charts/channel-trend";
import { MarketDonut } from "@/components/charts/market-donut";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import { formatPct } from "@/lib/utils";

export default function CompetitivePage() {
  const { value: c } = dataProvider.getChannel();

  const distData = c.distributors.map((d) => ({ name: d.name, value: d.revenueUsdM, highlight: d.isAvnet }));
  const supplierData = c.suppliers.map((s) => ({ name: s.name, value: s.revenueUsdM }));
  const mixData = c.componentMix.map((m) => ({ name: m.type, value: m.usdM }));

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Competitive & Channel" subtitle="Authorized-distribution channel & competitive position — ECIA Top-50" />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Channel Size" value={formatUsdMillions(c.channelSizeUsdM, { precise: true })} delta={c.channelYoY} deltaLabel="YoY" source="ecia" />
        <KpiCard label="Channel YoY" value={formatPct(c.channelYoY)} source="ecia" />
        <KpiCard label="Semis % of Channel" value={formatPct(c.semisSharePct)} source="ecia" />
        <KpiCard label="Avnet Share" value={formatPct(c.avnetChannelSharePct)} delta={0.004} deltaLabel="YoY" source="mock" />
        <KpiCard label="Avnet Rank" value={`#${c.avnetRank}`} source="mock" />
        <KpiCard label="Top-10 Supplier Share" value={formatPct(c.top10SupplierSharePct)} source="gartner" />
      </div>

      {/* distributor ranking + component mix */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Distributor Channel Ranking" subtitle="Global authorized distributors by revenue — Avnet highlighted" source="mock">
          <RankBars data={distData} />
        </Card>
        <Card className="lg:col-span-2" title="Channel by Component Type" subtitle="Semiconductors dominate at ~79%" source="ecia">
          <MarketDonut data={mixData} />
        </Card>
      </div>

      {/* channel trend + top suppliers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Channel Revenue Trend" subtitle="ECIA Top-50 — 2022–24 correction, 2025 recovery (est.)" source="ecia">
          <ChannelTrend data={c.channelTrend} />
        </Card>
        <Card className="lg:col-span-2" title="Top Semiconductor Suppliers" subtitle="By revenue — top-10 ≈ two-thirds of the market" source="gartner">
          <RankBars data={supplierData} baseColor={AVNET.blueDark} />
        </Card>
      </div>

      <p className="px-1 text-2xs text-muted">
        Channel size, YoY and component mix are real ECIA Top-50 aggregates; per-distributor and per-supplier rankings are
        modeled for this demo (carry a <span className="font-display uppercase tracking-wider text-accent-yellow">Mock</span> chip)
        — wired to Gartner/internal share data in production.
      </p>
    </div>
  );
}
