import Link from "next/link";
import { getCycle } from "@/lib/data/live/cycle";
import type { Cohort } from "@/lib/data/live/earnings-model";
import {
  APPROVAL_RATE,
  APPROVED_PIPELINE,
  APPROVED_PIPELINE_YEAR_AGO,
  DESIGN_APPROVED_SHARE,
  MONTHS_TO_BILLING,
  NEW_REGISTRATIONS,
  PIPELINE,
  PIPELINE_BY_QUARTER,
  PIPELINE_BY_SEGMENT,
  PIPELINE_BY_SUPPLIER,
  PIPELINE_BY_VERTICAL,
  PIPELINE_STAGES,
  RECENT_APPROVALS,
  STALLED_REGISTRATIONS,
} from "@/lib/shells/mock-avnet";
import { PageBody } from "@/components/layout/page-body";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { PageTitle } from "@/components/ui/page-title";
import { PipelineBreakdown } from "@/components/pipeline/breakdown";
import { PipelineTrend } from "@/components/pipeline/charts";
import { cn } from "@/lib/utils";

// Rendered per request for the live customer growth; everything else is the shared mock model.
export const dynamic = "force-dynamic";

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const link = "text-ink underline-offset-2 hover:underline";
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
// The two half-width lists use tighter cells so they fit at 1280px without wrapping IDs and names.
const TH2 = "h-control whitespace-nowrap px-2 font-display text-label font-normal uppercase text-ink-muted";

// End markets (Avnet's verticals) against the customer groups whose filings show demand there.
const MARKET_GROUP: Record<string, Cohort | undefined> = {
  "Data center & computing": "hyperscaler",
  Communications: "systems",
  Consumer: "systems",
  Automotive: "auto",
  Industrial: "industrial",
};

async function customerGrowth(): Promise<Record<string, number | undefined>> {
  const cycle = await getCycle().catch(() => null);
  if (!cycle?.latest) return {};
  const growthOf = (c: Cohort) => cycle.groups.find((g) => g.cohort === c)?.points.find((p) => p.label === cycle.latest)?.growth;
  return Object.fromEntries(PIPELINE_BY_VERTICAL.map((v) => [v.name, MARKET_GROUP[v.name] ? growthOf(MARKET_GROUP[v.name]!) : undefined]));
}

export default async function DesignPipelinePage() {
  const growth = await customerGrowth();
  const pipelineChange = APPROVED_PIPELINE / APPROVED_PIPELINE_YEAR_AGO - 1;
  const regChange = NEW_REGISTRATIONS.thisQuarter / NEW_REGISTRATIONS.yearAgo - 1;
  const rateChange = APPROVAL_RATE.now - APPROVAL_RATE.yearAgo;
  const first = PIPELINE.submitted.value;

  return (
    <PageBody>
      <PageTitle title="Design Pipeline" subtitle="Design registrations from submission to billing: Avnet's leading indicator" />

      <section aria-labelledby="pipeline-lead" className="space-y-3">
        <h2 id="pipeline-lead" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>
            The pipeline holds {money(APPROVED_PIPELINE)} of approved designs not yet billing, {pipelineChange >= 0 ? "up" : "down"}{" "}
            {pct(Math.abs(pipelineChange))} on a year ago.
          </span>
          <DataChip status="mock" />
        </h2>
        <HookupMarker ids={["drms", "billings"]} />
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Approved pipeline"
          value={money(APPROVED_PIPELINE)}
          note="not yet billing"
          delta={{ value: pipelineChange, display: pct(Math.abs(pipelineChange)), period: "YoY" }}
          source={{ status: "mock" }}
        />
        <KpiTile
          label="New registrations"
          value={NEW_REGISTRATIONS.thisQuarter.toLocaleString("en-US")}
          note="this quarter"
          delta={{ value: regChange, display: pct(Math.abs(regChange)), period: "YoY" }}
          source={{ status: "mock" }}
        />
        <KpiTile
          label="Approval rate"
          value={pct(APPROVAL_RATE.now)}
          note="last 12 months"
          delta={{ value: rateChange, display: `${Math.abs(rateChange * 100).toFixed(0)} pts`, period: "YoY" }}
          source={{ status: "mock" }}
        />
        <KpiTile label="Billings on design-approved parts" value={pct(DESIGN_APPROVED_SHARE)} note="of all billings" source={{ status: "mock" }} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-7"
          title="From submission to billing"
          subtitle="Registrations submitted in the last 12 months, by how far each has got"
          footer={
            <>
              <span>Median {MONTHS_TO_BILLING} months from approval to first billing</span>
              <Link href="/performance" className={cn(link, "ml-auto")}>
                Performance Tracker
              </Link>
            </>
          }
        >
          <ol className="space-y-1">
            {PIPELINE_STAGES.map(({ id, label }, i) => {
              const s = PIPELINE[id];
              const prev = i > 0 ? PIPELINE[PIPELINE_STAGES[i - 1].id] : undefined;
              return (
                <li key={id}>
                  {prev && (
                    <p className="border-l border-hairline py-1.5 pl-3 text-caption text-ink-muted">
                      {pct(s.count / prev.count)} {i === 1 ? "approved" : i === 2 ? "to production" : "to billing"}
                    </p>
                  )}
                  <div className="flex items-baseline justify-between gap-3 text-body-sm">
                    <span className="text-ink">
                      {i + 1}. {label}
                    </span>
                    <span className="tabular-nums text-ink-muted">
                      {s.count.toLocaleString("en-US")} registrations, <span className="font-semibold text-ink">{money(s.value)}</span>
                    </span>
                  </div>
                  <span className="mt-1 block h-5" aria-hidden>
                    <span className="block h-full bg-viz-avnet" style={{ width: `${(s.value / first) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel
          className="xl:col-span-5"
          title="Pipeline leads billings"
          subtitle="Approved pipeline and billings on design-approved parts, by fiscal quarter, both indexed to 100 in the first quarter"
          footer={<SourceLine source="Mock: DRMS and Avnet billings" />}
        >
          <PipelineTrend rows={PIPELINE_BY_QUARTER} />
        </Panel>
      </div>

      <Panel
        title="Pipeline in detail"
        subtitle="Select a row to see its funnel. Supplier and customer names are withheld in mock"
        bodyClassName="p-0"
        footer={
          <>
            <span>Customer growth is live, from SEC filings of the customer groups that buy in each market.</span>
            <Link href="/cycle" className={cn(link, "ml-auto")}>
              Market Cycle
            </Link>
          </>
        }
      >
        <PipelineBreakdown views={{ supplier: PIPELINE_BY_SUPPLIER, segment: PIPELINE_BY_SEGMENT, market: PIPELINE_BY_VERTICAL }} growth={growth} />
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Stalled" subtitle="Approved more than 12 months ago and not yet in production, oldest first" bodyClassName="p-0">
          <table className="w-full border-collapse font-body text-table">
            <caption className="sr-only">Stalled registrations (mock)</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                <th scope="col" className={cn(TH2, "text-left")}>
                  Registration
                </th>
                <th scope="col" className={cn(TH2, "text-left")}>
                  Supplier
                </th>
                <th scope="col" className={cn(TH2, "text-left")}>
                  Segment
                </th>
                <th scope="col" className={cn(TH2, "text-right")}>
                  Est. annual value
                </th>
                <th scope="col" className={cn(TH2, "text-right")}>
                  Age
                </th>
              </tr>
            </thead>
            <tbody>
              {STALLED_REGISTRATIONS.map((r) => (
                <tr key={r.reg} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-normal tabular-nums text-ink">
                    {r.reg}
                  </th>
                  <td className="whitespace-nowrap px-2 py-1.5 text-ink">{r.supplier}</td>
                  <td className="px-2 py-1.5 text-ink-muted">{r.segment}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">${r.value.toFixed(1)}M</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-ink">{r.months} months</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Recently approved" subtitle="Approved in the last 30 days, newest first" bodyClassName="p-0">
          <table className="w-full border-collapse font-body text-table">
            <caption className="sr-only">Recently approved registrations (mock)</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                <th scope="col" className={cn(TH2, "text-left")}>
                  Registration
                </th>
                <th scope="col" className={cn(TH2, "text-left")}>
                  Supplier
                </th>
                <th scope="col" className={cn(TH2, "text-left")}>
                  Segment
                </th>
                <th scope="col" className={cn(TH2, "text-right")}>
                  Est. annual value
                </th>
                <th scope="col" className={cn(TH2, "text-right")}>
                  Approved
                </th>
              </tr>
            </thead>
            <tbody>
              {RECENT_APPROVALS.map((r) => (
                <tr key={r.reg} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-normal tabular-nums text-ink">
                    {r.reg}
                  </th>
                  <td className="whitespace-nowrap px-2 py-1.5 text-ink">{r.supplier}</td>
                  <td className="px-2 py-1.5 text-ink-muted">{r.segment}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-ink">${r.value.toFixed(r.value < 1 ? 2 : 1)}M</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-ink">{r.daysAgo} days ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <p className="text-caption text-ink-muted">
        Everything on this page is mock until design registrations (DRMS) and billings are hooked up, except customer growth in the end-market view,
        which is each customer group&apos;s combined revenue growth on a year ago from SEC filings (Market Cycle). The funnel counts registrations
        submitted in the last 12 months by the furthest stage each has reached; values are estimated annual billings. Approved pipeline is the value
        approved but not yet billing. Pipeline to billings compares it with the last 12 months of billings in the same group: above the average, the
        group is set to grow.
      </p>
    </PageBody>
  );
}
