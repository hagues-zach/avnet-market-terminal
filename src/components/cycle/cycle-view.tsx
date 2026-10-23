import Link from "next/link";
import { getCycle, type CompanySeries, type GroupPoint, type GroupSeries, type StageSeries } from "@/lib/data/live/cycle";
import { COHORT_LABELS, isDemand } from "@/lib/data/live/earnings-model";
import { PERFORMANCE, fmtM, fmtPct } from "@/lib/shells/mock-avnet";
import { NA, earningsHref, format } from "@/components/earnings/format";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { BookToBill, CapexBars, GrowthBars, InventoryLines } from "./charts";
import { Spark } from "./spark";
import { cn } from "@/lib/utils";

const at = (points: GroupPoint[], label: string) => points.find((p) => p.label === label);
const growthText = (v: number | undefined) => (v === undefined ? NA : format("growth", v));
const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;
const days = (v: number) => `${Math.round(Math.abs(v))}d`;
const diff = (a: number | undefined, b: number | undefined) => (a === undefined || b === undefined ? undefined : a - b);
/** Round a change to what is shown, so "0d" or "0.0 pts" reads as flat rather than with an arrow. */
const dayChange = (a: number | undefined, b: number | undefined) => {
  const d = diff(a, b);
  return d === undefined ? undefined : Math.round(d);
};
const ptChange = (a: number | undefined, b: number | undefined) => {
  const d = diff(a, b);
  return d === undefined ? undefined : Math.round(d * 1000) / 1000;
};

const link = "text-ink underline-offset-2 hover:underline";

/** Server component: needs every company's history, so the page streams it in. */
export async function CycleView() {
  const cycle = await getCycle();
  const { labels, latest, groups, supply, phases, stages, avnet, arrow, hyperscalerCapex, hyperscalers, phase } = cycle;
  if (!latest) {
    return (
      <Panel>
        <ErrorState title="Company filings could not be loaded right now" source="SEC EDGAR" retryHref="/cycle" />
      </Panel>
    );
  }

  const prior = labels[labels.length - 2];
  const yearAgo = labels[labels.length - 5];
  const supplyNow = at(supply, latest);
  const supplyPrior = at(supply, prior);
  const group = (cohort: string) => groups.find((g) => g.cohort === cohort)!;
  const dist = group("distributor");
  const supplyGroups = groups.filter((g) => !isDemand(g.cohort));
  const demandGroups = groups.filter((g) => isDemand(g.cohort));
  const supplyCompanies = supplyGroups.reduce((n, g) => n + g.companies, 0);
  const capexLatest = [...hyperscalerCapex].reverse().find((c) => c.total !== undefined);
  const distDays = at(dist.points, latest)?.inventoryDays;
  const distDaysYearAgo = at(dist.points, yearAgo)?.inventoryDays;
  const distChange = dayChange(distDays, distDaysYearAgo);
  const growthChange = ptChange(supplyNow?.growth, supplyPrior?.growth);
  const growingChange = ptChange(supplyNow?.growing, supplyPrior?.growing);

  return (
    <>
      <section aria-labelledby="cycle-call" className="space-y-1">
        <h2 id="cycle-call" className="text-pretty text-xl leading-snug text-ink">
          <span className="font-semibold">{phase ?? "Cycle position unavailable"}.</span>{" "}
          {supplyNow?.growth !== undefined && (
            <>
              Supply-chain revenue {supplyNow.growth >= 0 ? "grew" : "fell"} {growthText(Math.abs(supplyNow.growth)).replace("+", "")} on a year ago
              in {latest}
              {supplyPrior?.growth !== undefined && <>, from {growthText(supplyPrior.growth)} the quarter before</>}.
            </>
          )}
        </h2>
        <p className="text-caption text-ink-muted">
          {supplyNow?.reporting ?? 0} of {supplyCompanies} supply-chain companies have reported {latest}. The median company grew{" "}
          {growthText(supplyNow?.medianGrowth)}.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label="Supply-chain revenue"
          value={growthText(supplyNow?.growth)}
          note="YoY"
          delta={growthChange !== undefined ? { value: growthChange, display: pts(growthChange), period: "on prior qtr" } : undefined}
          source={{ status: "live", label: "SEC" }}
        />
        <KpiTile
          label="Companies growing"
          value={supplyNow?.growing === undefined ? NA : `${Math.round(supplyNow.growing * 100)}%`}
          delta={growingChange !== undefined ? { value: growingChange, display: pts(growingChange), period: "on prior qtr" } : undefined}
          source={{ status: "live", label: "SEC" }}
        />
        <KpiTile
          label="Distributor inventory"
          value={distDays === undefined ? NA : `${Math.round(distDays)} days`}
          note="median"
          delta={distChange !== undefined ? { value: distChange, display: days(distChange), period: "YoY", invert: true } : undefined}
          source={{ status: "live", label: "SEC" }}
        />
        <KpiTile
          label="Hyperscaler capex"
          value={format("usd", capexLatest?.total)}
          note={capexLatest?.label}
          delta={capexLatest?.yoy !== undefined ? { value: capexLatest.yoy, period: "YoY" } : undefined}
          source={{ status: "live", label: "SEC" }}
        />
      </div>

      <Chain stages={stages} avnet={avnet} arrow={arrow} latest={latest} prior={prior} yearAgo={yearAgo} labels={labels} />

      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-8"
          title="How we got here"
          subtitle="Supply-chain revenue growth on a year ago, by calendar quarter, with the phase each quarter was in"
          footer={<SourceLine source="SEC filings" asOf={latest} />}
          bodyClassName="flex flex-col"
        >
          <GrowthBars fill rows={supply.map((p, i) => ({ label: p.label, growth: p.growth, phase: phases[i] }))} />
        </Panel>
        <OrderBook />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Panel
          title="Inventory in the chain"
          subtitle="Median days of inventory, by calendar quarter"
          footer={<SourceLine source="SEC filings" asOf={latest} />}
          bodyClassName="flex flex-col"
        >
          <InventoryLines
            fill
            series={["Manufacturers", "Distributors", "Contract manufacturers"]}
            short={{ "Contract manufacturers": "Contract mfrs" }}
            rows={labels.map((label) => ({
              label,
              Manufacturers: at(group("manufacturer").points, label)?.inventoryDays,
              Distributors: at(dist.points, label)?.inventoryDays,
              "Contract manufacturers": at(group("ems").points, label)?.inventoryDays,
            }))}
          />
        </Panel>
        <EndDemand demandGroups={demandGroups} latest={latest} capex={hyperscalerCapex} hyperscalers={hyperscalers} />
      </div>

      <Scorecard supplyGroups={supplyGroups} demandGroups={demandGroups} latest={latest} prior={prior} yearAgo={yearAgo} />

      <p className="text-caption text-ink-muted">
        Built from the same SEC filings as Quarterly Earnings (GAAP, as reported), with each fiscal quarter placed in the calendar quarter it mostly
        covers. The page is anchored on the latest quarter about two-thirds of supply-chain companies have reported, and a figure is left blank below
        that coverage. Growth is combined revenue for the companies present in both years, so the largest companies weigh most; margin and inventory
        are the median company. The phase is a rule: expansion or contraction is the sign of supply-chain growth, and accelerating or slowing is
        whether it rose or fell from the quarter before. Customers are a read on demand and are not counted in supply-chain figures. Capex is cash
        spent on property and equipment, excluding leases.
        {cycle.failed.length > 0 && ` Could not load: ${cycle.failed.join(", ")}.`}
      </p>
    </>
  );
}

/* ---------- The chain ---------- */

function Measure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-hairline py-2.5">
      <p className="font-display text-label uppercase text-ink-muted">{label}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">{children}</div>
    </div>
  );
}

function CompanyLine({ company, latest, yearAgo, marker }: { company: CompanySeries; latest: string; yearAgo: string; marker: string }) {
  const now = at(company.points, latest);
  const change = dayChange(now?.inventoryDays, at(company.points, yearAgo)?.inventoryDays);
  return (
    <li className="py-1.5">
      <div className="flex items-baseline justify-between gap-2 text-body-sm">
        <Link href={`/network/${company.slug}`} className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 hover:underline">
          <span className={cn("h-2.5 w-2.5 shrink-0", marker)} aria-hidden />
          {company.name.replace(" Electronics", "")}
        </Link>
        <span className="tabular-nums text-ink">{growthText(now?.growth)}</span>
      </div>
      <p className="mt-0.5 text-caption text-ink-muted">
        Inventory {now?.inventoryDays === undefined ? NA : `${Math.round(now.inventoryDays)} days`}
        {change !== undefined && ` (${change >= 0 ? "+" : "−"}${days(change)} YoY)`}, margin {format("pct", now?.operatingMargin)}
      </p>
    </li>
  );
}

/** Five stages from customers back to equipment, each with growth, inventory, margin and its last eight quarters. */
function Chain({
  stages,
  avnet,
  arrow,
  latest,
  prior,
  yearAgo,
  labels,
}: {
  stages: StageSeries[];
  avnet: CompanySeries;
  arrow: CompanySeries;
  latest: string;
  prior: string;
  yearAgo: string;
  labels: string[];
}) {
  return (
    <Panel
      title="The chain, from customers back to equipment"
      subtitle={`${latest}. Each stage is its companies taken together: combined revenue growth, median inventory and margin`}
      bodyClassName="p-0"
      footer={<SourceLine source="SEC filings" asOf={latest} />}
    >
      <ol className="grid divide-hairline sm:grid-cols-2 xl:grid-cols-5 xl:divide-x">
        {stages.map((s) => {
          const now = at(s.points, latest);
          const growthChange = ptChange(now?.growth, at(s.points, prior)?.growth);
          const daysChange = dayChange(now?.inventoryDays, at(s.points, yearAgo)?.inventoryDays);
          return (
            <li key={s.id} className="flex flex-col border-b border-hairline px-4 pb-3 pt-3 xl:border-b-0">
              <h3 className="font-display text-card-title text-ink">{s.name}</h3>
              <p className="min-h-8 text-caption text-ink-muted">
                {s.detail}. {now?.reporting ?? 0} of {s.companies} reported
              </p>
              <Measure label="Revenue growth YoY">
                <span className="font-display text-figure tabular-nums text-ink">{growthText(now?.growth)}</span>
                {growthChange !== undefined && <Delta value={growthChange} display={pts(growthChange)} period="on prior qtr" />}
              </Measure>
              <Measure label="Inventory days">
                <span className="text-body-strong tabular-nums text-ink">
                  {now?.inventoryDays === undefined ? NA : Math.round(now.inventoryDays)}
                </span>
                {daysChange !== undefined && <Delta value={daysChange} display={days(daysChange)} period="YoY" invert />}
              </Measure>
              <Measure label="Operating margin">
                <span className="text-body-strong tabular-nums text-ink">{format("pct", now?.operatingMargin)}</span>
              </Measure>
              {s.id === "distributors" && (
                <div className="border-t border-hairline pt-2">
                  <p className="font-display text-label uppercase text-ink-muted">Avnet and Arrow</p>
                  <ul className="divide-y divide-hairline">
                    <CompanyLine company={avnet} latest={latest} yearAgo={yearAgo} marker="bg-viz-avnet" />
                    <CompanyLine company={arrow} latest={latest} yearAgo={yearAgo} marker="bg-viz-arrow" />
                  </ul>
                </div>
              )}
              <div className="mt-auto border-t border-hairline pt-2.5">
                <p className="mb-1 font-display text-label uppercase text-ink-muted">Growth, last {labels.length} quarters</p>
                <Spark values={s.points.map((p) => p.growth)} width={140} height={28} />
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* ---------- Avnet's order book (mock) ---------- */

function OrderBook() {
  const latest = PERFORMANCE[PERFORMANCE.length - 1];
  const yearAgo = PERFORMANCE[PERFORMANCE.length - 5];
  return (
    <Panel
      className="xl:col-span-4"
      title="Avnet's order book"
      subtitle="The leading signal filings can't give: orders against shipments"
      footer={
        <>
          <Link href="/performance" className={link}>
            Performance Tracker
          </Link>
          <Link href="/competitive" className={link}>
            Avnet vs Arrow
          </Link>
        </>
      }
      bodyClassName="space-y-3"
    >
      <HookupMarker ids={["bookings", "backlog"]} />
      <BookToBill rows={PERFORMANCE} />
      <dl className="grid grid-cols-2 gap-3 border-t border-hairline pt-3">
        <div>
          <dt className="font-display text-label uppercase text-ink-muted">Book-to-bill, {latest.quarter}</dt>
          <dd className="font-display text-figure tabular-nums text-ink">{latest.bookToBill.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="font-display text-label uppercase text-ink-muted">Backlog</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-figure tabular-nums text-ink">{fmtM(latest.backlog)}</span>
            <Delta value={latest.backlog / yearAgo.backlog - 1} display={fmtPct(latest.backlog / yearAgo.backlog - 1)} period="YoY" />
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

/* ---------- End demand ---------- */

function EndDemand({
  demandGroups,
  latest,
  capex,
  hyperscalers,
}: {
  demandGroups: GroupSeries[];
  latest: string;
  capex: { label: string; total?: number }[];
  hyperscalers: { slug: string; name: string; capex?: number; yoy?: number; label?: string }[];
}) {
  const rows = demandGroups
    .map((g) => ({ g, growth: at(g.points, latest)?.growth }))
    .sort((a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity));
  const max = Math.max(0.01, ...rows.map((r) => Math.abs(r.growth ?? 0)));
  return (
    <Panel
      title="End demand"
      subtitle={`What the customers are doing: revenue growth on a year ago, ${latest}`}
      footer={<SourceLine source="SEC filings" asOf={latest} />}
      bodyClassName="space-y-4"
    >
      <ul className="space-y-2">
        {rows.map(({ g, growth }) => (
          <li key={g.cohort}>
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <Link href={earningsHref("avnet", g.cohort)} className="text-ink underline-offset-2 hover:underline">
                {COHORT_LABELS[g.cohort]}
              </Link>
              <span className="tabular-nums text-ink">{growthText(growth)}</span>
            </div>
            <span className="mt-1 block h-2" aria-hidden>
              <span className="block h-full bg-viz-benchmark" style={{ width: `${(Math.abs(growth ?? 0) / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-hairline pt-3">
        <h3 className="font-display text-card-title text-ink">Hyperscaler capital spending</h3>
        <p className="text-caption text-ink-muted">Combined capex of the five, by calendar quarter. Blank until all five have reported</p>
        <CapexBars rows={capex.map((c) => ({ label: c.label, capex: c.total }))} />
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-caption sm:grid-cols-3">
          {hyperscalers.map((h) => (
            <li key={h.slug} className="flex justify-between gap-2">
              <Link href={`/network/${h.slug}`} className="text-ink underline-offset-2 hover:underline">
                {h.name}
              </Link>
              <span className="tabular-nums text-ink-muted" title={h.label ? `Latest reported: ${h.label}` : undefined}>
                {growthText(h.yoy)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/* ---------- Scorecard ---------- */

const th = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

function ScoreRows({ groups, latest, prior, yearAgo }: { groups: GroupSeries[]; latest: string; prior: string; yearAgo: string }) {
  return (
    <>
      {groups.map((g) => {
        const now = at(g.points, latest);
        const before = at(g.points, prior);
        const lastYear = at(g.points, yearAgo);
        const margin = ptChange(now?.operatingMargin, lastYear?.operatingMargin);
        const inv = dayChange(now?.inventoryDays, lastYear?.inventoryDays);
        return (
          <tr key={g.cohort} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
            <th scope="row" className="px-3 py-1.5 text-left font-normal">
              <Link href={earningsHref("avnet", g.cohort)} className="text-ink underline-offset-2 hover:underline">
                {COHORT_LABELS[g.cohort]}
              </Link>
            </th>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">
              {now?.reporting ?? 0} of {g.companies}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink">{growthText(now?.growth)}</td>
            <td className="px-3 py-1.5">
              <Spark values={g.points.map((p) => p.growth)} />
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{growthText(before?.growth)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink">
              {now?.growing === undefined ? NA : `${Math.round(now.growing * 100)}%`}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink">{format("pct", now?.operatingMargin)}</td>
            <td className="px-3 py-1.5 text-right">
              {margin === undefined ? <span className="text-ink-muted">{NA}</span> : <Delta value={margin} display={pts(margin)} />}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums text-ink">{format("days", now?.inventoryDays)}</td>
            <td className="px-3 py-1.5 text-right">
              {inv === undefined ? <span className="text-ink-muted">{NA}</span> : <Delta value={inv} display={days(inv)} invert />}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function Scorecard({
  supplyGroups,
  demandGroups,
  latest,
  prior,
  yearAgo,
}: {
  supplyGroups: GroupSeries[];
  demandGroups: GroupSeries[];
  latest: string;
  prior: string;
  yearAgo: string;
}) {
  const band = (label: string) => (
    <tr className="border-b border-hairline bg-surface-sunken">
      <th scope="colgroup" colSpan={10} className="px-3 py-1.5 text-left font-display text-card-title font-normal text-ink">
        {label}
      </th>
    </tr>
  );
  return (
    <Panel
      title="Group scorecard"
      subtitle={`All ${supplyGroups.length + demandGroups.length} groups, ${latest}. Changes in margin and inventory are on a year ago`}
      bodyClassName="p-0"
      footer={<SourceLine source="SEC filings" asOf={latest} />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse font-body text-table">
          <caption className="sr-only">Growth, margin and inventory by group for {latest}</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(th, "text-left")}>
                Group
              </th>
              <th scope="col" className={cn(th, "text-right")} title="Companies that have reported the quarter">
                Reported
              </th>
              <th scope="col" className={cn(th, "text-right")} title="Combined revenue on a year ago">
                Growth YoY
              </th>
              <th scope="col" className={cn(th, "text-left")}>
                Last 8 qtrs
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Prior qtr
              </th>
              <th scope="col" className={cn(th, "text-right")} title="Share of the group's companies growing revenue">
                Growing
              </th>
              <th scope="col" className={cn(th, "text-right")} title="Median company">
                Op margin
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Change
              </th>
              <th scope="col" className={cn(th, "text-right")} title="Median company">
                Inv days
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {band("Supply chain")}
            <ScoreRows groups={supplyGroups} latest={latest} prior={prior} yearAgo={yearAgo} />
          </tbody>
          <tbody>
            {band("Customers")}
            <ScoreRows groups={demandGroups} latest={latest} prior={prior} yearAgo={yearAgo} />
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function CycleFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-2/3" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Panel
        title="Reading filings"
        subtitle="Rolling up every company's quarterly history from SEC EDGAR. The first load after a refresh can take a minute."
      >
        <LoadingBlock label="Loading the market cycle…" lines={8} />
      </Panel>
    </div>
  );
}
