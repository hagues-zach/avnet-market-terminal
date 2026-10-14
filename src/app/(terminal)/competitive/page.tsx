import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { HeadToHead, HeadToHeadFallback } from "@/components/competitive/head-to-head";

// Rendered per request; the underlying filings are cached.
export const dynamic = "force-dynamic";

export default function CompetitivePage() {
  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Avnet vs Arrow" subtitle="Two global electronic components distributors, side by side, from their SEC filings" />
      <Suspense fallback={<HeadToHeadFallback />}>
        <HeadToHead />
      </Suspense>
    </div>
  );
}
