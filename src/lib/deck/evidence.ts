import { plainDashes } from "@/lib/ai/dashes";
import type { Panel, PanelCell, Preview } from "./outline";
import { formatFigure } from "./slides";

// What a slide shows, as text, and the check that every figure Claude writes on
// it is one the slide has, with the same sign and unit (Add to deck, Phase 2).
// Pure, and safe in the browser: the review page, the PDF and the PowerPoint all
// re-check saved commentary with it as the slide is built, so nothing Claude
// wrote reaches a slide unchecked, whether it came from the call, the cache or
// the browser's saved tray.

/** One slide's evidence, as text; a full scatter is a few thousand characters. */
const MAX_EVIDENCE = 8000;

const pctText = (v: number, signed: boolean) => {
  const p = Math.round(v * 1000) / 10;
  return signed && p > 0 ? `+${p.toFixed(1)}%` : p < 0 ? `−${(-p).toFixed(1)}%` : `${p.toFixed(1)}%`;
};
const cellText = (c: PanelCell): string =>
  typeof c === "string" ? c : "text" in c ? c.text : "change" in c ? `${c.change}${c.period ? ` ${c.period}` : ""}` : "";
const join = (parts: (string | undefined | false)[], sep = ", ") => parts.filter(Boolean).join(sep);

function panelText(p: Panel): string[] {
  const out: string[] = [];
  const head = join([p.kicker, p.title, p.tag && `(${p.tag})`], " ");
  if (head) out.push(`Panel: ${head}`);
  if (p.detail) out.push(p.detail);
  if (p.lede) out.push(p.lede);
  if (p.figure) out.push(join([p.figure.value, p.figure.note, p.figure.change, p.figure.period], " "));
  for (const m of p.metrics ?? []) out.push(`${m.label}: ${join([m.value, m.change, m.period], " ")}`);
  if (p.bar?.label) out.push(p.bar.label);
  if (p.notes?.length) out.push(join([p.notesLabel, ...p.notes.map((n) => join([n.title, n.value, n.text], " "))], "; "));
  for (const x of p.paragraphs ?? []) out.push(join([x.lead && `${x.lead}:`, x.text], " "));
  for (const r of p.rows ?? [])
    out.push(join([`${r.title}:`, r.value, r.note, r.change, r.period, r.caption, r.text, ...(r.markers ?? []).map((m) => m.text)], " "));
  if (p.table) {
    out.push(`Table: ${p.table.columns.join(" | ")}`);
    for (const r of p.table.rows) out.push(`${r.label} | ${r.cells.map(cellText).filter(Boolean).join(" | ")}`);
  }
  if (p.bars?.valueLabels?.length) out.push(p.bars.labels.map((l, i) => `${l} ${p.bars!.valueLabels![i] ?? ""}`.trim()).join(", "));
  for (const x of p.pairs ?? []) out.push(`${x.label}: ${x.value}`);
  if (p.scatter) {
    const s = p.scatter;
    const fx = (v: number) => pctText(v, s.x.format === "growth");
    const fy = (v: number) => pctText(v, s.y.format === "growth");
    out.push(`Scatter: ${s.x.label} across, ${s.y.label} up`);
    // The named dots' values: the app's figures for the companies the slide labels.
    for (const pt of s.points) if (pt.label) out.push(`${pt.label}: ${s.x.label} ${fx(pt.x)}, ${s.y.label} ${fy(pt.y)}`);
    const unlabelled = s.points.filter((pt) => !pt.label).length;
    if (unlabelled) out.push(`${unlabelled} other companies, unlabelled`);
    if (s.medians?.x !== undefined) out.push(`Median ${s.x.label}: ${fx(s.medians.x)}`);
    if (s.medians?.y !== undefined) out.push(`Median ${s.y.label}: ${fy(s.medians.y)}`);
    if (s.note) out.push(s.note);
  }
  if (p.spark) out.push(p.spark.label);
  return out;
}

/** Everything a slide shows, as text: what Claude reads and what its figures are checked against. Pure. */
export function evidenceOf(p: Preview): string {
  const out: string[] = [`Headline: ${p.headline}`];
  if (p.text) out.push(`Takeaway: ${p.text}`);
  if (p.facts?.length) {
    if (p.columns?.length) out.push(`Columns: ${p.columns.join(" | ")}`);
    for (const f of p.facts) out.push(`${f.label}: ${f.values.join(" | ")}`);
  }
  if (p.chart) {
    const c = p.chart;
    out.push(`Chart${c.title ? `: ${c.title}` : ""}`);
    for (const s of c.series) out.push(`${s.name}: ${s.points.map((x) => `${x.label} ${formatFigure(c.format, x.value)}`).join(", ")}`);
  }
  for (const l of p.lines ?? []) out.push(`- ${l}`);
  for (const g of p.groups ?? []) out.push(`${g.title}:`, ...g.lines.map((l) => `- ${l}`));
  for (const panel of p.panels ?? []) out.push(...panelText(panel));
  const source = `Source: ${join([p.source, p.period])}`;
  // Whole lines only, so a cut can't leave half a figure; the source always comes last.
  const kept: string[] = [];
  let size = source.length;
  for (const l of out) {
    if (size + l.length + 1 > MAX_EVIDENCE) break;
    kept.push(l);
    size += l.length + 1;
  }
  return [...kept, source].join("\n");
}

/* ---------- Figures ---------- */

export interface Figure {
  /** "-" for a fall, "+" for a stated rise, "" when unsigned. */
  sign: "" | "+" | "-";
  /** Digits and a decimal point: "1.62". */
  num: string;
  /** "$B", "%", "pts", "x", "" …: the dollar sign and the suffix together. */
  unit: string;
  /** As written, for the dropped list. */
  text: string;
}

const UNITS: Record<string, string> = {
  "%": "%",
  b: "B",
  bn: "B",
  billion: "B",
  m: "M",
  mn: "M",
  million: "M",
  k: "K",
  thousand: "K",
  t: "T",
  trillion: "T",
  x: "x",
  pts: "pts",
  pt: "pts",
  points: "pts",
  point: "pts",
  bps: "bps",
  days: "days",
  day: "days",
};

// Sign, dollar, the number (with thousands commas), then a unit that ends a word.
const FIGURE = /([+\-−–—])?\s?(\$)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s?(%|bn|mn|billion|million|thousand|trillion|bps|pts|pt|points|point|days|day|[BMKTx])(?![A-Za-z]))?/gi;

/** The figures in text, each with its sign and unit. Pure. */
export function figures(text: string): Figure[] {
  return [...text.matchAll(FIGURE)].map((m) => {
    const [whole, s, dollar, raw, suffix] = m;
    const before = text[(m.index ?? 0) - 1];
    // A dash between two figures is a range, not a minus; a hyphen inside a word ("Q3-2026") neither.
    const signed = s && !(s !== "+" && before && /[\w]/.test(before));
    const sign = !signed ? "" : s === "+" ? "+" : "-";
    const unit = `${dollar ? "$" : ""}${suffix ? (UNITS[suffix.toLowerCase()] ?? (suffix.length === 1 ? suffix.toUpperCase() : suffix)) : ""}`;
    return { sign, num: raw.replace(/,/g, ""), unit, text: whole.trim() };
  });
}

/** A figure that is part of the wording rather than data: a year, or a bare count of one to ten. */
export function exempt(f: Figure): boolean {
  if (f.unit || f.sign) return false;
  if (/^(19|20)\d\d$/.test(f.text)) return true; // A year: four digits, no comma, no unit.
  return !f.num.includes(".") && Number(f.num) <= 10;
}

/**
 * The figures in text that the evidence doesn't have with the same number, sign
 * and unit. A signed figure needs the same sign; an unsigned one matches either.
 * A figure with a unit needs that unit; one without matches any. Pure.
 */
export function ungroundedFigures(text: string, evidence: string): string[] {
  const known = figures(evidence);
  return figures(text)
    .filter((f) => !exempt(f))
    .filter(
      (f) =>
        !known.some(
          (k) =>
            k.num === f.num &&
            (!f.unit || k.unit === f.unit || (f.unit.startsWith("$") && k.unit === f.unit.slice(1)) || (k.unit.startsWith("$") && k.unit.slice(1) === f.unit)) &&
            (!f.sign || (f.sign === "-" ? k.sign === "-" : k.sign !== "-")),
        ),
    )
    .map((f) => f.text);
}

/* ---------- Quantities in words ---------- */

// Quantities written as words: counts past ten, fractions and multiples. Counts up to ten are left out, as the
// figure check leaves bare digits up to 10 ("the two leaders" counts what the slide shows).
const NUMBER_WORDS =
  /\b(?:eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|dozen|half|halved|halves|a\s+third|a\s+quarter|three\s+quarters|twice|double|doubled|doubling|triple|tripled|tripling|(?:two|three|four|five|six|seven|eight|nine|ten|hundred)fold)\b/gi;
// The same words naming a period, not a quantity: "the second half", "half-year results", "a quarter earlier".
const PERIODS = /\b(?:first|second|1st|2nd|back|front)\s+half\b|\bhalf[-\s]year(?:ly)?\b|\ba\s+quarter\s+(?:ago|earlier|later|before|after|on)\b/gi;

/** The quantities in text written as words, lower case, periods aside. Pure. */
export const numberWords = (text: string) =>
  [...new Set([...text.replace(PERIODS, " ").matchAll(NUMBER_WORDS)].map((m) => m[0].toLowerCase().replace(/\s+/g, " ")))];

/**
 * The quantities in text written as words that the evidence doesn't say in the
 * same words. A quantity in words the slide doesn't state ("a quarter" for 24.0%,
 * "doubled" for a rise) is a converted figure, which Claude may not write. Pure.
 */
export function ungroundedWords(text: string, evidence: string): string[] {
  return numberWords(text).filter((w) => !new RegExp(`\\b${w.replace(/\s+/g, "\\s+")}\\b`, "i").test(evidence));
}

/** An en or em dash right before a figure is a minus: kept as one, so the dash rewrite can't drop the sign. */
const minusSigns = (s: string) => s.replace(/(^|[\s(])[–—](?=\$?\d)/g, "$1−");

/** Claude's text tidied: whitespace, leading bullets, dashes (keeping a minus). Pure. */
export const tidy = (raw: string) => plainDashes(minusSigns(raw.replace(/\s+/g, " ").trim().replace(/^[-•*]\s+/, "")));

/** Text split into sentences, at a stop followed by a capital, a quote or a bracket. Pure. */
export const sentences = (s: string) => s.split(/(?<=[.!?])\s+(?=[A-Z"“(])/).filter(Boolean);

/** Cut to `n` characters at a word, never through a figure. Pure. */
export function cutWords(s: string, n: number): string {
  if (s.length <= n) return s;
  const head = s.slice(0, n - 1);
  const at = head.lastIndexOf(" ");
  return `${(at > n / 2 ? head.slice(0, at) : head).replace(/[\s,;:]*[+\-−$]?[\d.,]*$/, "").trimEnd()}…`;
}

/** The text tidied, or "" when a figure in it, in digits or in words, isn't on the slide (noted in dropped). Pure. */
export function groundPiece(raw: string, evidence: string, dropped?: string[], where = ""): string {
  const s = tidy(raw);
  if (!s) return "";
  const bad = [...ungroundedFigures(s, evidence), ...ungroundedWords(s, evidence)];
  if (bad.length) {
    dropped?.push(`${where ? `${where}: ` : ""}${s} [${bad.join(", ")}]`);
    return "";
  }
  return s;
}
