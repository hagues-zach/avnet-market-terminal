import { getNewsAngles, type Angles } from "@/lib/ai/news-angles";
import {
  BRIEF_NS,
  briefCost,
  saveBriefs,
  storedRecord,
  systemBlocks,
  writeArticleBrief,
  type StoredArticle,
} from "@/lib/ai/news-brief";
import { aiConfigured } from "@/lib/ai/claude";
import { getLiveNewsWithText } from "@/lib/data/live/news";
import { articleSlug, type LiveArticle } from "@/lib/data/live/shared";
import { store as defaultStore, type Store } from "@/lib/store";

// Writes article briefs before anyone opens the story, so the article page reads
// a stored brief instead of making the reader wait for Claude. Run every 30
// minutes by /api/cron/news-briefs. Only stories the feed's relevance rating
// marks high or medium are written ahead; a low one is still written the first
// time someone opens it. Server-only.

/** Briefs per run: about 4 rounds of 4 calls fit well inside the route's two minutes. */
export const MAX_PER_RUN = 15;
const CONCURRENCY = 4;
const AHEAD = new Set(["high", "medium"]);

export interface PrewriteResult {
  /** Stories rated high or medium in the feed. */
  eligible: number;
  written: number;
  /** Already stored. */
  skipped: number;
  /** Eligible but over this run's cap; the next run takes them. */
  deferred: number;
  failed: { id: string; message: string }[];
  dollars: number;
  /** "off" when no API key is set; the angles' status otherwise. */
  status: "ok" | "off" | Angles["status"];
  message?: string;
}

export interface PrewriteDeps {
  store?: Store;
  load?: () => Promise<{ articles: LiveArticle[] }>;
  angles?: (articles: LiveArticle[]) => Promise<Angles>;
  write?: typeof writeArticleBrief;
  on?: boolean;
  max?: number;
}

/** Which stories to write this run, newest first: rated high or medium, not stored yet. Pure. */
export function pickStories(articles: LiveArticle[], angles: Angles["byId"], stored: Set<string>, max = MAX_PER_RUN) {
  const eligible = articles.filter((a) => a.kind !== "filing" && AHEAD.has(angles[a.id]?.relevance ?? ""));
  const todo = eligible.filter((a) => !stored.has(articleSlug(a)));
  const sorted = [...todo].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { eligible: eligible.length, skipped: eligible.length - todo.length, pick: sorted.slice(0, max), deferred: Math.max(0, todo.length - max) };
}

export async function prewriteBriefs(deps: PrewriteDeps = {}): Promise<PrewriteResult> {
  const s = deps.store ?? defaultStore;
  const result: PrewriteResult = { eligible: 0, written: 0, skipped: 0, deferred: 0, failed: [], dollars: 0, status: "ok" };
  if (!(deps.on ?? aiConfigured())) return { ...result, status: "off", message: "AI briefs are off. Set ANTHROPIC_API_KEY to turn them on." };

  const { articles } = await (deps.load ?? getLiveNewsWithText)();
  const angles = await (deps.angles ?? getNewsAngles)(articles);
  const stored = new Set(Object.keys(await s.getAll<StoredArticle>(BRIEF_NS)));
  const { eligible, skipped, pick, deferred } = pickStories(articles, angles.byId, stored, deps.max ?? MAX_PER_RUN);
  Object.assign(result, { eligible, skipped, deferred, status: angles.status, message: angles.message });

  const write = deps.write ?? writeArticleBrief;
  const system = deps.write ? undefined : systemBlocks(); // One profile render per run, so every call shares the cached prefix.
  const fresh: Record<string, StoredArticle> = {};
  for (let i = 0; i < pick.length; i += CONCURRENCY) {
    const batch = pick.slice(i, i + CONCURRENCY);
    const done = await Promise.all(batch.map((a) => write(a, { system })));
    done.forEach((r, j) => {
      const a = batch[j];
      result.dollars += briefCost(r.model, r.usage);
      if (r.brief) {
        fresh[articleSlug(a)] = storedRecord(a, r.brief, r.model);
        result.written += 1;
      } else result.failed.push({ id: a.id, message: r.message ?? "No brief." });
    });
  }
  await saveBriefs(fresh, s);
  result.dollars = Math.round(result.dollars * 10_000) / 10_000;
  return result;
}
