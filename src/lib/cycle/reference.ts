import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { REFERENCE } from "./catalog";
import { measured } from "./history";
import { average, monthIndex, yoy, type Series } from "./transform";
import { CHIP_RULES, datedTurns, type DatingRules, type Turn } from "./turns";

// The dated chip cycle every series is measured against. WSTS global chip sales
// when the licensed file is present (data/cycle/licensed/wsts-monthly.json, as
// [["YYYY-MM", sales], ...], gitignored); until then the public proxy in the
// catalog. Only the dates leave this module; raw WSTS figures are never written.

export const REFERENCE_START = "1985-01";
/** Growth swings smaller than 5 points of year-on-year growth aren't a cycle. */
export const REFERENCE_RULES: DatingRules = { ...CHIP_RULES, minSwing: 0.05 };
const WSTS_FILE = path.join(process.cwd(), "data", "cycle", "licensed", "wsts-monthly.json");

export interface ReferenceCycle {
  source: "WSTS global chip sales" | "Public proxy";
  series: string;
  method: string;
  /** The growth series the turns were dated on (kept in memory for the finder, not written for WSTS). */
  growth: Series;
  turns: Turn[];
}

export function referenceCycle(): ReferenceCycle {
  const method = "Bry-Boschan growth cycle on the 3-month average year-on-year growth: extremes within 6 months either side, phases of 6 months or more, cycles of 15 or more, swings of 5 points or more, 6 months censored at each end.";
  if (existsSync(WSTS_FILE)) {
    const raw = (JSON.parse(readFileSync(WSTS_FILE, "utf8")) as [string, number][]).map(([month, value]) => ({ month, value }));
    const growth = average(yoy(raw), 3).filter((p) => p.month >= REFERENCE_START);
    return { source: "WSTS global chip sales", series: "WSTS Blue Book, worldwide semiconductor sales", method, growth, turns: datedTurns(growth, REFERENCE_RULES) };
  }
  const growth = measured(REFERENCE).filter((p) => p.month >= REFERENCE_START);
  return { source: "Public proxy", series: REFERENCE.label, method, growth, turns: datedTurns(growth, REFERENCE_RULES) };
}

/** How the dated turns compare with another series' turns: matched within a window, and the ones that aren't. */
export function crossCheck(turns: Turn[], other: Turn[], from: string, window = 6) {
  const used = new Set<number>();
  const agree: { month: string; other: string; kind: Turn["kind"] }[] = [];
  const unmatched: Turn[] = [];
  for (const t of turns.filter((x) => x.month >= from)) {
    const i = other.findIndex((o, k) => !used.has(k) && o.kind === t.kind && Math.abs(monthIndex(o.month) - monthIndex(t.month)) <= window);
    if (i >= 0) {
      used.add(i);
      agree.push({ month: t.month, other: other[i].month, kind: t.kind });
    } else unmatched.push(t);
  }
  return { agree, unmatched, extra: other.filter((o, k) => o.month >= from && !used.has(k)) };
}
