import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { DemandRow, PerformanceKpis, RegionCard, ReportedCard, ReportedFallback, SupplierCard } from "@/components/performance/sections";

// Avnet's own figures are mock, from the shared model in src/lib/shells/mock-avnet.ts,
// until billings, bookings and backlog are hooked up. "What Avnet reports" is live.
export const dynamic = "force-dynamic";

export default function PerformancePage() {
  return (
    <PageBody>
      <PageTitle title="Performance Tracker" subtitle="Avnet billings, bookings and backlog by quarter, region and supplier" />
      <PerformanceKpis />
      <DemandRow />
      <RegionCard />
      {/* End markets are on Customers & End Markets. */}
      <div className="space-y-2">
        <SupplierCard />
        <HookupMarker ids={["billings", "material-master"]} />
      </div>
      <Suspense fallback={<ReportedFallback />}>
        <ReportedCard />
      </Suspense>
    </PageBody>
  );
}
