import type { Angle, Relevance } from "@/lib/ai/news-angles";
import type { LiveArticle } from "@/lib/data/live/shared";
import { COMPANIES, type Company } from "@/lib/data/live/earnings-model";

// The Market News briefing, worked out from the live feed: what leads the page,
// the counts in the summary line, topics this week, and the links from a story
// into Company Profile and QBR Prep. Pure functions, so the page and its tests
// read the same rules. Times are measured from the feed's fetch time, not the
// browser clock, so server and client agree.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const TOP_WINDOW_HOURS = 48;
export const TOP_LIMIT = 5;

const age = (a: LiveArticle, fetchedAt: string) => Date.parse(fetchedAt) - Date.parse(a.publishedAt);

/* ---------- Summary line ---------- */

export interface Summary {
  stories: number;
  high: number | null; // null until Claude's ratings are in (or with Claude off)
  filings: number;
  regulatory: number;
}

/** Counts for the last 24 hours. */
export function summarize(articles: LiveArticle[], fetchedAt: string, byId: Record<string, Angle> | null): Summary {
  const recent = articles.filter((a) => age(a, fetchedAt) <= DAY);
  return {
    stories: recent.length,
    high: byId ? recent.filter((a) => byId[a.id]?.relevance === "high").length : null,
    filings: recent.filter((a) => a.kind === "filing").length,
    regulatory: recent.filter((a) => a.kind === "regulatory").length,
  };
}

/* ---------- Top stories ---------- */

export interface TopStories {
  stories: LiveArticle[];
  /** "rated": high relevance from Claude. "recent": Claude is off or has rated nothing high, so the latest news instead. */
  basis: "rated" | "recent";
}

/**
 * High-relevance stories from the last 48 hours, newest first. When none are
 * rated high (Claude off, or a quiet day) the page still leads with something:
 * the most recent news, labelled as such.
 */
export function topStories(articles: LiveArticle[], fetchedAt: string, byId: Record<string, Angle> | null, limit = TOP_LIMIT): TopStories {
  const window = articles
    .filter((a) => a.kind !== "filing" && age(a, fetchedAt) <= TOP_WINDOW_HOURS * HOUR)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const rated = byId ? window.filter((a) => byId[a.id]?.relevance === "high") : [];
  if (rated.length) return { stories: rated.slice(0, limit), basis: "rated" };
  return {
    stories: window.filter((a) => a.kind === "news").slice(0, limit),
    basis: "recent",
  };
}

/* ---------- Topics this week ---------- */

export type TopicFacet = "segments" | "endMarkets";

export interface Topic {
  name: string;
  count: number;
}

/**
 * Stories per segment or end market in the last 7 days. No week-on-week change:
 * the RSS feeds only hold a few days of items, so "the week before" would be
 * mostly empty. That needs stored history (the database, step 4.1).
 */
export function topics(articles: LiveArticle[], fetchedAt: string, facet: TopicFacet): Topic[] {
  const counts = new Map<string, number>();
  for (const a of articles) {
    if (age(a, fetchedAt) > 7 * DAY) continue;
    for (const name of a[facet]) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ---------- Where a topic touches Avnet (mock) ---------- */

// News segments and end markets (rule-based tags) against the segments and
// verticals of Avnet's billings in the shared mock model. A topic with no
// match is one Avnet does not bill under (fabs and equipment, for instance).
const SEGMENT_MAP: Record<string, string[]> = {
  Memory: ["Memory"],
  "Analog & Power": ["Analog", "Discretes & power"],
  "Logic & Processors": ["Logic & FPGA"],
  "MCU & Embedded": ["Microcontrollers & processors"],
  "Sensors & Opto": ["Sensors", "Optoelectronics"],
  "IP&E": ["Connectors", "Passives", "Electromechanical"],
};

const END_MARKET_MAP: Record<string, string> = {
  "AI & Data Center": "Data center & computing",
  Automotive: "Automotive",
  Industrial: "Industrial",
  Consumer: "Consumer",
  "Aerospace & Defense": "Aerospace & defense",
  Communications: "Communications",
  Medical: "Medical",
};

/** Avnet's billings by segment and by end market: what news topics are measured against. Small enough to send to the browser. */
export interface ExposureBillings {
  segments: { segment: string; billings: number; growth: number }[];
  verticals: { name: string; billings: number; growth: number }[];
}

export const exposureBillings = (m: { segmentBillings: ExposureBillings["segments"]; verticals: ExposureBillings["verticals"] }): ExposureBillings => ({
  segments: m.segmentBillings.map(({ segment, billings, growth }) => ({ segment, billings, growth })),
  verticals: m.verticals.map(({ name, billings, growth }) => ({ name, billings, growth })),
});

/** Avnet's trailing 12 month billings ($M) and growth for a news topic, or null when Avnet doesn't bill under it. */
export function avnetExposure(topic: string, facet: TopicFacet, avnet: ExposureBillings): { billings: number; growth: number } | null {
  const rows =
    facet === "segments"
      ? avnet.segments.filter((s) => SEGMENT_MAP[topic]?.includes(s.segment))
      : avnet.verticals.filter((v) => v.name === END_MARKET_MAP[topic]);
  if (!rows.length) return null;
  const billings = rows.reduce((n, r) => n + r.billings, 0);
  const yearAgo = rows.reduce((n, r) => n + r.billings / (1 + r.growth), 0);
  return { billings, growth: billings / yearAgo - 1 };
}

/* ---------- Links into the rest of the app ---------- */

// Supplier tags whose label differs from the company's name in COMPANIES.
const TAG_ALIASES: Record<string, string> = { Arrow: "arrow" };
const BY_NAME = new Map(COMPANIES.map((c) => [c.name.toLowerCase(), c]));

/** Companies named in a story that have a profile, in tag order. */
export function profiledCompanies(article: LiveArticle): Company[] {
  const out: Company[] = [];
  for (const tag of article.suppliers) {
    const company = TAG_ALIASES[tag] ? COMPANIES.find((c) => c.slug === TAG_ALIASES[tag]) : BY_NAME.get(tag.toLowerCase());
    if (company && !out.includes(company)) out.push(company);
  }
  return out;
}

/** QBR Prep with the company chosen and the headline as the meeting focus (the setup caps focus at 200 characters). */
export function qbrHref(company: Company, article: LiveArticle): string {
  return `/tools/qbr?${new URLSearchParams({ company: company.slug, focus: article.title.slice(0, 200) }).toString()}`;
}

/** Avnet or Arrow, for the left rule on a story; null for everyone else. */
export function entityOf(article: LiveArticle): "avnet" | "arrow" | null {
  if (article.suppliers.includes("Avnet")) return "avnet";
  if (article.suppliers.includes("Arrow")) return "arrow";
  return null;
}

/* ---------- Feed grouping ---------- */

export type DayGroup = "Today" | "Yesterday" | "Earlier this week" | "Older";
export const DAY_GROUPS: DayGroup[] = ["Today", "Yesterday", "Earlier this week", "Older"];

/** Calendar day of the story against the fetch day, both in UTC (the page states UTC). */
export function dayGroup(publishedAt: string, fetchedAt: string): DayGroup {
  const days = Math.floor(Date.parse(fetchedAt.slice(0, 10)) / DAY) - Math.floor(Date.parse(publishedAt.slice(0, 10)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  return "Older";
}

/** "3h ago", relative to the fetch time. */
export function ago(publishedAt: string, fetchedAt: string): string {
  const mins = Math.max(0, Math.round((Date.parse(fetchedAt) - Date.parse(publishedAt)) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

/** "Oct 22 at 03:10 UTC": the same on the server and in the browser, so it never mismatches. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "n/a";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} at ${d.toISOString().slice(11, 16)} UTC`;
}

export const RELEVANCE_WORD: Record<Relevance, string> = {
  high: "High",
  medium: "Useful",
  low: "Low",
};
