import { cache } from "react";
import Link from "next/link";
import { getCycle } from "@/lib/data/live/cycle";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { VIZ } from "@/lib/colors";
import { getAvnet } from "@/lib/avnet";
import { shareHistory } from "@/lib/avnet/derive";
import { fullQuarter, growthAgainstMakers, latestGap, peerShare, shortQuarter } from "@/lib/share/peers";
import { summarise } from "@/lib/mapping/read";
import { KpiTile } from "@/components/ui/kpi-tile";
import { ExplainGrowthGap, ExplainMappedBillings, ExplainMappedShare, ExplainPeerShare } from "@/components/explain/share";
import { Panel, SourceLine } from "@/components/ui/panel";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { ShareBreakdown } from "./breakdown";
import { LabelledLines } from "./line-chart";
import { panelsSlide, seriesSlide } from "@/lib/deck/slides";

// Avnet's own share figures are MOCK until billings and the code map are hooked
// up. The Avnet against Arrow and growth comparisons are live SEC data, kept in
// their own sections so the two never mix.

const SHARE_HOOKUPS = ["billings", "wsts", "gartner-forecast", "code-map"];
// The makers in the Market Cycle rollup, which counts US GAAP filers only.
const MAKERS = COMPANIES.filter((c) => c.cohort === "manufacturer" && !c.foreign).length;

const cycleData = cache(getCycle);
const avnetData = cache(() => getCompanyEarnings("avnet"));
const arrowData = cache(() => getCompanyEarnings("arrow"));

const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;

/* ---------- Avnet share (src/lib/avnet) ---------- */

/** The headline share figures, from Avnet's data. */
async function shareFigures() {
  const m = await getAvnet();
  const trend = m.shareTrend;
  return {
    m,
    latestTrend: trend[trend.length - 1]["Avnet share of mapped TAM"],
    yearAgoTrend: trend[trend.length - 5]["Avnet share of mapped TAM"],
    mappedMarket: m.shareBySegment.reduce((s, r) => s + r.tam, 0),
    mappedBillings: m.shareBySegment.reduce((s, r) => s + r.tam * r.share, 0),
  };
}

export async function ShareKpis() {
  const { m, latestTrend, yearAgoTrend, mappedMarket, mappedBillings } = await shareFigures();
  const s = summarise(m.mappings);
  const mapping = {
    ttm: m.ttmBillings,
    mappedShare: m.mappedShare,
    validatedBillings: m.mappings.filter((x) => x.status === "validated").reduce((a, x) => a + x.billings, 0),
    reviewBillings: s.reviewBillings,
  };
  return (
    <>
      <KpiTile
        label="Share of mapped market"
        value={`${(latestTrend * 100).toFixed(1)}%`}
        delta={{ value: latestTrend - yearAgoTrend, display: pts(latestTrend - yearAgoTrend), period: "YoY" }}
        source={{ status: m.status }}
        explain={
          <ExplainMappedShare share={latestTrend} shareYearAgo={yearAgoTrend} mappedShare={m.mappedShare} segments={m.shareBySegment} status={m.status} />
        }
      />
      <KpiTile
        label="Mapped billings"
        value={`$${mappedBillings.toFixed(1)}B`}
        note={`of a $${mappedMarket.toFixed(0)}B market`}
        source={{ status: m.status }}
        explain={<ExplainMappedBillings figures={mapping} focus="amount" status={m.status} />}
      />
    </>
  );
}

export async function BreakdownCard() {
  const m = await getAvnet();
  // Each row's last eight quarters for the sparklines and the drawer, pinned to its table figures.
  const trend = m.shareTrend.map((r) => r["Avnet share of mapped TAM"]);
  const withHistory = <R extends { share: number; shareChange: number }>(r: R) => ({ ...r, history: shareHistory(r.share, r.shareChange, trend) });
  const segment = m.shareBySegment.map((s) => withHistory({ name: s.segment, tam: s.tam, share: s.share, shareChange: s.shareChange, confidence: s.confidence }));
  return (
    <div className="space-y-2">
      <ShareBreakdown
        rows={{ segment, supplier: m.shareBySupplier.map(withHistory), region: m.shareByRegion.map(withHistory) }}
        periods={m.shareTrend.map((r) => r.label)}
        footerLink={
          <Link href="/tools/mapping" className="ml-auto text-ink underline-offset-2 hover:underline">
            How billings map to segments
          </Link>
        }
      />
      <HookupMarker ids={SHARE_HOOKUPS} />
    </div>
  );
}

/** One marker for the trend and white-space row, so the two cards line up. */
export function TrendRowMarker() {
  return <HookupMarker ids={["billings", "wsts", "tam-sam-som", "code-map"]} />;
}

export async function TrendCard() {
  const { m, latestTrend, yearAgoTrend } = await shareFigures();
  const data = m.shareTrend.map((r) => ({ label: r.label, share: r["Avnet share of mapped TAM"] }));
  return (
    <Panel
      className="h-full"
      title="Share over time"
      subtitle={`${latestTrend >= yearAgoTrend ? "Up" : "Down"} ${pts(latestTrend - yearAgoTrend)} on a year ago, across all mapped segments`}
      actions={<DataChip status={m.status} />}
      footer={<SourceLine source="Avnet billings ÷ mapped market size" asOf={m.shareTrend[m.shareTrend.length - 1].label} />}
      bodyClassName="flex flex-col"
      deck={seriesSlide({
        key: "share:over-time",
        title: "Avnet's share over time",
        text: `${latestTrend >= yearAgoTrend ? "Up" : "Down"} ${pts(latestTrend - yearAgoTrend)} on a year ago, across all mapped segments.`,
        unit: "pct",
        kind: "line",
        periods: data.map((d) => d.label),
        series: [{ name: "Avnet", values: data.map((d) => d.share) }],
        chartTitle: "Avnet share of the mapped market, %",
        source: "Avnet billings divided by mapped market size",
        hookups: ["billings", "wsts", "tam-sam-som", "code-map"],
      })}
    >
      {/* Fills the height the white-space list beside it sets; the absolute box keeps the chart out of that sizing. */}
      <div className="relative min-h-52 flex-1">
        <div className="absolute inset-0">
          <LabelledLines data={data} series={[{ key: "share", name: "Avnet", color: VIZ.avnet }]} rightMargin={88} />
        </div>
      </div>
    </Panel>
  );
}

export async function WhiteSpaceCard() {
  const m = await getAvnet();
  const items = m.shareBySegment.filter((s) => s.share < 0.05).sort((a, b) => b.tam - a.tam);
  const max = Math.max(...items.map((s) => s.tam));
  return (
    <Panel
      className="h-full"
      title="White space"
      subtitle="Large markets where Avnet's share is under 5%"
      actions={<DataChip status={m.status} />}
      deck={panelsSlide({
        key: "share:white-space",
        title: "White space: large markets where Avnet's share is under 5%",
        trayTitle: "White space",
        // The card's bars: each market's size and Avnet's share of it.
        panels: [
          {
            rows: items.map((s) => ({
              title: s.segment,
              value: `$${s.tam}B market,`,
              note: `${(s.share * 100).toFixed(1)}% share`,
              bar: { share: s.tam / max, color: VIZ.other },
            })),
          },
        ],
        source: "TAM, SAM and SOM and the code map",
        hookups: ["billings", "wsts", "tam-sam-som", "code-map"],
      })}
      footer={
        <SourceLine source="TAM / SAM / SOM and the code map">
          <Link href="/tam" className="ml-auto text-ink underline-offset-2 hover:underline">
            TAM / SAM / SOM
          </Link>
        </SourceLine>
      }
    >
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.segment}>
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="truncate text-ink">{s.segment}</span>
              <span className="whitespace-nowrap tabular-nums text-ink">
                ${s.tam}B market, <span className="text-ink-muted">{(s.share * 100).toFixed(1)}% share</span>
              </span>
            </div>
            <div className="mt-1 h-2" aria-hidden>
              <div className="h-full bg-viz-other" style={{ width: `${(s.tam / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- Live comparisons ---------- */

export async function PeerKpis() {
  const [avnet, arrow, cycle] = await Promise.all([avnetData(), arrowData(), cycleData().catch(() => null)]);
  const share = peerShare(avnet, arrow);
  const last = share[share.length - 1];
  const yearAgo = share.length >= 5 ? share[share.length - 5] : undefined;
  const growth = cycle ? growthAgainstMakers(avnet, cycle) : [];
  const gap = cycle ? latestGap(growth) : null;
  const gaps = growth.flatMap((g) => (g.avnet !== undefined && g.makers !== undefined ? [{ label: g.label, avnet: g.avnet, makers: g.makers }] : [])).slice(-8);
  return (
    <>
      <KpiTile
        label="Share of Avnet + Arrow"
        value={last ? `${(last.avnet * 100).toFixed(1)}%` : "n/a"}
        delta={last && yearAgo ? { value: last.avnet - yearAgo.avnet, display: pts(last.avnet - yearAgo.avnet), period: "YoY" } : undefined}
        source={{ status: "live", label: "SEC" }}
        asOf={last ? shortQuarter(last.label) : undefined}
        explain={<ExplainPeerShare points={share.map((p) => ({ ...p, avnetRevenue: p.avnetRevenue / 1e6, arrowRevenue: p.arrowRevenue / 1e6 }))} />}
      />
      <KpiTile
        label="Growth over makers"
        value={gap ? `${gap.gap >= 0 ? "+" : "−"}${pts(gap.gap)}` : "n/a"}
        note={gap ? `${(gap.avnet * 100).toFixed(0)}% vs ${(gap.makers * 100).toFixed(0)}%` : undefined}
        source={{ status: "live", label: "SEC" }}
        asOf={gap ? shortQuarter(gap.label) : undefined}
        explain={<ExplainGrowthGap points={gaps} makers={MAKERS} />}
      />
    </>
  );
}

export function PeerKpisFallback() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-sm border border-hairline bg-surface px-4 py-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-6 w-20" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </>
  );
}

export async function ArrowCard() {
  const [avnet, arrow] = await Promise.all([avnetData(), arrowData()]);
  const share = peerShare(avnet, arrow);
  if (avnet.error || arrow.error) {
    return (
      <Panel title="Avnet against Arrow" deck={null}>
        <ErrorState title="Couldn't load Avnet's or Arrow's filings" source="SEC EDGAR" detail="Try again in a few minutes." />
      </Panel>
    );
  }
  const first = share[0];
  const last = share[share.length - 1];
  const move = last && first ? last.avnet - first.avnet : 0;
  return (
    <Panel
    title="Avnet against Arrow"
    subtitle={
      last
        ? `Avnet's part of the two companies' combined revenue is ${(last.avnet * 100).toFixed(1)}%, ${move >= 0 ? "up" : "down"} ${pts(move)} over ${share.length} quarters`
        : undefined
    }
    actions={<DataChip status="live" label="SEC EDGAR" />}
    deck={
      share.length > 1
        ? seriesSlide({
            key: "share:avnet-against-arrow",
            title: "Avnet's part of Avnet and Arrow's combined revenue",
            trayTitle: "Avnet against Arrow, share of combined revenue",
            text: last ? `Avnet's part is ${(last.avnet * 100).toFixed(1)}%, ${move >= 0 ? "up" : "down"} ${pts(move)} over ${share.length} quarters.` : undefined,
            unit: "pct",
            kind: "line",
            periods: share.map((p) => shortQuarter(p.label)),
            series: [
              { name: "Avnet", values: share.map((p) => p.avnet) },
              { name: "Arrow", values: share.map((p) => p.arrow) },
            ],
            chartTitle: "Share of combined revenue, %",
            source: "10-Q and 10-K revenue",
            period: last ? fullQuarter(last.label) : undefined,
          })
        : null
    }
    footer={
      <SourceLine source="10-Q and 10-K revenue" asOf={last ? fullQuarter(last.label) : undefined}>
        <Link href="/network/arrow" className="ml-auto text-ink underline-offset-2 hover:underline">
          Arrow&apos;s profile
        </Link>
      </SourceLine>
    }
    >
    {share.length > 1 ? (
      <div className="h-56">
        <LabelledLines
          data={share.map((p) => ({ label: p.label, avnet: p.avnet, arrow: p.arrow }))}
          series={[
            { key: "avnet", name: "Avnet", color: VIZ.avnet },
            { key: "arrow", name: "Arrow", color: VIZ.arrow },
          ]}
        />
      </div>
    ) : (
      <EmptyState title="Not enough quarters reported by both companies yet" />
    )}
    </Panel>
  );
}

export async function GrowthCard() {
  let points: ReturnType<typeof growthAgainstMakers> = [];
  try {
    const [avnet, cycle] = await Promise.all([avnetData(), cycleData()]);
    points = growthAgainstMakers(avnet, cycle);
  } catch {
    return (
    <Panel title="Growth against component makers" deck={null}>
      <ErrorState title="Couldn't load the cycle data" source="SEC EDGAR" detail="Try again in a few minutes." />
    </Panel>
    );
  }
  const gap = latestGap(points);
  return (
    <Panel
    title="Growth against component makers"
    subtitle={
      gap
        ? `Avnet ${gap.gap >= 0 ? "grew faster than" : "grew slower than"} the makers it sells by ${pts(gap.gap)} in ${shortQuarter(gap.label)}`
        : "Revenue growth on a year ago"
    }
    actions={<DataChip status="live" label="SEC EDGAR" />}
    footer={<SourceLine source={`Avnet and ${MAKERS} component makers' reported revenue`} asOf={gap ? fullQuarter(gap.label) : undefined} />}
    deck={
      points.some((p) => p.avnet !== undefined)
        ? seriesSlide({
            key: "share:growth-against-makers",
            title: "Avnet's growth against the component makers",
            text: gap ? `Avnet ${gap.gap >= 0 ? "grew faster than" : "grew slower than"} the makers it sells by ${pts(gap.gap)} in ${shortQuarter(gap.label)}.` : undefined,
            unit: "pct",
            kind: "line",
            periods: points.map((p) => shortQuarter(p.label)),
            series: [
              { name: "Avnet", values: points.map((p) => p.avnet) },
              { name: "Component makers", color: VIZ.benchmark, values: points.map((p) => p.makers) },
            ],
            chartTitle: "Revenue growth on a year ago, %",
            source: `Avnet and ${MAKERS} component makers' reported revenue`,
            period: gap ? fullQuarter(gap.label) : undefined,
          })
        : null
    }
    >
    {points.some((p) => p.avnet !== undefined) ? (
      <div className="h-56">
        <LabelledLines
          signed
          data={points.map((p) => ({ label: p.label, avnet: p.avnet, makers: p.makers }))}
          series={[
            { key: "avnet", name: "Avnet", color: VIZ.avnet },
            { key: "makers", name: "Makers", color: VIZ.benchmark, light: true },
          ]}
        />
      </div>
    ) : (
      <EmptyState title="Not enough reported quarters yet" />
    )}
    </Panel>
  );
}

export function CardFallback({ title }: { title: string }) {
  return (
    <Panel title={title} deck={null}>
    <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={6} />
    </Panel>
  );
}
