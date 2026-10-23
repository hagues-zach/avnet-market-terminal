// Ask the Terminal: the answer shape and the sentences answerers write. Pure,
// tested with frozen figures. A missing figure reads "n/a" and the sentence says
// what is missing; nothing is ever estimated here.
import type { Answerer, Intent } from "./route";

export interface Fact {
  label: string;
  values: string[];
}

export interface Story {
  title: string;
  outlet: string;
  date: string;
  url: string;
  /** "Why it matters", written by Claude earlier and cached. */
  angle?: string;
}

export interface Answer {
  /** "claude" when Claude wrote the answer from the answerers' results (step 3.2). */
  intent: Intent | "none" | "claude";
  question: string;
  subject: string;
  /** "Q2 2026", or a date. */
  period?: string;
  text: string;
  /** Column headers for multi-value facts (the first column is the label). */
  columns?: string[];
  facts?: Fact[];
  stories?: Story[];
  sources: { status: "live" | "mock"; label: string }[];
  links: { href: string; label: string }[];
  hookups?: string[];
  /** Text Claude wrote before and the app cached; nothing new is generated. */
  claude?: { label: string; text: string; date?: string };
  note?: string;
  suggestions?: Answerer[];
  /** For a Claude answer: "analysis" is a lead sentence and up to two paragraphs; "recall" a few sentences. */
  depth?: "recall" | "analysis";
  /** For a Claude answer: each answerer it called, with that answer's figures and stories. */
  parts?: Answer[];
  /** Set when the data couldn't be loaded. */
  error?: boolean;
}

/** "CY26 Q2" to "Q2 2026"; anything else unchanged. */
export const quarterName = (label?: string) => (label ? label.replace(/^CY(\d{2}) (Q\d)$/, "$2 20$1") : "the latest quarter");

/** "$1.21B", "$850M", "n/a". Input in dollars. */
export function usd(v?: number): string {
  if (v === undefined || !Number.isFinite(v)) return "n/a";
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  return a >= 1e9 ? `${sign}$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${sign}$${Math.round(a / 1e6)}M` : `${sign}$${Math.round(a)}`;
}

export const pctOf = (v?: number, signed = false) =>
  v === undefined || !Number.isFinite(v) ? "n/a" : `${v < 0 ? "−" : signed ? "+" : ""}${Math.abs(v * 100).toFixed(1)}%`;

/** "Nov 5" (and the year when it isn't this one) from YYYY-MM-DD. */
export function day(d: string, thisYear?: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return thisYear === undefined || y === thisYear ? s : `${s}, ${y}`;
}

const moved = (g: number) => (Math.abs(g) < 0.0005 ? "flat" : `${g > 0 ? "up" : "down"} ${Math.abs(g * 100).toFixed(1)}%`);

export function companySentence(i: {
  name: string;
  quarter?: string;
  revenue?: number;
  growth?: number;
  grossMargin?: number;
  next?: { date: string; status: "estimated" | "due" | "reported" };
  thisYear?: number;
}): string {
  if (i.revenue === undefined) return `${i.name} has no quarterly revenue in its SEC filings yet.`;
  const growth = i.growth === undefined ? ", with no year-ago quarter to compare" : `, ${moved(i.growth)} on a year ago`;
  const margin = i.grossMargin === undefined ? "" : `, with a ${pctOf(i.grossMargin)} gross margin`;
  const next = !i.next
    ? ""
    : i.next.status === "due"
      ? ` Its next results were expected on ${day(i.next.date, i.thisYear)} and aren't filed yet.`
      : i.next.status === "reported"
        ? ` It reported on ${day(i.next.date, i.thisYear)}.`
        : ` It reports next around ${day(i.next.date, i.thisYear)} (estimated).`;
  return `${i.name}'s revenue was ${usd(i.revenue)} in ${quarterName(i.quarter)}${growth}${margin}.${next}`;
}

const PHASE_WORDS: Record<string, string> = {
  "Expansion, accelerating": "expanding, and faster than the quarter before",
  "Expansion, slowing": "expanding, but more slowly than the quarter before",
  "Contraction, easing": "contracting, but less than the quarter before",
  "Contraction, deepening": "contracting, and more than the quarter before",
};

export function cycleSentence(i: { phase: string | null; quarter?: string; growth?: number; reporting?: number }): string {
  if (!i.phase) return "There aren't enough quarters reported yet to call the cycle.";
  const growth = i.growth === undefined ? "" : ` Supply-chain revenue was ${moved(i.growth)} on a year ago`;
  const who = i.reporting ? ` across ${i.reporting} companies` : "";
  return `In ${quarterName(i.quarter)} the semiconductor cycle is ${PHASE_WORDS[i.phase] ?? i.phase.toLowerCase()}.${growth ? `${growth}${who}.` : ""}`;
}

export function avnetSentence(i: { quarter: string; billings: number; bookToBill: number; backlog: number; billingsYearAgo?: number }): string {
  const g = i.billingsYearAgo ? `, ${moved(i.billings / i.billingsYearAgo - 1)} on a year ago` : "";
  return `Avnet's billings were ${usd(i.billings * 1e6)} in ${i.quarter}${g}, with a book-to-bill of ${i.bookToBill.toFixed(2)} and ${usd(i.backlog * 1e6)} of backlog.`;
}

export function seasonSentence(i: {
  quarter: string;
  reported: number;
  total: number;
  medianGrowth?: number;
  next?: { name: string; date: string }[];
  thisYear?: number;
}): string {
  const median = i.medianGrowth === undefined ? "" : `; the median grew ${pctOf(i.medianGrowth)} on a year ago`;
  const next = i.next?.length ? ` Next: ${i.next.map((n) => `${n.name} (${day(n.date, i.thisYear)})`).join(", ")}.` : "";
  return `${i.reported} of ${i.total} companies have reported ${quarterName(i.quarter)}${median}.${next}`;
}

export function lineCardSentence(i: { name: string; carriers: string[]; tracked: number; hasHome: boolean }): string {
  const home = i.hasHome ? "" : " Avnet's own line card isn't imported yet, so Avnet isn't in the check.";
  if (!i.tracked) return `No distributor line cards have been collected yet.${home}`;
  const of = `of the ${i.tracked} distributors collected`;
  if (!i.carriers.length) return `None ${of} lists ${i.name}.${home}`;
  const list = i.carriers.length === 1 ? i.carriers[0] : `${i.carriers.slice(0, -1).join(", ")} and ${i.carriers[i.carriers.length - 1]}`;
  return `${list} ${i.carriers.length === 1 ? "lists" : "list"} ${i.name}, ${i.carriers.length} ${of}.${home}`;
}

export function newsSentence(subject: string, stories: number): string {
  return stories
    ? `The latest ${stories === 1 ? "story" : `${stories} stories`} on ${subject}, newest first.`
    : `There is no recent story on ${subject} in the feeds the app reads.`;
}

export const CANT = "I can't answer that from the app's data yet.";
