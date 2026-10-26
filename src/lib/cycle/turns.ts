import { monthIndex, type Series } from "./transform";

// Turning points in a monthly series, by the Bry-Boschan rules the NBER and the
// Conference Board use: a peak or trough is the highest or lowest point within
// a window either side; peaks and troughs alternate; a phase lasts a minimum
// number of months and a full cycle more; turns too close to either end are
// dropped, since the series may not have turned yet. A minimum swing keeps noise
// from counting as a cycle. Pure.

export type TurnKind = "peak" | "trough";
export interface Turn {
  month: string;
  kind: TurnKind;
  value: number;
}

export interface DatingRules {
  /** Months either side a turn must be the extreme of. */
  window: number;
  /** Shortest peak to trough or trough to peak, in months. */
  minPhase: number;
  /** Shortest peak to peak or trough to trough, in months. */
  minCycle: number;
  /** Months at each end where no turn is dated. */
  censor: number;
  /** Smallest move between neighbouring turns, in the series' units. */
  minSwing: number;
}

export const CHIP_RULES: DatingRules = { window: 6, minPhase: 6, minCycle: 15, censor: 6, minSwing: 0 };

const gap = (a: Turn, b: Turn) => monthIndex(b.month) - monthIndex(a.month);
/** The more extreme of two same-kind turns. */
const stronger = (a: Turn, b: Turn) => (a.kind === "peak" ? (b.value > a.value ? b : a) : b.value < a.value ? b : a);

function alternate(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    const last = out.at(-1);
    if (last && last.kind === t.kind) out[out.length - 1] = stronger(last, t);
    else out.push(t);
  }
  return out;
}

export function datedTurns(s: Series, rules: DatingRules = CHIP_RULES): Turn[] {
  const n = s.length;
  // 1. Candidates: the extreme of a window either side.
  let turns: Turn[] = [];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - rules.window);
    const hi = Math.min(n - 1, i + rules.window);
    const around = s.slice(lo, hi + 1).map((p) => p.value);
    const v = s[i].value;
    if (v === Math.max(...around)) turns.push({ month: s[i].month, kind: "peak", value: v });
    else if (v === Math.min(...around)) turns.push({ month: s[i].month, kind: "trough", value: v });
  }
  turns = alternate(turns);

  // 2. Phase length, cycle length and swing: drop the weakest offending pair until none is left.
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i + 1 < turns.length; i++) {
      const a = turns[i];
      const b = turns[i + 1];
      const short = gap(a, b) < rules.minPhase || Math.abs(b.value - a.value) < rules.minSwing;
      const c = turns[i + 2];
      const longCycleShort = c !== undefined && gap(a, c) < rules.minCycle;
      if (short || longCycleShort) {
        // Remove the pair whose swing is smallest, keeping alternation.
        const pair = short ? i : Math.abs(b.value - a.value) <= Math.abs(c!.value - b.value) ? i : i + 1;
        turns.splice(pair, 2);
        turns = alternate(turns);
        changed = true;
        break;
      }
    }
  }

  // 3. Censor the ends.
  if (!n) return [];
  const first = monthIndex(s[0].month);
  const last = monthIndex(s[n - 1].month);
  return turns.filter((t) => monthIndex(t.month) - first >= rules.censor && last - monthIndex(t.month) >= rules.censor);
}
