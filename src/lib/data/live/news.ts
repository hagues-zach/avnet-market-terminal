import { parseFeed } from "./rss";
import { getFilings } from "./filings";
import { getRegulatory } from "./regulatory";
import { fetchText, type ArticleKind, type LiveArticle, type LiveNews, type SourceStatus } from "./shared";
import { isOnTopic, tagArticle } from "./tagging";

export type { LiveArticle, LiveNews, SourceStatus } from "./shared";

// Open-data Market News: public trade-press RSS plus GDELT's open news index,
// merged with SEC filings and Federal Register notices. Server-only. Each source
// is fetched independently so one outage never blanks the page.

// GDELT is supplementary and often throttled; don't let it hold the page.
const GDELT_TIMEOUT_MS = 4000;
const MAX_PER_SOURCE = 25;
const MAX_ARTICLES = 200;
// News goes stale fast; filings and rules are sparser and stay relevant longer.
const MAX_AGE_DAYS: Record<ArticleKind, number> = { news: 14, filing: 45, regulatory: 45 };

interface RssSource {
  outlet: string;
  url: string;
  /** Broad electronics/tech feeds only keep items that pick up a semiconductor tag. */
  screen?: boolean;
}

const RSS_SOURCES: RssSource[] = [
  { outlet: "EE Times", url: "https://www.eetimes.com/feed/" },
  { outlet: "EPS News", url: "https://www.eetimes.com/epsnews/feed/" },
  { outlet: "Semiconductor Engineering", url: "https://semiengineering.com/feed/" },
  { outlet: "Semiconductor Digest", url: "https://www.semiconductor-digest.com/feed/" },
  { outlet: "TrendForce", url: "https://www.trendforce.com/news/feed/" },
  { outlet: "DigiTimes", url: "https://www.digitimes.com/rss/daily.xml", screen: true },
  { outlet: "Power Electronics News", url: "https://www.powerelectronicsnews.com/feed/" },
  { outlet: "Electronics Weekly", url: "https://www.electronicsweekly.com/feed/", screen: true },
  { outlet: "eeNews Europe", url: "https://www.eenewseurope.com/en/feed/", screen: true },
  { outlet: "EDN", url: "https://www.edn.com/feed/", screen: true },
  { outlet: "All About Circuits", url: "https://www.allaboutcircuits.com/rss/news/", screen: true },
];

const GDELT_URL =
  "https://api.gdeltproject.org/api/v2/doc/doc?" +
  new URLSearchParams({
    query: '(semiconductor OR chipmaker OR "chip maker") sourcelang:english',
    mode: "artlist",
    format: "json",
    maxrecords: "75",
    timespan: "3d",
    sort: "datedesc",
  }).toString();

function toArticle(
  outlet: string,
  item: { title: string; url: string; publishedAt: string | null; snippet: string; categories: string[] },
): { article: LiveArticle; onTopic: boolean } | null {
  if (!item.publishedAt) return null;
  const tags = tagArticle([item.title, item.snippet, item.categories.join(" · ")].join(" \n "));
  return {
    article: { id: item.url, kind: "news", title: item.title, summary: item.snippet, outlet, url: item.url, publishedAt: item.publishedAt, ...tags },
    onTopic: isOnTopic(tags),
  };
}

async function fromRss(source: RssSource): Promise<LiveArticle[]> {
  const items = parseFeed(await fetchText(source.url));
  const out: LiveArticle[] = [];
  for (const item of items) {
    const mapped = toArticle(source.outlet, item);
    if (!mapped || (source.screen && !mapped.onTopic)) continue;
    out.push(mapped.article);
  }
  return out.slice(0, MAX_PER_SOURCE);
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string; // 20261011T121500Z
  domain?: string;
}

function gdeltDate(seen: string | undefined): string | null {
  const m = seen?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z` : null;
}

async function fromGdelt(): Promise<LiveArticle[]> {
  // GDELT answers rate-limit and error cases with plain text, so JSON.parse throws
  // and the source is reported as down rather than silently empty.
  const body = JSON.parse(await fetchText(GDELT_URL, GDELT_TIMEOUT_MS)) as { articles?: GdeltArticle[] };
  const out: LiveArticle[] = [];
  for (const a of body.articles ?? []) {
    if (!a.title || !a.url || !/^https?:\/\//i.test(a.url)) continue;
    const mapped = toArticle(a.domain ?? "GDELT", {
      title: a.title.replace(/\s+/g, " ").trim(),
      url: a.url,
      publishedAt: gdeltDate(a.seendate),
      snippet: "",
      categories: [],
    });
    if (mapped?.onTopic) out.push(mapped.article);
  }
  return out.slice(0, MAX_PER_SOURCE);
}

const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const urlKey = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

export async function getLiveNews(): Promise<LiveNews> {
  const jobs: { outlet: string; run: () => Promise<LiveArticle[]> }[] = [
    ...RSS_SOURCES.map((s) => ({ outlet: s.outlet, run: () => fromRss(s) })),
    { outlet: "GDELT", run: fromGdelt },
    { outlet: "SEC EDGAR", run: getFilings },
    { outlet: "Federal Register", run: getRegulatory },
  ];
  const settled = await Promise.allSettled(jobs.map((j) => j.run()));

  const now = Date.now();
  const sources: SourceStatus[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const articles: LiveArticle[] = [];

  // Trade press is listed first, so it wins a duplicate over the GDELT copy.
  settled.forEach((result, i) => {
    const { outlet } = jobs[i];
    if (result.status === "rejected") {
      sources.push({ outlet, ok: false, count: 0 });
      return;
    }
    let count = 0;
    for (const a of result.value) {
      const t = Date.parse(a.publishedAt);
      if (t < now - MAX_AGE_DAYS[a.kind] * 86_400_000 || t > now + 86_400_000) continue;
      const u = urlKey(a.url);
      const k = titleKey(a.title);
      if (seenUrls.has(u) || seenTitles.has(k)) continue;
      seenUrls.add(u);
      seenTitles.add(k);
      articles.push(a);
      count += 1;
    }
    sources.push({ outlet, ok: true, count });
  });

  articles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { articles: articles.slice(0, MAX_ARTICLES), sources, fetchedAt: new Date(now).toISOString() };
}
