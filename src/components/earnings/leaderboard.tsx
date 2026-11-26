import Link from "next/link";
import { getAllEarnings } from "@/lib/data/live/earnings";
import { COHORTS, COHORT_LABELS, US_FILERS, isUsFiler, type Cohort } from "@/lib/data/live/earnings-model";
import { MEASURES, medianOf, movers, rank, type Measure } from "@/lib/earnings/leaderboard";
import type { Unit } from "@/lib/chart-view/model";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Delta } from "@/components/ui/delta";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { format } from "./format";
import { GroupTable } from "./group-table";
import { GrowthMarginChart, RankChart } from "./leaderboard-charts";
import { peerRows, peersSlide } from "./peer-section";
import { comparisonSlide, panelsSlide } from "@/lib/deck/slides";
import { VIZ, companyColor } from "@/lib/colors";
import { scatterWindow } from "@/lib/chart-view/scatter";

const UNIT: Record<(typeof MEASURES)[Measure]["kind"], Unit> = { growth: "growth", pct: "pct", days: "days", usd: "usd" };
const href = (measure: Measure, group: Cohort | "all") =>
  `/earnings?view=leaderboard${measure === "revenueYoY" ? "" : `&measure=${measure}`}${group === "all" ? "" : `&group=${group}`}`;
const chip = (on: boolean) =>
  cn(
    "inline-flex h-control items-center whitespace-nowrap border px-2.5 font-body text-body-sm transition-colors",
    on ? "border-ink bg-surface font-semibold text-ink" : "border-hairline bg-surface text-ink-muted hover:text-ink",
  );

function Marker({ className }: { className: string }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0", className)} aria-hidden />;
}

/** Server component: every US filer on its latest quarter, ranked on one measure, within a group or across all. */
export async function LeaderboardView({ measure, group }: { measure: Measure; group: Cohort | "all" }) {
  const all = (await getAllEarnings()).filter((e) => isUsFiler(e.company) && (group === "all" || e.company.cohort === group));
  const m = MEASURES[measure];
  const unit = UNIT[m.kind];
  const ranked = rank(all, measure);
  const median = medianOf(ranked);
  const moved = movers(ranked, measure);
  const growthRank = measure === "revenueYoY" ? ranked : rank(all, "revenueYoY");
  const points = ranked.map((r) => ({ slug: r.company.slug, name: r.company.name, value: r.value, growth: r.growth, margin: r.margin }));
  const { rows, median: tableMedian } = await peerRows(group);
  const scope = group === "all" ? `All ${US_FILERS.length} companies` : COHORT_LABELS[group];
  const marginMedian = medianOf(rank(all, "operatingMargin"));

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Leaderboard filters" className="space-y-2 rounded-sm border border-hairline bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 font-display text-label uppercase text-ink-muted">Measure</span>
          {(Object.keys(MEASURES) as Measure[]).map((k) => (
            <Link key={k} href={href(k, group)} aria-current={k === measure ? "true" : undefined} className={chip(k === measure)} scroll={false}>
              {MEASURES[k].label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 font-display text-label uppercase text-ink-muted">Group</span>
          <Link href={href(measure, "all")} aria-current={group === "all" ? "true" : undefined} className={chip(group === "all")} scroll={false}>
            All
          </Link>
          {COHORTS.filter((c) => US_FILERS.some((co) => co.cohort === c)).map((c) => (
            <Link key={c} href={href(measure, c)} aria-current={c === group ? "true" : undefined} className={chip(c === group)} scroll={false}>
              {COHORT_LABELS[c]}
            </Link>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <Panel deck={null}>
          <EmptyState title={`No company in ${scope} has reported ${m.label.toLowerCase()} yet`} />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <Panel
            className="min-w-0 xl:col-span-8"
            title={`${m.label}, ranked`}
            subtitle={`${scope}, each on its latest filed quarter. ${m.higherIsBetter ? "Highest" : "Lowest"} first; a bar opens the company's profile`}
            deck={comparisonSlide({
              key: `earnings:ranked-${measure}-${group}`,
              title: `${m.label}, ranked: ${scope}`,
              text: `${scope}, each on its latest filed quarter, ${m.higherIsBetter ? "highest" : "lowest"} first. The median is ${format(m.kind, median)}.`,
              unit: m.kind === "growth" ? "pct" : m.kind,
              measure: m.label,
              keepOrder: true,
              items: ranked.slice(0, 16).map((r) => ({ name: r.company.slug === "avnet" ? "Avnet" : r.company.slug === "arrow" ? "Arrow" : r.company.name, value: r.value })),
              source: "SEC filings, GAAP as reported",
            })}
            footer={
              <SourceLine source="SEC filings, GAAP as reported">
                <span className="ml-auto inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Marker className="bg-viz-avnet" />
                    Avnet
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Marker className="bg-viz-arrow" />
                    Arrow
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Marker className="bg-viz-benchmark" />
                    Others
                  </span>
                </span>
              </SourceLine>
            }
          >
            <RankChart points={points} unit={unit} median={median} />
          </Panel>

          <div className="min-w-0 space-y-4 xl:col-span-4">
            <Panel
              title="Growth against margin"
              subtitle="Revenue growth on a year ago, against operating margin. Dashed lines are the medians"
              deck={growthMarginSlide(group, scope, growthRank, medianOf(growthRank), marginMedian)}
            >
              <GrowthMarginChart points={growthRank.map((r) => ({ slug: r.company.slug, name: r.company.name, value: r.value, growth: r.growth, margin: r.margin }))} medianGrowth={medianOf(growthRank)} medianMargin={marginMedian} />
            </Panel>
            <Panel
              title="Movers since the quarter before"
              subtitle={`Biggest changes in ${m.label.toLowerCase()}, each company against its own previous quarter`}
              deck={
                moved.length
                  ? panelsSlide({
                      key: `earnings:movers-${measure}-${group}`,
                      title: `Movers in ${m.label.toLowerCase()}: ${scope}`,
                      text: "The biggest changes since the quarter before, each company against its own previous quarter.",
                      // The card's list: each company, where it was and is, and the change in its colour.
                      panels: [
                        {
                          rowRules: true,
                          rows: moved.map((r) => {
                            const up = r.change! > 0;
                            const shown =
                              m.kind === "days"
                                ? `${Math.abs(Math.round(r.change!))} days`
                                : m.kind === "usd"
                                  ? format("usd", Math.abs(r.change!))
                                  : `${Math.abs(r.change! * 100).toFixed(1)} pts`;
                            return {
                              title: r.company.name,
                              value: `${format(m.kind, r.previous)} to ${format(m.kind, r.value)}`,
                              change: r.change === 0 ? shown : `${up ? "+" : "\u2212"}${shown}`,
                              tone: r.change === 0 ? ("neutral" as const) : up === m.higherIsBetter ? ("good" as const) : ("bad" as const),
                            };
                          }),
                        },
                      ],
                      source: "SEC filings, GAAP as reported",
                    })
                  : null
              }
            >
              {moved.length === 0 ? (
                <EmptyState title="No changes to compare yet" />
              ) : (
                <ul className="divide-y divide-hairline">
                  {moved.map((r) => (
                    <li key={r.company.slug} className="flex items-baseline gap-3 py-2 first:pt-0 last:pb-0 text-body-sm">
                      <Link href={`/network/${r.company.slug}`} className="min-w-0 flex-1 truncate text-ink underline-offset-2 hover:underline">
                        {r.company.name}
                      </Link>
                      <span className="tabular-nums text-ink-muted">
                        {format(m.kind, r.previous)} to <span className="text-ink">{format(m.kind, r.value)}</span>
                      </span>
                      <Delta
                        value={r.change!}
                        invert={!m.higherIsBetter}
                        display={
                          m.kind === "days"
                            ? `${Math.abs(Math.round(r.change!))} days`
                            : m.kind === "usd"
                              ? format("usd", Math.abs(r.change!))
                              : `${Math.abs(r.change! * 100).toFixed(1)} pts`
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      <Panel
        title={`${scope}, latest quarter`}
        subtitle="Every measure side by side. Select a column to sort, a company to open its profile"
        bodyClassName="p-0"
        footer={<SourceLine source="SEC filings, GAAP as reported" />}
        deck={peersSlide(`earnings:latest-quarter-${group}`, `${scope}, latest quarter`, rows, tableMedian)}
      >
        <GroupTable rows={rows} current="avnet" showGroup={group === "all"} median={tableMedian} />
      </Panel>
    </div>
  );
}

/**
 * The scatter's slide, as the card draws it: a dot per company on the same axes (the middle 90%,
 * Avnet and Arrow always in), Avnet and Arrow in their colours and named, dashed lines at the medians.
 */
function growthMarginSlide(
  group: string,
  scope: string,
  ranked: { company: { slug: string; name: string }; growth?: number; margin?: number }[],
  medianGrowth: number | undefined,
  medianMargin: number | undefined,
) {
  const all = ranked.flatMap((r) =>
    r.growth !== undefined && r.margin !== undefined ? [{ slug: r.company.slug, name: r.company.name, growth: r.growth, margin: r.margin }] : [],
  );
  if (!all.length) return null;
  const { shown, x, y, off } = scatterWindow(all);
  const strong = (slug: string) => slug === "avnet" || slug === "arrow";
  return panelsSlide({
    key: `earnings:growth-against-margin-${group}`,
    title: `Growth against margin: ${scope}`,
    text: `Revenue growth on a year ago against operating margin. Medians: growth ${format("growth", medianGrowth)}, margin ${format("pct", medianMargin)}.`,
    panels: [
      {
        scatter: {
          x: { label: "Revenue growth on a year ago", format: "growth", min: x[0], max: x[1] },
          y: { label: "Operating margin", format: "pct", min: y[0], max: y[1] },
          points: shown.map((p) => ({
            x: p.growth,
            y: p.margin,
            color: strong(p.slug) ? companyColor(p.slug) : VIZ.benchmark,
            ...(strong(p.slug) ? { strong: true, label: p.slug === "avnet" ? "Avnet" : "Arrow" } : {}),
          })),
          medians: { x: medianGrowth, y: medianMargin },
          note: off > 0 ? `${off} ${off === 1 ? "company is" : "companies are"} off the scale. Dashed lines are the medians.` : "Dashed lines are the medians.",
        },
      },
    ],
    source: "SEC filings, GAAP as reported",
  });
}
