import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { COHORTS, US_FILERS, type Cohort } from "@/lib/data/live/earnings-model";
import { isMeasure } from "@/lib/earnings/leaderboard";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { DataChip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { LoadingBlock } from "@/components/ui/states";
import { SeasonFallback, SeasonOverview } from "@/components/earnings/season";
import { SeasonByGroup } from "@/components/earnings/season-groups";
import { LeaderboardView } from "@/components/earnings/leaderboard";
import { cn } from "@/lib/utils";

// Earnings is about all companies at once: the season (who reports when, who
// just did, how each group is doing) and the leaderboard (every company ranked
// on one measure). Everything about one company lives on its profile.

type View = "season" | "leaderboard";

const VIEWS: { value: View; label: string; href: string }[] = [
  { value: "season", label: "Season", href: "/earnings" },
  { value: "leaderboard", label: "Leaderboard", href: "/earnings?view=leaderboard" },
];

function Fallback({ title }: { title: string }) {
  return (
    <Panel title={title} deck={null}>
      <LoadingBlock label="Reading every company's filings…" lines={6} />
    </Panel>
  );
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; group?: string; measure?: string; company?: string }>;
}) {
  const params = await searchParams;
  // One company's earnings moved to its profile; old links land there.
  if (params.company && US_FILERS.some((c) => c.slug === params.company)) redirect(`/network/${params.company}#overview`);

  const view: View = params.view === "leaderboard" ? "leaderboard" : "season";
  const group: Cohort | "all" = COHORTS.includes(params.group as Cohort) ? (params.group as Cohort) : "all";
  const measure = isMeasure(params.measure) ? params.measure : "revenueYoY";

  return (
    <PageBody>
      <PageTitle
        title="Earnings"
        subtitle={`The season and the leaderboard across ${US_FILERS.length} US-listed companies, from SEC filings. Each company's own results are on its profile`}
        actions={<DataChip status="live" label="SEC filings" />}
      />

      <nav aria-label="Earnings views" className="border-b border-hairline">
        <ul className="flex gap-6">
          {VIEWS.map((v) => (
            <li key={v.value}>
              <Link
                href={v.href}
                aria-current={v.value === view ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-tab items-center border-b-2 font-body text-body-sm transition-colors",
                  v.value === view ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {view === "season" ? (
        <>
          <Suspense fallback={<SeasonFallback />}>
            <SeasonOverview />
          </Suspense>
          <Suspense fallback={<Fallback title="Season by group" />}>
            <SeasonByGroup />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<Fallback title="Leaderboard" />}>
          <LeaderboardView measure={measure} group={group} />
        </Suspense>
      )}

      <p className="text-caption text-ink-muted">
        From SEC EDGAR structured data in each company&apos;s 10-Q and 10-K filings, as reported (GAAP, not adjusted). Fiscal quarters follow each
        company&apos;s calendar; the calendar quarter is the one the period mostly falls in, and the season is the last calendar quarter to have
        ended. Release dates are estimated from each company&apos;s release a year earlier. Fourth quarters and cash-flow items are filed as
        year-to-date totals, so the quarter is the difference between totals. Days measures use the quarter-end balance against 91 days of revenue
        or cost. &quot;What to watch&quot; guidance comes from the release summary on each company&apos;s profile, once it has been read. Checked for
        new filings about every 6 hours.
      </p>
    </PageBody>
  );
}
