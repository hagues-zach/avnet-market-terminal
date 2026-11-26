import type { DeckInput, WriteResult } from "./commentary";

// The deck commentary eval: real-shaped trays (commentary.fixtures.ts) through
// writeDeckCommentary, and for each deck what grounding dropped, how long the
// headlines run and which sections came back empty. The checks are pure and are
// tested offline against planted mistakes (commentary-eval.test.ts).
//
//   npx tsx scripts/deck-commentary-eval.ts          offline: a fake client with canned answers
//   npx tsx --env-file=.env.local scripts/deck-commentary-eval.ts --live
//                                                    one real call per deck (about $0.05 a deck)

/** The prompt asks for at most 14 words; past this a headline reads as a label or a paragraph. */
export const HEADLINE_WORDS = 14;
/** Sonnet 5.5, per million tokens. */
const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 };

export interface DeckReport {
  name: string;
  status: WriteResult["status"];
  message?: string;
  slides: number;
  written: number;
  dropped: string[];
  headlineWords: number[];
  longHeadlines: string[];
  /** "<slide id>: no sentence", "<slide id>: 1 bullet", "summary: 2 lines", "<slide id>: no commentary". */
  empty: string[];
  /** Headlines that fell back to the reader's point or the card's own. */
  fallbacks: string[];
  dollars: number;
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** What one deck's result says about the commentary. Pure. */
export function checkDeck(name: string, input: DeckInput, r: WriteResult): DeckReport {
  const shipped = input.items.filter((x) => x.included);
  const empty: string[] = [];
  const fallbacks: string[] = [];
  const headlineWords: number[] = [];
  const longHeadlines: string[] = [];
  for (const x of shipped) {
    const c = r.slides[x.id];
    if (!c) {
      empty.push(`${x.id}: no commentary`);
      continue;
    }
    const n = words(c.headline);
    headlineWords.push(n);
    if (n > HEADLINE_WORDS) longHeadlines.push(`${x.id}: ${c.headline}`);
    if (c.headline === x.note?.trim() || c.headline === x.preview.headline) fallbacks.push(x.id);
    if (!c.text) empty.push(`${x.id}: no sentence`);
    // Two-column slides keep their own columns, so they need no bullets.
    if (c.bullets.length < 2 && !x.preview.groups?.length) empty.push(`${x.id}: ${c.bullets.length} ${c.bullets.length === 1 ? "bullet" : "bullets"}`);
  }
  const lines = r.summary?.lines.length ?? 0;
  if (lines < 3) empty.push(`summary: ${lines} ${lines === 1 ? "line" : "lines"}`);
  const u = r.usage;
  return {
    name,
    status: r.status,
    ...(r.message ? { message: r.message } : {}),
    slides: shipped.length,
    written: shipped.filter((x) => r.slides[x.id]).length,
    dropped: r.dropped,
    headlineWords,
    longHeadlines,
    empty,
    fallbacks,
    dollars: (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead + u.cacheWrite * PRICE.cacheWrite) / 1e6,
  };
}

/** The reports as a plain-text table, then the details. Pure. */
export function formatReports(reports: DeckReport[]): string {
  const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
  const rows = reports.map(
    (r) =>
      `${r.name.padEnd(32)} ${r.status.padEnd(6)} ${`${r.written}/${r.slides}`.padStart(5)} ${String(r.dropped.length).padStart(7)} ${String(median(r.headlineWords)).padStart(9)} ${String(r.longHeadlines.length).padStart(5)} ${String(r.empty.length).padStart(5)}  $${r.dollars.toFixed(3)}`,
  );
  const details = reports.flatMap((r) =>
    [...(r.message ? [`  message: ${r.message}`] : []), ...r.dropped.map((d) => `  dropped: ${d}`), ...r.longHeadlines.map((h) => `  long headline: ${h}`), ...r.empty.map((e) => `  empty: ${e}`), ...r.fallbacks.map((f) => `  headline fell back: ${f}`)].map(
      (l) => `${r.name}${l}`,
    ),
  );
  return [`${"Deck".padEnd(32)} ${"Status".padEnd(6)} ${"Slides".padStart(5)} ${"Dropped".padStart(7)} ${"Med words".padStart(9)} ${"Long".padStart(5)} ${"Empty".padStart(5)}  Cost`, ...rows, "", ...details].join("\n");
}
