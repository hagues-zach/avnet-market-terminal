import { Suspense } from "react";
import Link from "next/link";
import { getCompanyEarnings, getPeerRows } from "@/lib/data/live/earnings";
import {
  COHORTS,
  COHORT_LABELS,
  COMPANIES,
  DEFAULT_COMPANY,
  comparability,
  comparableValue,
  type Cohort,
  type Metric,
  type Quarter,
} from "@/lib/data/live/earnings-model";
import { groupMedian, groupOf } from "@/lib/earnings/season";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { DataChip } from "@/components/ui/chip";
import { Panel, SourceLine } from "@/components/ui/panel";
import { LoadingBlock } from "@/components/ui/states";
import { CompanyPicker } from "@/components/earnings/company-picker";
import { CompanyResults, QuarterlyDetail, TrendPanel } from "@/components/earnings/company-view";
import { GroupTable } from "@/components/earnings/group-table";
import { SeasonFallback, SeasonOverview } from "@/components/earnings/season";

/** Server component: every company's latest quarter, filtered to the group. */
async function GroupSection({ company, group }: { company: string; group: Cohort | "all" }) {
  const all = await getPeerRows();
  const rows = groupOf(all, group);
  // Medians are of the US GAAP filers, as in the Market Cycle rollups; foreign reporters sit in the table with their caveats.
  const median = Object.fromEntries(
    (["revenueYoY", "grossMargin", "operatingMargin", "inventoryDays", "fcfMargin"] as const).map((m) => [m, groupMedian(rows.filter((r) => !r.company.foreign), m)]),
  );
  const foreign = rows.some((r) => r.company.foreign);
  return (
    <Panel
      title={group === "all" ? `All ${COMPANIES.length} companies, latest quarter` : `${COHORT_LABELS[group]}, latest quarter`}
      subtitle="Each company on its most recent filed quarter. Select a column to sort, a company to open it"
      bodyClassName="p-0"
      footer={
        <SourceLine
          source={
            foreign
              ? "SEC filings, GAAP as reported; Korean reporters from DART under K-IFRS, converted from won. Medians are of the US GAAP filers"
              : "SEC filings, GAAP as reported"
          }
        />
      }
    >
      <GroupTable
        rows={rows.map((r) => ({
          slug: r.company.slug,
          name: r.company.name,
          group: COHORT_LABELS[r.company.cohort],
          latest: r.latest && {
            ...r.latest,
            values: Object.fromEntries(
              Object.entries(r.latest.values).map(([m, v]) => [m, comparableValue(r.company, m as Metric, v)]),
            ) as Quarter["values"],
          },
          caveats: Object.fromEntries(
            (["revenue", "revenueYoY", "grossMargin", "operatingMargin", "inventoryDays", "fcfMargin"] as const).flatMap((m) => {
              const c = comparability(r.company, m);
              return c?.level === "caveat" ? [[m, c.reason]] : [];
            }),
          ),
        }))}
        current={company}
        groupParam={group}
        median={median}
      />
    </Panel>
  );
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ company?: string; group?: string }> }) {
  const params = await searchParams;
  const company = COMPANIES.some((c) => c.slug === params.company) ? params.company! : DEFAULT_COMPANY;
  const own = COMPANIES.find((c) => c.slug === company)!.cohort;
  // The group compared with: the URL's, or the company's own. "all" shows every company.
  const group: Cohort | "all" = params.group === "all" ? "all" : COHORTS.includes(params.group as Cohort) ? (params.group as Cohort) : own;
  const earnings = await getCompanyEarnings(company);

  return (
    <PageBody>
      <PageTitle
        title="Quarterly Earnings"
        subtitle={`One reporting framework across ${COMPANIES.length} companies, from SEC filings and Korea's DART`}
        actions={<DataChip status="live" label="SEC filings" />}
      />

      <Suspense fallback={<SeasonFallback />}>
        <SeasonOverview company={company} group={group} />
      </Suspense>

      <section aria-label="One company" className="space-y-4 pt-2">
        <CompanyPicker company={company} group={group} />
        <CompanyResults earnings={earnings} />
        <TrendPanel earnings={earnings} />
        <p className="text-body-sm text-ink-muted">
          What {earnings.company.name}&apos;s management said and its revenue mix are on{" "}
          <Link href={`/network/${company}`} className="text-ink underline underline-offset-2 hover:text-ink-muted">
            its company profile
          </Link>
          .
        </p>
        <Suspense
          fallback={
            <Panel title="Latest quarter in the group">
              <LoadingBlock label="Loading the group…" lines={6} />
            </Panel>
          }
        >
          <GroupSection company={company} group={group} />
        </Suspense>
        <QuarterlyDetail earnings={earnings} />
      </section>

      <p className="text-caption text-ink-muted">
        From SEC EDGAR structured data in each company&apos;s 10-Q and 10-K filings, as reported (GAAP, not adjusted). Fiscal quarters follow each
        company&apos;s calendar; the calendar quarter is the one the period mostly falls in, and the season is the last calendar quarter to have
        ended. Release dates are estimated from each company&apos;s release a year earlier. Fourth quarters and cash-flow items are filed as
        year-to-date totals, so the quarter is the difference between totals; EPS derived that way is marked. Days measures use the quarter-end
        balance against 91 days of revenue or cost. Checked for new filings about every 6 hours.
      </p>
    </PageBody>
  );
}
