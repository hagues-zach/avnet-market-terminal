import type { FredPoint } from "../fred";
import type { FlowMetric, InstantMetric, Metric, Quarter } from "../earnings-model";

// Converting a foreign reporter's quarters to US dollars. The quarters are built
// in the reporting currency first, so every margin, ratio and days figure is
// exact; only the dollar amounts move here. Flows (earned over the quarter) use
// the quarter's average rate, balances the rate on the quarter-end date. Pure.

/**
 * FRED series for each currency, by ISO code. Most are quoted as units of the
 * currency per US dollar; `inverse` series are dollars per unit (sterling).
 */
export const FRED_RATE: Record<string, { series: string; inverse?: boolean }> = {
  KRW: { series: "DEXKOUS" },
  TWD: { series: "DEXTAUS" },
  GBP: { series: "DEXUSUK", inverse: true },
};

/** A FRED series for `currency` as units of that currency per US dollar. */
export function perDollarPoints(points: FredPoint[], currency: string): FredPoint[] {
  return FRED_RATE[currency]?.inverse ? points.filter((p) => p.value).map((p) => ({ ...p, value: 1 / p.value })) : points;
}

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);

const FLOWS: (FlowMetric | "freeCashFlow")[] = [
  "revenue",
  "costOfRevenue",
  "grossProfit",
  "operatingIncome",
  "netIncome",
  "rd",
  "sga",
  "operatingCashFlow",
  "capex",
  "buybacks",
  "dividends",
  "freeCashFlow",
];
const BALANCES: InstantMetric[] = ["inventory", "receivables", "payables", "cash", "longTermDebt"];
// Per-share figures stay in the reporting currency, so they aren't shown in dollars.
const DROPPED: Metric[] = ["epsDiluted"];

export interface QuarterRate {
  average: number;
  close: number;
}

/** The average over the `days` (a quarter by default) to `end`, and the last rate on or before it. Undefined without data. */
export function rateFor(points: FredPoint[], end: string, days = 91): QuarterRate | undefined {
  const to = ms(end);
  const from = to - days * DAY;
  const inQuarter = points.filter((p) => ms(p.date) > from && ms(p.date) <= to);
  // A period that has barely begun, or a gap in the series, isn't averaged.
  if (inQuarter.length < (20 * days) / 91) return undefined;
  const average = inQuarter.reduce((s, p) => s + p.value, 0) / inQuarter.length;
  return { average, close: inQuarter[inQuarter.length - 1].value };
}

function growth(quarters: Quarter[], q: Quarter, daysBack: number): number | undefined {
  const target = ms(q.end) - daysBack * DAY;
  const prior = quarters.find((p) => Math.abs(ms(p.end) - target) <= 20 * DAY);
  const now = q.values.revenue;
  const then = prior?.values.revenue;
  return now !== undefined && then ? now / then - 1 : undefined;
}

/**
 * The quarters in dollars, and revenue growth as it was in the reporting
 * currency. A quarter with no rate keeps its ratios and loses its dollar amounts.
 */
export function convert(quarters: Quarter[], points: FredPoint[], days = 91): { quarters: Quarter[]; localYoY: Record<string, number> } {
  const localYoY: Record<string, number> = {};
  for (const q of quarters) if (q.values.revenueYoY !== undefined) localYoY[q.end] = q.values.revenueYoY;

  const converted = quarters.map((q) => {
    const rate = rateFor(points, q.end, days);
    const values = { ...q.values };
    for (const m of [...FLOWS, ...BALANCES, ...DROPPED]) {
      const v = values[m];
      if (v === undefined) continue;
      if (!rate || DROPPED.includes(m)) delete values[m];
      else values[m] = v / ((BALANCES as Metric[]).includes(m) ? rate.close : rate.average);
    }
    delete values.revenueYoY;
    delete values.revenueQoQ;
    return { ...q, values };
  });
  for (const q of converted) {
    const yoy = growth(converted, q, 364);
    // Half-yearly reporters have no sequential quarter to compare against.
    const qoq = days === 91 ? growth(converted, q, 91) : undefined;
    if (yoy !== undefined) q.values.revenueYoY = yoy;
    if (qoq !== undefined) q.values.revenueQoQ = qoq;
  }
  return { quarters: converted, localYoY };
}
