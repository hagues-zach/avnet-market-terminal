// Minimal RSS 2.0 / Atom reader for the open-data news adapters. Dependency-free on
// purpose: feeds are only mined for headline, link, date, a short snippet and the
// publisher's own category labels.

export interface RawFeedItem {
  title: string;
  url: string;
  publishedAt: string | null; // ISO
  snippet: string;
  categories: string[];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Feed text → plain text: unwrap CDATA, decode entities, drop markup. */
export function toPlainText(raw: string): string {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Decode twice: descriptions are often entity-escaped HTML with entities inside.
  const text = decodeEntities(decodeEntities(unwrapped).replace(/<[^>]+>/g, " "));
  return text.replace(/\s+/g, " ").trim();
}

function tagText(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : null;
}

function allTagText(block: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  return Array.from(block.matchAll(re), (m) => m[1]);
}

function linkOf(block: string): string {
  const text = tagText(block, "link");
  if (text && toPlainText(text)) return toPlainText(text);
  // Atom: <link rel="alternate" href="..."/>
  const links = Array.from(block.matchAll(/<link\b([^>]*)\/?>/gi), (m) => m[1]);
  const pick = links.find((a) => /rel=["']alternate["']/i.test(a)) ?? links.find((a) => !/rel=/i.test(a)) ?? links[0];
  const href = pick?.match(/href=["']([^"']+)["']/i)?.[1];
  return href ? decodeEntities(href) : "";
}

const MAX_SNIPPET = 220;

function snippetOf(block: string): string {
  const raw = tagText(block, "description") ?? tagText(block, "summary") ?? "";
  // WordPress feeds append "The post … appeared first on …".
  const text = toPlainText(raw).replace(/\s*The post .* appeared first on .*$/i, "");
  if (text.length <= MAX_SNIPPET) return text;
  const cut = text.slice(0, MAX_SNIPPET);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_SNIPPET - 40))}…`;
}

function dateOf(block: string): string | null {
  const raw = tagText(block, "pubDate") ?? tagText(block, "dc:date") ?? tagText(block, "published") ?? tagText(block, "updated");
  if (!raw) return null;
  const t = Date.parse(toPlainText(raw));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseFeed(xml: string): RawFeedItem[] {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const items: RawFeedItem[] = [];
  for (const block of blocks) {
    const title = toPlainText(tagText(block, "title") ?? "");
    const url = linkOf(block);
    if (!title || !/^https?:\/\//i.test(url)) continue;
    const atomCats = Array.from(block.matchAll(/<category\b[^>]*\bterm=["']([^"']+)["']/gi), (m) => decodeEntities(m[1]));
    items.push({
      title,
      url,
      publishedAt: dateOf(block),
      snippet: snippetOf(block),
      categories: [...allTagText(block, "category").map(toPlainText), ...atomCats].filter(Boolean),
    });
  }
  return items;
}
