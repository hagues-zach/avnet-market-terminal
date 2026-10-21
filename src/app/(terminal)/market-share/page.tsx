import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import {
  ArrowCard,
  BreakdownCard,
  CardFallback,
  GrowthCard,
  PeerKpis,
  PeerKpisFallback,
  ShareKpis,
  TrendCard,
  TrendRowMarker,
  WhiteSpaceCard,
} from "@/components/share/sections";

// Avnet's share figures are mock until billings and the code map are hooked up
// (see src/lib/hookups.ts). The Arrow and component-maker comparisons are live.
export const dynamic = "force-dynamic";

export default function MarketSharePage() {
  return (
    <PageBody>
      <PageTitle title="Market Share" subtitle="Avnet billings divided by the market, by segment, supplier and region" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <ShareKpis />
        <Suspense fallback={<PeerKpisFallback />}>
          <PeerKpis />
        </Suspense>
      </div>

      <BreakdownCard />

      <div className="space-y-2">
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendCard />
          <WhiteSpaceCard />
        </div>
        <TrendRowMarker />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<CardFallback title="Avnet against Arrow" />}>
          <ArrowCard />
        </Suspense>
        <Suspense fallback={<CardFallback title="Growth against component makers" />}>
          <GrowthCard />
        </Suspense>
      </div>
    </PageBody>
  );
}
