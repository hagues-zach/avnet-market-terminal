import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { answer } from "@/lib/ask/answer";
import { readCache } from "@/lib/ai/cache";
import { plainDashes } from "@/lib/ai/dashes";
import type { Angle } from "@/lib/ai/news-angles";
import { getCycle, type Cycle } from "@/lib/data/live/cycle";
import { COHORT_LABELS, isDemand } from "@/lib/data/live/earnings-model";
import { getLiveNews } from "@/lib/data/live/news";
import { day, quarterName } from "@/lib/ask/sentences";
import { REGION_LABEL, PRODUCT_LABEL, type TamSummary } from "@/lib/data/types";
import { AI_DEVICES } from "@/lib/shells/mock-market";
import { PACE_WORDS, bn, forecastDrift, lead, pace, pct, split } from "@/lib/overview/read";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Chip, DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { cn } from "@/lib/utils";
import { MarketByYear } from "./market-chart";

// Market Overview sections. Published WSTS figures carry their vintage; live
// reads (SEC filings, economic signals, news) carry Live; the split of the
// devices AI spending lands on is mock until WSTS detail and Gartner are hooked up.

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const link = "text-ink underline underline-offset-2 hover:text-ink-muted";
const DEVICES = AI_DEVICES.map((d) => d.device);
const thisYear = () => new Date().getUTCFullYear();

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
  const s = split(AI_DEVICES, tam.tamUsdM, marketPrior);
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
            devices: DEVICES,
            rest: s.rest,
            quarter: cycle ? quarterName(cycle.latest) : undefined,
            supplyGrowth: supply,
            leader: top?.label,
          })}
        </span>
        <DataChip status="mock" title="The split of AI devices against the rest is mock" />
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

export function WhatCarried({ tam, marketPrior, vintage }: { tam: TamSummary; marketPrior: number; vintage: string }) {
  const s = split(AI_DEVICES, tam.tamUsdM, marketPrior);
  return (
    <Panel
      title="What carried the growth"
      subtitle={`${tam.latestYear} sales and growth on ${tam.latestYear - 1}: the devices AI spending lands on, against the rest of the market`}
      actions={<DataChip status="mock" />}
      className="xl:col-span-7"
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
            {AI_DEVICES.map((d) => (
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

/* ---------- This quarter in the filings ---------- */

export async function ThisQuarter() {
  const cycle = await cycleOrNull();
  const rows = cycle ? quarterRows(cycle) : [];
  return (
    <Panel
      title="This quarter in the filings"
      subtitle={`Revenue growth on a year ago${cycle ? `, ${quarterName(cycle.latest)}` : ""}, by company group, and whether it sped up or slowed on the quarter before`}
      actions={<DataChip status="live" />}
      className="xl:col-span-5"
      footer={
        <SourceLine source="SEC filings">
          <Link href="/cycle" className={link}>
            Market Cycle
          </Link>
        </SourceLine>
      }
    >
      {rows.length ? (
        <table className="w-full border-collapse font-body text-table">
          <caption className="sr-only">Revenue growth by company group, latest quarter, and against the quarter before.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-y border-hairline text-right">
              <th scope="col" className={cn(TH, "text-left")}>
                Group
              </th>
              <th scope="col" className={TH}>
                Growth
              </th>
              <th scope="col" className={TH}>
                Pace
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cohort} className="border-b border-hairline last:border-b-0">
                <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                  {r.label}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{pct(r.growth)}</td>
                <td className="px-3 py-1.5 text-right text-ink">{r.pace ? PACE_WORDS[r.pace] : "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-body-sm text-ink-muted">The latest filings couldn&apos;t be read just now. Try again in a few minutes.</p>
      )}
    </Panel>
  );
}

/* ---------- Forecast, regions, backdrop ---------- */

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

export async function Backdrop() {
  const a = await answer("What is the economy doing?");
  return (
    <Panel
      title="The backdrop"
      subtitle={a.period}
      actions={<DataChip status="live" />}
      footer={
        <SourceLine source={a.sources.map((s) => s.label).join(", ") || "n/a"}>
          <Link href="/signals" className={link}>
            Economic Signals
          </Link>
        </SourceLine>
      }
    >
      <p className="text-body-sm text-ink">{a.text}</p>
      {a.facts && (
        <dl className="mt-3 divide-y divide-hairline border-y border-hairline">
          {a.facts.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-body-sm text-ink-muted">{f.label}</dt>
              <dd className="text-body-sm text-ink">{f.values[0]}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/* ---------- What is being said ---------- */

const MARKET_TAGS = ["Memory", "Logic & Processors", "Foundry & Equipment"];

export async function Stories() {
  const [news, angles] = await Promise.all([
    getLiveNews().catch(() => null),
    readCache<Angle>("news-angles-v1").catch(() => ({}) as Record<string, Angle>),
  ]);
  const stories = (news?.articles ?? []).filter((a) => a.kind === "news" && a.segments.some((s) => MARKET_TAGS.includes(s))).slice(0, 4);
  return (
    <Panel
      title="What is being said"
      subtitle="The latest stories on memory, processors, AI and the fabs"
      actions={<DataChip status="live" />}
      footer={
        <SourceLine source="Trade press and GDELT">
          <Link href="/news" className={link}>
            Market News
          </Link>
        </SourceLine>
      }
    >
      {stories.length ? (
        <ul className="divide-y divide-hairline">
          {stories.map((s) => {
            const angle = (angles as Record<string, Angle>)[s.id]?.angle;
            return (
              <li key={s.id} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 text-body-sm font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {s.title}
                    <span className="sr-only"> (opens the source)</span>
                    <ExternalLink className="ml-1 inline h-3 w-3 text-ink-muted" strokeWidth={1.5} aria-hidden />
                  </a>
                  <span className="shrink-0 whitespace-nowrap text-caption text-ink-muted">
                    {s.outlet}, {day(s.publishedAt.slice(0, 10), thisYear())}
                  </span>
                </div>
                {angle && (
                  <p className="mt-0.5 text-caption text-ink-muted">
                    <span className="text-ink">Why it matters, written by Claude:</span> {plainDashes(angle)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">No market stories in the feed just now.</p>
      )}
    </Panel>
  );
}
