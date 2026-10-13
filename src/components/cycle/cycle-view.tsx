import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getCycle, type GroupPoint, type GroupSeries } from "@/lib/data/live/cycle";
import { COHORT_LABELS, isDemand } from "@/lib/data/live/earnings-model";
import { Card } from "@/components/ui/card";
import { GroupLines, GrowthSpark, QuarterBars, type ChartRow } from "@/components/charts/cycle-charts";
import { DASH, earningsHref, format } from "@/components/earnings/format";
import { cn } from "@/lib/utils";

const at = (points: GroupPoint[], label: string) => points.find((p) => p.label === label);
const growthText = (v: number | undefined) => (v === undefined ? DASH : format("growth", v));

interface Delta {
  text: string;
  up: boolean;
  good: boolean;
}

function Tile({ label, value, delta, note }: { label: string; value: string; delta?: Delta; note: string }) {
  const Arrow = delta?.up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span className="font-display text-2xs uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1.5 font-display text-2xl tabular text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">
        {delta && (
          <span className={cn("mr-1 inline-flex items-center gap-0.5 tabular", delta.good ? "text-avnet-greenDark" : "text-danger")}>
            <Arrow className="h-3.5 w-3.5" />
            {delta.text}
          </span>
        )}
        {note}
      </div>
    </div>
  );
}

function change(cur: number | undefined, prev: number | undefined, unit: "pts" | "days", upIsGood: boolean): Delta | undefined {
  if (cur === undefined || prev === undefined) return undefined;
  const diff = cur - prev;
  const up = diff >= 0;
  const text = unit === "pts" ? `${(Math.abs(diff) * 100).toFixed(1)} pts` : `${Math.round(Math.abs(diff))} ${Math.round(Math.abs(diff)) === 1 ? "day" : "days"}`;
  return { text, up, good: up === upIsGood };
}

/** Shared bar scales, so a bar means the same length in the supply-chain and customer blocks. */
interface Scales {
  growth: number;
  margin: number;
  days: number;
}

// Growth bars stop at +100%: one group growing several-fold would flatten every other bar.
const GROWTH_CAP = 1;

function scalesFor(groups: GroupSeries[], latest: string): Scales {
  const points = groups.map((g) => at(g.points, latest));
  const max = (pick: (p: GroupPoint) => number | undefined) => Math.max(0, ...points.map((p) => (p ? Math.abs(pick(p) ?? 0) : 0)));
  return { growth: Math.min(GROWTH_CAP, max((p) => p.growth)) || 1, margin: max((p) => p.operatingMargin) || 1, days: max((p) => p.inventoryDays) || 1 };
}

/** A right-aligned value with an in-cell bar behind it. The number always carries the value; the bar is a visual aid. */
function BarCell({ value, max, text, capped }: { value: number | undefined; max: number; text: string; capped?: boolean }) {
  const width = value === undefined ? 0 : Math.min(1, Math.abs(value) / max) * 100;
  const negative = (value ?? 0) < 0;
  return (
    <td className="px-3 py-1">
      <div className="relative flex h-6 items-center justify-end">
        {width > 0 && (
          <span
            aria-hidden
            className={cn("absolute inset-y-0.5 left-0 rounded-sm", negative ? "bg-danger/15" : "bg-blue-dark/20", capped && "border-r-2 border-blue-dark")}
            style={{ width: `${width}%` }}
          />
        )}
        <span className="relative tabular text-ink">{text}</span>
      </div>
    </td>
  );
}

/** A signed change, coloured by whether the direction is good news. The sign is always printed, so colour is not the only cue. */
function ChangeCell({ value, text, upIsGood }: { value: number | undefined; text: string; upIsGood: boolean }) {
  const flat = value === undefined || text.replace(/[^0-9]/g, "").replace(/0/g, "") === "";
  const good = (value ?? 0) > 0 === upIsGood;
  return (
    <td className={cn("px-3 py-1.5 text-right tabular", flat ? "text-muted" : good ? "text-avnet-greenDark" : "text-danger")}>{text}</td>
  );
}

function ScoreRows({ groups, latest, yearAgo, prior, scales }: { groups: GroupSeries[]; latest: string; yearAgo: string; prior: string; scales: Scales }) {
  return (
    <>
      {groups.map((g) => {
        const now = at(g.points, latest);
        const before = at(g.points, prior);
        const lastYear = at(g.points, yearAgo);
        const days = now?.inventoryDays !== undefined && lastYear?.inventoryDays !== undefined ? now.inventoryDays - lastYear.inventoryDays : undefined;
        const margin =
          now?.operatingMargin !== undefined && lastYear?.operatingMargin !== undefined ? now.operatingMargin - lastYear.operatingMargin : undefined;
        // Momentum: is growth higher or lower than the quarter before?
        const momentum = now?.growth !== undefined && before?.growth !== undefined ? now.growth - before.growth : undefined;
        const Momentum = (momentum ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
        return (
          <tr key={g.cohort} className="border-b border-line last:border-b-0 hover:bg-canvas">
            <th scope="row" className="px-4 py-1.5 text-left font-normal">
              <Link href={earningsHref("avnet", g.cohort)} className="font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline">
                {COHORT_LABELS[g.cohort]}
              </Link>
            </th>
            <td className="px-3 py-1.5 text-right tabular text-muted">
              {now?.reporting ?? 0}/{g.companies}
            </td>
            <BarCell value={now?.growth} max={scales.growth} text={growthText(now?.growth)} capped={(now?.growth ?? 0) > GROWTH_CAP} />
            <td className="px-3 py-1.5 text-right tabular text-muted">
              <span className="inline-flex items-center justify-end gap-1">
                {growthText(before?.growth)}
                {momentum !== undefined && (
                  <Momentum
                    className={cn("h-3.5 w-3.5", momentum >= 0 ? "text-avnet-greenDark" : "text-danger")}
                    aria-label={momentum >= 0 ? "Growth accelerated since" : "Growth slowed since"}
                  />
                )}
              </span>
            </td>
            <BarCell value={now?.growing} max={1} text={now?.growing === undefined ? DASH : `${Math.round(now.growing * 100)}%`} />
            <BarCell value={now?.operatingMargin} max={scales.margin} text={format("pct", now?.operatingMargin)} />
            <ChangeCell
              value={margin}
              text={margin === undefined ? DASH : `${margin >= 0 ? "+" : "−"}${(Math.abs(margin) * 100).toFixed(1)} pts`}
              upIsGood
            />
            <BarCell value={now?.inventoryDays} max={scales.days} text={format("days", now?.inventoryDays)} />
            <ChangeCell value={days} text={days === undefined ? DASH : `${days >= 0 ? "+" : "−"}${Math.round(Math.abs(days))}`} upIsGood={false} />
          </tr>
        );
      })}
    </>
  );
}

/** Server component: needs every company's history, so the page streams it in. */
export async function CycleView() {
  const cycle = await getCycle();
  const { labels, latest, groups, supply, hyperscalerCapex, hyperscalers, phase } = cycle;
  if (!latest) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-muted">Company filings could not be loaded from SEC EDGAR right now.</p>
      </Card>
    );
  }

  const prior = labels[labels.length - 2];
  const yearAgo = labels[labels.length - 5];
  const supplyNow = at(supply, latest);
  const supplyPrior = at(supply, prior);
  const group = (cohort: string) => groups.find((g) => g.cohort === cohort)!;
  const dist = group("distributor");
  const mfr = group("manufacturer");
  const ems = group("ems");
  const capexNow = hyperscalerCapex[hyperscalerCapex.length - 1];
  const capexLatest = [...hyperscalerCapex].reverse().find((c) => c.total !== undefined);

  const supplyGroups = groups.filter((g) => !isDemand(g.cohort));
  const demandGroups = groups.filter((g) => isDemand(g.cohort));

  const inventoryRows: ChartRow[] = labels.map((label) => ({
    label,
    Distributors: at(dist.points, label)?.inventoryDays,
    Manufacturers: at(mfr.points, label)?.inventoryDays,
    "Contract manufacturers": at(ems.points, label)?.inventoryDays,
  }));
  const breadthRows: ChartRow[] = supply.map((p) => ({ label: p.label, growing: p.growing }));
  const capexRows: ChartRow[] = hyperscalerCapex.map((c) => ({ label: c.label, capex: c.total }));
  const scales = scalesFor(groups, latest);
  const supplyCompanies = supplyGroups.reduce((n, g) => n + g.companies, 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 className="font-display text-lg uppercase tracking-wide text-ink">
          {phase ?? "Cycle position unavailable"} <span className="text-muted">· {latest}</span>
        </h2>
        <p className="text-xs text-muted">
          Combined supply-chain revenue {growthText(supplyNow?.growth)} year over year, from {growthText(supplyPrior?.growth)} the quarter
          before · median company {growthText(supplyNow?.medianGrowth)} ·{" "}
          {supplyNow?.reporting ?? 0} of {supplyCompanies} companies reported
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Tile
          label="Supply-chain revenue"
          value={growthText(supplyNow?.growth)}
          delta={change(supplyNow?.growth, supplyPrior?.growth, "pts", true)}
          note="vs prior quarter's growth"
        />
        <Tile
          label="Median company growth"
          value={growthText(supplyNow?.medianGrowth)}
          delta={change(supplyNow?.medianGrowth, supplyPrior?.medianGrowth, "pts", true)}
          note="vs prior quarter"
        />
        <Tile
          label="Companies growing"
          value={supplyNow?.growing === undefined ? DASH : `${Math.round(supplyNow.growing * 100)}%`}
          delta={change(supplyNow?.growing, supplyPrior?.growing, "pts", true)}
          note="vs prior quarter"
        />
        <Tile
          label="Distributor inventory days"
          value={format("days", at(dist.points, latest)?.inventoryDays)}
          delta={change(at(dist.points, latest)?.inventoryDays, at(dist.points, yearAgo)?.inventoryDays, "days", false)}
          note="YoY · median"
        />
        <Tile
          label="Manufacturer inventory days"
          value={format("days", at(mfr.points, latest)?.inventoryDays)}
          delta={change(at(mfr.points, latest)?.inventoryDays, at(mfr.points, yearAgo)?.inventoryDays, "days", false)}
          note="YoY · median"
        />
        <Tile
          label="Hyperscaler capex"
          value={format("usd", capexLatest?.total)}
          note={
            capexLatest
              ? `${capexLatest.yoy === undefined ? "" : `${format("growth", capexLatest.yoy)} YoY · `}${capexLatest.label}${
                  capexLatest.label !== capexNow.label ? " (latest complete)" : ""
                }`
              : "Not all five have reported"
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Inventory in the chain" subtitle="Median days of inventory, by calendar quarter">
          <GroupLines rows={inventoryRows} series={["Distributors", "Manufacturers", "Contract manufacturers"]} unit="days" />
        </Card>
        <Card title="Breadth of growth" subtitle={`Share of ${supplyCompanies} supply-chain companies growing revenue year over year`}>
          <QuarterBars rows={breadthRows} dataKey="growing" name="Companies growing" unit="pctWhole" domain={[0, 1]} />
        </Card>
      </div>

      <Card title="Revenue growth by group" subtitle={`Year over year, last ${labels.length} calendar quarters · latest quarter emphasised · same scale within each tile only`}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-3 xl:grid-cols-5">
          {groups.map((g) => {
            const now = at(g.points, latest);
            return (
              <div key={g.cohort}>
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={earningsHref("avnet", g.cohort)}
                    className="truncate font-display text-2xs uppercase tracking-wider text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                  >
                    {COHORT_LABELS[g.cohort]}
                  </Link>
                  <span className="text-xs tabular text-ink">{growthText(now?.growth)}</span>
                </div>
                <GrowthSpark rows={g.points.map((p) => ({ label: p.label, growth: p.growth }))} name={COHORT_LABELS[g.cohort]} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Group scorecard" subtitle={`${latest} · growth is combined revenue; margin and inventory are the group median · growth bars stop at +100% · arrows show growth against the prior quarter`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Group
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Reported
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Growth YoY
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Prior qtr
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Growing
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Op margin
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  YoY
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Inv days
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  YoY
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-canvas">
                <th scope="colgroup" colSpan={9} className="px-4 py-1.5 text-left font-display text-2xs uppercase tracking-widest text-muted">
                  Supply chain
                </th>
              </tr>
              <ScoreRows groups={supplyGroups} latest={latest} yearAgo={yearAgo} prior={prior} scales={scales} />
            </tbody>
            <tbody>
              <tr className="border-b border-line bg-canvas">
                <th scope="colgroup" colSpan={9} className="px-4 py-1.5 text-left font-display text-2xs uppercase tracking-widest text-muted">
                  Customers
                </th>
              </tr>
              <ScoreRows groups={demandGroups} latest={latest} yearAgo={yearAgo} prior={prior} scales={scales} />
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Hyperscaler capital spending" subtitle="Combined capex of the five hyperscalers, by calendar quarter">
          <QuarterBars rows={capexRows} dataKey="capex" name="Combined capex" unit="usd" />
        </Card>
        <Card title="Capex by hyperscaler" subtitle="Each company's most recent reported quarter" bodyClassName="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Company
                </th>
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  Quarter
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Capex
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  YoY
                </th>
              </tr>
            </thead>
            <tbody>
              {hyperscalers.map((h) => (
                <tr key={h.slug} className="border-b border-line last:border-b-0 hover:bg-canvas">
                  <th scope="row" className="px-4 py-1.5 text-left font-normal">
                    <Link href={earningsHref(h.slug, "all")} className="font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline">
                      {h.name}
                    </Link>
                  </th>
                  <td className="px-3 py-1.5 text-left text-muted">{h.label ?? DASH}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{format("usd", h.capex)}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{growthText(h.yoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <p className="px-1 text-2xs text-muted">
        Built from the same SEC filings as Quarterly Earnings (GAAP, as reported), with each company&apos;s fiscal quarter placed in
        the calendar quarter it mostly falls in. The view is anchored on the latest quarter that about two-thirds of supply-chain
        companies have reported, and a group&apos;s figure is left blank below that coverage. Growth compares combined revenue for
        the companies present in both years, so the largest companies dominate it; the median shows the typical company. The cycle label is a rule: expansion or contraction is the sign of supply-chain
        growth, and accelerating or slowing is whether it rose or fell from the prior quarter. Customer groups are a demand
        read and are not counted in supply-chain figures. Capex is cash spent on property and equipment and excludes leases.
        {cycle.failed.length > 0 && ` Could not load: ${cycle.failed.join(", ")}.`}
      </p>
    </>
  );
}

export function CycleFallback() {
  return (
    <Card title="Reading filings" subtitle="Rolling up every company's quarterly history from SEC EDGAR. The first load after a refresh can take a minute.">
      <div className="space-y-2" role="status" aria-label="Loading the market cycle view">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
