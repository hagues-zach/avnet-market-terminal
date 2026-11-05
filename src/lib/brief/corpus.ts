import { getNewsAngles, type Angles, type Relevance } from "@/lib/ai/news-angles";
import { getLiveNews, titleKey, urlKey } from "@/lib/data/live/news";
import type { LiveArticle, LiveNews, SourceStatus } from "@/lib/data/live/shared";
import { store as defaultStore, type Store } from "@/lib/store";
import { topCustomers as defaultTopCustomers } from "./top-customers";

// Morning brief, phase B1: one shared corpus a day. A scheduled job reads the same
// sources as Market News (getLiveNews, already tagged by tagArticle, customers
// included), adds Claude's relevance where Market News already has it, stamps every
// item and saves the day's corpus. Per-user briefs select from this and never call
// a news source themselves. Kept in the store seam (local files for now; Oracle's
// corpus tables on the Avnet machine, docs/morning-brief-plan.md). Server-only.

export const CORPUS_NS = "brief-corpus-v1";
const KEEP_DAYS = 14;

export interface CorpusItem extends LiveArticle {
  /** The item's id at its source: the article URL, or the filing or notice id. */
  sourceId: string;
  /** When a corpus job first saw it (ISO). Kept across runs, so "new today" means new. */
  ingestedAt: string;
  /** The customers it names that are flagged as Avnet top customers. */
  topCustomers: string[];
  /** Claude's rating and angle, when Market News has written one. */
  relevance?: Relevance;
  angle?: string;
}

export interface Corpus {
  /** The briefing day, YYYY-MM-DD in Eastern time. */
  date: string;
  builtAt: string;
  /** When the sources were read (getLiveNews's fetchedAt). */
  fetchedAt: string;
  sources: SourceStatus[];
  angles: Angles["status"];
  items: CorpusItem[];
}

/** The briefing day for a moment, in Eastern time: "2026-11-05". */
export function easternDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export interface BuildInput {
  news: LiveNews;
  now: Date;
  /** Earlier corpora (today's earlier run, the last briefing day), for first-seen stamps. */
  previous?: Corpus[];
  topCustomers?: Set<string>;
  angles?: Angles["byId"];
  anglesStatus?: Angles["status"];
}

/** The day's corpus from one read of the sources. Pure. */
export function buildCorpus({ news, now, previous = [], topCustomers = new Set(), angles = {}, anglesStatus = "off" }: BuildInput): Corpus {
  const builtAt = now.toISOString();
  const firstSeen = new Map<string, string>();
  for (const c of previous) for (const i of c.items) if (!firstSeen.has(i.id) || i.ingestedAt < firstSeen.get(i.id)!) firstSeen.set(i.id, i.ingestedAt);

  const urls = new Set<string>();
  const titles = new Set<string>();
  const items: CorpusItem[] = [];
  for (const a of news.articles) {
    const u = urlKey(a.url || a.id);
    const t = titleKey(a.title);
    if (urls.has(u) || titles.has(t)) continue;
    urls.add(u);
    titles.add(t);
    const angle = angles[a.id];
    items.push({
      ...a,
      sourceId: a.id,
      ingestedAt: firstSeen.get(a.id) ?? builtAt,
      topCustomers: a.customers.filter((c) => topCustomers.has(c)),
      ...(angle ? { relevance: angle.relevance, angle: angle.angle } : {}),
    });
  }
  return { date: easternDate(now), builtAt, fetchedAt: news.fetchedAt, sources: news.sources, angles: anglesStatus, items };
}

export interface JobDeps {
  now?: Date;
  fetchNews?: () => Promise<LiveNews>;
  /** Claude's ratings; the same cached call Market News makes, so a story is rated once. */
  rate?: (articles: LiveArticle[]) => Promise<Angles>;
  store?: Store;
  topCustomers?: Set<string>;
}

export interface JobResult {
  date: string;
  items: number;
  newItems: number;
  topCustomerItems: number;
  sourcesDown: string[];
  angles: Angles["status"];
}

/** Build and save the day's corpus. Run by the scheduled job; a rerun the same day replaces it and keeps first-seen stamps. */
export async function runCorpusJob(deps: JobDeps = {}): Promise<JobResult> {
  const now = deps.now ?? new Date();
  const s = deps.store ?? defaultStore;
  const news = await (deps.fetchNews ?? getLiveNews)();
  const rated = await (deps.rate ?? getNewsAngles)(news.articles);

  const date = easternDate(now);
  const saved = await s.getAll<Corpus>(CORPUS_NS);
  const today = saved[date];
  const lastDay = Object.keys(saved).filter((d) => d < date).sort().pop();
  const previous = [today, lastDay ? saved[lastDay] : undefined].filter((c): c is Corpus => !!c);

  const corpus = buildCorpus({
    news,
    now,
    previous,
    topCustomers: deps.topCustomers ?? defaultTopCustomers(),
    angles: rated.byId,
    anglesStatus: rated.status,
  });
  await s.set<Corpus>(CORPUS_NS, date, corpus, { days: KEEP_DAYS, dateOf: (key) => key });

  const seenBefore = new Set(lastDay ? saved[lastDay].items.map((i) => i.id) : []);
  return {
    date,
    items: corpus.items.length,
    newItems: corpus.items.filter((i) => !seenBefore.has(i.id)).length,
    topCustomerItems: corpus.items.filter((i) => i.topCustomers.length).length,
    sourcesDown: corpus.sources.filter((x) => !x.ok).map((x) => x.outlet),
    angles: corpus.angles,
  };
}

/** The corpus for a briefing day (today in Eastern time by default), or null before the job has run. */
export async function getCorpus(date = easternDate(new Date()), s: Store = defaultStore): Promise<Corpus | null> {
  return (await s.get<Corpus>(CORPUS_NS, date)) ?? null;
}
