import { Suspense } from "react";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { DataChip } from "@/components/ui/chip";
import { CycleFallback, CycleView } from "@/components/cycle/cycle-view";

// Rendered per request; the underlying filings are cached for six hours.
export const dynamic = "force-dynamic";

export default function CyclePage() {
  return (
    <PageBody>
      <PageTitle
        title="Market Cycle"
        subtitle={`Where the semiconductor supply chain and its customers are in the cycle, from ${COMPANIES.length} companies' SEC filings`}
        actions={<DataChip status="live" label="SEC filings" />}
      />
      <Suspense fallback={<CycleFallback />}>
        <CycleView />
      </Suspense>
    </PageBody>
  );
}
