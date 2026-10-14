import { COMPANIES, type Company } from "./earnings-model";

// Earnings release calendar. SEC data has no forward-looking dates, so upcoming
// releases are ESTIMATES: companies report on a very regular cadence, so the next
// release is projected from the earnings 8-K (Item 2.02) filed for the same
// quarter a year earlier. Past releases are actual filings. Server-only.

const REVALIDATE_SECONDS = 6 * 60 * 60;
const USER_AGENT = "MarketTerminal/0.1 (news reader)";
const TIMEOUT_MS = 15_000;
// SEC asks for no more than 10 requests/second; stay well under it.
const BATCH = 6;
const DAY = 86_400_000;
const RECENT_DAYS = 14;

export type Timing = "before" | "during" | "after";

export const TIMING_LABELS: Record<Timing, string> = {
  before: "Before market open",
  during: "During market hours",
  after: "After market close",
};

export interface ReleaseEvent {
  company: Company;
  date: string; // YYYY-MM-DD, US Eastern
  /**
   * estimated — projected, still ahead.
   * due — the projected date has passed with no earnings 8-K filed yet.
   * reported — an actual earnings 8-K, filed in the last two weeks.
   */
  status: "estimated" | "due" | "reported";
  timing: Timing | null;
  /** For estimates: the prior release the projection is based on. */
  basis?: string;
  /** False when no year-ago release was found and the date is just last release + 91 days. */
  fromLastYear?: boolean;
  /** For reported releases: the 8-K on EDGAR. */
  url?: string;
}

export interface EarningsCalendar {
  events: ReleaseEvent[]; // soonest first; reported releases newest first at the end
  failed: string[];
  today: string; // YYYY-MM-DD, US Eastern
}

interface Submissions {
  filings?: {
    recent?: {
      form: string[];
      items: string[];
      acceptanceDateTime: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
}

interface Release {
  date: string;
  timing: Timing;
  url: string;
}

const eastern = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A UTC instant as a US Eastern calendar date and minutes past midnight. */
function inEastern(instant: Date): { date: string; minutes: number } {
  const p = Object.fromEntries(eastern.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
const gap = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);

async function releases(company: Company): Promise<Release[]> {
  const res = await fetch(`https://data.sec.gov/submissions/CIK${String(company.cik).padStart(10, "0")}.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`SEC returned ${res.status} for ${company.name}`);
  const r = ((await res.json()) as Submissions).filings?.recent;
  if (!r) return [];
  const out: Release[] = [];
  for (let i = 0; i < r.form.length; i++) {
    // Item 2.02 = "Results of Operations and Financial Condition": the earnings release.
    if (r.form[i] !== "8-K" || !(r.items[i] ?? "").split(",").includes("2.02")) continue;
    const accepted = new Date(r.acceptanceDateTime[i]);
    if (Number.isNaN(accepted.getTime())) continue;
    const { date, minutes } = inEastern(accepted);
    out.push({
      date,
      timing: minutes < 9 * 60 + 30 ? "before" : minutes >= 16 * 60 ? "after" : "during",
      url: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${r.accessionNumber[i].replace(/-/g, "")}/${r.primaryDocument[i]}`,
    });
  }
  // Newest first; drop same-quarter repeats (preliminary results, amendments).
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out.filter((rel, i) => i === 0 || gap(rel.date, out[i - 1].date) > 30);
}

function eventsFor(company: Company, past: Release[], today: string): ReleaseEvent[] {
  const events: ReleaseEvent[] = [];
  const last = past[0];
  if (!last) return events;
  if (gap(last.date, today) <= RECENT_DAYS) {
    events.push({ company, date: last.date, status: "reported", timing: last.timing, url: last.url });
  }
  // The release for the same quarter last year sits about three quarters before the
  // latest one. Projecting it forward 364 days keeps the same weekday.
  const lastYear = past.find((p) => Math.abs(gap(p.date, last.date) - 273) <= 25);
  const date = lastYear ? addDays(lastYear.date, 364) : addDays(last.date, 91);
  events.push({
    company,
    date,
    status: date < today ? "due" : "estimated",
    timing: (lastYear ?? last).timing,
    basis: (lastYear ?? last).date,
    fromLastYear: Boolean(lastYear),
  });
  return events;
}

export async function getEarningsCalendar(): Promise<EarningsCalendar> {
  const today = inEastern(new Date()).date;
  const events: ReleaseEvent[] = [];
  const failed: string[] = [];
  for (let i = 0; i < COMPANIES.length; i += BATCH) {
    const batch = COMPANIES.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(releases));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") events.push(...eventsFor(batch[j], s.value, today));
      else failed.push(batch[j].name);
    });
  }
  const upcoming = events.filter((e) => e.status !== "reported").sort((a, b) => a.date.localeCompare(b.date));
  const reported = events.filter((e) => e.status === "reported").sort((a, b) => b.date.localeCompare(a.date));
  return { events: [...upcoming, ...reported], failed, today };
}

/** The next expected release for one company, or null when it cannot be worked out. */
export async function getNextRelease(slug: string): Promise<ReleaseEvent | null> {
  const company = COMPANIES.find((c) => c.slug === slug);
  if (!company) return null;
  try {
    const events = eventsFor(company, await releases(company), inEastern(new Date()).date);
    return events.find((e) => e.status !== "reported") ?? null;
  } catch {
    return null;
  }
}
