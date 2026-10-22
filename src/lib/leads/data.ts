// Lead Finder data: each customer company's latest quarter and news (live),
// and Avnet's business with it (mock, the same figures Company Profile and QBR
// Prep show). Server-only; the ranking itself is the pure rank.ts.
import { day, quarterName } from "@/lib/ask/sentences";
import { newsFor } from "@/lib/data/live/company-news";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getLiveNews } from "@/lib/data/live/news";
import type { LiveArticle } from "@/lib/data/live/shared";
import type { Primer } from "@/lib/learn/content";
import { avnetBusinessMock } from "@/components/network/company-profile";
import { CUSTOMERS, PRIMER_TERMS, rank, type Lead, type LeadInput } from "./rank";

export interface Business {
  rows: { label: string; value: string }[];
  hookups: string[];
}

export type LeadRow = Lead & { business: Business; error?: boolean };

const DAY = 86_400_000;

async function input(
  c: (typeof CUSTOMERS)[number],
  feed: LiveArticle[],
  terms: RegExp | undefined,
  now: number,
): Promise<LeadInput & { error?: boolean }> {
  const earnings = await getCompanyEarnings(c.slug).catch(() => null);
  const news = newsFor(c, feed, 6);
  const qs = earnings?.quarters ?? [];
  const latest = qs[qs.length - 1];
  const yearAgo = qs[qs.length - 5];
  const thisYear = new Date(now).getFullYear();
  return {
    company: c,
    quarter: latest ? quarterName(latest.calendarLabel) : undefined,
    revenue: latest?.values.revenue,
    growth: latest?.values.revenueYoY,
    inventoryDays: latest?.values.inventoryDays,
    inventoryDaysYearAgo: yearAgo?.values.inventoryDays,
    stories: news.map((a) => ({
      title: a.title,
      outlet: a.outlet,
      date: day(a.publishedAt.slice(0, 10), thisYear),
      url: a.url,
      age: Math.floor((now - Date.parse(a.publishedAt)) / DAY),
      onTechnology: Boolean(terms?.test(`${a.title} ${a.summary}`)),
    })),
    error: !earnings || Boolean(earnings.error),
  };
}

/** Every customer company whose market uses the technology, ranked, with Avnet's (mock) business with each. */
export async function getLeads(primer: Primer): Promise<LeadRow[]> {
  const now = Date.now();
  // One read of the news feed for every company, not one each.
  const feed = (await getLiveNews().catch(() => null))?.articles ?? [];
  const inputs = await Promise.all(CUSTOMERS.map((c) => input(c, feed, PRIMER_TERMS[primer.slug], now)));
  const errors = new Map(inputs.map((i) => [i.company.slug, i.error]));
  return rank(inputs, primer).map((l) => {
    const b = avnetBusinessMock(l.company);
    return { ...l, business: { rows: b.rows, hookups: b.hookups }, error: errors.get(l.company.slug) };
  });
}
