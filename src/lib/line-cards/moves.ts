import { supplierKey } from "./model";

// Franchise moves: announced distribution agreements between a distributor and a
// supplier, picked out of public news headlines. Unlike the line card snapshots,
// this covers distributors whose sites cannot be read (Avnet, Arrow, Mouser,
// DigiKey) and says when something changed. Server-only.

const REVALIDATE_SECONDS = 6 * 60 * 60;
const USER_AGENT = "MarketTerminal/0.1 (news reader)";
const TIMEOUT_MS = 15_000;
const MAX_AGE_DAYS = 365;
const DAY = 86_400_000;

export interface MoveDistributor {
  slug: string;
  name: string;
  /** Avnet itself or a business Avnet owns. */
  avnet: boolean;
}

// Order matters: Avnet's own brands are checked before the bare word "Avnet".
const DISTRIBUTOR_PATTERNS: [RegExp, MoveDistributor][] = [
  [/\bAvnet Silica\b/i, { slug: "avnet", name: "Avnet (Silica)", avnet: true }],
  [/\bAvnet Abacus\b/i, { slug: "avnet", name: "Avnet (Abacus)", avnet: true }],
  [/\bEBV( Elektronik)?\b/, { slug: "avnet", name: "Avnet (EBV)", avnet: true }],
  [/\b(Farnell|Newark|element14)\b/i, { slug: "newark", name: "Farnell (Avnet)", avnet: true }],
  [/\bAvnet\b/i, { slug: "avnet", name: "Avnet", avnet: true }],
  [/\bArrow( Electronics)?\b/, { slug: "arrow", name: "Arrow", avnet: false }],
  [/\bMouser( Electronics)?\b/i, { slug: "mouser", name: "Mouser", avnet: false }],
  [/\bDigi-?Key( Electronics)?\b/i, { slug: "digikey", name: "DigiKey", avnet: false }],
  [/\bTTI\b/, { slug: "tti", name: "TTI", avnet: false }],
  [/\bFuture Electronics\b/i, { slug: "future", name: "Future Electronics", avnet: false }],
  [/\bRutronik\b/i, { slug: "rutronik", name: "Rutronik", avnet: false }],
  [/\bRS (Group|Components)\b/, { slug: "rs", name: "RS Group", avnet: false }],
  [/\bWPG( Holdings)?\b/, { slug: "wpg", name: "WPG", avnet: false }],
  [/\bWT Micro(electronics)?\b/i, { slug: "wt-micro", name: "WT Microelectronics", avnet: false }],
  [/\bMacnica\b/i, { slug: "macnica", name: "Macnica", avnet: false }],
  [/\bRichardson (RFPD|Electronics)\b/i, { slug: "richardson", name: "Richardson", avnet: false }],
  [/\bSager( Electronics)?\b/, { slug: "sager", name: "Sager", avnet: false }],
  [/\bMaster Electronics\b/i, { slug: "master", name: "Master Electronics", avnet: false }],
  [/\bHeilind\b/i, { slug: "heilind", name: "Heilind", avnet: false }],
  [/\bSymmetry Electronics\b/i, { slug: "symmetry", name: "Symmetry Electronics", avnet: false }],
  [/\bRochester Electronics\b/i, { slug: "rochester", name: "Rochester Electronics", avnet: false }],
];

const SEARCH_NAMES = "Avnet OR Arrow OR Mouser OR DigiKey OR TTI OR \"Future Electronics\" OR Farnell OR Rutronik OR \"Avnet Silica\" OR EBV OR Macnica";
const QUERIES = [
  `("distribution agreement" OR "distribution deal" OR "franchise agreement") (${SEARCH_NAMES})`,
  `("global distribution" OR "authorized distributor" OR "line card") electronic components (${SEARCH_NAMES})`,
];
// A headline has to read like an agreement, not just mention a distributor.
const IS_MOVE = /\b(distribution|distributor|franchis\w*|line ?card)\b/i;

export interface Move {
  id: string;
  date: string; // ISO
  distributor: MoveDistributor;
  /** The other party, when it could be read out of the headline. */
  supplier?: string;
  /** True when the headline reports an agreement ending rather than starting. */
  ended: boolean;
  title: string;
  outlet: string;
  url: string;
}

export interface Moves {
  moves: Move[]; // newest first
  byDistributor: { distributor: MoveDistributor; count: number }[];
  error?: string;
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

// Words that end a company name in a headline. Headlines are often title-cased,
// so capital letters alone cannot tell a name from the words around it.
const VERBS = ["sign", "signs", "signed", "ink", "inks", "announce", "announces", "expand", "expands", "extend", "extends", "enter", "enters", "secure", "secures", "add", "adds", "appoint", "appoints", "name", "names", "select", "selects", "partner", "partners", "strengthen", "strengthens", "terminate", "terminates", "end", "ends", "renew", "renews"];
const STOP = new Set([
  ...VERBS,
  "and", "with", "for", "to", "in", "on", "by", "of", "as", "across", "through", "the", "a", "an", "its", "new", "top", "global", "strategic", "distribution",
  "distributor", "agreement", "deal", "partnership", "footprint", "enterprise", "technology", "in-stock", "line", "authorized",
]);
const GENERIC = /^(customers?|suppliers?|manufacturers?|parts?|products?|portfolio|nearly|over|more|sources?)\b/i;
const DESCRIPTOR = /^(specialist|maker|provider|manufacturer|supplier|vendor|developer|leader|company|firm)$/i;
// The agreement being ended is as useful to know as one being signed.
const ENDED = /\b(terminat\w*|ends?|ending|cancel\w*|drops?|exits?)\b/i;
// Awards, rankings and warehouse stories mention distribution without being an agreement.
const NOT_A_MOVE = /\b(awards?|honou?rs?|ranks?|ranking|recogni[sz]\w*|distributor of the year|wins?|distribution cent(er|re))\b/i;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
const bare = (w: string) => w.replace(/[,:;|]+$/, "");

/** The run of name-like words at the start of `text`: capitalised, up to four, ending at a stop word. */
function lead(text: string): { name: string; next?: string } {
  const out: string[] = [];
  const all = words(text);
  for (const raw of all) {
    const w = bare(raw);
    if (out.length === 4 || STOP.has(w.toLowerCase()) || !/^[A-Z0-9]/.test(w)) break;
    out.push(w);
    if (w !== raw) break; // punctuation ends the name
  }
  return { name: out.join(" "), next: all[out.length]?.toLowerCase() };
}

/** Best-effort: the party in the headline that is not the distributor. */
function supplierFrom(title: string, distributor: RegExp): string | undefined {
  const ok = (s: string) =>
    s.length >= 2 && !GENERIC.test(s) && !/^\d/.test(s) && !DISTRIBUTOR_PATTERNS.some(([re]) => re.test(s)) ? s.replace(/\s+(Corporation|Corp\.?|Inc\.?|Ltd\.?|GmbH|AG)$/i, "").trim() : undefined;

  // "... agreement with Supplier ...", and "... with UWB specialist TrueSense".
  const withAt = title.search(/\b[Ww]ith\s/);
  if (withAt >= 0) {
    const rest = words(title.slice(withAt)).slice(1);
    const d = rest.findIndex((w) => DESCRIPTOR.test(bare(w)));
    const found = ok(lead((d >= 0 && d <= 3 ? rest.slice(d + 1) : rest).join(" ")).name);
    if (found) return found;
  }
  // "Distributor and Supplier announce ..."
  const paired = title.replace(distributor, "").match(/^\s*(?:and|And|&)\s+(.*)$/);
  if (paired) {
    const found = ok(lead(paired[1]).name);
    if (found) return found;
  }
  // "Distributor extends Supplier distribution agreement ..."
  const all = words(title);
  const verbAt = all.findIndex((w) => VERBS.includes(bare(w).toLowerCase()));
  if (verbAt >= 0) {
    const object = lead(all.slice(verbAt + 1).join(" "));
    if (object.next === "distribution") {
      const found = ok(object.name);
      if (found) return found;
    }
  }
  // "Supplier and Distributor sign ...", "Supplier ends ... deal with Distributor"
  const first = lead(title);
  if (first.next && STOP.has(first.next) && !distributor.test(first.name)) return ok(first.name);
  return undefined;
}

async function search(query: string): Promise<string> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`News search returned ${res.status}`);
  return res.text();
}

export async function getMoves(): Promise<Moves> {
  const settled = await Promise.allSettled(QUERIES.map(search));
  const feeds = settled.filter((s): s is PromiseFulfilledResult<string> => s.status === "fulfilled").map((s) => s.value);
  if (!feeds.length) return { moves: [], byDistributor: [], error: "The news search could not be reached." };

  const cutoff = Date.now() - MAX_AGE_DAYS * DAY;
  const seen = new Set<string>();
  const moves: Move[] = [];
  for (const xml of feeds) {
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const rawTitle = decode(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const url = decode(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      const time = Date.parse(decode(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""));
      if (!rawTitle || !/^https?:\/\//.test(url) || Number.isNaN(time) || time < cutoff) continue;
      // Headlines arrive as "Title - Outlet".
      const cut = rawTitle.lastIndexOf(" - ");
      const title = cut > 0 ? rawTitle.slice(0, cut) : rawTitle;
      const outlet = decode(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "") || (cut > 0 ? rawTitle.slice(cut + 3) : "");
      if (!IS_MOVE.test(title) || NOT_A_MOVE.test(title)) continue;
      const hit = DISTRIBUTOR_PATTERNS.find(([re]) => re.test(title));
      if (!hit) continue;
      const [pattern, distributor] = hit;
      const supplier = supplierFrom(title, pattern);
      // The same announcement is carried by many outlets; keep the first seen.
      const key = supplier ? `${distributor.slug}|${supplierKey(supplier)}` : title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      moves.push({ id: url, date: new Date(time).toISOString(), distributor, supplier, ended: ENDED.test(title), title, outlet, url });
    }
  }
  moves.sort((a, b) => b.date.localeCompare(a.date));

  const counts = new Map<string, { distributor: MoveDistributor; count: number }>();
  for (const m of moves) {
    const row = counts.get(m.distributor.slug) ?? { distributor: { ...m.distributor, name: m.distributor.name.replace(/ \((Silica|Abacus|EBV)\)$/, "") }, count: 0 };
    row.count += 1;
    counts.set(m.distributor.slug, row);
  }
  return { moves, byDistributor: Array.from(counts.values()).sort((a, b) => b.count - a.count) };
}
