// The Earnings page's cross-company views: the season by group, and every
// company ranked on one measure with who moved since the quarter before. Pure,
// over each company's filed quarters, so the page and its tests read the same rules.

import { COHORTS, comparableValue, type Cohort, type CompanyEarnings, type Company, type Quarter } from "@/lib/data/live/earnings-model";
import { yearAgo } from "./season";

type Metric = keyof Quarter["values"];

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
const defined = (xs: (number | undefined)[]) => xs.filter((v): v is number => v !== undefined && Number.isFinite(v));

/** "CY26 Q3" → "CY26 Q2"; "CY26 Q1" → "CY25 Q4". */
export function previousQuarter(label: string): string {
  const m = label.match(/^CY(\d{2}) Q([1-4])$/);
  if (!m) return label;
  const y = Number(m[1]);
  const q = Number(m[2]);
  return q === 1 ? `CY${String(y - 1).padStart(2, "0")} Q4` : `CY${m[1]} Q${q - 1}`;
}

const inQuarter = (e: CompanyEarnings, label: string) => e.quarters.find((q) => q.calendarLabel === label);
const value = (e: CompanyEarnings, q: Quarter | undefined, m: Metric) => (q ? comparableValue(e.company, m, q.values[m]) : undefined);

/* ---------- Season by group ---------- */

export interface GroupSeason {
  cohort: Cohort;
  total: number;
  filed: number;
  /** Median revenue growth on a year ago, among those that filed the season's quarter. */
  medianGrowth?: number;
  /** The same group's median for the quarter before, across all its companies. */
  priorMedianGrowth?: number;
  /** Share of those filed growing revenue on a year ago. */
  shareGrowing?: number;
  /** Median change in inventory days on a year ago, among those filed. */
  inventoryDaysChange?: number;
}

export function seasonByGroup(all: CompanyEarnings[], quarter: string): GroupSeason[] {
  const prior = previousQuarter(quarter);
  return COHORTS.flatMap((cohort) => {
    const group = all.filter((e) => e.company.cohort === cohort);
    if (!group.length) return [];
    const filed = group.map((e) => ({ e, q: inQuarter(e, quarter) })).filter((x): x is { e: CompanyEarnings; q: Quarter } => x.q !== undefined);
    const growth = defined(filed.map(({ e, q }) => value(e, q, "revenueYoY")));
    const invChange = defined(
      filed.map(({ e, q }) => {
        const now = value(e, q, "inventoryDays");
        const then = value(e, yearAgo(e.quarters, q), "inventoryDays");
        return now === undefined || then === undefined ? undefined : now - then;
      }),
    );
    return [
      {
        cohort,
        total: group.length,
        filed: filed.length,
        medianGrowth: median(growth),
        priorMedianGrowth: median(defined(group.map((e) => value(e, inQuarter(e, prior), "revenueYoY")))),
        shareGrowing: growth.length ? growth.filter((g) => g > 0).length / growth.length : undefined,
        inventoryDaysChange: median(invChange),
      },
    ];
  });
}

/* ---------- Leaderboard ---------- */

export type Measure = "revenueYoY" | "grossMargin" | "operatingMargin" | "inventoryDays" | "fcfMargin" | "revenue";

export const MEASURES: Record<Measure, { label: string; kind: "growth" | "pct" | "days" | "usd"; higherIsBetter: boolean }> = {
  revenueYoY: { label: "Revenue growth on a year ago", kind: "growth", higherIsBetter: true },
  grossMargin: { label: "Gross margin", kind: "pct", higherIsBetter: true },
  operatingMargin: { label: "Operating margin", kind: "pct", higherIsBetter: true },
  inventoryDays: { label: "Inventory days", kind: "days", higherIsBetter: false },
  fcfMargin: { label: "Free cash flow margin", kind: "pct", higherIsBetter: true },
  revenue: { label: "Revenue", kind: "usd", higherIsBetter: true },
};

export const isMeasure = (m: string | undefined): m is Measure => m !== undefined && m in MEASURES;

export interface Ranked {
  company: Company;
  /** The company's latest filed quarter. */
  quarter: Quarter;
  value: number;
  /** The same measure for the company's quarter before, when filed. */
  previous?: number;
  change?: number;
  /** Revenue growth and operating margin, for the growth-against-margin view. */
  growth?: number;
  margin?: number;
}

/** Every company with a figure for the measure on its latest quarter, best first. */
export function rank(all: CompanyEarnings[], measure: Measure): Ranked[] {
  const dir = MEASURES[measure].higherIsBetter ? -1 : 1;
  return all
    .flatMap((e) => {
      const n = e.quarters.length;
      const quarter = e.quarters[n - 1];
      const v = value(e, quarter, measure);
      if (!quarter || v === undefined || !Number.isFinite(v)) return [];
      const previous = value(e, e.quarters[n - 2], measure);
      return [
        {
          company: e.company,
          quarter,
          value: v,
          previous,
          change: previous === undefined ? undefined : v - previous,
          growth: value(e, quarter, "revenueYoY"),
          margin: value(e, quarter, "operatingMargin"),
        },
      ];
    })
    .sort((a, b) => dir * (a.value - b.value) || a.company.name.localeCompare(b.company.name));
}

/** The biggest changes since the quarter before, either way, largest first. Revenue moves are compared as a share of the quarter before. */
export function movers(ranked: Ranked[], measure: Measure, n = 5): Ranked[] {
  const size = (r: Ranked) =>
    r.change === undefined ? -1 : measure === "revenue" ? (r.previous ? Math.abs(r.change / r.previous) : -1) : Math.abs(r.change);
  return ranked
    .filter((r) => r.change !== undefined && r.change !== 0)
    .sort((a, b) => size(b) - size(a))
    .slice(0, n);
}

export function medianOf(ranked: Ranked[]): number | undefined {
  return median(ranked.map((r) => r.value));
}
