import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getEarningsCalendar, type ReleaseEvent, type Timing } from "@/lib/data/live/earnings-calendar";
import { getPeerRows } from "@/lib/data/live/earnings";
import { COHORT_LABELS, type Cohort } from "@/lib/data/live/earnings-model";
import { justReported, season } from "@/lib/earnings/season";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel } from "@/components/ui/panel";
import { EmptyState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { NA, earningsHref, format } from "./format";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dayLabel = (d: string) => utc(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const shortDate = (d: string) => utc(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const pct = (v: number | undefined) => (v === undefined ? NA : `${(v * 100).toFixed(1)}%`);
const SHORT_TIMING: Record<Timing, string> = { before: "Before open", during: "Market hours", after: "After close" };
const TH = "h-control whitespace-nowrap px-2 font-display text-label font-normal uppercase text-ink-muted";

function CompanyLink({ event, group, current }: { event: ReleaseEvent; group: Cohort | "all"; current: string }) {
  const c = event.company;
  return (
    <Link
      href={earningsHref(c.slug, group)}
      scroll={false}
      aria-current={c.slug === current ? "true" : undefined}
      className={cn("inline-flex items-center gap-1.5 text-ink underline-offset-2 hover:underline", c.slug === current && "font-semibold")}
    >
      {c.slug === "avnet" && <span className="h-2.5 w-2.5 shrink-0 bg-viz-avnet" aria-hidden />}
      {c.name}
    </Link>
  );
}

function SoonRows({ title, events, group, current }: { title: string; events: ReleaseEvent[]; group: Cohort | "all"; current: string }) {
  if (!events.length) return null;
  return (
    <tbody>
      <tr className="border-b border-hairline">
        <th scope="colgroup" colSpan={5} className="px-2 pb-1 pt-3 text-left font-display text-card-title font-normal text-ink">
          {title} <span className="text-ink-muted">{events.length}</span>
        </th>
      </tr>
      {events.map((e) => (
        <tr
          key={`${e.company.slug}-${e.date}`}
          className={cn("border-b border-hairline last:border-b-0", e.company.slug === current && "bg-surface-sunken")}
        >
          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-ink">
            <time dateTime={e.date}>{dayLabel(e.date)}</time>
          </td>
          <th scope="row" className="px-2 py-1.5 text-left font-normal">
            <CompanyLink event={e} group={group} current={current} />
          </th>
          <td className="px-2 py-1.5 text-ink-muted">
            {COHORT_LABELS[e.company.cohort]}
          </td>
          <td className="whitespace-nowrap px-2 py-1.5 text-ink-muted">{e.timing ? SHORT_TIMING[e.timing] : ""}</td>
          <td className="whitespace-nowrap px-2 py-1.5 text-right text-ink-muted" title={e.basis ? `Based on ${e.basis}` : undefined}>
            {e.status === "due" ? "due, not filed" : "estimated"}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

/** Server component: every company's filing index and latest quarter. */
export async function SeasonOverview({ company, group }: { company: string; group: Cohort | "all" }) {
  const [{ events, failed, today }, rows] = await Promise.all([getEarningsCalendar(), getPeerRows()]);
  const s = season(rows, events, today);
  const recent = justReported(events, rows, s.quarter);
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
                <SoonRows title="Expected by now" events={s.due} group={group} current={company} />
                <SoonRows title="This week" events={s.thisWeek} group={group} current={company} />
                <SoonRows title="Next week" events={s.nextWeek} group={group} current={company} />
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
                    <tr
                      key={e.company.slug}
                      className={cn("border-b border-hairline last:border-b-0", e.company.slug === company && "bg-surface-sunken")}
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-ink-muted">
                        <time dateTime={e.date}>{shortDate(e.date)}</time>
                      </td>
                      <th scope="row" className="px-2 py-1.5 text-left font-normal">
                        <CompanyLink event={e} group={group} current={company} />
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
      >
        <LoadingBlock label="Loading the earnings calendar…" lines={6} />
      </Panel>
    </div>
  );
}
