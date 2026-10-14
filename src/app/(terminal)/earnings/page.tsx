import { Suspense } from "react";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { COHORTS, COMPANIES, DEFAULT_COMPANY, type Cohort } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyView } from "@/components/earnings/company-view";
import { EarningsCalendar, EarningsCalendarFallback } from "@/components/earnings/earnings-calendar";
import { EarningsControls } from "@/components/earnings/earnings-controls";
import { DASH } from "@/components/earnings/format";
import { PeerTable, PeerTableFallback } from "@/components/earnings/peer-table";
import { RevenueMix, RevenueMixFallback } from "@/components/earnings/revenue-mix";

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ company?: string; group?: string }> }) {
  const params = await searchParams;
  const company = COMPANIES.some((c) => c.slug === params.company) ? params.company! : DEFAULT_COMPANY;
  const group: Cohort | "all" = COHORTS.includes(params.group as Cohort) ? (params.group as Cohort) : "all";
  // Only the open company blocks the page; the cross-company table streams in after.
  const earnings = await getCompanyEarnings(company);

  return (
    <div className="space-y-5 p-5">
      <PageHeader
        title="Quarterly Earnings"
        subtitle={`One reporting framework across ${COMPANIES.length} distributors, chipmakers, suppliers and their customers, from SEC filings`}
      />
      <EarningsControls company={company} group={group} />
      <CompanyView earnings={earnings} />
      {/* Keyed by company so the fallback shows again while a new company's filing loads. */}
      <Suspense key={company} fallback={<RevenueMixFallback />}>
        <RevenueMix company={company} />
      </Suspense>
      <Suspense fallback={<EarningsCalendarFallback />}>
        <EarningsCalendar company={company} group={group} />
      </Suspense>
      <Suspense fallback={<PeerTableFallback />}>
        <PeerTable company={company} group={group} />
      </Suspense>
      <p className="px-1 text-2xs text-muted">
        Source: SEC EDGAR structured data from each company&apos;s 10-Q and 10-K filings, as reported (GAAP, not adjusted). Fiscal
        quarters follow each company&apos;s own calendar; the CY label is the calendar quarter the period mostly falls in. Fourth
        quarters and all cash-flow items are filed as year-to-date totals, so the quarter is the difference between consecutive
        totals; † marks EPS derived that way, which is approximate. Days metrics use the quarter-end balance against 91 days of
        revenue or cost of revenue. {DASH} means the company does not report the item in a comparable form. Checked for new
        filings about every 6 hours.
      </p>
    </div>
  );
}
