import { Suspense } from "react";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { CycleFallback, CycleView } from "@/components/cycle/cycle-view";

// Rendered per request; the underlying filings are cached for six hours.
export const dynamic = "force-dynamic";

export default function CyclePage() {
  return (
    <div className="space-y-5 p-5">
      <PageHeader
        title="Market Cycle"
        subtitle={`Where the semiconductor supply chain and its customers are in the cycle, rolled up from ${COMPANIES.length} companies' SEC filings`}
      />
      <Suspense fallback={<CycleFallback />}>
        <CycleView />
      </Suspense>
    </div>
  );
}
