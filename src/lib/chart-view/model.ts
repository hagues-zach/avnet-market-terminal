// The data behind a table's chart view, shared by every container that shows it
// (the modal now; later the drawer). Plain, serialisable data: a
// server component builds it, client components draw it. Pure, no React.
//
// A view is a set of tabs. Each tab is one or more panes stacked on one shared
// period axis, and each pane has a single y-axis (DESIGN.md: never a dual axis;
// two measures in different units are two panes).

import { VIZ } from "@/lib/colors";
import { formatPctSigned, formatUsdMillions } from "@/lib/format";

export type Unit = "usd" | "pct" | "growth" | "days" | "eps";

/**
 * How a series is coloured. "company" is the company's own colour (Avnet Green
 * for Avnet, Dark Blue for Arrow, grey for anyone else); 0–3 walk the validated
 * non-Avnet order; "muted" is grey for deductions and reference lines.
 */
export type ColorRole = "company" | 0 | 1 | 2 | 3 | "muted";

export interface SeriesSpec {
  /** Key into ChartData.series. */
  key: string;
  name: string;
  mark: "bar" | "line";
  color: ColorRole;
  dashed?: boolean;
  /** Draw below zero (a payment reported as a positive number, such as capex). */
  negate?: boolean;
}

export interface PaneSpec {
  title: string;
  unit: Unit;
  series: SeriesSpec[];
  /** Bars stack (positive above zero, negative below) instead of sitting side by side. */
  stacked?: boolean;
  /** Share of the chart's height, relative to the other panes. */
  weight?: number;
}

export interface TabSpec {
  id: string;
  label: string;
  panes: PaneSpec[];
}

export interface ChartData {
  /** Small all-caps line above the title, e.g. "Avnet · Quarterly detail". */
  eyebrow: string;
  title: string;
  /** "avnet", "arrow" or any other company slug; picks the "company" colour. */
  company: string;
  periods: string[];
  /** One value per period, null where not reported. */
  series: Record<string, (number | null)[]>;
  tabs: TabSpec[];
  /** One sentence per tab id, or null when there is nothing safe to say. */
  takeaways: Record<string, string | null>;
  source: string;
  asOf?: string;
}

const ORDER = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.yellow] as const;

/** The fill or stroke for a series. Arrow owns Dark Blue, so its own measures skip it. */
export function seriesColor(role: ColorRole, company: string, mark: SeriesSpec["mark"] = "bar"): string {
  if (role === "company") return company === "avnet" ? VIZ.avnet : company === "arrow" ? VIZ.arrow : VIZ.benchmark;
  if (role === "muted") return mark === "line" ? VIZ.benchmark : VIZ.other;
  const shift = company === "arrow" ? 1 : 0;
  return ORDER[role + shift] ?? VIZ.other;
}

/** Light series need a heavier line to read on white (DESIGN.md chart rules). */
export const isLight = (color: string) => color === VIZ.blueLight || color === VIZ.yellow || color === VIZ.other || color === VIZ.benchmark;

/** A value as it reads in a table cell or tooltip. */
export function formatValue(unit: Unit, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  switch (unit) {
    case "usd":
      return `${v < 0 ? "−" : ""}${formatUsdMillions(Math.abs(v) / 1e6, { precise: true })}`;
    case "pct":
      return `${(v * 100).toFixed(1)}%`;
    case "growth":
      return formatPctSigned(v);
    case "days":
      return `${Math.round(v)} days`;
    case "eps":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
  }
}

/** A value as it reads on an axis tick: short. */
export function formatAxis(unit: Unit, v: number): string {
  switch (unit) {
    case "usd":
      return `${v < 0 ? "−" : ""}${formatUsdMillions(Math.abs(v) / 1e6)}`;
    case "pct":
    case "growth":
      return `${Math.round(v * 100)}%`;
    case "days":
      return `${Math.round(v)}d`;
    case "eps":
      return `$${v.toFixed(2)}`;
  }
}

/** The change between two values, in the words a sentence needs: "up 9.4%", "down 0.3 pts", "up 4 days". */
export function describeChange(unit: Unit, cur: number, prev: number): string {
  const d = cur - prev;
  const dir = d >= 0 ? "up" : "down";
  switch (unit) {
    case "usd":
    case "eps":
      // A percentage only means something when both figures are positive.
      return prev > 0 && cur > 0 ? `${dir} ${Math.abs((cur / prev - 1) * 100).toFixed(1)}%` : `${dir} ${formatValue(unit, Math.abs(d))}`;
    case "pct":
    case "growth":
      return `${dir} ${Math.abs(d * 100).toFixed(1)} pts`;
    case "days":
      return `${dir} ${Math.abs(Math.round(d))} days`;
  }
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const count = (n: number) => NUMBER_WORDS[n] ?? String(n);

/**
 * One plain sentence about a series: its latest value, its change on a year ago
 * (four periods back), and a run of rises or falls when there is one worth saying.
 * Null when the latest value is missing.
 */
export function describeSeries(name: string, unit: Unit, values: (number | null)[], periods: string[], yearBack = 4): string | null {
  const last = values.length - 1;
  const cur = values[last];
  if (cur === null || cur === undefined) return null;
  let s = `${name} was ${formatValue(unit, cur)} in ${periods[last]}`;
  const prev = values[last - yearBack];
  if (prev !== null && prev !== undefined) s += `, ${describeChange(unit, cur, prev)} on a year ago`;
  // Count consecutive moves in the same direction, ending at the latest period.
  let run = 0;
  let dir = 0;
  for (let i = last; i > 0; i--) {
    const a = values[i];
    const b = values[i - 1];
    if (a === null || b === null || a === undefined || b === undefined || a === b) break;
    const d = Math.sign(a - b);
    if (dir === 0) dir = d;
    if (d !== dir) break;
    run++;
  }
  if (run >= 3) s += `. It has ${dir > 0 ? "risen" : "fallen"} ${count(run)} quarters running`;
  return `${s}.`;
}

/** Whether a tab has anything to draw. */
export function tabHasData(data: ChartData, tab: TabSpec): boolean {
  return tab.panes.some((p) => p.series.some((s) => data.series[s.key]?.some((v) => v !== null)));
}
