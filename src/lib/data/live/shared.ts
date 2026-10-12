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
