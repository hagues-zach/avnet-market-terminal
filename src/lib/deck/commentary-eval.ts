import type { DeckInput, WriteResult } from "./commentary";
import { exempt, figures } from "./evidence";
import type { Panel, Preview } from "./outline";
import type { StorylineInput, StorylineResult } from "./storyline";

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
  /** "<slide id>: <bullet>": bullets with no figure and no word from the slide's own labels. */
  filler: string[];
  /** Words in each slide's notes, as they ship. */
  noteWords: number[];
  /** Slides whose notes Claude wrote but none held up. */
  notesDropped: string[];
  /** Note sentences grounding dropped, and those cut at the notes' length limit. */
  noteSentencesDropped: number;
  /** Words in each slide's notes as Claude wrote them, before grounding and the length cap. */
  rawNoteWords: number[];
  dollars: number;
}

/* ---------- Filler ---------- */

// Words that name nothing on a slide: function words, and words every slide shares (Avnet is on all of them).
const STOP = new Set(
  (
    "the and for with from that this than into over each year years ago last next part total market sold through chart panel table " +
    "are is was were have has had will would can could should may might more most less very much many some any all its their our " +
    "why what how who when where which there here they them then also just only still even about against between across under " +
    "matter mean say says said show shows shown point points room watch track worth keep make take avnet supplier customer company compan"
  ).split(" "),
);

const panelLabels = (p: Panel): string[] =>
  [
    p.title,
    p.kicker,
    ...(p.metrics ?? []).map((m) => m.label),
    ...(p.rows ?? []).map((r) => r.title),
    ...(p.table ? [...p.table.columns, ...p.table.rows.map((r) => r.label)] : []),
    ...(p.bars?.labels ?? []),
    ...(p.pairs ?? []).map((x) => x.label),
    ...(p.notes ?? []).map((n) => n.title),
    ...(p.scatter ? [p.scatter.x.label, p.scatter.y.label, ...p.scatter.points.map((x) => x.label)] : []),
    p.figure?.note,
    p.spark?.label,
    // A text panel's words are what the slide says: a news story's summary is its content.
    p.lede,
    ...(p.paragraphs ?? []).map((x) => x.text),
  ].filter((x): x is string => Boolean(x));

const stem = (w: string) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?<=[a-z]{3})s$/, "");
const wordsOf = (s: string) => (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).map(stem);

/** The words a slide names things with: its series, rows, columns, metric and panel labels, and the card's title. Pure. */
export function labelWords(p: Preview, title = ""): Set<string> {
  const labels = [
    title,
    p.chart?.title,
    ...(p.chart?.series ?? []).flatMap((s) => [s.name, ...s.points.map((x) => x.label)]),
    ...(p.facts ?? []).map((f) => f.label),
    ...(p.columns ?? []),
    ...(p.groups ?? []).map((g) => g.title),
    ...(p.panels ?? []).flatMap(panelLabels),
  ].filter((x): x is string => Boolean(x));
  return new Set(labels.flatMap(wordsOf).filter((w) => !STOP.has(w)));
}

/** A bullet with no figure and no word from the slide's labels: generic advice, not something the slide shows. Pure. */
export function isFiller(bullet: string, labels: Set<string>): boolean {
  // A figure the grounding treats as data (not a year or a small count) is something the slide shows.
  if (figures(bullet).some((f) => !exempt(f))) return false;
  return !wordsOf(bullet).some((w) => labels.has(w) && !STOP.has(w));
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** What one deck's result says about the commentary. Pure. */
export function checkDeck(name: string, input: DeckInput, r: WriteResult): DeckReport {
  const shipped = input.items.filter((x) => x.included);
  const empty: string[] = [];
  const fallbacks: string[] = [];
  const headlineWords: number[] = [];
  const longHeadlines: string[] = [];
  const filler: string[] = [];
  const noteWords: number[] = [];
  const notesDropped: string[] = [];
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
    const labels = labelWords(x.preview, x.title);
    for (const b of c.bullets) if (isFiller(b, labels)) filler.push(`${x.id}: ${b}`);
    if (c.notes) noteWords.push(words(c.notes));
    else if (r.raw?.slides.find((s) => s.id === x.id)?.notes?.trim()) notesDropped.push(x.id);
  }
  // A one-slide deck has no summary by design; a longer one needs at least three lines.
  const lines = r.summary?.lines.length ?? 0;
  if (shipped.length >= 2 && lines < 3) empty.push(`summary: ${lines} ${lines === 1 ? "line" : "lines"}`);
  if (shipped.length < 2 && lines) empty.push(`summary: ${lines} ${lines === 1 ? "line" : "lines"} on a one-slide deck`);
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
    filler,
    noteWords,
    notesDropped,
    noteSentencesDropped: r.dropped.filter((d) => / notes: /.test(d)).length,
    rawNoteWords: shipped.map((x) => r.raw?.slides.find((s) => s.id === x.id)?.notes?.trim()).filter((n): n is string => Boolean(n)).map(words),
    dollars: (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead + u.cacheWrite * PRICE.cacheWrite) / 1e6,
  };
}

/** The reports as a plain-text table, then the details. Pure. */
export function formatReports(reports: DeckReport[]): string {
  const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
  const cols: [string, number][] = [["Slides", 6], ["Dropped", 7], ["Med words", 9], ["Long", 4], ["Empty", 5], ["Filler", 6], ["Note words", 10], ["Notes off", 9], ["Sent. off", 9]];
  const rows = reports.map((r) =>
    [
      r.name.padEnd(32),
      r.status.padEnd(6),
      ...[`${r.written}/${r.slides}`, r.dropped.length, median(r.headlineWords), r.longHeadlines.length, r.empty.length, r.filler.length, median(r.noteWords), r.notesDropped.length, r.noteSentencesDropped].map((v, k) => String(v).padStart(cols[k][1])),
      ` $${r.dollars.toFixed(3)}`,
    ].join(" "),
  );
  const details = reports.flatMap((r) =>
    [
      ...(r.message ? [`  message: ${r.message}`] : []),
      ...r.dropped.map((d) => `  dropped: ${d}`),
      ...r.longHeadlines.map((h) => `  long headline: ${h}`),
      ...r.empty.map((e) => `  empty: ${e}`),
      ...r.fallbacks.map((f) => `  headline fell back: ${f}`),
      ...r.filler.map((f) => `  filler: ${f}`),
      ...(r.noteWords.length ? [`  note words: ${r.noteWords.join(", ")}`] : []),
      ...(r.rawNoteWords.length ? [`  note words as written: ${r.rawNoteWords.join(", ")}`] : []),
      ...r.notesDropped.map((n) => `  notes dropped: ${n}`),
    ].map((l) => `${r.name}${l}`),
  );
  const head = ["Deck".padEnd(32), "Status".padEnd(6), ...cols.map(([c, w]) => c.padStart(w)), " Cost"].join(" ");
  return [head, ...rows, "", ...details].join("\n");
}

/* ---------- The storyline ---------- */

export interface StorylineReport {
  name: string;
  status: StorylineResult["status"];
  message?: string;
  expect: "reorder" | "keep";
  /** Slides whose position changed. */
  moved: number;
  reasons: number;
  sections: string[];
  dropped: string[];
  /** For "reorder": every market slide comes before every detail slide. For "keep": two moves at most. */
  pass: boolean;
  order: string[];
  dollars: number;
}

/** What one storyline answer says about the order. Pure. */
export function checkStoryline(
  name: string,
  input: StorylineInput,
  r: StorylineResult,
  expect: "reorder" | "keep",
  groups: { market: string[]; detail: string[] },
): StorylineReport {
  const ids = input.items.filter((x) => x.included).map((x) => x.id);
  const order = r.order ?? [];
  const moved = order.filter((id, i) => ids[i] !== id).length;
  const at = (set: string[]) => set.map((id) => order.indexOf(id)).filter((i) => i >= 0);
  const pass = r.status === "ok" && (expect === "keep" ? moved <= 2 : Math.max(-1, ...at(groups.market)) < Math.min(Infinity, ...at(groups.detail)));
  const u = r.usage;
  return {
    name,
    status: r.status,
    ...(r.message ? { message: r.message } : {}),
    expect,
    moved,
    reasons: Object.keys(r.reasons).length,
    sections: Object.values(r.sections),
    dropped: r.dropped,
    pass,
    order,
    dollars: (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead + u.cacheWrite * PRICE.cacheWrite) / 1e6,
  };
}

/** The storyline reports as a plain-text table, then each order. Pure. */
export function formatStoryline(reports: StorylineReport[]): string {
  const rows = reports.map(
    (r) =>
      `${r.name.padEnd(40)} ${r.status.padEnd(6)} ${r.expect.padEnd(7)} ${String(r.moved).padStart(5)} ${String(r.reasons).padStart(7)} ${String(r.sections.length).padStart(8)} ${String(r.dropped.length).padStart(7)} ${(r.pass ? "pass" : "FAIL").padStart(5)}  $${r.dollars.toFixed(3)}`,
  );
  const details = reports.flatMap((r) =>
    [
      ...(r.message ? [`  message: ${r.message}`] : []),
      `  order: ${r.order.join(" > ")}`,
      ...(r.sections.length ? [`  sections: ${r.sections.join(" | ")}`] : []),
      ...r.dropped.map((d) => `  dropped: ${d}`),
    ].map((l) => `${r.name}${l}`),
  );
  const head = `${"Storyline".padEnd(40)} ${"Status".padEnd(6)} ${"Expect".padEnd(7)} ${"Moved".padStart(5)} ${"Reasons".padStart(7)} ${"Sections".padStart(8)} ${"Dropped".padStart(7)} ${"Pass".padStart(5)}  Cost`;
  return [head, ...rows, "", ...details].join("\n");
}
