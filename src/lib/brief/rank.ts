import { TRADE_PRESS } from "@/lib/data/live/news";
import type { Corpus, CorpusItem } from "./corpus";
import type { BriefLength, BriefProfile } from "./profile";

// Morning brief, phase B2: rank the day's corpus for one user and pick stories
// per chapter until the length budget is spent. Pure and rule-based, so it is
// cheap per user and the eval can check it. Scores come from the profile's facet
// matches, Claude's relevance from Market News, freshness and source quality.
// A quiet day gives a short brief: nothing below the floor is used as padding.

export type ChapterId = "top" | "suppliers" | "customers" | "technologies" | "market";

export const CHAPTER_TITLES: Record<ChapterId, string> = {
  top: "Top of the morning",
  suppliers: "Your suppliers",
  customers: "Your customers",
  technologies: "Your technologies",
  market: "Market and filings",
};
export const CHAPTERS: ChapterId[] = ["top", "suppliers", "customers", "technologies", "market"];

/** Spoken seconds, at about 150 words a minute. */
export const SECONDS = {
  intro: 15,
  transition: 3,
  /** A top-of-the-morning item: two sentences. */
  top: 20,
  /** A story in a chapter: a short paragraph. */
  story: 30,
  /** A filing or rule: one or two sentences. */
  filing: 15,
  /** Quick: one line per item. */
  line: 8,
};

/** Each chapter's share of a standard brief, in seconds: about 10 minutes in all. */
const BUDGET: Record<ChapterId, number> = { top: 60, suppliers: 180, customers: 150, technologies: 150, market: 90 };
export const STANDARD_SECONDS = 600;
export const CAP_SECONDS = 15 * 60;
export const QUICK_SECONDS = 5 * 60;
const TOP_COUNT = 3;
const WORTH_KNOWING_MAX = 2;
/** The floor for any chapter: one real match on a fresh story. */
export const MIN_SCORE = 4;
/** The floor for the top three. */
const TOP_MIN = 7;
/** Stories this strong may run past their chapter's share on a heavy day, up to the cap. */
const STRONG = 9;

export interface Scored {
  item: CorpusItem;
  score: number;
  reasons: string[];
}

export interface Pick extends Scored {
  seconds: number;
  /** A customer the user doesn't serve, in the news for their suppliers or technologies. */
  worthKnowing?: boolean;
}

export interface Chapter {
  id: ChapterId;
  title: string;
  picks: Pick[];
  seconds: number;
}

export interface BriefPlan {
  profileId: string;
  date: string;
  length: BriefLength;
  chapters: Chapter[];
  /** Spoken length, intro and transitions included. */
  seconds: number;
  /** Stories in scope that didn't fit the audio; the written brief lists them. */
  more: Scored[];
}

const HOUR = 3_600_000;

/** The customers this user follows: the ones they serve, plus Avnet's top customers if they follow those. */
function watchedCustomers(item: CorpusItem, p: BriefProfile): string[] {
  return item.customers.filter((c) => p.customers.includes(c as never) || (p.followTopCustomers && item.topCustomers.includes(c)));
}

/** How much this item matters to this user today. Pure. */
export function score(item: CorpusItem, p: BriefProfile, builtAt: string): Scored {
  const reasons: string[] = [];
  let s = 0;
  const add = (n: number, why: string) => {
    s += n;
    reasons.push(`${n > 0 ? "+" : ""}${n} ${why}`);
  };

  const supplierRanks = item.suppliers.map((x) => p.suppliers.indexOf(x)).filter((i) => i >= 0);
  if (supplierRanks.length) {
    const best = Math.min(...supplierRanks);
    add(4 - Math.min(best, 2) * 0.5, `supplier ${p.suppliers[best]}`);
  }
  // A customer they serve counts for more than one they follow only because it is an Avnet top customer.
  const watched = watchedCustomers(item, p);
  const served = watched.filter((c) => p.customers.includes(c as never));
  if (served.length) add(served.some((c) => item.topCustomers.includes(c)) ? 4 : 3, `customer ${served[0]}`);
  else if (watched.length) add(2, `top customer ${watched[0]}`);
  const tech = item.segments.filter((x) => p.technologies.includes(x));
  if (tech.length) add(2, `technology ${tech[0]}`);
  if (item.regions.includes(p.region)) add(1, `region ${p.region}`);

  if (item.relevance === "high") add(3, "rated high");
  else if (item.relevance === "medium") add(1, "rated useful");
  else if (item.relevance === "low") add(-3, "rated low");

  const hours = (Date.parse(builtAt) - Date.parse(item.publishedAt)) / HOUR;
  if (item.kind === "news") {
    if (hours <= 24) add(2, "last 24 hours");
    else if (hours <= 48) add(1, "last 48 hours");
    else if (hours > 96) add(-2, "over 4 days old");
  } else if (hours <= 72) add(1, "filed in the last 3 days");
  else if (hours > 14 * 24) add(-2, "filed over 2 weeks ago");

  // Already told: enough to keep it out of the audio unless it is still very strong.
  if (Date.parse(builtAt) - Date.parse(item.ingestedAt) > 20 * HOUR) add(-4, "in an earlier brief");
  if (TRADE_PRESS.has(item.outlet)) add(1, "trade press");

  return { item, score: s, reasons };
}

const matchesSupplier = (i: CorpusItem, p: BriefProfile) => i.suppliers.some((x) => p.suppliers.includes(x));
const matchesTech = (i: CorpusItem, p: BriefProfile) => i.segments.some((x) => p.technologies.includes(x));
/** Anything in the user's scope at all. */
const inScope = (i: CorpusItem, p: BriefProfile) => matchesSupplier(i, p) || watchedCustomers(i, p).length > 0 || matchesTech(i, p);
/** The user's own scope, which a top story needs: a top customer they don't serve can't lead their morning. */
const direct = (i: CorpusItem, p: BriefProfile) => matchesSupplier(i, p) || i.customers.some((c) => p.customers.includes(c as never)) || matchesTech(i, p);

/** The brief's stories for this user, chapter by chapter. Pure. */
export function planBrief(corpus: Corpus, p: BriefProfile): BriefPlan {
  const quick = p.length === "quick";
  const scored = corpus.items
    .map((i) => score(i, p, corpus.builtAt))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.item.publishedAt.localeCompare(a.item.publishedAt));
  const used = new Set<string>();
  const left = (keep: (s: Scored) => boolean) => scored.filter((s) => !used.has(s.item.id) && keep(s));

  const candidates: Record<ChapterId, Scored[]> = {
    top: left((s) => s.score >= TOP_MIN && s.item.kind !== "filing" && direct(s.item, p)).slice(0, TOP_COUNT),
    suppliers: [],
    customers: [],
    technologies: [],
    market: [],
  };
  candidates.top.forEach((s) => used.add(s.item.id));
  const news = (s: Scored) => s.item.kind === "news";
  // By importance: the score already weights the user's first suppliers.
  candidates.suppliers = left((s) => news(s) && matchesSupplier(s.item, p));
  // Customers they follow first, then up to two they don't serve yet ("Worth knowing").
  const followed = left((s) => news(s) && watchedCustomers(s.item, p).length > 0);
  const worth = left((s) => news(s) && s.item.customers.length > 0 && !watchedCustomers(s.item, p).length && matchesTech(s.item, p)).slice(0, WORTH_KNOWING_MAX);
  candidates.customers = [...followed, ...worth];
  candidates.technologies = left((s) => news(s) && matchesTech(s.item, p));
  // Filings and rules in the user's scope; a rule outside it only when Claude rated it high (a trade rule touches everyone).
  candidates.market = left((s) => !news(s) && (inScope(s.item, p) || (s.item.kind === "regulatory" && s.item.relevance === "high")));
  const worthIds = new Set(worth.map((s) => s.item.id));

  const cost = (id: ChapterId, s: Scored) => (quick && id !== "top" ? SECONDS.line : id === "top" ? SECONDS.top : news(s) ? SECONDS.story : SECONDS.filing);
  const chapters: Chapter[] = CHAPTERS.map((id) => ({ id, title: CHAPTER_TITLES[id], picks: [], seconds: 0 }));
  const byId = Object.fromEntries(chapters.map((c) => [c.id, c])) as Record<ChapterId, Chapter>;
  const total = () => SECONDS.intro + chapters.reduce((t, c) => t + c.seconds + (c.picks.length ? SECONDS.transition : 0), 0);
  const limit = quick ? QUICK_SECONDS : CAP_SECONDS;

  const take = (id: ChapterId, s: Scored, room: number): boolean => {
    if (used.has(s.item.id) && id !== "top") return false;
    const secs = cost(id, s);
    const c = byId[id];
    const extra = secs + (c.picks.length ? 0 : SECONDS.transition);
    if (c.seconds + secs > room || total() + extra > limit) return false;
    c.picks.push({ ...s, seconds: secs, ...(worthIds.has(s.item.id) ? { worthKnowing: true } : {}) });
    c.seconds += secs;
    used.add(s.item.id);
    return true;
  };

  // Pass 1: each chapter up to its share (quick: no shares, just the 5-minute cap).
  for (const id of CHAPTERS) for (const s of candidates[id]) take(id, s, quick ? Infinity : BUDGET[id]);
  // Pass 2, standard only: on a heavy day the strongest leftovers run past their chapter's share,
  // to at most twice it, so one busy chapter can't crowd out the rest; 15 minutes in all.
  if (!quick) for (const id of CHAPTERS.slice(1)) for (const s of candidates[id]) if (s.score >= STRONG) take(id, s, 2 * BUDGET[id]);

  const kept = chapters.filter((c) => c.picks.length);
  const more = scored.filter((s) => !used.has(s.item.id));
  return { profileId: p.id, date: corpus.date, length: p.length, chapters: kept, seconds: total(), more };
}
