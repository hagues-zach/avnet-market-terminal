import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { getAllEarnings } from "@/lib/data/live/earnings";
import { getCycle } from "@/lib/data/live/cycle";
import { COHORT_LABELS, COMPANIES, type Cohort } from "@/lib/data/live/earnings-model";
import { added, againstDemand, concentration, DEMAND_WORDS, MARKET_GROUP, trailingGrowth, type Demand } from "@/lib/customers/read";
import { getAvnet, type AvnetModel } from "@/lib/avnet";
import { DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { Panel, SourceLine } from "@/components/ui/panel";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { cn } from "@/lib/utils";

// Customers & End Markets sections. Avnet's billings, accounts and pipeline are
// mock (the shared model); customer groups and public companies are live from
// SEC filings. The two never share a column without a chip saying which is which.

const money = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);
const dollars = (v: number) => (Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`);
const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;
const pct1 = (v: number) => `${Math.abs(v * 100).toFixed(1)}%`;
const link = "text-ink underline-offset-2 hover:underline";
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

/* ---------- Live demand by customer group ---------- */

export interface GroupDemand {
  cohort: Cohort;
  /** Mean growth on a year ago over the last four quarters. */
  growth?: number;
  latest: string;
}

/** Each customer group's growth over the last four quarters, or null when the filings can't be read. */
export async function loadDemand(): Promise<Record<string, GroupDemand> | null> {
  const cycle = await getCycle().catch(() => null);
  if (!cycle?.latest) return null;
  return Object.fromEntries(
    cycle.groups
      .filter((g) => Object.values(MARKET_GROUP).includes(g.cohort))
      .map((g) => [g.cohort, { cohort: g.cohort, growth: trailingGrowth(g.points), latest: cycle.latest }]),
  );
}

interface MarketRow {
  name: string;
  billings: number;
  share: number;
  growth: number;
  added: number;
  pipeline: number;
  group?: Cohort;
  groupGrowth?: number;
  demand: Demand | null;
}

function marketRows(m: AvnetModel, demand: Record<string, GroupDemand> | null): MarketRow[] {
  return [...m.verticals]
    .map((v) => {
      const group = MARKET_GROUP[v.name];
      const groupGrowth = group ? demand?.[group]?.growth : undefined;
      return {
        name: v.name,
        billings: v.billings,
        share: v.billings / m.ttmBillings,
        growth: v.growth,
        added: added(v),
        pipeline: m.pipelineByVertical.find((p) => p.name === v.name)?.pipeline ?? 0,
        group,
        groupGrowth,
        demand: againstDemand(v.growth, groupGrowth),
      };
    })
    .sort((a, b) => b.billings - a.billings);
}

const DEMAND_ARROW: Record<Demand, typeof ArrowUp> = { ahead: ArrowUp, with: ArrowRight, behind: ArrowDown };

function DemandWord({ demand }: { demand: Demand | null }) {
  if (!demand) return <span className="text-ink-muted">n/a</span>;
  const Arrow = DEMAND_ARROW[demand];
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-ink">
      <Arrow className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      {DEMAND_WORDS[demand]}
    </span>
  );
}

function HeaderChip({
  label,
  status,
  chip,
  title,
  right = true,
}: {
  label: string;
  status: "mock" | "live";
  chip?: string;
  title?: string;
  right?: boolean;
}) {
  return (
    <th scope="col" className={cn(TH, "h-auto px-2 py-1.5 align-bottom", right ? "text-right" : "text-left")} title={title}>
      {/* The chip sits under the label so it doesn't widen the column. */}
      <span className={cn("flex flex-col gap-1", right ? "items-end" : "items-start")}>
        {label}
        <DataChip status={status} label={chip} />
      </span>
    </th>
  );
}

/* ---------- By end market, and the dot plot ---------- */

export async function EndMarkets() {
  const [m, demand] = await Promise.all([getAvnet(), loadDemand()]);
  const rows = marketRows(m, demand);
  const maxBillings = Math.max(...rows.map((r) => r.billings));
  const latest = demand ? Object.values(demand)[0]?.latest : undefined;

  return (
    <Panel
      title="By end market"
      subtitle="Avnet's billings in the last 12 months by end market, against the revenue growth of the customers who buy in it"
      bodyClassName="p-0"
      footer={
        <>
          <span>
            {demand
              ? `Customer growth is live from SEC filings: the mean of each group's last four quarters on a year ago, to ${latest}.`
              : "Customer growth is not available: the SEC filings couldn't be read. Try again in a few minutes."}
          </span>
          <Link href="/cycle" className={cn(link, "ml-auto")}>
            Market Cycle
          </Link>
        </>
      }
    >
      <div role="region" aria-label="Billings and customer demand by end market" tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse font-body text-table">
          <caption className="sr-only">
            Avnet billings by end market (mock) with the revenue growth of the matching customer group (live, SEC filings) and how the two compare.
          </caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "px-2 py-1.5 text-left align-bottom")}>
                End market
              </th>
              <HeaderChip label="Billings, 12 months" status={m.status} right={false} />
              <HeaderChip label="Share" status={m.status} />
              <HeaderChip label="Growth YoY" status={m.status} />
              <HeaderChip label="Added" status={m.status} title="Billings added on a year ago" />
              <HeaderChip
                label="Customer growth"
                status="live"
                chip="SEC"
                right={false}
                title="Revenue growth of the customer group that buys in this market"
              />
              <HeaderChip
                label="Against demand"
                status={m.status}
                chip="Mock vs live"
                right={false}
                title="Avnet's growth (mock) against customer growth (live): more than 5 points either way is ahead or behind"
              />
              <HeaderChip label="Pipeline" status={m.status} title="Approved design pipeline, not yet billing" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-normal text-ink">
                  {r.name}
                </th>
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-14 text-right tabular-nums text-ink">{money(r.billings)}</span>
                    <span className="block h-2 w-20" aria-hidden>
                      <span className="block h-full bg-viz-avnet" style={{ width: `${(r.billings / maxBillings) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{pct(r.share)}</td>
                <td className="px-2 py-1.5 text-right">
                  <Delta value={r.growth} display={pct(r.growth)} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-ink">
                  {r.added >= 0 ? "+" : "−"}
                  {money(Math.abs(r.added))}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {r.group ? (
                    <span className="flex items-baseline gap-2">
                      <span className="text-ink-muted">{COHORT_LABELS[r.group]}</span>
                      {r.groupGrowth === undefined ? (
                        <span className="text-ink-muted">not available</span>
                      ) : (
                        <Delta value={r.groupGrowth} display={pct1(r.groupGrowth)} neutral />
                      )}
                    </span>
                  ) : (
                    <span className="text-ink-muted" title="No customer group in the app sells into this market">
                      n/a
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <DemandWord demand={r.demand} />
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  <Link href="/design-pipeline?view=market" className={link}>
                    {money(r.pipeline)}
                    <span className="sr-only"> approved pipeline in {r.name}, open in Design Pipeline</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export async function DemandPlot() {
  const [m, demand] = await Promise.all([getAvnet(), loadDemand()]);
  const rows = marketRows(m, demand);
  return (
    <Panel
      className="xl:col-span-4"
      title="Avnet growth against customer demand"
      subtitle="Growth on a year ago, on one axis: Avnet's billings and the revenue of the customers in each market"
      footer={<SourceLine source="Mock: Avnet billings. Live: SEC filings" />}
    >
      <DotPlot rows={rows} />
    </Panel>
  );
}

/** One row per market with a customer group: Avnet (green) and its customers (dark blue) on a shared percent axis. */
function DotPlot({ rows }: { rows: MarketRow[] }) {
  const shown = rows.filter((r) => r.group && r.groupGrowth !== undefined);
  const missing = rows.filter((r) => !r.group).map((r) => r.name);
  if (!shown.length) {
    return <p className="text-body-sm text-ink-muted">Customer growth is not available, so there is nothing to compare yet.</p>;
  }
  const values = shown.flatMap((r) => [r.growth, r.groupGrowth!]);
  const step = 0.1;
  const lo = Math.min(0, Math.floor(Math.min(...values) / step) * step);
  const hi = Math.max(step, Math.ceil(Math.max(...values) / step) * step);
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const signed = (v: number) => `${v >= 0 ? "+" : "−"}${pct(v)}`;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-viz-avnet" aria-hidden />
          Avnet billings (mock)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-viz-arrow" aria-hidden />
          Customer revenue (live)
        </span>
      </div>
      <ul className="space-y-3">
        {shown.map((r) => {
          const a = r.growth;
          const c = r.groupGrowth!;
          return (
            <li key={r.name}>
              <p className="flex items-baseline justify-between gap-2 text-caption">
                <span className="text-body-sm text-ink">{r.name}</span>
                <span className="whitespace-nowrap tabular-nums text-ink-muted">
                  Avnet {signed(a)}, customers {signed(c)}
                </span>
              </p>
              <div className="relative mt-1 h-3" aria-hidden>
                <span className="absolute inset-y-0 w-px bg-hairline" style={{ left: x(0) }} />
                <span
                  className="absolute top-1/2 h-px -translate-y-1/2 bg-ink-muted"
                  style={{ left: x(Math.min(a, c)), width: `calc(${x(Math.max(a, c))} - ${x(Math.min(a, c))})` }}
                />
                <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-viz-arrow" style={{ left: x(c) }} />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface bg-viz-avnet"
                  style={{ left: x(a) }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="relative mt-2 h-4 border-t border-hairline text-micro text-ink-muted" aria-hidden>
        {ticks.map((t, i) => (
          <span
            key={t}
            className={cn("absolute top-1 tabular-nums", i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
            style={{ left: x(t) }}
          >
            {Math.round(t * 100)}%
          </span>
        ))}
      </div>
      {missing.length > 0 && <p className="mt-4 text-caption text-ink-muted">{missing.join(" and ")} have no public customer group in the app.</p>}
    </div>
  );
}

export function EndMarketsFallback() {
  return (
    <Panel title="By end market">
      <LoadingBlock label="Loading customer demand…" lines={7} />
    </Panel>
  );
}

export function DemandPlotFallback() {
  return (
    <Panel className="xl:col-span-4" title="Avnet growth against customer demand">
      <LoadingBlock label="Loading customer demand…" lines={5} />
    </Panel>
  );
}

/* ---------- Largest customers (mock) ---------- */

export async function LargestCustomers() {
  const { concentration: c, topCustomers, status } = await getAvnet();
  return (
    <Panel
      className="xl:col-span-8"
      title="Largest customers"
      subtitle={`${concentration(c.top10.now, c.top10.yearAgo)} The ten largest by parent company; names withheld in mock`}
      actions={<DataChip status={status} />}
      bodyClassName="p-0"
    >
      <div role="region" aria-label="Largest customers" tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse font-body text-table">
          <caption className="sr-only">
            The ten largest customers by billings in the last 12 months, with growth, backlog and approved pipeline. Mock data.
          </caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "px-2 text-left")}>
                Customer
              </th>
              <th scope="col" className={cn(TH, "px-2 text-left")}>
                End market
              </th>
              <th scope="col" className={cn(TH, "px-2 text-left")}>
                Region
              </th>
              <th scope="col" className={cn(TH, "px-2 text-right")}>
                Billings
              </th>
              <th scope="col" className={cn(TH, "px-2 text-right")}>
                Growth YoY
              </th>
              <th scope="col" className={cn(TH, "px-2 text-right")}>
                Backlog
              </th>
              <th scope="col" className={cn(TH, "px-2 text-right")} title="Approved design pipeline, not yet billing">
                Pipeline
              </th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((c) => (
              <tr key={c.name} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-normal text-ink">
                  {c.name}
                </th>
                <td className="whitespace-nowrap px-2 py-1.5 text-ink">{c.vertical}</td>
                <td className="px-2 py-1.5 text-ink-muted">{c.region}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{money(c.billings)}</td>
                <td className="px-2 py-1.5 text-right">
                  <Delta value={c.growth} display={pct(c.growth)} />
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{money(c.backlog)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-ink">{money(c.pipeline)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------- Public customer companies (live) ---------- */

const PUBLIC_GROUPS: Cohort[] = ["hyperscaler", "systems", "auto", "industrial", "ems"];

export async function PublicCustomers() {
  const [all, cycle] = await Promise.all([getAllEarnings().catch(() => []), getCycle().catch(() => null)]);
  const bySlug = new Map(all.map((e) => [e.company.slug, e]));
  const capex = new Map((cycle?.hyperscalers ?? []).map((h) => [h.slug, h]));
  const groups = PUBLIC_GROUPS.map((cohort) => ({
    cohort,
    rows: COMPANIES.filter((c) => c.cohort === cohort)
      .map((c) => {
        const q = [...(bySlug.get(c.slug)?.quarters ?? [])].reverse().find((x) => x.values.revenue !== undefined);
        return { company: c, q };
      })
      .sort((a, b) => (b.q?.values.revenue ?? -1) - (a.q?.values.revenue ?? -1)),
  }));
  const loaded = groups.some((g) => g.rows.some((r) => r.q));

  return (
    <Panel
      title="Customer companies in the public filings"
      subtitle="The customers whose quarterly filings the app reads, by group: their latest quarter on a year ago"
      actions={<DataChip status="live" label="SEC" />}
      bodyClassName="p-0"
      footer={
        <>
          <span>
            Revenue and inventory days from each company&apos;s latest 10-Q or 10-K. Capex is shown for hyperscalers, whose spending drives data
            centre demand.
          </span>
          <Link href="/network" className={cn(link, "ml-auto")}>
            Company Profiles
          </Link>
        </>
      }
    >
      {!loaded ? (
        <div className="px-4">
          <ErrorState title="Couldn't load the customers' filings" source="SEC EDGAR" detail="Try again in a few minutes." retryHref="/customers" />
        </div>
      ) : (
        <div role="region" aria-label="Customer companies in the public filings" tabIndex={0} className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse font-body text-table">
            <caption className="sr-only">
              Public customer companies by group: latest quarter, revenue, growth on a year ago, inventory days and, for hyperscalers, capital
              spending. Live from SEC filings.
            </caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                <th scope="col" className={cn(TH, "text-left")}>
                  Company
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Latest quarter
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Revenue
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Growth YoY
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Inventory days
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Capex
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.cohort}>
                <tr className="border-b border-hairline bg-surface-sunken">
                  <th scope="rowgroup" colSpan={7} className="px-3 py-1 text-left font-display text-label font-normal uppercase text-ink">
                    {COHORT_LABELS[g.cohort]}
                  </th>
                </tr>
                {g.rows.map(({ company, q }) => {
                  const yoy = q?.values.revenueYoY;
                  const inv = q?.values.inventoryDays;
                  const cx = capex.get(company.slug);
                  return (
                    <tr key={company.slug} className="border-b border-hairline hover:bg-surface-sunken">
                      <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">
                        <Link href={`/network/${company.slug}`} className={link}>
                          {company.name}
                        </Link>
                      </th>
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-muted">{q ? q.calendarLabel : "Not available"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {q?.values.revenue !== undefined ? dollars(q.values.revenue) : ""}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {yoy !== undefined ? <Delta value={yoy} display={pct1(yoy)} neutral /> : <span className="text-ink-muted">n/a</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {inv !== undefined ? `${Math.round(inv)} days` : <span className="text-ink-muted">n/a</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-ink">
                        {cx?.capex !== undefined ? (
                          <span className="inline-flex items-center justify-end gap-2">
                            {dollars(cx.capex)}
                            {cx.yoy !== undefined && <Delta value={cx.yoy} display={pct(cx.yoy)} neutral />}
                          </span>
                        ) : (
                          <span className="text-ink-muted">n/a</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">
                        <Link href={`/tools/qbr?company=${company.slug}&meeting=customer`} className={link}>
                          Prepare a QBR<span className="sr-only"> for {company.name}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </Panel>
  );
}

export function PublicCustomersFallback() {
  return (
    <Panel title="Customer companies in the public filings">
      <LoadingBlock label="Loading the customers' filings…" lines={8} />
    </Panel>
  );
}
