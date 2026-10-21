import { cache } from "react";
import Link from "next/link";
import { getCycle } from "@/lib/data/live/cycle";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { VIZ } from "@/lib/colors";
import { SHARE_BY_REGION, SHARE_BY_SEGMENT, SHARE_BY_SUPPLIER, SHARE_TREND } from "@/lib/shells/mock-market";
import { fullQuarter, growthAgainstMakers, latestGap, peerShare, shortQuarter } from "@/lib/share/peers";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { ShareBreakdown } from "./breakdown";
import { LabelledLines } from "./line-chart";

// Avnet's own share figures are MOCK until billings and the code map are hooked
// up. The Avnet against Arrow and growth comparisons are live SEC data, kept in
// their own sections so the two never mix.

const SHARE_HOOKUPS = ["billings", "wsts", "gartner-forecast", "code-map"];
const MAKERS = COMPANIES.filter((c) => c.cohort === "manufacturer").length;

const cycleData = cache(getCycle);
const avnetData = cache(() => getCompanyEarnings("avnet"));
const arrowData = cache(() => getCompanyEarnings("arrow"));

const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;

/* ---------- Mock share ---------- */

const latestTrend = SHARE_TREND[SHARE_TREND.length - 1]["Avnet share of mapped TAM"];
const yearAgoTrend = SHARE_TREND[SHARE_TREND.length - 5]["Avnet share of mapped TAM"];
const mappedMarket = SHARE_BY_SEGMENT.reduce((s, r) => s + r.tam, 0);
const mappedBillings = SHARE_BY_SEGMENT.reduce((s, r) => s + r.tam * r.share, 0);

export function ShareKpis() {
  return (
    <>
      <KpiTile
        label="Share of mapped market"
        value={`${(latestTrend * 100).toFixed(1)}%`}
        delta={{ value: latestTrend - yearAgoTrend, display: pts(latestTrend - yearAgoTrend), period: "YoY" }}
        source={{ status: "mock" }}
      />
      <KpiTile
        label="Mapped billings"
        value={`$${mappedBillings.toFixed(1)}B`}
        note={`of a $${mappedMarket}B market`}
        source={{ status: "mock" }}
      />
    </>
  );
}

export function BreakdownCard() {
  const segment = SHARE_BY_SEGMENT.map((s) => ({ name: s.segment, tam: s.tam, share: s.share, shareChange: s.shareChange, confidence: s.confidence }));
  return (
    <div className="space-y-2">
      <ShareBreakdown
        rows={{ segment, supplier: SHARE_BY_SUPPLIER, region: SHARE_BY_REGION }}
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

export function TrendCard() {
  const data = SHARE_TREND.map((r) => ({ label: r.label.replace(/^FY(\d{2}) (Q\d)$/, "$2 FY$1"), share: r["Avnet share of mapped TAM"] }));
  return (
    <Panel
      className="h-full"
      title="Share over time"
      subtitle={`Up ${pts(latestTrend - yearAgoTrend)} on a year ago, across all mapped segments`}
      actions={<DataChip status="mock" />}
      footer={<SourceLine source="Avnet billings ÷ mapped market size" asOf={SHARE_TREND[SHARE_TREND.length - 1].label} />}
    >
      <div className="h-52">
        <LabelledLines data={data} series={[{ key: "share", name: "Avnet", color: VIZ.avnet }]} rightMargin={88} />
      </div>
    </Panel>
  );
}

export function WhiteSpaceCard() {
  const items = SHARE_BY_SEGMENT.filter((s) => s.share < 0.05).sort((a, b) => b.tam - a.tam);
  const max = Math.max(...items.map((s) => s.tam));
  return (
    <Panel
      className="h-full"
      title="White space"
      subtitle="Large markets where Avnet's share is under 5%"
      actions={<DataChip status="mock" />}
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
                ${s.tam}B market <span className="text-ink-muted">· {(s.share * 100).toFixed(1)}% share</span>
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
  const gap = cycle ? latestGap(growthAgainstMakers(avnet, cycle)) : null;
  return (
    <>
      <KpiTile
        label="Share of Avnet + Arrow"
        value={last ? `${(last.avnet * 100).toFixed(1)}%` : "n/a"}
        delta={last && yearAgo ? { value: last.avnet - yearAgo.avnet, display: pts(last.avnet - yearAgo.avnet), period: "YoY" } : undefined}
        source={{ status: "live", label: "SEC" }}
        asOf={last ? shortQuarter(last.label) : undefined}
      />
      <KpiTile
        label="Growth over makers"
        value={gap ? `${gap.gap >= 0 ? "+" : "−"}${pts(gap.gap)}` : "n/a"}
        note={gap ? `${(gap.avnet * 100).toFixed(0)}% vs ${(gap.makers * 100).toFixed(0)}%` : undefined}
        source={{ status: "live", label: "SEC" }}
        asOf={gap ? shortQuarter(gap.label) : undefined}
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
      <Panel title="Avnet against Arrow">
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
          data={share.map((p) => ({ label: shortQuarter(p.label), avnet: p.avnet, arrow: p.arrow }))}
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
    <Panel title="Growth against component makers">
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
    >
    {points.some((p) => p.avnet !== undefined) ? (
      <div className="h-56">
        <LabelledLines
          signed
          data={points.map((p) => ({ label: shortQuarter(p.label), avnet: p.avnet, makers: p.makers }))}
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
    <Panel title={title}>
    <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={6} />
    </Panel>
  );
}
