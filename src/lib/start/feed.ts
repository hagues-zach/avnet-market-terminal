// "What changed this week": one list built from news (with Claude's angle when
// it is on), line card moves and earnings releases, ranked for the chosen role.
// Pure function; the page fetches the sources and passes them in.

import type { LiveArticle } from "@/lib/data/live/shared";
import type { Angles } from "@/lib/ai/news-angles";
import type { Move } from "@/lib/line-cards/moves";
import type { ReleaseEvent } from "@/lib/data/live/earnings-calendar";
import type { RoleId } from "./roles";

export type FeedType = "News" | "Filing" | "Regulatory" | "Line card" | "Earnings";

export interface FeedItem {
  id: string;
  type: FeedType;
  title: string;
  why?: string;
  source: string;
  date: string; // ISO
  url: string;
  score: number;
}

const DAY = 86_400_000;

// How much each kind of item matters to each role, before relevance and recency.
const WEIGHT: Record<RoleId, Record<FeedType, number>> = {
  everyone: { News: 2, Filing: 1, Regulatory: 1, "Line card": 2, Earnings: 2 },
  supplier: { News: 2, Filing: 1, Regulatory: 0, "Line card": 4, Earnings: 3 },
  sales: { News: 3, Filing: 0, Regulatory: 0, "Line card": 1, Earnings: 2 },
  strategy: { News: 2, Filing: 2, Regulatory: 2, "Line card": 1, Earnings: 3 },
  executive: { News: 2, Filing: 1, Regulatory: 1, "Line card": 2, Earnings: 3 },
  analyst: { News: 1, Filing: 4, Regulatory: 2, "Line card": 1, Earnings: 3 },
};

const RELEVANCE = { high: 3, medium: 1, low: -2 } as const;

function firstSentence(text: string, max = 160): string {
  const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function recency(iso: string, now: number): number {
  const days = (now - new Date(iso).getTime()) / DAY;
  return Math.max(0, 7 - days) * 0.3;
}

export function buildFeed({
  role,
  articles,
  angles,
  moves,
  releases,
  now = Date.now(),
  days = 7,
  limit = 8,
}: {
  role: RoleId;
  articles: LiveArticle[];
  angles: Angles | null;
  moves: Move[];
  releases: ReleaseEvent[];
  now?: number;
  days?: number;
  limit?: number;
}): FeedItem[] {
  const since = now - days * DAY;
  const w = WEIGHT[role];
  const items: FeedItem[] = [];

  for (const a of articles) {
    if (new Date(a.publishedAt).getTime() < since) continue;
    const type: FeedType = a.kind === "filing" ? "Filing" : a.kind === "regulatory" ? "Regulatory" : "News";
    const angle = angles?.byId[a.id];
    let score = w[type] + recency(a.publishedAt, now) + (angle ? RELEVANCE[angle.relevance] : 0);
    if (role === "supplier" && a.suppliers.length) score += 2;
    if (role === "sales" && a.endMarkets.length) score += 2;
    if (role === "strategy" && (a.segments.length || a.regions.length)) score += 1;
    if (role === "executive" && angle?.relevance === "high") score += 2;
    items.push({
      id: `a-${a.id}`,
      type,
      title: a.title,
      why: angle?.angle ?? (a.summary ? firstSentence(a.summary) : undefined),
      source: a.outlet,
      date: a.publishedAt,
      url: a.url,
      score,
    });
  }

  for (const m of moves) {
    if (new Date(m.date).getTime() < since) continue;
    let score = w["Line card"] + recency(m.date, now);
    if (m.distributor.avnet) score += role === "executive" || role === "supplier" ? 3 : 1;
    const party = m.supplier ? ` and ${m.supplier}` : "";
    items.push({
      id: `m-${m.id}`,
      type: "Line card",
      title: m.title,
      why: `${m.ended ? "Agreement ending" : "New or expanded agreement"} between ${m.distributor.name}${party}.`,
      source: m.outlet,
      date: m.date,
      url: m.url,
      score,
    });
  }

  for (const r of releases) {
    if (r.status !== "reported" || !r.url) continue;
    const iso = `${r.date}T12:00:00Z`;
    if (new Date(iso).getTime() < since) continue;
    let score = w.Earnings + recency(iso, now);
    if (r.company.cohort === "distributor") score += role === "executive" || role === "strategy" ? 3 : 1;
    if (r.company.cohort === "manufacturer" && role === "supplier") score += 2;
    items.push({
      id: `e-${r.company.slug}-${r.date}`,
      type: "Earnings",
      title: `${r.company.name} reported quarterly results`,
      why: "Earnings release filed with the SEC (8-K).",
      source: "SEC EDGAR",
      date: iso,
      url: r.url,
      score,
    });
  }

  return items.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date)).slice(0, limit);
}
