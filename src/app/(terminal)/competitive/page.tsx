import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { ButtonLink } from "@/components/ui/button";
import { DataChip } from "@/components/ui/chip";
import { isHidden } from "@/lib/visibility";
import { ArrowCard, CardFallback } from "@/components/share/sections";
import { Components, ManagementSaid, MoreMeasures, Moves, Overview, OverviewFallback, SectionFallback } from "@/components/competitive/head-to-head";

// Rendered per request; the underlying filings are cached.
export const dynamic = "force-dynamic";

export default function CompetitivePage() {
  return (
    <PageBody>
      <PageTitle
        title="Avnet vs Arrow"
        subtitle="Avnet against its closest competitor, from both companies' SEC filings"
        actions={
          <>
            <DataChip status="live" label="SEC filings" />
            <ButtonLink href="/network/arrow">Open Arrow&apos;s profile</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<OverviewFallback />}>
        <Overview />
      </Suspense>
      <Suspense fallback={<SectionFallback title="What Arrow's management said last quarter" />}>
        <ManagementSaid />
      </Suspense>
      {/* Franchise moves come from Line Cards; while it is hidden, the share of the pair sits beside components instead. */}
      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        {!isHidden("/line-cards") && (
          <Suspense fallback={<SectionFallback title="Franchise moves, last 12 months" className="xl:col-span-5" />}>
            <Moves />
          </Suspense>
        )}
        <Suspense fallback={<SectionFallback title="Components against components" className="xl:col-span-7" />}>
          <Components />
        </Suspense>
        <div className={isHidden("/line-cards") ? "xl:col-span-5" : "xl:col-span-12"}>
          <Suspense fallback={<CardFallback title="Avnet against Arrow" />}>
            <ArrowCard />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <MoreMeasures />
      </Suspense>
      <p className="text-caption text-ink-muted">
        Both companies&apos; figures come from their SEC filings (GAAP, as reported), lined up on calendar quarters because Avnet&apos;s fiscal year
        ends in June and Arrow&apos;s in December. Segment and region figures are read from the latest 10-Q and 10-K documents, with fourth quarters
        backed out of the annual report; segment margins use each company&apos;s own definition, so they are close to, not exactly, like for like.
        &ldquo;Leads&rdquo; counts only measures where higher or lower is clearly better, and the sentences under each company are written by a rule
        from the figures. Management summaries are written by Claude from each earnings release. Win and loss in accounts, share by supplier and
        pricing are not in filings.
      </p>
    </PageBody>
  );
}
