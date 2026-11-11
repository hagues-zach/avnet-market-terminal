import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { LeadTimesFallback, LeadTimesView } from "@/components/lead-times/lead-times-view";

// Rendered per request; the news feeds are cached for 15 minutes and the series for six hours.
export const dynamic = "force-dynamic";

export default function LeadTimesPage() {
  return (
    <PageBody>
      <PageTitle title="Lead Times & Signals" subtitle="Where component lead times are heading, from trade-press reports and public supply-pressure data" />
      <Suspense fallback={<LeadTimesFallback />}>
        <LeadTimesView />
      </Suspense>
    </PageBody>
  );
}
