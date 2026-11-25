// Season by group and the leaderboard. Run with: npx tsx src/lib/earnings/leaderboard.test.ts
import assert from "node:assert/strict";
import { COMPANIES, type CompanyEarnings, type Quarter } from "@/lib/data/live/earnings-model";
import { medianOf, movers, previousQuarter, rank, seasonByGroup } from "./leaderboard";

const co = (slug: string) => COMPANIES.find((c) => c.slug === slug)!;
const q = (calendarLabel: string, end: string, values: Quarter["values"]): Quarter => ({ end, fiscalLabel: calendarLabel, calendarLabel, values, backedOut: [] });
const e = (slug: string, quarters: Quarter[]): CompanyEarnings => ({ company: co(slug), quarters, latestFiling: null });

assert.equal(previousQuarter("CY26 Q3"), "CY26 Q2");
assert.equal(previousQuarter("CY26 Q1"), "CY25 Q4");
assert.equal(previousQuarter("FY26 Q1"), "FY26 Q1");

const all = [
  e("avnet", [
    q("CY25 Q3", "2025-09-30", { revenueYoY: 0.02, inventoryDays: 90, operatingMargin: 0.03 }),
    q("CY26 Q2", "2026-06-30", { revenueYoY: 0.1, inventoryDays: 80, operatingMargin: 0.035 }),
    q("CY26 Q3", "2026-09-30", { revenueYoY: 0.3, inventoryDays: 77, operatingMargin: 0.044 }),
  ]),
  e("arrow", [
    q("CY25 Q3", "2025-09-30", { revenueYoY: 0.01, inventoryDays: 72 }),
    q("CY26 Q2", "2026-06-30", { revenueYoY: 0.05, inventoryDays: 71, operatingMargin: 0.03 }),
    q("CY26 Q3", "2026-09-30", { revenueYoY: 0.2, inventoryDays: 70, operatingMargin: 0.04 }),
  ]),
  // Filed only the quarter before: counts toward the group, not toward "filed".
  e("wesco", [q("CY26 Q2", "2026-06-30", { revenueYoY: -0.02, operatingMargin: 0.06 })]),
];

// Season by group: distributors, 2 of 3 filed, medians and the share growing.
const dist = seasonByGroup(all, "CY26 Q3").find((g) => g.cohort === "distributor")!;
assert.equal(dist.total, 3);
assert.equal(dist.filed, 2);
assert.ok(Math.abs(dist.medianGrowth! - 0.25) < 1e-12);
assert.ok(Math.abs(dist.priorMedianGrowth! - 0.05) < 1e-12);
assert.equal(dist.shareGrowing, 1);
assert.ok(Math.abs(dist.inventoryDaysChange! - -7.5) < 1e-12);
// Groups with no companies are left out.
assert.ok(!seasonByGroup(all, "CY26 Q3").some((g) => g.total === 0));

// Ranking: higher is better for growth, lower for inventory days.
const growth = rank(all, "revenueYoY");
assert.deepEqual(growth.map((r) => r.company.slug), ["avnet", "arrow", "wesco"]);
assert.ok(Math.abs(growth[0].change! - 0.2) < 1e-12);
assert.equal(growth[2].change, undefined);
assert.deepEqual(rank(all, "inventoryDays").map((r) => r.company.slug), ["arrow", "avnet"]);
assert.ok(Math.abs(medianOf(growth)! - 0.2) < 1e-12);

// Movers: biggest change first, companies without a quarter before left out.
assert.deepEqual(movers(growth, "revenueYoY").map((r) => r.company.slug), ["avnet", "arrow"]);

console.log("leaderboard: ok");
