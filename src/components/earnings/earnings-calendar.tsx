import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getEarningsCalendar, TIMING_LABELS, type ReleaseEvent } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, type Cohort } from "@/lib/data/live/earnings-model";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASH, earningsHref, longDate } from "./format";

const TITLE = "Earnings calendar";
const DAY = 86_400_000;

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dayLabel = (d: string) => utc(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Monday of the week `d` falls in, as YYYY-MM-DD. */
function weekStart(d: string): string {
  const date = utc(d);
  const back = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - back * DAY).toISOString().slice(0, 10);
}

function sections(events: ReleaseEvent[], today: string): { label: string; events: ReleaseEvent[] }[] {
  const out: { label: string; events: ReleaseEvent[] }[] = [];
  const due = events.filter((e) => e.status === "due");
  if (due.length) out.push({ label: "Expected by now, not yet filed", events: due });
  const thisWeek = weekStart(today);
  const byWeek = new Map<string, ReleaseEvent[]>();
  for (const e of events.filter((x) => x.status === "estimated")) {
    const w = weekStart(e.date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), e]);
  }
  for (const [w, list] of byWeek) {
    const label = w === thisWeek ? "This week" : `Week of ${utc(w).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
    out.push({ label, events: list });
  }
  const reported = events.filter((e) => e.status === "reported");
  if (reported.length) out.push({ label: "Reported in the last two weeks", events: reported });
  return out;
}

/** Server component: reads every company's filing index, so the page streams it in. */
export async function EarningsCalendar({ company, group }: { company: string; group: Cohort | "all" }) {
  const { events, failed, today } = await getEarningsCalendar();
  const shown = events.filter((e) => group === "all" || e.company.cohort === group);
  const upcoming = shown.filter((e) => e.status === "estimated").length;

  return (
    <Card
      title={TITLE}
      subtitle={`${upcoming} upcoming releases · dates are estimates from each company's release for the same quarter last year`}
      bodyClassName="p-0"
    >
      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">No release dates could be worked out from SEC filings right now.</p>
      ) : (
        <div className="max-h-[26rem] overflow-auto">
          <table className="w-full min-w-[680px] text-xs">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line text-left font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 font-normal">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Company
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Group
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Usual timing
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Status
                </th>
              </tr>
            </thead>
            {sections(shown, today).map((section) => (
              <tbody key={section.label}>
                <tr className="border-b border-line bg-canvas">
                  <th scope="colgroup" colSpan={5} className="px-4 py-1.5 text-left font-display text-2xs uppercase tracking-widest text-muted">
                    {section.label} · {section.events.length}
                  </th>
                </tr>
                {section.events.map((e) => (
                  <tr
                    key={`${e.company.slug}-${e.status}`}
                    className={cn("border-b border-line last:border-b-0", e.company.slug === company ? "bg-avnet-green/10" : "hover:bg-canvas")}
                  >
                    <td className="whitespace-nowrap px-4 py-1.5 tabular text-ink">
                      <time dateTime={e.date}>{dayLabel(e.date)}</time>
                    </td>
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">
                      <Link
                        href={earningsHref(e.company.slug, group)}
                        className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                      >
                        {e.company.slug === "avnet" && <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />}
                        {e.company.name}
                      </Link>
                    </th>
                    <td className="px-3 py-1.5 text-muted">{COHORT_LABELS[e.company.cohort]}</td>
                    <td className="px-3 py-1.5 text-muted">{e.timing ? TIMING_LABELS[e.timing] : DASH}</td>
                    <td className="px-3 py-1.5 text-muted">
                      {e.status === "reported" && e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark"
                        >
                          Reported · 8-K
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <>
                          <span className="rounded border border-dashed border-accent-yellow px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-ink">
                            Estimate
                          </span>
                          {e.basis && (
                            <span className="ml-2">
                              {e.fromLastYear ? "last year" : "one quarter after"} {longDate(e.basis)}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      <p className="border-t border-line px-4 py-2 text-2xs text-muted">
        Estimates are not company-confirmed dates. Each one takes the earnings 8-K filed for the same quarter a year earlier and
        moves it forward 364 days (or, with no year-ago filing, adds one quarter to the latest release); timing is when that filing reached the SEC, in US Eastern time. Dates are replaced by the
        actual filing once a company reports.
        {failed.length > 0 && ` Could not load: ${failed.join(", ")}.`}
      </p>
    </Card>
  );
}

export function EarningsCalendarFallback() {
  return (
    <Card title={TITLE} subtitle="Reading each company's filing history from SEC EDGAR.">
      <div className="space-y-2" role="status" aria-label="Loading the earnings calendar">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
