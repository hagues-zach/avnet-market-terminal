import { cache } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCycle } from "@/lib/data/live/cycle";
import { COMPANIES, isDemand } from "@/lib/data/live/earnings-model";
import { ENDMARKET_LABEL, PRODUCT_LABEL, REGION_LABEL, type TamSummary } from "@/lib/data/types";
import { formatUsdMillions } from "@/lib/format";
import { VIZ } from "@/lib/colors";
import { categoryRows } from "@/lib/tam/categories";
import { fullQuarter, shortQuarter } from "@/lib/share/peers";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Chip, DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { CategoryTable } from "./category-table";
import { TrendMini } from "./trend-mini";

// TAM and its splits are published WSTS / SIA figures, labelled with their
// vintage. SAM and SOM are MOCK until billings and the code map are hooked up.
// The forecast check is live SEC data.

const cycleData = cache(getCycle);
const SUPPLY_COMPANIES = COMPANIES.filter((c) => !isDemand(c.cohort)).length;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/* ---------- The funnel ---------- */

function Step({
  label,
  value,
  definition,
  chip,
  bar,
  barLabel,
  avnet = false,
  last = false,
}: {
  label: string;
  value: string;
  definition: React.ReactNode;
  chip: React.ReactNode;
  /** Width of the bar, 0 to 1: this step as a share of the one before. */
  bar: number;
  barLabel: string;
  avnet?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative min-w-0 border-hairline py-4 first:pt-0 last:pb-0 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-label uppercase text-ink-muted">{label}</span>
        {chip}
      </div>
      <p className="mt-1.5 font-display text-figure-xl tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-body-sm text-ink">{definition}</p>
      <div className="mt-4 h-2" aria-hidden>
        <div className={`h-full ${avnet ? "bg-viz-avnet" : "bg-viz-benchmark"}`} style={{ width: `${Math.max(bar * 100, 1.5)}%` }} />
      </div>
      <p className="mt-1 text-caption text-ink-muted">{barLabel}</p>
      {!last && (
        <ChevronRight
          className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 bg-surface text-ink-muted md:block"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
    </div>
  );
}

export function FunnelCard({ t, vintage }: { t: TamSummary; vintage: string }) {
  const samShare = t.samUsdM / t.tamUsdM;
  return (
    <div className="space-y-2">
      <Panel title={`The opportunity in ${t.latestYear}`} subtitle="The world market, the part sold through distribution, and the part Avnet bills">
        <div className="grid md:grid-cols-3">
          <Step
            label="TAM, total market"
            value={formatUsdMillions(t.tamUsdM)}
            definition={
              <>
                World semiconductor sales, <Delta value={t.yoyGrowth} period={`on ${t.latestYear - 1}`} />
              </>
            }
            chip={<Chip>{vintage}</Chip>}
            bar={1}
            barLabel={`${formatUsdMillions(t.forecastNextYearUsdM)} forecast for ${t.latestYear + 1}`}
          />
          <Step
            label="SAM, served by distribution"
            value={formatUsdMillions(t.samUsdM)}
            definition="The part of the market sold through distributors"
            chip={<DataChip status="mock" />}
            bar={samShare}
            barLabel={`${pct(samShare)} of TAM`}
          />
          <Step
            label="SOM, Avnet"
            value={formatUsdMillions(t.somUsdM)}
            definition="Avnet billings in the served market"
            chip={<DataChip status="mock" />}
            bar={t.somShareOfSam}
            barLabel={`${pct(t.somShareOfSam)} of SAM`}
            avnet
            last
          />
        </div>
      </Panel>
      <HookupMarker ids={["billings", "code-map", "tam-sam-som"]} />
    </div>
  );
}

/* ---------- Over time ---------- */

export function TrendRow({ t, vintage }: { t: TamSummary; vintage: string }) {
  const first = t.trend[0].year;
  const series = [
    { key: "tamUsdM", title: "Market (TAM)", name: "TAM", color: VIZ.benchmark, light: true, chip: <Chip>WSTS</Chip>, source: vintage },
    { key: "samUsdM", title: "Served by distribution (SAM)", name: "SAM", color: VIZ.benchmark, light: true, chip: <DataChip status="mock" />, source: "Modelled share of TAM" },
    { key: "somUsdM", title: "Avnet (SOM)", name: "SOM", color: VIZ.avnet, light: false, chip: <DataChip status="mock" />, source: "Avnet billings, mock" },
  ] as const;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {series.map((s) => {
        const latest = t.trend.find((p) => p.year === t.latestYear)!;
        const start = t.trend[0];
        const cagr = (latest[s.key] / start[s.key]) ** (1 / (t.latestYear - first)) - 1;
        return (
          <Panel
            key={s.key}
            title={s.title}
            subtitle={`${formatUsdMillions(latest[s.key])} in ${t.latestYear}, ${pct(cagr)} a year since ${first}`}
            actions={s.chip}
            footer={<SourceLine source={s.source} />}
          >
            <div className="h-40">
              <TrendMini
                name={s.name}
                color={s.color}
                light={s.light}
                points={t.trend.map((p) => ({ year: p.year, value: p[s.key], forecast: p.isForecast }))}
              />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------- Categories ---------- */

export function CategoryCard({ t, vintage }: { t: TamSummary; vintage: string }) {
  const rows = categoryRows(t);
  const [a, b] = [...rows].sort((x, y) => y.growth - x.growth);
  const takeaway = a && b
    ? `${PRODUCT_LABEL[a.product]} and ${PRODUCT_LABEL[b.product].toLowerCase()} grew fastest and make up ${pct(a.shareOfTam + b.shareOfTam)} of the market`
    : "";
  return (
    <div className="space-y-2">
      <Panel
        title="Where the market is growing"
        subtitle={takeaway}
        bodyClassName="px-0 pb-0"
        footer={<SourceLine source={`${vintage} by product category; served and Avnet columns from billings and the code map (mock)`} />}
      >
        <CategoryTable rows={rows} />
      </Panel>
      <HookupMarker ids={["billings", "code-map"]} />
    </div>
  );
}

/* ---------- Forecast check (live) ---------- */

export async function ForecastCard({ t }: { t: TamSummary }) {
  let reported: { label: string; growth: number } | null = null;
  try {
    const cycle = await cycleData();
    const p = [...cycle.supply].reverse().find((x) => x.growth !== undefined);
    reported = p ? { label: p.label, growth: p.growth! } : null;
  } catch {
    return (
      <Panel title="Is the forecast holding?">
        <ErrorState title="Couldn't load the cycle data" source="SEC EDGAR" detail="Try again in a few minutes." />
      </Panel>
    );
  }
  const forecast = t.forecastNextYearUsdM / t.tamUsdM - 1;
  const gap = reported ? reported.growth - forecast : 0;
  const rows = [
    { label: `Reported, ${reported ? shortQuarter(reported.label) : "latest quarter"}`, value: reported?.growth, note: `${SUPPLY_COMPANIES} supply-chain companies, revenue on a year ago` },
    { label: `WSTS forecast for ${t.latestYear + 1}`, value: forecast, note: "World market growth, published forecast" },
  ];
  const max = Math.max(...rows.map((r) => Math.abs(r.value ?? 0)), 0.01);
  return (
    <Panel
      title="Is the forecast holding?"
      subtitle={
        reported
          ? `Reported growth is ${Math.abs(gap * 100).toFixed(0)} pts ${gap >= 0 ? "above" : "below"} the forecast pace`
          : "Waiting for enough companies to report"
      }
      className="h-full"
      actions={<DataChip status="live" label="SEC EDGAR" />}
      footer={
        <SourceLine source="SEC filings and WSTS" asOf={reported ? fullQuarter(reported.label) : undefined}>
          <Link href="/cycle" className="ml-auto text-ink underline-offset-2 hover:underline">
            Market Cycle
          </Link>
        </SourceLine>
      }
    >
      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-ink">{r.label}</span>
              <span className="font-display text-figure tabular-nums text-ink">
                {r.value === undefined ? "n/a" : `${r.value >= 0 ? "+" : "−"}${Math.abs(r.value * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="mt-1 h-2" aria-hidden>
              <div className={`h-full ${i === 0 ? "bg-viz-benchmark" : "bg-ink"}`} style={{ width: `${(Math.abs(r.value ?? 0) / max) * 100}%` }} />
            </div>
            <p className="mt-1 text-caption text-ink-muted">{r.note}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ForecastFallback() {
  return (
    <Panel title="Is the forecast holding?" className="h-full">
      <LoadingBlock label="Loading reported growth…" lines={5} />
    </Panel>
  );
}

/* ---------- Region and end market ---------- */

function BarList({ items }: { items: { name: string; value: number; growth: number }[] }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 1;
  const total = sorted.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-3">
      {sorted.map((i) => (
        <li key={i.name}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-body-sm">
            <span className="text-ink">{i.name}</span>
            <span className="flex items-baseline gap-3 whitespace-nowrap tabular-nums text-ink">
              {formatUsdMillions(i.value)} <span className="text-ink-muted">{pct(i.value / total)}</span>
              <Delta value={i.growth} />
            </span>
          </div>
          <div className="mt-1 h-2" aria-hidden>
            <div className="h-full bg-viz-other" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RegionCard({ t, vintage }: { t: TamSummary; vintage: string }) {
  const items = t.byRegion.map((r) => ({ name: REGION_LABEL[r.region], value: r.usdM, growth: r.yoy }));
  const top = [...items].sort((a, b) => b.value - a.value)[0];
  return (
    <Panel
      title="By region"
      subtitle={`${top.name} buys ${pct(top.value / t.tamUsdM)} of the world's chips`}
      actions={<Chip>WSTS</Chip>}
      footer={<SourceLine source={`${vintage}, ${t.latestYear}`} />}
      className="h-full"
    >
      <BarList items={items} />
    </Panel>
  );
}

export function EndMarketCard({ t }: { t: TamSummary }) {
  const items = t.byEndMarket.map((e) => ({ name: ENDMARKET_LABEL[e.endMarket], value: e.usdM, growth: e.yoy }));
  return (
    <Panel
      title="By end market"
      subtitle="Computers and communications take two thirds of the market"
      actions={<Chip>SIA</Chip>}
      footer={<SourceLine source={`SIA 2024 end-market mix applied to the ${t.latestYear} total`} />}
      className="h-full"
    >
      <BarList items={items} />
    </Panel>
  );
}

/* ---------- Method ---------- */

export function MethodCard({ vintage }: { vintage: string }) {
  return (
    <Panel title="Method">
      <div className="max-w-prose space-y-2 text-body-sm text-ink">
        <p>
          <span className="font-semibold">TAM</span> and its splits by product, region and end market are published figures: {vintage} for the
          market and its forecast, SIA 2024 for the end-market mix. The page standardises on WSTS, not SIA, to match the existing TAM report.
        </p>
        <p>
          <span className="font-semibold">SAM</span> is the part of the market sold through distributors, modelled here at 18% of TAM in line with
          the ECIA channel size. <span className="font-semibold">SOM</span> is Avnet&apos;s billings in that market. Both are mock until Avnet
          billings are joined to the WSTS categories through the code map.
        </p>
        <p className="flex flex-wrap items-center gap-2 pt-1">
          <Chip>{vintage}</Chip>
          <Chip>SIA 2024</Chip>
          <DataChip status="mock" label="SAM and SOM" />
        </p>
      </div>
    </Panel>
  );
}
