import Link from "next/link";
import { ChevronRight, ExternalLink, Info } from "lucide-react";
import { getCommentary, type Commentary } from "@/lib/ai/commentary";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getNextRelease } from "@/lib/data/live/earnings-calendar";
import type { CompanyEarnings, Metric, Quarter } from "@/lib/data/live/earnings-model";
import { getSegmentHistory, type MemberSeries, type SeriesPoint } from "@/lib/data/live/segment-history";
import { getMoves } from "@/lib/line-cards/moves";
import { scorecard, strengths, talkingPoint, tally, verdict, type ScoreRow, type Side } from "@/lib/competitive/compare";
import { NA, format, longDate } from "@/components/earnings/format";
import { Chip } from "@/components/ui/chip";
import { Panel, SourceLine } from "@/components/ui/panel";
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { PairLines, type PairRow, type Unit } from "./charts";
import { PairSpark } from "./pair-spark";
import { cn } from "@/lib/utils";

// Which of each company's segments is its components distribution business: the
// like-for-like comparison. The others have no direct counterpart.
const COMPONENTS = { avnet: /ElectronicComponents/i, arrow: /GlobalComponents/i };

const order = (label: string) => {
  const m = label.match(/^CY(\d+) Q(\d)$/);
  return m ? Number(m[1]) * 4 + Number(m[2]) : -1;
};
const shared = (a: string[], b: string[]) => a.filter((l) => b.includes(l)).sort((x, y) => order(x) - order(y));
const yearBefore = (label: string) => label.replace(/^CY(\d+)/, (_, y: string) => `CY${String(Number(y) - 1).padStart(y.length, "0")}`);
const link = "text-ink underline-offset-2 hover:underline";

interface Pair {
  avnet: CompanyEarnings;
  arrow: CompanyEarnings;
  qa: Map<string, Quarter>;
  qb: Map<string, Quarter>;
  /** Calendar quarters both have reported, oldest first. */
  labels: string[];
  latest?: string;
}

async function loadPair(): Promise<Pair> {
  const [avnet, arrow] = await Promise.all([getCompanyEarnings("avnet"), getCompanyEarnings("arrow")]);
  const qa = new Map(avnet.quarters.map((q) => [q.calendarLabel, q]));
  const qb = new Map(arrow.quarters.map((q) => [q.calendarLabel, q]));
  const labels = shared(Array.from(qa.keys()), Array.from(qb.keys()));
  return { avnet, arrow, qa, qb, labels, latest: labels[labels.length - 1] };
}

const series = (pair: Pair, metric: Metric, n = 8) =>
  pair.labels.slice(-n).map((label) => ({ label, avnet: pair.qa.get(label)?.values[metric], arrow: pair.qb.get(label)?.values[metric] }));

function Marker({ side }: { side: Side }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0", side === "Avnet" ? "bg-viz-avnet" : "bg-viz-arrow")} aria-hidden />;
}

function gapText(row: Pick<ScoreRow, "kind">, gap: number | undefined): string {
  if (gap === undefined) return NA;
  if (row.kind === "usd") return `${gap.toFixed(2)}×`;
  const sign = gap >= 0 ? "+" : "−";
  return row.kind === "days" ? `${sign}${Math.round(Math.abs(gap))}` : `${sign}${(Math.abs(gap) * 100).toFixed(1)} pts`;
}

/* ---------- Verdict, scorecard and strengths ---------- */

/** Server component: both companies' structured financials. */
export async function Overview() {
  const pair = await loadPair();
  const { latest } = pair;
  if (!latest) {
    return (
      <Panel>
        <ErrorState title="The two companies' filings could not be loaded right now" source="SEC EDGAR" retryHref="/competitive" />
      </Panel>
    );
  }
  const a = pair.qa.get(latest)!;
  const b = pair.qb.get(latest)!;
  const ago = yearBefore(latest);
  const rows = scorecard(a, b, pair.qa.get(ago), pair.qb.get(ago));
  const count = tally(rows);
  const [nextA, nextB] = await Promise.all([getNextRelease("avnet").catch(() => null), getNextRelease("arrow").catch(() => null)]);
  const next = [nextB && { name: "Arrow", e: nextB }, nextA && { name: "Avnet", e: nextA }]
    .filter((x): x is { name: string; e: NonNullable<typeof nextA> } => Boolean(x))
    .sort((x, y) => x.e.date.localeCompare(y.e.date));

  return (
    <>
      <section aria-labelledby="verdict" className="space-y-1">
        <h2 id="verdict" className="text-pretty text-xl leading-snug text-ink">
          {verdict(rows, latest)}
        </h2>
        <p className="text-caption text-ink-muted">
          Avnet {a.fiscalLabel}, quarter ended {longDate(a.end)}. Arrow {b.fiscalLabel}, quarter ended {longDate(b.end)}.
          {next.length > 0 &&
            ` Next results: ${next.map(({ name, e }) => `${name} ${longDate(e.date)}${e.status === "estimated" ? " (estimated)" : e.status === "due" ? " (due)" : ""}`).join(", ")}.`}
        </p>
      </section>

      <Panel
        title="Scorecard"
        subtitle={`${latest}. Avnet leads on ${count.avnet} and Arrow on ${count.arrow} of the ${count.counted} measures where higher or lower is clearly better`}
        bodyClassName="p-0"
        footer={<SourceLine source="SEC filings, GAAP as reported" asOf={latest} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse font-body text-table">
            <caption className="sr-only">Avnet against Arrow on each measure for {latest}</caption>
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                <th scope="col" className={cn(TH, "text-left")}>
                  Measure
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Marker side="Avnet" />
                    Avnet
                  </span>
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Marker side="Arrow" />
                    Arrow
                  </span>
                </th>
                <th scope="col" className={cn(TH, "text-right")} title="Avnet minus Arrow, in points or days; a ratio for dollar amounts">
                  Gap
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Leads
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Gap a year ago
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      {r.label}
                      {r.caveat && (
                        <span title={r.caveat} className="inline-flex text-ink-muted">
                          <Info className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          <span className="sr-only">{r.caveat}</span>
                        </span>
                      )}
                    </span>
                  </th>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums text-ink", r.leads === "Avnet" && "font-semibold")}>
                    {format(r.kind, r.avnet)}
                  </td>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums text-ink", r.leads === "Arrow" && "font-semibold")}>
                    {format(r.kind, r.arrow)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">{r.caveat ? NA : gapText(r, r.gap)}</td>
                  <td className="px-3 py-1.5 text-left text-ink">{r.leads ?? <span className="text-ink-muted">n/a</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{r.caveat ? NA : gapText(r, r.gapYearAgo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid items-start gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Strengths side="Avnet" rows={rows} pair={pair} />
        <Strengths side="Arrow" rows={rows} pair={pair} />
      </div>
    </>
  );
}

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

function Strengths({ side, rows, pair }: { side: Side; rows: ScoreRow[]; pair: Pair }) {
  const list = strengths(rows, side);
  return (
    <Panel title={`Where ${side} is stronger`} subtitle="Biggest edge first, with a sentence to use in a conversation">
      {list.length === 0 ? (
        <EmptyState title={`${side} doesn't lead on any measure this quarter`} />
      ) : (
        <ul className="divide-y divide-hairline">
          {list.map((r) => {
            const s = series(pair, r.metric);
            return (
              <li key={r.metric} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-card-title text-ink">{r.label}</h3>
                  <p className="mt-0.5 flex flex-wrap gap-x-4 text-body-sm tabular-nums">
                    <span className={cn("inline-flex items-center gap-1.5", side === "Avnet" ? "font-semibold text-ink" : "text-ink-muted")}>
                      <Marker side="Avnet" />
                      Avnet {format(r.kind, r.avnet)}
                    </span>
                    <span className={cn("inline-flex items-center gap-1.5", side === "Arrow" ? "font-semibold text-ink" : "text-ink-muted")}>
                      <Marker side="Arrow" />
                      Arrow {format(r.kind, r.arrow)}
                    </span>
                  </p>
                  <p className="mt-1 text-body-sm text-ink">{talkingPoint(r)}</p>
                </div>
                <PairSpark avnet={s.map((p) => p.avnet)} arrow={s.map((p) => p.arrow)} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- What each management said ---------- */

const TOPICS = [
  ["demand", "Demand"],
  ["inventory", "Inventory"],
  ["leadTimes", "Lead times"],
  ["pricing", "Pricing"],
] as const;

function CommentaryColumn({ c, label }: { c: Commentary; label: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-1.5 font-display text-card-title text-ink">
        <Marker side={c.company.slug === "avnet" ? "Avnet" : "Arrow"} />
        {label}
      </h3>
      {c.status !== "ok" || !c.digest ? (
        <p className="text-body-sm text-ink-muted">{c.message ?? "The latest earnings release could not be read."}</p>
      ) : (
        <>
          <p className="text-base leading-snug text-ink">{c.digest.headline}</p>
          <dl className="space-y-1.5">
            {TOPICS.map(([key, name]) => (
              <div key={key} className="text-body-sm">
                <dt className="inline font-semibold text-ink">{name}: </dt>
                <dd className="inline text-ink">{c.digest![key] ?? <span className="text-ink-muted">Not covered in the release.</span>}</dd>
              </div>
            ))}
          </dl>
          {c.releaseUrl && (
            <a href={c.releaseUrl} target="_blank" rel="noopener noreferrer" className={cn(link, "inline-flex items-center gap-1 text-caption")}>
              Read the release{c.filed ? `, filed ${longDate(c.filed)}` : ""}
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
              <span className="sr-only"> (opens SEC EDGAR in a new tab)</span>
            </a>
          )}
        </>
      )}
    </div>
  );
}

/** Server component: Claude's digest of each company's latest earnings release. */
export async function ManagementSaid() {
  const [arrow, avnet] = await Promise.all([getCommentary("arrow"), getCommentary("avnet")]);
  return (
    <Panel
      title="What Arrow's management said last quarter"
      subtitle="Set beside what Avnet's said. Written by Claude from each company's latest earnings release; check the release before quoting it"
    >
      <div className="grid gap-6 md:grid-cols-2 md:divide-x md:divide-hairline [&>*:last-child]:md:pl-6">
        <CommentaryColumn c={arrow} label="Arrow" />
        <CommentaryColumn c={avnet} label="And Avnet" />
      </div>
    </Panel>
  );
}

/* ---------- Franchise moves ---------- */

const MOVE_LIMIT = 8;

/** Server component: distribution agreements read from news headlines. */
export async function Moves() {
  const { moves, error } = await getMoves().catch(() => ({ moves: [], error: "Franchise news could not be loaded." }));
  const ours = moves.filter((m) => m.distributor.avnet || m.distributor.slug === "arrow");
  return (
    <Panel
      className="xl:col-span-5"
      title="Franchise moves, last 12 months"
      subtitle="Agreements Avnet and Arrow announced or ended, from news headlines"
      footer={
        <>
          <span>{ours.length} found</span>
          <Link href="/line-cards" className={cn(link, "ml-auto")}>
            Line Cards
          </Link>
        </>
      }
    >
      {ours.length === 0 ? (
        <EmptyState title="No agreements found" body={error ?? "No distribution agreement headlines for Avnet or Arrow in the last 12 months."} />
      ) : (
        <ul className="divide-y divide-hairline">
          {ours.slice(0, MOVE_LIMIT).map((m) => (
            <li key={m.id} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
              <span className="pt-1">
                <Marker side={m.distributor.avnet ? "Avnet" : "Arrow"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-ink">
                  <span className="font-medium">{m.supplier ?? "Supplier not named"}</span>
                  <span className="text-ink-muted">{m.distributor.name}</span>
                  {m.ended && <Chip>Ended</Chip>}
                </p>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(link, "line-clamp-1 text-caption text-ink-muted hover:text-ink")}
                >
                  {m.title}
                </a>
              </div>
              <time dateTime={m.date} className="whitespace-nowrap text-caption text-ink-muted">
                {longDate(m.date.slice(0, 10))}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Components against components ---------- */

const at = (s: MemberSeries | undefined, label: string): SeriesPoint | undefined => s?.points.find((p) => p.label === label);

/** Server component: segment history read from the filing documents. */
export async function Components() {
  const [sa, sb] = await Promise.all([getSegmentHistory("avnet"), getSegmentHistory("arrow")]);
  const compA = sa.segments.find((s) => COMPONENTS.avnet.test(s.key));
  const compB = sb.segments.find((s) => COMPONENTS.arrow.test(s.key));
  const labels = shared(compA?.points.map((p) => p.label) ?? [], compB?.points.map((p) => p.label) ?? []);
  const latest = labels[labels.length - 1];
  const names = { avnet: `Avnet ${compA?.label ?? "components"}`, arrow: `Arrow ${compB?.label ?? "components"}` };
  const rows = (pick: (p: SeriesPoint | undefined) => number | undefined): PairRow[] =>
    labels.map((label) => ({ label, avnet: pick(at(compA, label)), arrow: pick(at(compB, label)) }));

  return (
    <Panel
      className="xl:col-span-7"
      title="Components against components"
      subtitle={`${names.avnet} against ${names.arrow}, the like-for-like businesses`}
      footer={<SourceLine source="Segment figures in 10-Q and 10-K filings" asOf={latest} />}
    >
      {!latest ? (
        <ErrorState title="Segment detail could not be read from the filings" source="SEC EDGAR" detail={sa.error ?? sb.error} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-display text-card-title text-ink">Revenue</h3>
            <PairLines rows={rows((p) => p?.revenue)} unit="usd" names={names} />
          </div>
          <div>
            <h3 className="font-display text-card-title text-ink">Segment operating margin</h3>
            <PairLines rows={rows((p) => p?.operatingMargin)} unit="pct" names={names} />
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Trends and regional mix (folded) ---------- */

const TRENDS: { title: string; metric: Metric; unit: Unit }[] = [
  { title: "Revenue growth YoY", metric: "revenueYoY", unit: "growth" },
  { title: "Gross margin", metric: "grossMargin", unit: "pct" },
  { title: "Operating margin", metric: "operatingMargin", unit: "pct" },
  { title: "Inventory days", metric: "inventoryDays", unit: "days" },
];

const REGIONS = ["Americas", "EMEA", "Asia"] as const;
const regionOf = (key: string) => (/Americas/.test(key) ? "Americas" : /EMEA|Europe/.test(key) ? "EMEA" : /Asia/.test(key) ? "Asia" : undefined);
const share = (v: number | undefined) => (v === undefined ? NA : `${Math.round(v * 100)}%`);

/** Server component: trends and regions, folded under the comparison. */
export async function MoreMeasures() {
  const [pair, sa, sb] = await Promise.all([loadPair(), getSegmentHistory("avnet"), getSegmentHistory("arrow")]);
  const regionLabels = shared(sa.regions[0]?.points.map((p) => p.label) ?? [], sb.regions[0]?.points.map((p) => p.label) ?? []);
  const rl = regionLabels[regionLabels.length - 1];
  const region = (list: MemberSeries[], name: string) => list.find((s) => regionOf(s.key) === name);
  const total = (list: MemberSeries[]) => (rl ? REGIONS.reduce((n, r) => n + (at(region(list, r), rl)?.revenue ?? 0), 0) || undefined : undefined);
  const totals = { avnet: total(sa.regions), arrow: total(sb.regions) };

  return (
    <details className="group rounded-sm border border-hairline bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-90" strokeWidth={1.5} aria-hidden />
        <span className="font-display text-card-title text-ink">Trends and regional mix</span>
        <span className="ml-auto truncate pl-3 text-caption text-ink-muted">
          Growth, margins and inventory over eight quarters; revenue by region
        </span>
      </summary>
      <div className="space-y-6 border-t border-hairline p-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {TRENDS.map((t) => (
            <div key={t.metric}>
              <h3 className="font-display text-card-title text-ink">{t.title}</h3>
              <PairLines rows={series(pair, t.metric)} unit={t.unit} height={160} />
            </div>
          ))}
        </div>
        {rl && (
          <div className="overflow-x-auto">
            <h3 className="mb-1 font-display text-card-title text-ink">Regional mix, {rl}</h3>
            <table className="w-full min-w-[640px] border-collapse font-body text-table">
              <caption className="sr-only">Revenue by region for Avnet and Arrow, {rl}</caption>
              <thead className="bg-surface-sunken">
                <tr className="border-b border-hairline">
                  <th scope="col" className={cn(TH, "text-left")}>
                    Region
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Avnet revenue
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Share
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Growth YoY
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Arrow revenue
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Share
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Growth YoY
                  </th>
                </tr>
              </thead>
              <tbody>
                {REGIONS.map((r) => {
                  const x = at(region(sa.regions, r), rl);
                  const y = at(region(sb.regions, r), rl);
                  return (
                    <tr key={r} className="border-b border-hairline last:border-b-0">
                      <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                        {r}
                      </th>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">{format("usd", x?.revenue)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">
                        {share(x?.revenue !== undefined && totals.avnet ? x.revenue / totals.avnet : undefined)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">{x?.yoy === undefined ? NA : format("growth", x.yoy)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">{format("usd", y?.revenue)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">
                        {share(y?.revenue !== undefined && totals.arrow ? y.revenue / totals.arrow : undefined)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">{y?.yoy === undefined ? NA : format("growth", y.yoy)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

/* ---------- Loading states ---------- */

export function OverviewFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-2/3" />
      <Panel title="Scorecard" subtitle="Reading both companies' filings from SEC EDGAR. The first load can take a minute.">
        <LoadingBlock label="Loading the comparison…" lines={8} />
      </Panel>
    </div>
  );
}

export function SectionFallback({ title, className }: { title: string; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={5} />
    </Panel>
  );
}
