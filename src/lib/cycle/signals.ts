import { monthIndex, type Series } from "./transform";
import type { Turn } from "./turns";

// Signals on the composite indexes, after EPB: a downturn signal built one step
// at a time and backtested on the dated chip cycle at each step, its mirror for
// the upturn, a stress flag (finished goods piling up while margins slip), and
// the stage read across the sequence. Thresholds are chosen on chip history, not
// copied from US recessions. Pure.

export const SIGNAL_RULES = {
  /** Drops from the 24-month high tried for step 1; the backtest picks one. */
  grid: [0.05, 0.075, 0.1, 0.125, 0.15],
  lookback: 24,
  /** A signal this many months before a peak, up to the trough, counts. */
  window: 18,
  /** Signals within this many months of the last are the same episode (step 4). */
  merge: 12,
  /** The share of past downturns a threshold must catch to be chosen. */
  minCaught: 0.75,
};

export interface StepResult {
  step: string;
  /** First month of each signal episode. */
  episodes: string[];
  hits: number;
  falseSignals: number;
  /** Downturns (or upturns) caught by at least one episode. */
  caught: number;
  of: number;
  /** Median months from the signal to the turn, positive when the signal came first. */
  lead: number | null;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Phases of the cycle: peak to trough for downturns, trough to peak for upturns. */
export function phases(cycle: Turn[], kind: "down" | "up"): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  for (let i = 0; i + 1 < cycle.length; i++) {
    if ((kind === "down" && cycle[i].kind === "peak") || (kind === "up" && cycle[i].kind === "trough")) out.push({ start: cycle[i].month, end: cycle[i + 1].month });
  }
  return out;
}

/** Runs of signal months as episodes; months within `merge` of the last signal join it. */
export function episodes(months: string[], merge = 1): string[] {
  const out: string[] = [];
  let last = -Infinity;
  for (const m of months) {
    const i = monthIndex(m);
    if (i - last > merge) out.push(m);
    last = i;
  }
  return out;
}

export function evaluate(step: string, starts: string[], turns: { start: string; end: string }[], from: string, window = SIGNAL_RULES.window): StepResult {
  const inScope = turns.filter((t) => t.start >= from);
  const caught = new Set<number>();
  const leads: number[] = [];
  let hits = 0;
  for (const e of starts) {
    const i = monthIndex(e);
    const k = inScope.findIndex((t) => i >= monthIndex(t.start) - window && i <= monthIndex(t.end));
    if (k >= 0) {
      hits += 1;
      if (!caught.has(k)) leads.push(monthIndex(inScope[k].start) - i);
      caught.add(k);
    }
  }
  return { step, episodes: starts, hits, falseSignals: starts.length - hits, caught: caught.size, of: inScope.length, lead: median(leads) };
}

const lookup = (s: Series) => new Map(s.map((p) => [p.month, p.value]));

/**
 * The downturn (or upturn) signal, step by step:
 * 1. the leading index `drop` below its 24-month high (above its low, for the upturn),
 * 2. and the yield curve inverted in the last 24 months (positive now, for the upturn),
 * 3. and leading momentum negative (positive),
 * 4. with signals within 12 months counted as one.
 */
export function backtest(leading: Series, growth: Series, curve: Series | null, cycle: Turn[], drop: number, kind: "down" | "up" = "down"): StepResult[] {
  const R = SIGNAL_RULES;
  const g = lookup(growth);
  const c = curve ? lookup(curve) : null;
  const from = leading[R.lookback]?.month ?? "9999";
  const s1: string[] = [];
  const s2: string[] = [];
  const s3: string[] = [];
  for (let i = R.lookback; i < leading.length; i++) {
    const window = leading.slice(i - R.lookback, i + 1).map((p) => p.value);
    const v = leading[i].value;
    const m = leading[i].month;
    const one = kind === "down" ? v <= (1 - drop) * Math.max(...window) : v >= (1 + drop) * Math.min(...window);
    if (!one) continue;
    s1.push(m);
    const two = !c
      ? false
      : kind === "down"
        ? leading.slice(i - R.lookback, i + 1).some((p) => (c.get(p.month) ?? Infinity) < 0)
        : (c.get(m) ?? -Infinity) > 0;
    if (!two) continue;
    s2.push(m);
    const gm = g.get(m);
    if (gm === undefined || (kind === "down" ? gm >= 0 : gm <= 0)) continue;
    s3.push(m);
  }
  const turns = phases(cycle, kind);
  const word = kind === "down" ? "below" : "above";
  return [
    evaluate(`Leading ${Math.round(drop * 1000) / 10}% ${word} its 24-month ${kind === "down" ? "high" : "low"}`, episodes(s1), turns, from),
    evaluate(kind === "down" ? "and the yield curve inverted in the last 24 months" : "and the yield curve positive", episodes(s2), turns, from),
    evaluate(`and leading momentum ${kind === "down" ? "negative" : "positive"}`, episodes(s3), turns, from),
    evaluate("with signals within 12 months counted once", episodes(s3, R.merge), turns, from),
  ];
}

/** Of the grid, the drop with the fewest false signals that still catches 75% of turns; else the one that catches most. */
export function chooseDrop(run: (drop: number) => StepResult[]): { drop: number; final: StepResult; grid: { drop: number; final: StepResult }[] } {
  const grid = SIGNAL_RULES.grid.map((drop) => ({ drop, final: run(drop).at(-1)! }));
  const good = grid.filter((x) => x.final.of > 0 && x.final.caught / x.final.of >= SIGNAL_RULES.minCaught);
  const pick = good.length
    ? good.reduce((a, b) => (b.final.falseSignals < a.final.falseSignals ? b : a))
    : grid.reduce((a, b) => (b.final.caught > a.final.caught || (b.final.caught === a.final.caught && b.final.falseSignals < a.final.falseSignals) ? b : a));
  return { ...pick, grid };
}

/* ---------- Stage ---------- */

export type IndexName = "Leading" | "Cyclical" | "Aggregate" | "Lagging";
export interface IndexState {
  name: IndexName;
  direction: "rising" | "falling";
  /** The month growth last changed sign, if within the last 6 months. */
  turned: string | null;
  momentum: number;
}

export function stateOf(name: IndexName, growth: Series, recent = 6): IndexState | null {
  if (growth.length < 4) return null;
  const last = growth.at(-1)!;
  let turned: string | null = null;
  for (let i = growth.length - 1; i > 0 && i >= growth.length - recent; i--) {
    if (Math.sign(growth[i].value) !== Math.sign(growth[i - 1].value)) {
      turned = growth[i].month;
      break;
    }
  }
  return { name, direction: last.value >= 0 ? "rising" : "falling", turned, momentum: last.value - growth.at(-4)!.value };
}

const names = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** "Leading has turned up; Cyclical and Aggregate are still falling; Lagging hasn't turned yet." */
export function stageSentence(states: (IndexState | null)[]): string {
  const known = states.filter((s): s is IndexState => s !== null);
  if (!known.length) return "No index has enough history to read yet.";
  const groups = new Map<string, string[]>();
  const anyTurned = known.some((s) => s.turned);
  for (const s of known) {
    const phrase = s.turned
      ? `turned ${s.direction === "rising" ? "up" : "down"}`
      : s.name === "Lagging" && anyTurned
        ? "not turned yet"
        : `still ${s.direction}`;
    groups.set(phrase, [...(groups.get(phrase) ?? []), s.name]);
  }
  const parts = [...groups.entries()].map(([phrase, who]) => {
    const many = who.length > 1;
    const verb = phrase.startsWith("turned") ? (many ? "have" : "has") : phrase === "not turned yet" ? (many ? "haven't" : "hasn't") : many ? "are" : "is";
    return `${names(who)} ${verb} ${phrase === "not turned yet" ? "turned yet" : phrase}`;
  });
  const missing = (["Leading", "Cyclical", "Aggregate", "Lagging"] as IndexName[]).filter((n) => !known.some((s) => s.name === n));
  const sentence = `${parts.join("; ")}.`;
  return missing.length ? `${sentence} No ${names(missing.map((m) => m.toLowerCase()))} index yet.` : sentence;
}

/* ---------- Stress ---------- */

/** Where the latest value sits in the series' own history, 0 to 1. */
export function percentile(s: Series): number | null {
  if (s.length < 24) return null;
  const v = s.at(-1)!.value;
  return s.filter((p) => p.value <= v).length / s.length;
}

/**
 * Finished goods piling up while margins slip: the finished-goods share in the top
 * fifth of its history, and operating margin down from its 4-quarter high by more
 * than the median drawdown seen in past downturns.
 */
export function stress(finishedShare: Series, margins: { quarter: string; margin: number }[], pastDrawdowns: number[]) {
  const share = percentile(finishedShare);
  const recent = margins.slice(-5);
  const drawdown = recent.length >= 2 ? Math.max(...recent.slice(0, -1).map((m) => m.margin)) - recent.at(-1)!.margin : null;
  const threshold = median(pastDrawdowns);
  const inventory = share !== null && share >= 0.8;
  const margin = drawdown !== null && threshold !== null && drawdown >= threshold;
  return { on: inventory && margin, inventory, margin, share, drawdown, threshold };
}
