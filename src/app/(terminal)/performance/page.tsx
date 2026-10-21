import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { DemandRow, EndMarketCard, PerformanceKpis, RegionCard, ReportedCard, ReportedFallback, SupplierCard } from "@/components/performance/sections";

// Avnet's own figures are mock, from the shared model in src/lib/shells/mock-avnet.ts,
// until billings, bookings and backlog are hooked up. "What Avnet reports" is live.
export const dynamic = "force-dynamic";

export default function PerformancePage() {
  return (
    <PageBody>
      <PageTitle title="Performance Tracker" subtitle="Avnet billings, bookings and backlog by quarter, region, supplier and end market" />
      <PerformanceKpis />
      <DemandRow />
      <RegionCard />
      <div className="space-y-2">
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <SupplierCard />
          <EndMarketCard />
        </div>
        <HookupMarker ids={["billings", "material-master", "customer-master"]} />
      </div>
      <Suspense fallback={<ReportedFallback />}>
        <ReportedCard />
      </Suspense>
    </PageBody>
  );
}
