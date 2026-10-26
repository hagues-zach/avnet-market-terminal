// Monthly series and the transforms the cycle engine reads them through. Pure.
// Months are "YYYY-MM"; a series is sorted by month with no duplicates.

export interface Point {
  month: string;
  value: number;
}
export type Series = Point[];

export const monthOf = (date: string) => date.slice(0, 7);

/** Months as an index (1970-01 is 0), so lags are arithmetic. */
export const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
export const monthFromIndex = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
export const addMonths = (m: string, n: number) => monthFromIndex(monthIndex(m) + n);

/** Daily or monthly dated values to one value a month (the month's average). */
export function toMonthly(points: { date: string; value: number }[]): Series {
  const sums = new Map<string, { s: number; n: number }>();
  for (const p of points) {
    if (!Number.isFinite(p.value)) continue;
    const m = monthOf(p.date);
    const x = sums.get(m) ?? { s: 0, n: 0 };
    x.s += p.value;
    x.n += 1;
    sums.set(m, x);
  }
  return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, x]) => ({ month, value: x.s / x.n }));
}

const byMonth = (s: Series) => new Map(s.map((p) => [p.month, p.value]));

/** Growth on the same month a year earlier, where both exist and the base isn't zero. */
export function yoy(s: Series): Series {
  const m = byMonth(s);
  return s.flatMap((p) => {
    const base = m.get(addMonths(p.month, -12));
    return base ? [{ month: p.month, value: p.value / base - 1 }] : [];
  });
}

/** a over b, month by month. */
export function ratio(a: Series, b: Series): Series {
  const mb = byMonth(b);
  return a.flatMap((p) => {
    const d = mb.get(p.month);
    return d ? [{ month: p.month, value: p.value / d }] : [];
  });
}

/** Average of the last n months, once n months are available. */
export function average(s: Series, n = 3): Series {
  return s.flatMap((p, i) => (i + 1 < n || monthIndex(p.month) - monthIndex(s[i - n + 1].month) !== n - 1 ? [] : [{ month: p.month, value: s.slice(i - n + 1, i + 1).reduce((a, x) => a + x.value, 0) / n }]));
}

/** "CY26 Q2" to its months, "2026-04" to "2026-06". */
export function quarterMonths(label: string): string[] {
  const m = label.match(/^CY(\d{2}) Q([1-4])$/);
  if (!m) return [];
  const year = 2000 + Number(m[1]);
  const first = (Number(m[2]) - 1) * 3 + 1;
  return [0, 1, 2].map((k) => `${year}-${String(first + k).padStart(2, "0")}`);
}

/** A quarterly series held for each of its three months, so it lines up with monthly ones. */
export function quarterlyToMonthly(q: { quarter: string; value: number }[]): Series {
  return q.flatMap((x) => quarterMonths(x.quarter).map((month) => ({ month, value: x.value }))).sort((a, b) => a.month.localeCompare(b.month));
}

export interface CompanyQuarters {
  slug: string;
  cohort: string;
  quarters: { quarter: string; revenue?: number; operatingIncome?: number }[];
}

/** The calendar quarter a year before "CY26 Q2". */
export const yearBefore = (q: string) => q.replace(/^CY(\d{2})/, (_, y: string) => `CY${String(Number(y) - 1).padStart(2, "0")}`);
const quarterOrder = (q: string) => Number(q.slice(2, 4)) * 4 + Number(q.slice(-1));

/**
 * A group's combined revenue growth by calendar quarter: the same companies this
 * quarter and a year earlier, so a company that starts filing doesn't read as
 * growth. Also the group's operating margin (combined income over revenue).
 */
export function groupQuarters(companies: CompanyQuarters[], minCompanies = 3, minCoverage = 0.65): { quarter: string; growth: number; margin?: number; companies: number }[] {
  const quarters = [...new Set(companies.flatMap((c) => c.quarters.map((q) => q.quarter)))].sort((a, b) => quarterOrder(a) - quarterOrder(b));
  const out: { quarter: string; growth: number; margin?: number; companies: number }[] = [];
  for (const q of quarters) {
    let now = 0;
    let before = 0;
    let income = 0;
    let incomeRevenue = 0;
    let n = 0;
    for (const c of companies) {
      const a = c.quarters.find((x) => x.quarter === q);
      const b = c.quarters.find((x) => x.quarter === yearBefore(q));
      if (a?.revenue === undefined || b?.revenue === undefined || b.revenue <= 0) continue;
      now += a.revenue;
      before += b.revenue;
      n += 1;
      if (a.operatingIncome !== undefined) {
        income += a.operatingIncome;
        incomeRevenue += a.revenue;
      }
    }
    if (n >= minCompanies) out.push({ quarter: q, growth: now / before - 1, margin: incomeRevenue ? income / incomeRevenue : undefined, companies: n });
  }
  // As on Market Cycle: a quarter only most of the group has reported isn't the group's
  // figure yet, or early reporters would stand in for everyone.
  const most = Math.max(0, ...out.map((x) => x.companies));
  return out.filter((x) => x.companies >= minCoverage * most);
}

/** Series on their common months only, in the same order. */
export function align(series: Series[]): { months: string[]; values: number[][] } {
  if (!series.length) return { months: [], values: [] };
  const maps = series.map(byMonth);
  const months = series[0].map((p) => p.month).filter((m) => maps.every((x) => x.has(m)));
  return { months, values: maps.map((x) => months.map((m) => x.get(m)!)) };
}
