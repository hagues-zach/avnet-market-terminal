import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SignalsFallback, SignalsView } from "@/components/signals/signals-view";

// Rendered per request; each source is cached for six hours.
export const dynamic = "force-dynamic";

export default function SignalsPage() {
  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Economic Signals" subtitle="Production, prices, input costs, rates and currency around the semiconductor supply chain" />
      <Suspense fallback={<SignalsFallback />}>
        <SignalsView />
      </Suspense>
    </div>
  );
}
