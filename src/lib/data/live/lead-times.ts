import * as XLSX from "xlsx";
import { getLiveNews, titleKey, urlKey } from "./news";
import { parseFeed } from "./rss";
import { fetchText, type LiveArticle, type SourceStatus } from "./shared";
import { SEGMENT_LABELS, isOnTopic, tagArticle } from "./tagging";

// Lead Times & Signals on public data. Server-only. Three kinds of source, each
// fetched on its own so one outage never blanks the page:
//
// 1. Lead-time stories: the Market News feeds, Supply Chain Dive and a GDELT search, screened for
//    lead-time language, tagged by segment, read for a direction (lengthening or
//    easing) and any "N weeks" figure quoted in the headline or snippet.
// 2. Supply-pressure series: the New York Fed's Global Supply Chain Pressure Index,
//    the Philadelphia Fed's delivery-time index, and Census
//    unfilled orders for computers and electronic products (the last three from FRED).
// 3. Published reports: links to the latest Sourceability quarterly highlights, plus
//    fixed links to ECIA and TrustedParts. Their figures are never copied: both
//    sites' terms forbid reproducing them (and ECIA's forbid automated access), so
//    the page reads only Sourceability's public list of titles and dates.

const SERIES_REVALIDATE_SECONDS = 6 * 60 * 60;
const SERIES_TIMEOUT_MS = 30_000;
const GDELT_TIMEOUT_MS = 4000;
const MONTHS_KEPT = 36;
const STORY_MAX_AGE_DAYS = 30;
const MAX_STORIES = 80;
const REPORTS_KEPT = 4;
const DAY = 86_400_000;

// ---- Stories ----

export type LeadWay = "longer" | "easing";

export interface QuotedWeeks {
  low: number;
  high: number;
  /** Normalized, e.g. "40-52 weeks". */
  text: string;
}

export interface LeadStory {
  id: string;
  title: string;
  summary: string;
  outlet: string;
  url: string;
  publishedAt: string; // ISO
  segments: string[];
  suppliers: string[];
  way: LeadWay | null;
  weeks: QuotedWeeks | null;
}

/** Language that says a story is about lead times or supply tightness. */
const LEAD_TERMS =
  /\blead[- ]?times?\b|\ballocation\b|\b(?<!(?:talent|labor|labour|worker|staff|staffing|skills?|housing) )shortages?\b|\bsold[- ]out\b|\bbacklogs?\b|\bdelivery (times?|delays?)\b|\b(supply|memory|chip|component|capacity) (crunch|squeeze|constraints?|tightness)\b|\btight(er|ening)? supply\b|\bsupply (is |remains |stays )?tight\b|\bprice (hikes?|increases?)\b|\braises? prices\b/i;

/** Without a segment or supplier tag, a story must still be about chips or components. */
const COMPONENT_TERMS = /\b(chips?|semiconductors?|components?|electronics?|distributors?)\b/i;

const LONGER =
  /\b(lengthen\w*|stretch\w*|extend\w*|longer|ris(e|es|ing)|rose|climb\w*|surg\w*|soar\w*|jump\w*|spik\w*|tighten\w*|tight|(?<!(?:talent|labor|labour|worker|staff|staffing|skills?|housing) )shortages?|allocation|sold[- ]out|price (hikes?|increases?)|raises? prices|crunch|squeeze)\b/i;
const EASING =
  /\b(shorten\w*|eas(e|es|ed|ing)|improv\w*|normali[sz]\w*|loosen\w*|fall(s|ing)?|fell|declin\w*|drop\w*|glut|oversupply|excess inventory|price cuts?|cuts? prices|stabili[sz]\w*|recover\w*)\b/i;

/** True when the text is a lead-time or supply-tightness story about components. */
export function isLeadTimeStory(text: string, tags = tagArticle(text)): boolean {
  return LEAD_TERMS.test(text) && (isOnTopic(tags) || COMPONENT_TERMS.test(text));
}

function wayOf(text: string): LeadWay | null {
  const longer = LONGER.test(text);
  const easing = EASING.test(text);
  return longer === easing ? null : longer ? "longer" : "easing";
}

/** The direction a story points, from its headline, or from the snippet when the headline is mixed or silent. */
export function leadWay(title: string, summary = ""): LeadWay | null {
  return wayOf(title) ?? (summary ? wayOf(summary) : null);
}

const WEEKS = /\b(\d{1,3})(?:\s*(?:-|–|—|to)\s*(\d{1,3}))?(?:\s*|-)(?:weeks?|wks?)\b/i;

/** The first lead time quoted in weeks: "52 weeks", "40-52 weeks", "16 to 20 weeks". Nonsense (over two years) is ignored. */
export function quotedWeeks(text: string): QuotedWeeks | null {
  const m = text.match(WEEKS);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  if (low < 1 || high > 104) return null;
  return { low, high, text: low === high ? `${low} weeks` : `${low}-${high} weeks` };
}

/** A news article as a lead-time story, or null when it isn't one. */
export function toLeadStory(a: Pick<LiveArticle, "id" | "title" | "summary" | "outlet" | "url" | "publishedAt" | "segments" | "suppliers">): LeadStory | null {
  const text = `${a.title}\n${a.summary}`;
  const tags = { segments: a.segments, suppliers: a.suppliers, customers: [], endMarkets: [], regions: [] };
  if (!isLeadTimeStory(text, tags)) return null;
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    outlet: a.outlet,
    url: a.url,
    publishedAt: a.publishedAt,
    segments: a.segments,
    suppliers: a.suppliers,
    way: leadWay(a.title, a.summary),
    weeks: quotedWeeks(a.title) ?? quotedWeeks(a.summary),
  };
}

/** A general supply-chain feed: only its lead-time stories about components are kept. */
const SUPPLY_CHAIN_DIVE = "https://www.supplychaindive.com/feeds/news/";

/** An RSS or Atom feed as tagged articles. */
export function feedArticles(outlet: string, xml: string): LiveArticle[] {
  return parseFeed(xml).flatMap((item) =>
    item.publishedAt
      ? [{ id: item.url, kind: "news" as const, title: item.title, summary: item.snippet, outlet, url: item.url, publishedAt: item.publishedAt, ...tagArticle(`${item.title}\n${item.snippet}`) }]
      : [],
  );
}

const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?" +
  new URLSearchParams({
    query: '("lead times" OR "lead time" OR allocation OR shortage) (semiconductor OR chip OR "electronic components") sourcelang:english',
    mode: "artlist",
    format: "json",
    maxrecords: "75",
    timespan: `${STORY_MAX_AGE_DAYS}d`,
    sort: "datedesc",
  }).toString();

/** GDELT's artlist JSON as articles, tagged from the headline (GDELT gives no snippet). */
export function parseGdelt(body: string): LiveArticle[] {
  const parsed = JSON.parse(body) as { articles?: { url?: string; title?: string; seendate?: string; domain?: string }[] };
  const out: LiveArticle[] = [];
  for (const a of parsed.articles ?? []) {
    const m = a.seendate?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (!a.title || !a.url || !/^https?:\/\//i.test(a.url) || !m) continue;
    const title = a.title.replace(/\s+/g, " ").trim();
    out.push({
      id: a.url,
      kind: "news",
      title,
      summary: "",
      outlet: a.domain ?? "GDELT",
      url: a.url,
      publishedAt: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`,
      ...tagArticle(title),
    });
  }
  return out;
}

/** Lead-time stories from several article lists, newest first, without duplicates or stale items. */
export function leadStories(lists: LiveArticle[][], now: number): LeadStory[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const out: LeadStory[] = [];
  for (const a of lists.flat()) {
    if (a.kind !== "news") continue;
    const t = Date.parse(a.publishedAt);
    if (!Number.isFinite(t) || t < now - STORY_MAX_AGE_DAYS * DAY || t > now + DAY) continue;
    const u = urlKey(a.url);
    const k = titleKey(a.title);
    if (seenUrls.has(u) || seenTitles.has(k)) continue;
    const story = toLeadStory(a);
    if (!story) continue;
    seenUrls.add(u);
    seenTitles.add(k);
    out.push(story);
  }
  out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return out.slice(0, MAX_STORIES);
}

// ---- Segment reads ----

export type SegmentVerdict = "longer" | "easing" | "mixed" | "thin" | "quiet";

export interface SegmentRead {
  segment: string;
  stories: number;
  longer: number;
  easing: number;
  verdict: SegmentVerdict;
  /** The most recent lead time quoted in weeks for this segment, with its story. */
  quoted: { weeks: QuotedWeeks; storyId: string; outlet: string; publishedAt: string } | null;
  latest: LeadStory | null;
}

/**
 * One row per segment, in the tagging order. A segment reads "longer" or "easing"
 * when at least two stories point one way and they outnumber the other way two to
 * one; "mixed" when stories point both ways without that margin; "thin" when there
 * are stories but too few pointing one way to call; "quiet" when there are none.
 */
export function segmentReads(stories: LeadStory[], segments: readonly string[] = SEGMENT_LABELS): SegmentRead[] {
  return segments.map((segment) => {
    const mine = stories.filter((s) => s.segments.includes(segment)); // already newest first
    const longer = mine.filter((s) => s.way === "longer").length;
    const easing = mine.filter((s) => s.way === "easing").length;
    const verdict: SegmentVerdict =
      longer >= 2 && longer >= 2 * easing ? "longer" : easing >= 2 && easing >= 2 * longer ? "easing" : longer > 0 && easing > 0 ? "mixed" : mine.length ? "thin" : "quiet";
    const withWeeks = mine.find((s) => s.weeks);
    return {
      segment,
      stories: mine.length,
      longer,
      easing,
      verdict,
      quoted: withWeeks?.weeks ? { weeks: withWeeks.weeks, storyId: withWeeks.id, outlet: withWeeks.outlet, publishedAt: withWeeks.publishedAt } : null,
      latest: mine[0] ?? null,
    };
  });
}

// ---- Supply-pressure series ----

export interface LeadPoint {
  date: string; // YYYY-MM
  value: number;
}

export type LeadUnit = "sd" | "diffusion" | "usd-millions";

export interface LeadIndicator {
  key: string;
  label: string;
  /** What the number is, in a short line. */
  detail: string;
  /** How to read a rise. */
  reading: string;
  unit: LeadUnit;
  source: string;
  sourceUrl: string;
  points: LeadPoint[]; // oldest → newest
}

const lastMonths = (points: LeadPoint[]) => [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-MONTHS_KEPT);

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** A GSCPI date cell as YYYY-MM: "31-Oct-2026", or an Excel date serial. */
function gscpiMonth(cell: unknown): string | null {
  if (typeof cell === "number" && Number.isFinite(cell)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(cell) * DAY);
    return d.toISOString().slice(0, 7);
  }
  const m = String(cell ?? "").match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  const month = m ? MONTH_NAMES.indexOf(m[2].toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}` : null;
}

/** Rows of the NY Fed's GSCPI workbook: a "Date, GSCPI" header, blank rows, then one row a month. */
export function parseGscpiRows(rows: unknown[][]): LeadPoint[] {
  const out: LeadPoint[] = [];
  for (const row of rows) {
    const date = gscpiMonth(row[0]);
    const value = row[1];
    if (date && typeof value === "number" && Number.isFinite(value)) out.push({ date, value });
  }
  if (!out.length) throw new Error("GSCPI workbook has no data rows");
  return lastMonths(out);
}

/** FRED's keyless CSV ("observation_date,ID"; "." for no value) as monthly points. */
export function parseFredMonthly(csv: string): LeadPoint[] {
  const [head, ...rows] = csv.trim().split("\n");
  if (!/^observation_date,/i.test(head ?? "")) throw new Error("not a FRED CSV");
  const out = rows.flatMap((r) => {
    const [date, v] = r.trim().split(",");
    const value = Number(v);
    return /^\d{4}-\d{2}/.test(date ?? "") && v && v !== "." && Number.isFinite(value) ? [{ date: date.slice(0, 7), value }] : [];
  });
  if (!out.length) throw new Error("FRED series has no data");
  return lastMonths(out);
}

async function getSeries(url: string): Promise<Response> {
  // No custom User-Agent: FRED's bot screen has turned away the one the news feeds send.
  const res = await fetch(url, { signal: AbortSignal.timeout(SERIES_TIMEOUT_MS), next: { revalidate: SERIES_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res;
}

const GSCPI_URL = "https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx";

async function fromGscpi(): Promise<LeadIndicator[]> {
  const book = XLSX.read(new Uint8Array(await (await getSeries(GSCPI_URL)).arrayBuffer()), { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
  return [
    {
      key: "gscpi",
      label: "Global supply chain pressure",
      detail: "Standard deviations from the long-run average",
      reading: "Above zero means more supply-chain pressure than usual: longer deliveries, higher shipping costs, more backlogs.",
      unit: "sd",
      source: "Federal Reserve Bank of New York, GSCPI",
      sourceUrl: "https://www.newyorkfed.org/research/policy/gscpi",
      points: parseGscpiRows(rows),
    },
  ];
}

const FRED_SERIES: Omit<LeadIndicator, "points" | "sourceUrl">[] = [
  {
    key: "DTCDFSA066MSFRBPHI",
    label: "Delivery times, Philadelphia Fed survey",
    detail: "Diffusion index, current conditions, seasonally adjusted",
    reading: "Above zero means more manufacturers report slower supplier deliveries than faster ones.",
    unit: "diffusion",
    source: "Federal Reserve Bank of Philadelphia, via FRED",
  },
  {
    key: "A34SUO",
    label: "Unfilled orders, computers and electronic products",
    detail: "US manufacturers, millions of dollars, seasonally adjusted",
    reading: "A growing backlog means makers are taking orders faster than they ship them.",
    unit: "usd-millions",
    source: "US Census Bureau M3 survey, via FRED",
  },
];

const fredUrl = (id: string) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;

async function fromFred(meta: Omit<LeadIndicator, "points" | "sourceUrl">): Promise<LeadIndicator[]> {
  const csv = await (await getSeries(fredUrl(meta.key))).text();
  return [{ ...meta, sourceUrl: `https://fred.stlouisfed.org/series/${meta.key}`, points: parseFredMonthly(csv) }];
}

// ---- Published reports ----

export interface PublishedReport {
  publisher: string;
  title: string;
  url: string;
  /** YYYY-MM-DD, when the publisher dates it. */
  date: string | null;
  cadence: string;
  /** What the report covers, in our words, and how to get it. */
  note: string;
}

const SOURCEABILITY_LIST = "https://sourceability.com/news-categories/lead-time-reports";

/** The lead-time posts on Sourceability's category page: link, "MM.DD.YY" date and heading. */
export function parseSourceabilityList(html: string, base = "https://sourceability.com"): PublishedReport[] {
  const out: PublishedReport[] = [];
  const seen = new Set<string>();
  for (const block of html.split(/<a\s/i).slice(1)) {
    const href = block.match(/^[^>]*href="(\/post\/[^"#?]*lead-time[^"#?]*)"/i)?.[1];
    if (!href || seen.has(href)) continue;
    const text = block
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").trim())
      .filter(Boolean);
    const dateAt = text.findIndex((t) => /^\d{1,2}\.\d{1,2}\.\d{2}$/.test(t));
    const title = text.find((t, i) => i !== dateAt && /lead time/i.test(t) && !/^read the/i.test(t));
    if (!title) continue;
    let date: string | null = null;
    if (dateAt >= 0) {
      const [mm, dd, yy] = text[dateAt].split(".").map(Number);
      date = `${2000 + yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    }
    seen.add(href);
    out.push({
      publisher: "Sourceability",
      title,
      url: `${base}${href}`,
      date,
      cadence: "Quarterly",
      note: "Lead times and price trends by component category, with sourcing commentary. The full report is free with registration.",
    });
  }
  out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return out.slice(0, REPORTS_KEPT);
}

/** Reports the page links to without reading: their sites forbid automated access or sit behind a bot screen. */
export const FIXED_REPORTS: PublishedReport[] = [
  {
    publisher: "ECIA",
    title: "Industry Pulse executive summary",
    url: "https://www.ecianow.org/market-trends-lead-times/ecst-monthly-survey-summary-public/",
    date: null,
    cadence: "Monthly",
    note: "Survey of North American component makers and distributors, including the share reporting longer lead times by component group. The summary is public; weekly lead times by category are for ECIA members.",
  },
  {
    publisher: "TrustedParts",
    title: "Component lead-time trends",
    url: "https://www.trustedparts.com/en/lead-times",
    date: null,
    cadence: "Weekly",
    note: "ECIA's free search site: lead-time trends for over 160 component categories from authorized distributors. Open it in a browser.",
  },
];

// ---- The page's data ----

export interface LeadTimes {
  stories: LeadStory[];
  segments: SegmentRead[];
  indicators: LeadIndicator[];
  reports: PublishedReport[];
  sources: SourceStatus[];
  fetchedAt: string;
}

/** Named source jobs; a rejected job is reported as down and the rest still render. */
export interface LeadSources {
  news: () => Promise<LiveArticle[]>;
  supplyChain: () => Promise<LiveArticle[]>;
  gdelt: () => Promise<LiveArticle[]>;
  indicators: { outlet: string; load: () => Promise<LeadIndicator[]> }[];
  sourceability: () => Promise<PublishedReport[]>;
}

export const DEFAULT_SOURCES: LeadSources = {
  news: async () => {
    const news = await getLiveNews();
    if (!news.sources.some((s) => s.ok)) throw new Error("no news source answered");
    return news.articles;
  },
  supplyChain: async () => feedArticles("Supply Chain Dive", await fetchText(SUPPLY_CHAIN_DIVE)),
  gdelt: async () => parseGdelt(await fetchText(GDELT_URL, GDELT_TIMEOUT_MS)),
  indicators: [
    { outlet: "New York Fed GSCPI", load: fromGscpi },
    ...FRED_SERIES.map((meta) => ({ outlet: meta.source.startsWith("US Census") ? "Census M3" : "Philadelphia Fed", load: () => fromFred(meta) })),
  ],
  sourceability: async () => {
    const reports = parseSourceabilityList(await fetchText(SOURCEABILITY_LIST));
    if (!reports.length) throw new Error("no lead-time posts found on Sourceability's list");
    return reports;
  },
};

export async function getLeadTimes(sources: LeadSources = DEFAULT_SOURCES, now = Date.now()): Promise<LeadTimes> {
  const [news, supplyChain, gdelt, sourceability, ...indicatorResults] = await Promise.allSettled([
    sources.news(),
    sources.supplyChain(),
    sources.gdelt(),
    sources.sourceability(),
    ...sources.indicators.map((s) => s.load()),
  ]);

  const status: SourceStatus[] = [];
  const value = <T>(outlet: string, r: PromiseSettledResult<T[]>): T[] => {
    status.push({ outlet, ok: r.status === "fulfilled", count: r.status === "fulfilled" ? r.value.length : 0 });
    return r.status === "fulfilled" ? r.value : [];
  };

  // Market News first, so a trade-press copy wins a duplicate over GDELT's.
  const lists = [value("Market News feeds", news), value("Supply Chain Dive", supplyChain), value("GDELT", gdelt)];
  const stories = leadStories(lists, now);
  const reports = [...value("Sourceability", sourceability), ...FIXED_REPORTS];
  const indicators = indicatorResults.flatMap((r, i) => value(sources.indicators[i].outlet, r));
  // A story source's count is the lead-time stories it gave, not every article it read.
  const kept = new Set(stories.map((s) => s.id));
  lists.forEach((list, i) => {
    status[i] = { ...status[i], count: list.filter((a) => kept.delete(a.id)).length };
  });

  return { stories, segments: segmentReads(stories), indicators, reports, sources: status, fetchedAt: new Date(now).toISOString() };
}

// ---- The read in words ----

/** Change in an indicator's latest value on a year ago, or undefined. */
export function yearAgo(ind: LeadIndicator): number | undefined {
  const last = ind.points[ind.points.length - 1];
  const before = ind.points[ind.points.length - 13];
  if (!last || !before) return undefined;
  return ind.unit === "usd-millions" ? (before.value === 0 ? undefined : last.value / before.value - 1) : last.value - before.value;
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** One sentence: which segments the news says are lengthening or easing, and where the GSCPI sits. */
export function leadSentence(segments: SegmentRead[], indicators: LeadIndicator[]): string {
  const longer = segments.filter((s) => s.verdict === "longer").map((s) => s.segment);
  const easing = segments.filter((s) => s.verdict === "easing").map((s) => s.segment);
  const parts: string[] = [];
  if (longer.length) parts.push(`Lead-time news points longer in ${list(longer)}`);
  if (easing.length) parts.push(`${parts.length ? "easing" : "Lead-time news points to easing"} in ${list(easing)}`);
  if (!parts.length) parts.push(segments.some((s) => s.stories) ? "Lead-time news is mixed across segments" : "Little lead-time news in the last month");
  let out = parts.join("; ");
  const g = indicators.find((i) => i.key === "gscpi");
  const last = g?.points[g.points.length - 1];
  if (last) {
    const level = last.value > 0.5 ? "above normal" : last.value < -0.5 ? "below normal" : "near normal";
    out += `. Global supply-chain pressure is ${level} (${last.value >= 0 ? "+" : "−"}${Math.abs(last.value).toFixed(2)})`;
  }
  return `${out}.`;
}
