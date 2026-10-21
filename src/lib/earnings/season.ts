import type { ReleaseEvent } from "@/lib/data/live/earnings-calendar";
import type { Cohort, Company, Quarter } from "@/lib/data/live/earnings-model";

// The earnings season, worked out from the calendar and each company's latest
// filed quarter. Pure, so the page and its tests read the same rules. Dates are
// YYYY-MM-DD in US Eastern, as the calendar gives them.

const DAY = 86_400_000;
const utc = (d: string) => Date.parse(`${d}T00:00:00Z`);

export interface PeerRow {
  company: Company;
  latest: Quarter | null;
}

/** The calendar quarter companies are reporting now: the last one to have ended before `today`. */
export function seasonQuarter(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const q = Math.floor((m - 1) / 3); // 0-3, the quarter today falls in
  const year = q === 0 ? y - 1 : y;
  const last = q === 0 ? 4 : q;
  return `CY${String(year).slice(-2)} Q${last}`;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Monday of the week `d` falls in. */
export function weekStart(d: string): string {
  const t = utc(d);
  const back = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - back * DAY).toISOString().slice(0, 10);
}

export interface Season {
  quarter: string;
  /** Companies whose latest filed quarter is the season's quarter. */
  reported: PeerRow[];
  total: number;
  medianGrowth?: number;
  thisWeek: ReleaseEvent[];
  nextWeek: ReleaseEvent[];
  /** Expected by now but no earnings 8-K filed yet. */
  due: ReleaseEvent[];
  next: { avnet?: ReleaseEvent; arrow?: ReleaseEvent };
}

export function season(rows: PeerRow[], events: ReleaseEvent[], today: string): Season {
  const quarter = seasonQuarter(today);
  const reported = rows.filter((r) => r.latest?.calendarLabel === quarter);
  const growth = reported.map((r) => r.latest!.values.revenueYoY).filter((v): v is number => v !== undefined);
  const week = weekStart(today);
  const nextWeekStart = new Date(utc(week) + 7 * DAY).toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.status === "estimated");
  const nextFor = (slug: string) => events.find((e) => e.company.slug === slug && e.status !== "reported");
  return {
    quarter,
    reported,
    total: rows.length,
    medianGrowth: median(growth),
    thisWeek: upcoming.filter((e) => weekStart(e.date) === week),
    nextWeek: upcoming.filter((e) => weekStart(e.date) === nextWeekStart),
    due: events.filter((e) => e.status === "due"),
    next: { avnet: nextFor("avnet"), arrow: nextFor("arrow") },
  };
}

export interface JustReported {
  event: ReleaseEvent;
  /** The quarter's figures once the 10-Q is in; the earnings 8-K often comes first. */
  quarter: Quarter | null;
}

/** Earnings releases filed in the last two weeks, newest first, with the quarter's figures where they have been filed. */
export function justReported(events: ReleaseEvent[], rows: PeerRow[], quarter: string): JustReported[] {
  const latest = new Map(rows.map((r) => [r.company.slug, r.latest]));
  return events
    .filter((e) => e.status === "reported")
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((event) => {
      const q = latest.get(event.company.slug) ?? null;
      return { event, quarter: q?.calendarLabel === quarter ? q : null };
    });
}

/** A group's latest quarters, and its median on each measure. */
export function groupOf(rows: PeerRow[], group: Cohort | "all"): PeerRow[] {
  return rows.filter((r) => group === "all" || r.company.cohort === group);
}

export function groupMedian(rows: PeerRow[], metric: keyof Quarter["values"]): number | undefined {
  return median(rows.map((r) => r.latest?.values[metric]).filter((v): v is number => v !== undefined));
}

/** The quarter ending about a year before `q`. */
export function yearAgo(quarters: Quarter[], q: Quarter): Quarter | undefined {
  const target = utc(q.end) - 364 * DAY;
  return quarters.find((p) => Math.abs(utc(p.end) - target) <= 20 * DAY);
}
