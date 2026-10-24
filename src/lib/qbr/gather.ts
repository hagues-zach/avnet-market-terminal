// Everything a QBR brief shows, gathered once, so the page, Claude's talking points
// (src/lib/qbr/talking-points.ts) and the dev-only eval all read the same data.
// Server-only.
import { getCommentary } from "@/lib/ai/commentary";
import { readCache } from "@/lib/ai/cache";
import type { Angle } from "@/lib/ai/news-angles";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getRevenueMix } from "@/lib/data/live/revenue-mix";
import { getCompanyNews } from "@/lib/data/live/company-news";
import { getCycle } from "@/lib/data/live/cycle";
import { roleOf, type Company } from "@/lib/data/live/earnings-model";
import { getCarriers } from "@/lib/line-cards/analysis";
import { getMoves } from "@/lib/line-cards/moves";
import { avnetBusinessMock, glance, yearAgo } from "@/components/network/company-profile";
import type { Setup } from "./setup";

export type BriefSetup = Setup & { company: Company };
export type Brief = Awaited<ReturnType<typeof gatherBrief>>;

export async function gatherBrief({ company }: BriefSetup) {
  const supplier = roleOf(company) === "supplier";
  const [earnings, mix, commentary, news, cycle, carriers, moves, angles] = await Promise.all([
    getCompanyEarnings(company.slug),
    getRevenueMix(company.slug),
    getCommentary(company.slug),
    getCompanyNews(company, 4).catch(() => []),
    getCycle().catch(() => null),
    supplier ? getCarriers(company.name).catch(() => null) : Promise.resolve(null),
    supplier ? getMoves().catch(() => null) : Promise.resolve(null),
    readCache<Angle>("news-angles-v1"),
  ]);

  const q = earnings.quarters[earnings.quarters.length - 1];
  const p = q ? yearAgo(earnings.quarters, q) : undefined;
  const v = q?.values ?? {};
  const lines = glance(earnings, mix);
  const name = company.name.toLowerCase();
  const companyMoves = (moves?.moves ?? []).filter((m) => m.title.toLowerCase().includes(name) || m.supplier?.toLowerCase().includes(name)).slice(0, 3);
  const gm = v.grossMargin !== undefined && p?.values.grossMargin !== undefined ? v.grossMargin - p.values.grossMargin : undefined;
  const inv = v.inventoryDays !== undefined && p?.values.inventoryDays !== undefined ? Math.round(v.inventoryDays - p.values.inventoryDays) : undefined;
  const onAvnet = carriers?.hasHome ? carriers.carriers.some((c) => c.slug === "avnet") : null;
  // The summary carries the headline fact and the backdrop; each section then adds something new.
  const summary = [lines[0], cycle?.phase ? `The semiconductor cycle is in ${cycle.phase.toLowerCase()}.` : undefined].filter(Boolean).join(" ");

  return {
    supplier,
    earnings,
    commentary,
    digest: commentary.digest,
    news,
    angles: Object.fromEntries(news.filter((a) => angles[a.id]).map((a) => [a.id, angles[a.id].angle])) as Record<string, string>,
    cycle,
    carriers,
    companyMoves,
    business: avnetBusinessMock(company),
    q,
    p,
    v,
    lines,
    gm,
    inv,
    onAvnet,
    summary,
  };
}
