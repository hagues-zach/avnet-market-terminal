import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SERIES, type CatalogSeries } from "./catalog";
import { average, groupQuarters, quarterlyToMonthly, ratio, yoy, type CompanyQuarters, type Series } from "./transform";

// Reads the committed history (scripts/fetch-history.ts) into each catalog
// series, as the engine measures it: growth on a year ago or the level, as a
// 3-month average so one odd month doesn't date a turn. Server-only (reads files).

const ROOT = path.join(process.cwd(), "data", "cycle", "history");

export function fredSeries(id: string): Series {
  const file = path.join(ROOT, "fred", `${id}.json`);
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, "utf8")) as [string, number][]).map(([month, value]) => ({ month, value }));
}

export function secCompanies(): CompanyQuarters[] {
  const file = path.join(ROOT, "sec-companies.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as CompanyQuarters[]) : [];
}

const SEC_COHORTS: Record<NonNullable<CatalogSeries["sec"]>, string[]> = {
  chips: ["manufacturer", "platform", "connectivity", "memory"],
  exai: ["manufacturer"],
  ai: ["platform", "connectivity"],
};

/** A chip group's combined revenue growth and operating margin by quarter. */
export function secGroup(group: NonNullable<CatalogSeries["sec"]>) {
  return groupQuarters(secCompanies().filter((c) => SEC_COHORTS[group].includes(c.cohort)));
}

/** The underlying level: the FRED series, the ratio, or for SEC the growth itself. */
export function rawSeries(s: CatalogSeries): Series {
  if (s.fred) return fredSeries(s.fred);
  if (s.ratio) return ratio(fredSeries(s.ratio[0]), fredSeries(s.ratio[1]));
  if (s.sec) return quarterlyToMonthly(secGroup(s.sec).map((q) => ({ quarter: q.quarter, value: q.growth })));
  return [];
}

/** The series as the engine reads it: growth on a year ago or the level, as a 3-month average. */
export function measured(s: CatalogSeries): Series {
  const raw = rawSeries(s);
  // SEC figures are already growth on a year ago, held for each month of the quarter.
  if (s.sec) return raw;
  return average(s.measure === "yoy" ? yoy(raw) : raw, 3);
}

export const measuredAll = () => new Map(SERIES.map((s) => [s.key, measured(s)]));
