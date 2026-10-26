import { cache } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCycle } from "@/lib/data/live/cycle";
import { getLiveNews } from "@/lib/data/live/news";
import { getEarningsCalendar, TIMING_LABELS } from "@/lib/data/live/earnings-calendar";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { getMoves } from "@/lib/line-cards/moves";
import { getNewsAngles } from "@/lib/ai/news-angles";
import { getAvnet } from "@/lib/avnet";
import { shellSpecs } from "@/lib/shells/specs";
import { buildFeed } from "@/lib/start/feed";
import type { Role } from "@/lib/start/roles";
import { Panel, SourceLine } from "@/components/ui/panel";
import { HighlightBar } from "@/components/ui/highlight-bar";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { Chip, DataChip } from "@/components/ui/chip";
import { EmptyState, ErrorState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { GrowthChart } from "./growth-chart";

// One fetch per request, shared by the banner and the growth chart.
const cycleData = cache(getCycle);

const shortDate = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));

/* ---------- Cycle ---------- */

/** "CY26 Q2" or "CY2026 Q2" → "Q2 '26". */
const quarterLabel = (label: string) => label.replace(/^CY(?:20)?(\d{2}) (Q\d)$/, "$2 '$1");
/** "CY26 Q2" → "CY2026 Q2". */
const fullQuarter = (label: string) => label.replace(/^CY(\d{2}) /, "CY20$1 ");

export async function CycleBanner() {
  try {
    const cycle = await cycleData();
    if (!cycle.phase) return null;
    return (
      <HighlightBar className="max-w-5xl">
        The semiconductor cycle is in {cycle.phase.toLowerCase()} ({fullQuarter(cycle.latest)}), from {COMPANIES.length} companies&apos;
        SEC filings.
      </HighlightBar>
    );
  } catch {
    return null;
  }
}

export function CycleBannerFallback() {
  return <Skeleton className="h-10 max-w-3xl" />;
}

export async function GrowthCard() {
  let points: { label: string; growth: number }[] = [];
  let latest = "";
  try {
    const cycle = await cycleData();
    latest = cycle.latest;
    points = cycle.supply
      .filter((p): p is typeof p & { growth: number } => p.growth !== undefined)
      .slice(-8)
      .map((p) => ({ label: quarterLabel(p.label), growth: p.growth }));
  } catch {
    return (
      <Panel title="Supply-chain revenue growth">
        <ErrorState title="Couldn't load the cycle data" source="SEC EDGAR" detail="Try again in a few minutes." />
      </Panel>
    );
  }
  return (
    <Panel
      title="Supply-chain revenue growth"
      subtitle="Year on year, combined across semiconductor and component makers"
      actions={<DataChip status="live" label="SEC EDGAR" />}
      footer={
        <SourceLine source={`SEC filings, ${COMPANIES.length} companies`} asOf={fullQuarter(latest)}>
          <Link href="/cycle" className="ml-auto text-ink underline-offset-2 hover:underline">
            Market Cycle
          </Link>
        </SourceLine>
      }
    >
      {points.length > 1 ? (
        <div className="h-44">
          <GrowthChart data={points} />
        </div>
      ) : (
        <EmptyState title="Not enough reported quarters yet" />
      )}
    </Panel>
  );
}

export function PanelFallback({ title, lines = 4 }: { title: string; lines?: number }) {
  return (
    <Panel title={title}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={lines} />
    </Panel>
  );
}

/* ---------- What changed ---------- */

export async function FeedCard({ role }: { role: Role }) {
  const [news, moves, calendar] = await Promise.allSettled([getLiveNews(), getMoves(), getEarningsCalendar()]);
  const articles = news.status === "fulfilled" ? news.value.articles : [];
  const angles = articles.length ? await getNewsAngles(articles).catch(() => null) : null;
  const failed = [news.status === "rejected" && "news", moves.status === "rejected" && "line card moves", calendar.status === "rejected" && "earnings"].filter(
    Boolean,
  ) as string[];

  const items = buildFeed({
    role: role.id,
    articles,
    angles,
    moves: moves.status === "fulfilled" ? moves.value.moves : [],
    releases: calendar.status === "fulfilled" ? calendar.value.events : [],
  });

  return (
    <Panel
      title="What changed this week"
      subtitle={`Ranked for ${role.plural}`}
      footer={
        <>
          <span>News, line card moves and earnings releases from the last seven days{angles?.status === "off" ? ". Claude is off, so stories show without angles" : ""}.</span>
          <Link href="/news" className="ml-auto text-ink underline-offset-2 hover:underline">
            All market news
          </Link>
        </>
      }
    >
      {failed.length > 0 && <p className="mb-2 text-caption text-negative">Couldn&apos;t load {failed.join(" or ")}; showing the rest.</p>}
      {items.length === 0 ? (
        <EmptyState title="Nothing new this week" body="No stories, line card moves or earnings releases in the last seven days." />
      ) : (
        <ul className="divide-y divide-hairline">
          {items.map((it) => (
            <li key={it.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
              <Chip className="mt-0.5 w-[4.75rem] shrink-0 justify-center">{it.type}</Chip>
              <div className="min-w-0 flex-1">
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-body-sm font-medium text-ink underline-offset-2 hover:underline">
                  {it.title}
                </a>
                {it.why && <p className="mt-0.5 line-clamp-2 text-caption text-ink-muted">{it.why}</p>}
              </div>
              <div className="w-28 shrink-0 text-right text-caption text-ink-muted">
                <div>{it.source}</div>
                <div>{shortDate(it.date)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Reporting soon ---------- */

export async function ReportingCard() {
  let rows: { slug: string; name: string; date: string; timing: string; due: boolean }[] = [];
  try {
    const cal = await getEarningsCalendar();
    const today = new Date(`${cal.today}T00:00:00Z`).getTime();
    const end = today + 7 * 86_400_000;
    // Releases more than three days overdue belong on the Earnings page, not "this week".
    const start = today - 3 * 86_400_000;
    rows = cal.events
      .filter((e) => {
        const t = new Date(`${e.date}T00:00:00Z`).getTime();
        return e.status !== "reported" && t <= end && t >= start;
      })
      .slice(0, 6)
      .map((e) => ({
        slug: e.company.slug,
        name: e.company.name,
        date: e.date,
        timing: e.timing ? TIMING_LABELS[e.timing].replace("market ", "") : "",
        due: e.status === "due",
      }));
  } catch {
    return (
      <Panel title="Reporting this week">
        <ErrorState title="Couldn't load the earnings calendar" source="SEC EDGAR" />
      </Panel>
    );
  }
  return (
    <Panel
      title="Reporting this week"
      subtitle="Estimated from each company's release a year ago"
      actions={<DataChip status="live" label="SEC EDGAR" />}
      footer={
        <Link href="/earnings" className="ml-auto text-ink underline-offset-2 hover:underline">
          Earnings calendar
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState title="No releases expected in the next seven days" />
      ) : (
        <table className="w-full text-table">
          <caption className="sr-only">Companies expected to report in the next seven days</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.slug}-${r.date}`} className="border-b border-hairline last:border-b-0">
                <td className="h-control w-16 whitespace-nowrap tabular-nums text-ink-muted">{shortDate(`${r.date}T12:00:00Z`)}</td>
                <td className="h-control">
                  <Link href={`/network/${r.slug}`} className="text-ink underline-offset-2 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="h-control whitespace-nowrap text-right text-caption text-ink-muted">{r.due ? "Due, not filed yet" : r.timing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

/* ---------- Avnet and next steps ---------- */

export async function AvnetCard() {
  const m = await getAvnet();
  const avnetKpis = shellSpecs(m).START.sections.find((s) => s.kind === "kpis");
  if (!avnetKpis || avnetKpis.kind !== "kpis") return null;
  return (
    <Panel title="Avnet this quarter" subtitle={avnetKpis.subtitle?.replace(" · mock", "")} actions={<DataChip status={m.status} />}>
      <dl className="divide-y divide-hairline">
        {avnetKpis.items.map((k) => (
          <div key={k.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt className="text-body-sm text-ink-muted">{k.label}</dt>
            <dd className="flex items-baseline gap-2">
              <span className="font-display text-section-title tabular-nums text-ink">{k.value}</span>
              {k.change && <span className="whitespace-nowrap text-caption text-ink-muted">{k.change}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <HookupMarker ids={avnetKpis.hookups} />
      </div>
    </Panel>
  );
}

export function NextSteps({ role }: { role: Role }) {
  return (
    <Panel title={role.id === "everyone" ? "Where to start" : "Your next steps"} subtitle={role.id === "everyone" ? "One page for each role" : undefined}>
      <ol className="divide-y divide-hairline">
        {role.steps.map((s, i) => (
          <li key={s.href}>
            <Link href={s.href} className="group flex items-center gap-3 py-2.5 first:pt-0">
              <span className="w-4 shrink-0 font-display text-section-title tabular-nums text-ink-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-ink group-hover:underline underline-offset-2">{s.title}</span>
                <span className="block text-caption text-ink-muted">{s.page}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
