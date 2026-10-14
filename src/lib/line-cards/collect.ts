import { cleanName, DISTRIBUTORS, type Snapshot } from "./model";

// Reads the manufacturer listing of each distributor whose public page can be
// fetched normally. One page per distributor per run. Sites that challenge or
// block automated requests are not collected; they use the import form.
// Server-only.

const USER_AGENT = "MarketTerminal/0.1 (line card snapshot)";
const TIMEOUT_MS = 30_000;
// A page that parses to fewer names than this has probably changed layout or
// returned an error page; do not store it as a snapshot.
const MIN_PLAUSIBLE = 50;

type Parser = (html: string) => string[];

const PARSERS: Record<string, Parser> = {
  // <a href="/content/ttiinc/en/manufacturers/3m.html">3M</a>
  tti: (html) => Array.from(html.matchAll(/<a[^>]+href="[^"]*\/manufacturers\/[^"]*"[^>]*>\s*([^<]{2,80})</g), (m) => m[1]),
  // <div class="title" itemprop="name">AAEON</div>
  future: (html) => Array.from(html.matchAll(/<div class="title" itemprop="name">\s*([^<]{2,80})</g), (m) => m[1]),
  // <a href="/b/3m">3M</a>
  newark: (html) => Array.from(html.matchAll(/<a[^>]+href="[^"]*\/b\/[^"]+"[^>]*>\s*([^<]{2,80})</g), (m) => m[1]),
};

// Future Electronics' robots.txt asks crawlers to visit only between 04:00 and
// 08:45 UTC. Honour it.
const VISIT_WINDOWS: Record<string, [startMinute: number, endMinute: number]> = { future: [4 * 60, 8 * 60 + 45] };

export interface CollectResult {
  distributor: string;
  ok: boolean;
  count?: number;
  message: string;
  snapshot?: Snapshot;
}

async function collectOne(slug: string, url: string, today: string, now: Date): Promise<CollectResult> {
  const window = VISIT_WINDOWS[slug];
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (window && (minute < window[0] || minute > window[1])) {
    return { distributor: slug, ok: false, message: "Skipped: this site asks to be read only between 04:00 and 08:45 UTC." };
  }
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { distributor: slug, ok: false, message: `The site returned ${res.status}.` };
    const names = Array.from(new Set(PARSERS[slug](await res.text()).map(cleanName).filter((n) => n.length >= 2)));
    if (names.length < MIN_PLAUSIBLE) {
      return { distributor: slug, ok: false, message: `Only ${names.length} names found, so the page layout has probably changed. Nothing was saved.` };
    }
    return {
      distributor: slug,
      ok: true,
      count: names.length,
      message: `${names.length} suppliers saved.`,
      snapshot: { distributor: slug, date: today, method: "collected", source: url, suppliers: names },
    };
  } catch (e) {
    return { distributor: slug, ok: false, message: e instanceof Error ? e.message : "Request failed." };
  }
}

export async function collectAll(): Promise<CollectResult[]> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const targets = DISTRIBUTORS.filter((d) => d.sourceUrl && PARSERS[d.slug]);
  return Promise.all(targets.map((d) => collectOne(d.slug, d.sourceUrl!, today, now)));
}
