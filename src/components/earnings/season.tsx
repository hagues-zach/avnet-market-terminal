import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cachedCommentary } from "@/lib/ai/commentary";
import { getEarningsCalendar, type ReleaseEvent } from "@/lib/data/live/earnings-calendar";
import { getPeerRows } from "@/lib/data/live/earnings";
import { isUsFiler } from "@/lib/data/live/earnings-model";
import { justReported, season } from "@/lib/earnings/season";
import { KpiTile } from "@/components/ui/kpi-tile";
import { ExplainMedianGrowth } from "@/components/explain/cycle";
import { Panel } from "@/components/ui/panel";
import { EmptyState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { NA, format } from "./format";
import { SoonRows, type Watch } from "./soon-rows";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const shortDate = (d: string) => utc(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const pct = (v: number | undefined) => (v === undefined ? NA : `${(v * 100).toFixed(1)}%`);
const TH = "h-control whitespace-nowrap px-2 font-display text-label font-normal uppercase text-ink-muted";

function CompanyLink({ event }: { event: ReleaseEvent }) {
  const c = event.company;
  return (
    <Link href={`/network/${c.slug}`} className="inline-flex items-center gap-1.5 text-ink underline-offset-2 hover:underline">
      {c.slug === "avnet" && <span className="h-2.5 w-2.5 shrink-0 bg-viz-avnet" aria-hidden />}
      {c.name}
    </Link>
  );
}


/** Server component: every company's filing index and latest quarter. */
export async function SeasonOverview() {
  const [calendar, peers] = await Promise.all([getEarningsCalendar(), getPeerRows()]);
  // US filers only for the MVP (docs/mvp-plan.md).
  const { failed, today } = calendar;
  const events = calendar.events.filter((e) => isUsFiler(e.company));
  const rows = peers.filter((r) => isUsFiler(r.company));
  const s = season(rows, events, today);
  const recent = justReported(events, rows, s.quarter);
  // What to watch for each company about to report: its last filed quarter, and the guidance from its cached release summary.
  const soon = [...s.due, ...s.thisWeek, ...s.nextWeek];
  const latest = new Map(rows.map((r) => [r.company.slug, r.latest]));
  const watch: Record<string, Watch> = Object.fromEntries(
    await Promise.all(
      soon.map(async (e) => {
        const c = await cachedCommentary(e.company).catch(() => null);
        return [e.company.slug, { latest: latest.get(e.company.slug) ?? null, guidance: c?.digest.guidance || undefined, filed: c?.filed }] as const;
      }),
    ),
  );
  const next = (label: string, e: ReleaseEvent | undefined) =>
    e ? `${label} ${shortDate(e.date)}${e.status === "estimated" ? " (estimated)" : e.status === "due" ? " (due)" : ""}` : `${label} not found`;

  return (
    <section aria-labelledby="season" className="space-y-4">
      <h2 id="season" className="text-pretty text-xl leading-snug text-ink">
        {s.quarter} season: {s.reported.length} of {s.total} companies have filed the quarter
        {s.medianGrowth !== undefined && <>, with median revenue growth of {format("growth", s.medianGrowth)}</>}.
      </h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label="Filed the quarter" value={`${s.reported.length} of ${s.total}`} note={s.quarter} source={{ status: "live", label: "SEC" }} />
        <KpiTile
          label="Median revenue growth"
          value={format("growth", s.medianGrowth)}
          note="of those filed"
          source={{ status: "live", label: "SEC" }}
          explain={
            <ExplainMedianGrowth
              companies={s.reported.flatMap((r) =>
                r.latest?.values.revenueYoY === undefined ? [] : [{ slug: r.company.slug, name: r.company.name, growth: r.latest.values.revenueYoY }],
              )}
              quarter={s.quarter}
              total={s.total}
            />
          }
        />
        <KpiTile label="Reporting this week" value={String(s.thisWeek.length)} note={s.due.length ? `${s.due.length} overdue` : "estimated dates"} />
        <KpiTile
          label="Next for Avnet"
          value={s.next.avnet ? shortDate(s.next.avnet.date) : NA}
          note={s.next.avnet?.status === "estimated" ? "estimated" : undefined}
          asOf={next("Arrow", s.next.arrow)}
        />
      </div>

      <Panel
        title="Earnings calendar"
        subtitle="All companies. Dates are estimated from each company's release for the same quarter last year"
        bodyClassName="p-0"
        deck={null}
        footer={failed.length > 0 ? <span>Could not read: {failed.join(", ")}</span> : undefined}
      >
        <div className="grid xl:grid-cols-2 xl:divide-x xl:divide-hairline">
          {/* Scrolls on a busy week; focusable so the list can be scrolled from the keyboard. */}
          <div role="region" aria-label="Reporting soon" tabIndex={0} className="max-h-[30rem] overflow-auto px-2 pb-3">
            <h3 className="px-2 pt-3 font-display text-label uppercase text-ink-muted">Reporting soon</h3>
            {[...s.due, ...s.thisWeek, ...s.nextWeek].length === 0 ? (
              <EmptyState title="No releases expected in the next two weeks" />
            ) : (
              <table className="w-full border-collapse font-body text-table">
                <caption className="sr-only">Earnings releases expected this week and next</caption>
                <SoonRows title="Expected by now" events={s.due} watch={watch} />
                <SoonRows title="This week" events={s.thisWeek} watch={watch} />
                <SoonRows title="Next week" events={s.nextWeek} watch={watch} />
              </table>
            )}
          </div>
          <div
            role="region"
            aria-label="Just reported"
            tabIndex={0}
            className="max-h-[30rem] overflow-auto border-t border-hairline px-2 pb-3 xl:border-t-0"
          >
            <h3 className="px-2 pt-3 font-display text-label uppercase text-ink-muted">Just reported</h3>
            {recent.length === 0 ? (
              <EmptyState title="No earnings releases in the last two weeks" />
            ) : (
              <table className="mt-1 w-full border-collapse font-body text-table">
                <caption className="sr-only">Earnings releases filed in the last two weeks</caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className={cn(TH, "text-left")}>
                      Date
                    </th>
                    <th scope="col" className={cn(TH, "text-left")}>
                      Company
                    </th>
                    <th scope="col" className={cn(TH, "text-right")}>
                      Revenue YoY
                    </th>
                    <th scope="col" className={cn(TH, "text-right")}>
                      Op margin
                    </th>
                    <th scope="col" className={cn(TH, "text-right")}>
                      Release
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(({ event: e, quarter }) => (
                    <tr key={e.company.slug} className="border-b border-hairline last:border-b-0">
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-ink-muted">
                        <time dateTime={e.date}>{shortDate(e.date)}</time>
                      </td>
                      <th scope="row" className="px-2 py-1.5 text-left font-normal">
                        <CompanyLink event={e} />
                      </th>
                      {quarter ? (
                        <>
                          <td className="px-2 py-1.5 text-right tabular-nums text-ink">{format("growth", quarter.values.revenueYoY)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-ink">{pct(quarter.values.operatingMargin)}</td>
                        </>
                      ) : (
                        <td
                          colSpan={2}
                          className="px-2 py-1.5 text-right text-ink-muted"
                          title="The earnings release is out; the quarter's figures arrive with the 10-Q"
                        >
                          10-Q not filed yet
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-right">
                        {e.url ? (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-ink underline-offset-2 hover:underline"
                          >
                            8-K
                            <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                            <span className="sr-only"> for {e.company.name} (opens SEC EDGAR)</span>
                          </a>
                        ) : (
                          NA
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}

export function SeasonFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Panel
        title="Earnings calendar"
        subtitle="Reading every company's filing index from SEC EDGAR. The first load after a refresh can take a minute."
        deck={null}
      >
        <LoadingBlock label="Loading the earnings calendar…" lines={6} />
      </Panel>
    </div>
  );
}
