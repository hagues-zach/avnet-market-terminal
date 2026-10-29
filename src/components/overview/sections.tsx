import Link from "next/link";
import { getCycle, type Cycle } from "@/lib/data/live/cycle";
import { COHORT_LABELS, isDemand } from "@/lib/data/live/earnings-model";
import { quarterName } from "@/lib/ask/sentences";
import { REGION_LABEL, PRODUCT_LABEL, type TamSummary } from "@/lib/data/types";
import { getAvnet } from "@/lib/avnet";
import { bn, forecastDrift, lead, pace, pct, split } from "@/lib/overview/read";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Chip, DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { cn } from "@/lib/utils";
import { MarketByYear } from "./market-chart";

// Market Overview sections. Published WSTS figures carry their vintage; live
// reads from SEC filings carry Live; the split of the devices AI spending
// lands on is mock until WSTS detail and Gartner are hooked up.

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const link = "text-ink underline underline-offset-2 hover:text-ink-muted";

/** The supply-chain groups (customer groups left out), latest quarter against the one before. */
function quarterRows(c: Cycle) {
  const i = c.labels.indexOf(c.latest);
  const before = i > 0 ? c.labels[i - 1] : undefined;
  return c.groups
    .filter((g) => !isDemand(g.cohort))
    .map((g) => {
      const now = g.points.find((p) => p.label === c.latest)?.growth;
      const prev = before ? g.points.find((p) => p.label === before)?.growth : undefined;
      return { cohort: g.cohort, label: COHORT_LABELS[g.cohort], growth: now, pace: pace(now, prev) };
    })
    .filter((r) => r.growth !== undefined)
    .sort((a, b) => b.growth! - a.growth!);
}

async function cycleOrNull() {
  try {
    return await getCycle();
  } catch {
    return null;
  }
}

/* ---------- The lead ---------- */

export async function Lead({ tam, marketPrior }: { tam: TamSummary; marketPrior: number }) {
  const cycle = await cycleOrNull();
  const { aiDevices, status } = await getAvnet();
  const s = split(aiDevices, tam.tamUsdM, marketPrior);
  const supply = cycle?.supply.find((p) => p.label === cycle.latest)?.growth;
  const top = cycle ? quarterRows(cycle)[0] : undefined;
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
        <span>
          {lead({
            year: tam.latestYear,
            market: tam.tamUsdM,
            growth: tam.yoyGrowth,
            forecast: tam.forecastNextYearUsdM,
            devices: aiDevices.map((d) => d.device),
            rest: s.rest,
            quarter: cycle ? quarterName(cycle.latest) : undefined,
            supplyGrowth: supply,
            leader: top?.label,
          })}
        </span>
        <DataChip status={status} title={status === "mock" ? "The split of AI devices against the rest is mock" : undefined} />
      </p>
      <HookupMarker ids={["wsts", "gartner-forecast"]} />
    </div>
  );
}

/* ---------- The market by year ---------- */

export function MarketYears({ tam, vintage, supply }: { tam: TamSummary; vintage: string; supply: React.ReactNode }) {
  const forecastGrowth = tam.forecastNextYearUsdM / tam.tamUsdM - 1;
  return (
    <Panel
      title="The market by year"
      subtitle={`World semiconductor sales, 2019 to the ${tam.latestYear + 1} forecast`}
      actions={<Chip>{vintage}</Chip>}
      footer={<SourceLine source={`${vintage}, published totals`} />}
    >
      <MarketByYear points={tam.trend.map((p) => ({ year: p.year, usdM: p.tamUsdM, forecast: p.isForecast }))} />
      <dl className="mt-3 grid grid-cols-1 divide-y divide-hairline border-t border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="py-3 md:pr-4">
          <dt className={LABEL}>World market, {tam.latestYear}</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-figure tabular-nums text-ink">{bn(tam.tamUsdM, 1)}</span>
            <Delta value={tam.yoyGrowth} period={`on ${tam.latestYear - 1}`} neutral />
          </dd>
        </div>
        <div className="py-3 md:px-4">
          <dt className={LABEL}>WSTS forecast, {tam.latestYear + 1}</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-figure tabular-nums text-ink">{bn(tam.forecastNextYearUsdM, 1)}</span>
            <Delta value={forecastGrowth} period={`on ${tam.latestYear}`} neutral />
          </dd>
        </div>
        <div className="py-3 md:pl-4">{supply}</div>
      </dl>
    </Panel>
  );
}

export async function SupplyFigure() {
  const cycle = await cycleOrNull();
  const now = cycle?.supply.find((p) => p.label === cycle.latest);
  return (
    <>
      <dt className="flex items-center justify-between gap-2">
        <span className={LABEL}>Supply-chain revenue, {cycle ? quarterName(cycle.latest) : "latest quarter"}</span>
        <DataChip status="live" />
      </dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-figure tabular-nums text-ink">{pct(now?.growth)}</span>
        <span className="text-caption text-ink-muted">{now ? `${now.reporting} companies, on a year ago` : "SEC filings couldn't be read"}</span>
      </dd>
    </>
  );
}

/* ---------- What carried the growth ---------- */

function Bar({ label, value, share, growth, ai }: { label: string; value: number; share: number; growth: number; ai: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-body-sm">
        <span className="text-ink">{label}</span>
        <span className="flex items-baseline gap-2 tabular-nums text-ink">
          {bn(value, 1)}, {Math.round(share * 100)}% of the market
          <Delta value={growth} neutral />
        </span>
      </div>
      <div className="mt-1 h-2" aria-hidden>
        <div className={cn("h-full", ai ? "bg-viz-arrow" : "bg-viz-other")} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

export async function WhatCarried({ tam, marketPrior, vintage }: { tam: TamSummary; marketPrior: number; vintage: string }) {
  const { aiDevices, status } = await getAvnet();
  const s = split(aiDevices, tam.tamUsdM, marketPrior);
  return (
    <Panel
      title="What carried the growth"
      subtitle={`${tam.latestYear} sales and growth on ${tam.latestYear - 1}: the devices AI spending lands on, against the rest of the market`}
      actions={<DataChip status={status} />}
    >
      <div className="space-y-3">
        <Bar label="DRAM, Flash, MPUs, GPUs and AI accelerators" value={s.ai.usdM} share={s.ai.share} growth={s.ai.growth} ai />
        <Bar label="Everything else" value={s.rest.usdM} share={s.rest.share} growth={s.rest.growth} ai={false} />
      </div>
      <div role="region" aria-label="AI devices" tabIndex={0} className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse font-body text-table">
          <caption className="sr-only">Sales of the devices AI spending lands on, {tam.latestYear}, mock.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-y border-hairline text-right">
              <th scope="col" className={cn(TH, "text-left")}>
                Device
              </th>
              <th scope="col" className={TH}>
                {tam.latestYear} sales
              </th>
              <th scope="col" className={TH}>
                Growth
              </th>
            </tr>
          </thead>
          <tbody>
            {aiDevices.map((d) => (
              <tr key={d.device} className="border-b border-hairline">
                <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                  {d.device}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{bn(d.usdM, 1)}</td>
                <td className="px-3 py-1.5 text-right">
                  <Delta value={d.yoy} neutral />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <HookupMarker ids={["wsts", "gartner-forecast"]} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="font-display text-card-title text-ink">By WSTS category</h3>
        <Chip>{vintage}</Chip>
      </div>
      <div role="region" aria-label="Market by WSTS category" tabIndex={0} className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse font-body text-table">
          <caption className="sr-only">The market by WSTS product category, {tam.latestYear}, published.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-y border-hairline text-right">
              <th scope="col" className={cn(TH, "text-left")}>
                Category
              </th>
              <th scope="col" className={TH}>
                {tam.latestYear} sales
              </th>
              <th scope="col" className={TH}>
                Growth
              </th>
              <th scope="col" className={TH}>
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {tam.byProduct.map((p) => (
              <tr key={p.product} className="border-b border-hairline last:border-b-0">
                <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                  {PRODUCT_LABEL[p.product]}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{bn(p.usdM, 1)}</td>
                <td className="px-3 py-1.5 text-right">
                  <Delta value={p.yoy} neutral />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{Math.round((p.usdM / tam.tamUsdM) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-caption text-ink-muted">
        WSTS publishes logic, memory and micro; GPUs and AI accelerators sit inside logic and MPUs inside micro, so the split above waits for WSTS
        detail and the Gartner forecast. The categories are as published.{" "}
        <Link href="/tam" className={link}>
          TAM, SAM and SOM
        </Link>
      </p>
    </Panel>
  );
}

/* ---------- Forecast and regions ---------- */

function Bars({ items, highlight }: { items: { label: string; value: number; note?: React.ReactNode }[]; highlight?: string }) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-body-sm">
            <span className="text-ink">{i.label}</span>
            <span className="flex items-baseline gap-2 tabular-nums text-ink">
              {bn(i.value, 1)}
              {i.note}
            </span>
          </div>
          <div className="mt-1 h-2" aria-hidden>
            <div className={cn("h-full", i.label === highlight ? "bg-viz-arrow" : "bg-viz-other")} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ForecastCard({ vintages, year }: { vintages: { vintage: string; value: number }[]; year: number }) {
  const last = vintages[vintages.length - 1];
  return (
    <Panel
      title="Where the forecast is heading"
      subtitle={forecastDrift(vintages, year)}
      actions={<Chip>WSTS</Chip>}
      footer={<SourceLine source="WSTS forecast releases" />}
    >
      <Bars items={vintages.map((v) => ({ label: v.vintage, value: v.value }))} highlight={last?.vintage} />
    </Panel>
  );
}

export function RegionsCard({ tam, vintage }: { tam: TamSummary; vintage: string }) {
  const rows = [...tam.byRegion].sort((a, b) => b.usdM - a.usdM);
  return (
    <Panel
      title="Where the sales are"
      subtitle={`${tam.latestYear} sales by region, and growth on ${tam.latestYear - 1}`}
      actions={<Chip>{vintage}</Chip>}
      footer={<SourceLine source={vintage} />}
    >
      <Bars items={rows.map((r) => ({ label: REGION_LABEL[r.region], value: r.usdM, note: <Delta value={r.yoy} neutral /> }))} />
    </Panel>
  );
}
