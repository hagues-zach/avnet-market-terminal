import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SignalsFallback, SignalsView } from "@/components/signals/signals-view";

// Rendered per request; each source is cached for six hours.
export const dynamic = "force-dynamic";

export default function SignalsPage() {
  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title="Economic Signals" subtitle="Production, prices, input costs, rates and currency around the semiconductor supply chain" />
      <Suspense fallback={<SignalsFallback />}>
        <SignalsView />
      </Suspense>
    </div>
  );
}
