import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { AddViewToDeck } from "@/components/deck/add-view-to-deck";
import { SignalsFallback, SignalsView } from "@/components/signals/signals-view";

// Rendered per request; each source is cached for six hours.
export const dynamic = "force-dynamic";

export default function SignalsPage() {
  return (
    <PageBody>
      <PageTitle
        title="Economic Signals"
        subtitle="The economy around electronics: demand, costs, financing and currency, from public data"
        actions={<AddViewToDeck slide="economy" label="The economic backdrop" />}
      />
      <Suspense fallback={<SignalsFallback />}>
        <SignalsView />
      </Suspense>
    </PageBody>
  );
}
