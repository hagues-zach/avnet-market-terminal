import type { ArticleTags } from "./tagging";

// Shared shapes and fetch helper for the open-data adapters (news, filings,
// regulatory). Server-only: responses are cached by Next for REVALIDATE_SECONDS.

export const REVALIDATE_SECONDS = 900;
export const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "MarketTerminal/0.1 (news reader)";

export type ArticleKind = "news" | "filing" | "regulatory";

export const KIND_LABELS: Record<ArticleKind, string> = {
  news: "News",
  filing: "Filings",
  regulatory: "Regulatory",
};

export interface LiveArticle extends ArticleTags {
  id: string;
  kind: ArticleKind;
  title: string;
  summary: string;
  outlet: string;
  url: string;
  publishedAt: string; // ISO
  /** Byline, when the feed names one. */
  author?: string;
  /**
   * Full article text from the feed, server-only: input for Claude's brief, never
   * shown or stored. Removed by `forClient` before articles reach the browser.
   */
  body?: string;
}

/** Articles without their feed text, for passing to client components. */
export function forClient<T extends LiveArticle>(articles: T[]): T[] {
  return articles.map(({ body: _body, ...rest }) => rest as T);
}

/**
 * The article's route key for /news/[slug]: a short hash of its URL, the same on
 * server and client, and stable for as long as the outlet keeps the URL.
 */
export function articleSlug(article: Pick<LiveArticle, "url">): string {
  // FNV-1a over two lanes, so 64 bits without BigInt.
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < article.url.length; i++) {
    const c = article.url.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  return (a >>> 0).toString(36).padStart(7, "0") + (b >>> 0).toString(36).padStart(7, "0");
}

export interface SourceStatus {
  outlet: string;
  ok: boolean;
  count: number;
}

export interface LiveNews {
  articles: LiveArticle[];
  sources: SourceStatus[];
  fetchedAt: string; // ISO
}

export async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, application/json, */*" },
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.text();
}
