import { Suspense } from "react";
import { lead } from "@/lib/customers/read";
import { getAvnet } from "@/lib/avnet";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageTitle } from "@/components/ui/page-title";
import {
  DemandPlot,
  DemandPlotFallback,
  EndMarkets,
  EndMarketsFallback,
  LargestCustomers,
  PublicCustomers,
  PublicCustomersFallback,
} from "@/components/customers/sections";

// Rendered per request for the live customer groups and companies; everything Avnet's own comes from src/lib/avnet.
export const dynamic = "force-dynamic";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default async function CustomersPage() {
  const { ttmBillings, ttmBillingsYearAgo, concentration, verticals, status } = await getAvnet();
  const growth = ttmBillings / ttmBillingsYearAgo - 1;
  const top10 = concentration.top10;
  const top100 = concentration.top100;
  const pts = (a: { now: number; yearAgo: number }) => Math.round((a.now - a.yearAgo) * 1000) / 10;

  return (
    <PageBody>
      <PageTitle
        title="Customers & End Markets"
        subtitle="Where Avnet's billings come from, by end market and customer, and whether customer demand is behind it"
      />

      <section aria-labelledby="customers-lead" className="space-y-3">
        <h2 id="customers-lead" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>{lead(verticals)}</span>
          <DataChip status={status} />
        </h2>
        <HookupMarker ids={["billings", "customer-master", "backlog", "drms"]} />
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Billings, last 12 months"
          value={`$${(ttmBillings / 1000).toFixed(1)}B`}
          delta={{ value: growth, display: `${(growth * 100).toFixed(1)}%`, period: "YoY" }}
          source={{ status }}
        />
        <KpiTile
          label="Top 10 customers"
          value={pct(top10.now)}
          note="of billings"
          delta={{ value: pts(top10), display: `${Math.abs(pts(top10)).toFixed(1)} pts`, period: "YoY", neutral: true }}
          source={{ status }}
        />
        <KpiTile
          label="Top 100 customers"
          value={pct(top100.now)}
          note="of billings"
          delta={{ value: pts(top100), display: `${Math.abs(pts(top100)).toFixed(1)} pts`, period: "YoY", neutral: true }}
          source={{ status }}
        />
        <KpiTile
          label="Active customers"
          value={`${(concentration.active / 1e6).toFixed(1)}M`}
          note="parent companies"
          delta={{ value: concentration.newCustomerGrowth, display: `${(concentration.newCustomerGrowth * 100).toFixed(1)}% new`, period: "YoY" }}
          source={{ status }}
        />
      </div>

      <Suspense fallback={<EndMarketsFallback />}>
        <EndMarkets />
      </Suspense>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Suspense fallback={<DemandPlotFallback />}>
          <DemandPlot />
        </Suspense>
        <LargestCustomers />
      </div>

      <Suspense fallback={<PublicCustomersFallback />}>
        <PublicCustomers />
      </Suspense>

      <p className="text-caption text-ink-muted">
        Avnet&apos;s billings, accounts, backlog and pipeline are mock until billings, the customer master, backlog and design registrations are
        hooked up. The lead names the end market that added the most billings on a year ago (billings times growth over one plus growth). Customer
        growth is live: the mean of each customer group&apos;s last four quarters of revenue growth on a year ago, from SEC filings (Market Cycle), so
        it covers the same span as Avnet&apos;s 12 months. Avnet is ahead of demand when its growth is more than 5 points above its customers&apos;,
        behind when more than 5 points below. Aerospace and defence and medical have no customer group in the app.
      </p>
    </PageBody>
  );
}
