import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import {
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
// (see src/lib/hookups.ts). The component-maker comparison is live.
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

      {/* Avnet against Arrow is on the Avnet vs Arrow page. */}
      <Suspense fallback={<CardFallback title="Growth against component makers" />}>
        <GrowthCard />
      </Suspense>
    </PageBody>
  );
}
