import { Suspense } from "react";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { CycleFallback, CycleView } from "@/components/cycle/cycle-view";

// Rendered per request; the underlying filings are cached for six hours.
export const dynamic = "force-dynamic";

export default function CyclePage() {
  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
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
