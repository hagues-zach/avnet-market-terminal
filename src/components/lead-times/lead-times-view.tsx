import Link from "next/link";
import { ArrowDown, ArrowLeftRight, ArrowUp, ExternalLink, Minus } from "lucide-react";
import {
  getLeadTimes,
  leadSentence,
  yearAgo,
  type LeadIndicator,
  type PublishedReport,
  type SegmentRead,
  type SegmentVerdict,
} from "@/lib/data/live/lead-times";
import { VIZ } from "@/lib/colors";
import { DataChip } from "@/components/ui/chip";
import { Panel, SourceLine } from "@/components/ui/panel";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { SignalLines, type Format, type Row } from "@/components/signals/charts";
import { StoryList, type StoryRow } from "./story-list";

// Lead Times & Signals: the read in words, lead-time direction by segment from
// the news, three public supply-pressure series, the stories themselves, and
// links to the published lead-time reports. Public data only, no Avnet figures.

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts });
const MONTH_YEAR = fmt({ month: "short", year: "numeric" });
const MONTH_SHORT_YEAR = fmt({ month: "short", year: "2-digit" });
const FULL_DATE = fmt({ month: "short", day: "numeric", year: "numeric" });
// Story times in Eastern, like the morning brief.
const DAY_MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

/** "2026-08" → "Aug 2026". */
const monthYear = (ym: string) => MONTH_YEAR.format(new Date(`${ym}-01T00:00:00Z`));
/** "2026-08" → "Aug 26". */
const shortMonth = (ym: string) => MONTH_SHORT_YEAR.format(new Date(`${ym}-01T00:00:00Z`)).replace(" '", " ");
/** An ISO time as "Nov 4". */
const dayMonth = (iso: string) => DAY_MONTH.format(new Date(iso));
/** "2026-10-14" → "Oct 14, 2026". */
const fullDate = (ymd: string) => FULL_DATE.format(new Date(`${ymd}T00:00:00Z`));

const signed = (v: number, digits: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`;

const VERDICT: Record<SegmentVerdict, { word: string; icon: typeof ArrowUp; muted?: boolean }> = {
  longer: { word: "Lengthening", icon: ArrowUp },
  easing: { word: "Easing", icon: ArrowDown },
  mixed: { word: "Mixed", icon: ArrowLeftRight },
  thin: { word: "Too few to call", icon: Minus, muted: true },
  quiet: { word: "No stories", icon: Minus, muted: true },
};

function Verdict({ v }: { v: SegmentVerdict }) {
  const { word, icon: Icon, muted } = VERDICT[v];
  return (
    <span className={muted ? "inline-flex items-center gap-1 text-ink-muted" : "inline-flex items-center gap-1 font-medium text-ink"}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
      {word}
    </span>
  );
}

function SegmentTable({ rows }: { rows: SegmentRead[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-table">
        <caption className="sr-only">Lead-time direction by segment, from news in the last 30 days</caption>
        <thead>
          <tr className="h-8 bg-surface-sunken text-left font-display text-label uppercase text-ink-muted">
            <th scope="col" className="px-4 font-normal">Segment</th>
            <th scope="col" className="px-4 font-normal">Read</th>
            <th scope="col" className="px-4 text-right font-normal">Stories</th>
            <th scope="col" className="px-4 text-right font-normal">Longer</th>
            <th scope="col" className="px-4 text-right font-normal">Easing</th>
            <th scope="col" className="px-4 font-normal">Latest lead time quoted</th>
            <th scope="col" className="px-4 font-normal">Latest story</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={r.segment} className="h-10 align-middle hover:bg-surface-sunken">
              <th scope="row" className="whitespace-nowrap px-4 text-left font-medium text-ink">
                {r.segment}
              </th>
              <td className="whitespace-nowrap px-4">
                <Verdict v={r.verdict} />
              </td>
              <td className="px-4 text-right tabular-nums">{r.stories}</td>
              <td className="px-4 text-right tabular-nums">{r.longer}</td>
              <td className="px-4 text-right tabular-nums">{r.easing}</td>
              <td className="whitespace-nowrap px-4">
                {r.quoted ? (
                  <>
                    <span className="tabular-nums text-ink">{r.quoted.weeks.text}</span>
                    <span className="ml-2 text-caption text-ink-muted">
                      {r.quoted.outlet}, {dayMonth(r.quoted.publishedAt)}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-muted">None quoted</span>
                )}
              </td>
              <td className="max-w-[28rem] px-4 py-2">
                {r.latest ? (
                  <a href={r.latest.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-ink underline-offset-2 hover:underline">
                    {r.latest.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-ink-muted">n/a</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FORMAT: Record<LeadIndicator["unit"], Format> = { sd: "decimal", diffusion: "decimal", "usd-millions": "usd-millions" };

function latestText(ind: LeadIndicator): string {
  const v = ind.points[ind.points.length - 1]?.value;
  if (v === undefined) return "n/a";
  if (ind.unit === "usd-millions") return USD_COMPACT.format(v * 1e6);
  return signed(v, ind.unit === "sd" ? 2 : 1);
}

function yearText(ind: LeadIndicator): string | null {
  const c = yearAgo(ind);
  if (c === undefined) return null;
  return ind.unit === "usd-millions" ? `${signed(c * 100, 1)}% on a year ago` : `${signed(c, ind.unit === "sd" ? 2 : 1)} on a year ago`;
}

function IndicatorPanel({ ind }: { ind: LeadIndicator }) {
  const last = ind.points[ind.points.length - 1];
  const rows: Row[] = ind.points.map((p) => ({ label: shortMonth(p.date), v: p.value }));
  const year = yearText(ind);
  return (
    <Panel
      title={ind.label}
      subtitle={ind.detail}
      className="min-w-0"
      footer={
        <SourceLine source={ind.source} asOf={last ? monthYear(last.date) : undefined}>
          <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-ink underline-offset-2 hover:underline">
            Data
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            <span className="sr-only"> for {ind.label} (opens in a new tab)</span>
          </a>
        </SourceLine>
      }
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-figure tabular-nums text-ink">{latestText(ind)}</span>
        {year && <span className="text-caption tabular-nums text-ink-muted">{year}</span>}
      </p>
      <p className="mt-1 text-caption text-ink-muted">{ind.reading}</p>
      <div className="mt-3">
        <SignalLines rows={rows} series={[{ key: "v", name: "Latest", color: VIZ.arrow }]} format={FORMAT[ind.unit]} height={180} zeroLine={ind.unit !== "usd-millions"} />
      </div>
    </Panel>
  );
}

function Reports({ reports }: { reports: PublishedReport[] }) {
  return (
    <ul className="divide-y divide-hairline">
      {reports.map((r, i) => (
        <li key={r.url} className="px-4 py-3">
          <p className="text-caption text-ink-muted">
            {r.publisher}, {r.cadence.toLowerCase()}
            {r.date && `, ${fullDate(r.date)}`}
          </p>
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-start gap-1 text-body text-ink underline-offset-2 hover:underline">
            {r.title}
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {/* One note per publisher: the quarterly editions share it. */}
          {reports[i - 1]?.publisher !== r.publisher && <p className="mt-1 text-caption text-ink-muted">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Server component: several outside sources, so the page streams it in. */
export async function LeadTimesView() {
  const data = await getLeadTimes();
  const { stories, segments, indicators, reports, sources } = data;

  if (!sources.some((s) => s.ok)) {
    return (
      <Panel title="Lead times">
        <ErrorState
          title="None of the public sources could be reached"
          source="Trade-press feeds, GDELT, New York Fed, Philadelphia Fed, US Census Bureau, Sourceability"
          detail="Try again in a few minutes."
          retryHref="/lead-times"
        />
      </Panel>
    );
  }

  const storyRows: StoryRow[] = stories.map((s) => ({
    id: s.id,
    title: s.title,
    url: s.url,
    outlet: s.outlet,
    date: dayMonth(s.publishedAt),
    segments: s.segments,
    way: s.way,
    weeks: s.weeks?.text ?? null,
  }));
  const down = sources.filter((s) => !s.ok).map((s) => s.outlet);
  const storySources = sources.filter((s) => ["Market News feeds", "Supply Chain Dive", "GDELT"].includes(s.outlet) && s.ok).map((s) => s.outlet);

  return (
    <>
      <section aria-labelledby="lead-read">
        <h2 id="lead-read" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>{leadSentence(segments, indicators)}</span>
          <DataChip status="live" />
        </h2>
      </section>

      <Panel
        title="Lead-time direction by segment"
        subtitle="Read from lead-time stories in the last 30 days. A segment needs two stories pointing one way, outnumbering the other way two to one."
        bodyClassName="p-0"
        footer={<SourceLine source={storySources.length ? storySources.join(", ") : "News feeds not responding"} asOf={dayMonth(data.fetchedAt)} />}
      >
        <SegmentTable rows={segments} />
      </Panel>

      {indicators.length > 0 && (
        <section aria-labelledby="pressure-title" className="space-y-3">
          <h2 id="pressure-title" className="font-display text-section-title text-ink">
            Supply pressure
          </h2>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {indicators.map((ind) => (
              <IndicatorPanel key={ind.key} ind={ind} />
            ))}
          </div>
        </section>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Lead-time stories" subtitle="Newest first. Direction and weeks are read from the headline and summary." bodyClassName="p-0">
          <StoryList stories={storyRows} segments={segments.map((s) => s.segment)} />
        </Panel>
        <Panel
          title="Published lead-time reports"
          subtitle="Full figures live with each publisher, whose terms don't allow copying them here."
          bodyClassName="p-0"
        >
          <Reports reports={reports} />
        </Panel>
      </div>

      <nav aria-label="Related pages" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm">
        <span className="font-display text-label uppercase text-ink-muted">Related</span>
        <Link href="/signals" className="text-ink underline-offset-2 hover:underline">
          Economic Signals
        </Link>
        <Link href="/cycle" className="text-ink underline-offset-2 hover:underline">
          Market Cycle
        </Link>
        <Link href="/news" className="text-ink underline-offset-2 hover:underline">
          Market News
        </Link>
      </nav>

      <p className="max-w-[120ch] text-caption text-ink-muted">
        Stories come from the Market News trade-press feeds, Supply Chain Dive and a GDELT news search, kept when they talk about lead times,
        allocation, shortages, backlogs or price increases for components. Segments use the same tags as Market News. A story points longer or easing
        from words such as stretch, tighten or shortage against ease, shorten or glut; weeks are the first figure quoted. Supply-pressure series are the
        New York Fed&apos;s Global Supply Chain Pressure Index, the Philadelphia Fed&apos;s manufacturing survey and the Census Bureau&apos;s M3 survey,
        read through FRED. Recent months are preliminary and get revised. Stories are checked every 15 minutes, series about every six hours.
        {down.length > 0 && ` Not responding: ${down.join(", ")}.`}
      </p>
    </>
  );
}

export function LeadTimesFallback() {
  return (
    <>
      <Panel title="Lead-time direction by segment">
        <LoadingBlock label="Reading lead-time stories…" lines={8} />
      </Panel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {["Global supply chain pressure", "Delivery times", "Unfilled orders"].map((t) => (
          <Panel key={t} title={t}>
            <LoadingBlock label={`Loading ${t.toLowerCase()}…`} lines={4} />
          </Panel>
        ))}
      </div>
    </>
  );
}
