import type { Tier } from "./catalog";
import { monthIndex, type Series } from "./transform";
import { datedTurns, CHIP_RULES, type Turn } from "./turns";

// The finder: how far a series leads or lags the dated chip cycle, how reliably,
// and which tier that puts it in. Two measures, as the Conference Board uses:
// the correlation at each shift, and turn-by-turn matching of the series' own
// peaks and troughs to the cycle's. A lead is only trusted if it held before and
// after 2008. Pure.

export const TIER_RULES = {
  /** Leading: a median lead of at least this many months... */
  leadMonths: 3,
  /** ...matching at least this share of the cycle's turns... */
  leadingHitRate: 0.6,
  /** Coincident or lagging: matching at least this share. */
  hitRate: 0.5,
  /** Coincident: a median lead within this many months either way. */
  coincident: 2,
  /** At least this share of the series' own turns must be the cycle's, or its turns are mostly noise. */
  precision: 0.5,
  /** And its best correlation at least this, so a pile of chance matches can't place it. */
  supportCorrelation: 0.3,
  /** Fewer matched turns than this and the turns can't place it. */
  minMatched: 3,
  /** Correlation strong enough to place a series by its best shift when turns can't. */
  minCorrelation: 0.6,
  /** A series turn counts as the cycle's if it comes up to this many months before... */
  matchBefore: 24,
  /** ...or this many after. */
  matchAfter: 18,
  /** Eras for the stability check. */
  split: "2008-01",
} as const;

export type Placement = Tier | "coincident" | "not placed";

export interface Scorecard {
  key: string;
  /** Best correlation and the shift it's at; a positive shift means the series leads. */
  correlation: { lead: number; r: number } | null;
  turns: number;
  matched: number;
  missed: number;
  falseTurns: number;
  hitRate: number;
  /** Median lead in months over matched turns, positive when the series turns first. */
  lead: number | null;
  leadAtPeaks: number | null;
  leadAtTroughs: number | null;
  range: [number, number] | null;
  /** Median lead before and after the split. */
  eras: { before: number | null; after: number | null };
  stable: boolean | "one era";
  placement: Placement;
  reason: string;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Pearson correlation of the series shifted forward by `lead` months against the reference. */
export function correlationAt(series: Series, reference: Series, lead: number): number | null {
  const ref = new Map(reference.map((p) => [monthIndex(p.month), p.value]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of series) {
    const y = ref.get(monthIndex(p.month) + lead);
    if (y === undefined) continue;
    xs.push(p.value);
    ys.push(y);
  }
  if (xs.length < 36) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function bestCorrelation(series: Series, reference: Series, span = 18): { lead: number; r: number } | null {
  let best: { lead: number; r: number } | null = null;
  for (let k = -span; k <= span; k++) {
    const r = correlationAt(series, reference, k);
    if (r !== null && (!best || r > best.r)) best = { lead: k, r };
  }
  return best;
}

const std = (s: Series) => {
  const m = s.reduce((a, p) => a + p.value, 0) / s.length;
  return Math.sqrt(s.reduce((a, p) => a + (p.value - m) ** 2, 0) / s.length);
};

/**
 * Score a series against the cycle. `upIsGood: false` series move against the
 * cycle (a credit spread peaks at the trough), so they're inverted first.
 */
export function score(key: string, series: Series, reference: Series, cycle: Turn[], upIsGood = true): Scorecard {
  const s = upIsGood ? series : series.map((p) => ({ ...p, value: -p.value }));
  const correlation = bestCorrelation(s, reference);
  const own = datedTurns(s, { ...CHIP_RULES, minSwing: std(s) * 0.5 });
  const first = s[0] ? monthIndex(s[0].month) : Infinity;
  const last = s.length ? monthIndex(s[s.length - 1].month) : -Infinity;
  // Only the cycle's turns the series was around for (with room to match) count.
  const inRange = cycle.filter((t) => monthIndex(t.month) - TIER_RULES.matchBefore >= first - TIER_RULES.matchBefore && monthIndex(t.month) <= last - 6);
  const used = new Set<number>();
  const leads: { lead: number; kind: Turn["kind"]; month: string }[] = [];
  for (const t of inRange) {
    const at = monthIndex(t.month);
    let pick = -1;
    let bestGap = Infinity;
    own.forEach((o, i) => {
      if (used.has(i) || o.kind !== t.kind) return;
      const lead = at - monthIndex(o.month);
      if (lead > TIER_RULES.matchBefore || -lead > TIER_RULES.matchAfter) return;
      if (Math.abs(lead) < bestGap) {
        bestGap = Math.abs(lead);
        pick = i;
      }
    });
    if (pick >= 0) {
      used.add(pick);
      leads.push({ lead: at - monthIndex(own[pick].month), kind: t.kind, month: t.month });
    }
  }
  const all = leads.map((l) => l.lead);
  const lead = median(all);
  const before = median(leads.filter((l) => l.month < TIER_RULES.split).map((l) => l.lead));
  const after = median(leads.filter((l) => l.month >= TIER_RULES.split).map((l) => l.lead));
  const enoughBoth = leads.filter((l) => l.month < TIER_RULES.split).length >= 2 && leads.filter((l) => l.month >= TIER_RULES.split).length >= 2;
  const hitRate = inRange.length ? leads.length / inRange.length : 0;
  const card: Scorecard = {
    key,
    correlation,
    turns: own.length,
    matched: leads.length,
    missed: inRange.length - leads.length,
    falseTurns: own.length - used.size,
    hitRate,
    lead,
    leadAtPeaks: median(leads.filter((l) => l.kind === "peak").map((l) => l.lead)),
    leadAtTroughs: median(leads.filter((l) => l.kind === "trough").map((l) => l.lead)),
    range: all.length ? [Math.min(...all), Math.max(...all)] : null,
    eras: { before, after },
    stable: enoughBoth ? before !== null && after !== null && Math.sign(Math.round(before)) === Math.sign(Math.round(after)) : "one era",
    placement: "not placed",
    reason: "",
  };
  return place(card);
}

/** The tier a scorecard earns, and why. */
export function place(c: Scorecard): Scorecard {
  const R = TIER_RULES;
  const pct = `${Math.round(c.hitRate * 100)}% of turns`;
  const precision = c.turns ? c.matched / c.turns : 0;
  const supported = precision >= R.precision && (c.correlation?.r ?? 0) >= R.supportCorrelation;
  if (c.matched >= R.minMatched && c.lead !== null && !supported)
    return {
      ...c,
      placement: "not placed",
      reason: `Turns mostly don't match the cycle (${Math.round(precision * 100)}% of its ${c.turns} turns match, best correlation ${c.correlation ? c.correlation.r.toFixed(2) : "n/a"})`,
    };
  if (c.matched >= R.minMatched && c.lead !== null) {
    const m = `median lead ${c.lead} months, ${pct}`;
    if (c.lead >= R.leadMonths && c.hitRate >= R.leadingHitRate) {
      if (c.stable === false) return { ...c, placement: "not placed", reason: `Led on average (${m}) but not in both eras` };
      return { ...c, placement: "leading", reason: `Leads: ${m}${c.stable === "one era" ? ", one era only" : ""}` };
    }
    if (Math.abs(c.lead) <= R.coincident && c.hitRate >= R.hitRate) return { ...c, placement: "coincident", reason: `Moves with the cycle: ${m}` };
    if (c.lead <= -R.leadMonths && c.hitRate >= R.hitRate) return { ...c, placement: "lagging", reason: `Lags: ${m}` };
    if (c.correlation && c.correlation.r < R.minCorrelation) return { ...c, placement: "not placed", reason: `Turns don't line up (${m})` };
  }
  // Too few turns to judge (short history, quarterly data): fall back on the correlation.
  if (c.correlation && c.correlation.r >= R.minCorrelation) {
    const k = c.correlation.lead;
    const why = `by correlation, r ${c.correlation.r.toFixed(2)} at ${k} months`;
    if (k >= R.leadMonths) return { ...c, placement: "leading", reason: `Leads ${why}` };
    if (Math.abs(k) <= R.coincident) return { ...c, placement: "coincident", reason: `Moves with the cycle ${why}` };
    if (k <= -R.leadMonths) return { ...c, placement: "lagging", reason: `Lags ${why}` };
  }
  return { ...c, placement: "not placed", reason: c.matched < R.minMatched ? `Too few turns to judge (${c.matched} matched)` : `No steady relationship (${pct})` };
}
