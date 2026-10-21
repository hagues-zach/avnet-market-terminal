// Avnet vs Arrow rules. Run with: npx tsx src/lib/competitive/compare.test.ts
import assert from "node:assert/strict";
import type { Quarter } from "@/lib/data/live/earnings-model";
import { scorecard, strengths, talkingPoint, tally, verdict } from "./compare";

const q = (values: Quarter["values"]): Quarter => ({ end: "2026-06-30", fiscalLabel: "Q", calendarLabel: "CY26 Q2", values, backedOut: [] });

const avnet = q({
  revenue: 6580,
  revenueYoY: 0.182,
  grossMargin: 0.109,
  operatingMargin: 0.036,
  sgaPct: 0.073,
  inventoryDays: 92,
  receivableDays: 70,
});
const arrow = q({
  revenue: 7920,
  revenueYoY: 0.096,
  grossMargin: 0.118,
  operatingMargin: 0.041,
  sgaPct: 0.077,
  inventoryDays: 74,
  receivableDays: 120,
});
const avnetYA = q({ revenueYoY: 0.05, grossMargin: 0.112, inventoryDays: 90 });
const arrowYA = q({ revenueYoY: 0.08, grossMargin: 0.12, inventoryDays: 80 });
const rows = scorecard(avnet, arrow, avnetYA, arrowYA);
const row = (m: string) => rows.find((r) => r.metric === m)!;

// Who leads, including lower-is-better rows and rows that can't be compared.
assert.equal(row("revenueYoY").leads, "Avnet");
assert.equal(row("grossMargin").leads, "Arrow");
assert.equal(row("sgaPct").leads, "Avnet");
assert.equal(row("inventoryDays").leads, "Arrow");
assert.equal(row("revenue").leads, null);
assert.equal(row("receivableDays").leads, null);
assert.ok(row("receivableDays").caveat);
assert.equal(row("fcfMargin").leads, null, "a missing figure leads nowhere");
// Gaps: a difference, or a ratio for dollars.
assert.ok(Math.abs(row("revenue").gap! - 6580 / 7920) < 1e-9);
assert.ok(Math.abs(row("inventoryDays").gap! - 18) < 1e-9);
// Near-equal figures are even.
assert.equal(scorecard(q({ grossMargin: 0.1101 }), q({ grossMargin: 0.1099 }))[3].leads, "Even");

// The verdict and the tally.
assert.equal(verdict(rows, "CY26 Q2"), "Avnet grew faster in CY26 Q2, Arrow kept the higher margins.");
assert.deepEqual(tally(rows), { avnet: 2, arrow: 3, counted: 5 });

// Strengths, biggest edge first, and their sentences.
assert.deepEqual(
  strengths(rows, "Avnet").map((r) => r.metric),
  ["revenueYoY", "sgaPct"],
);
assert.equal(
  talkingPoint(row("revenueYoY")),
  "Avnet is growing about 1.9 times as fast as Arrow on a year ago (+18.2% against +9.6%). A year ago it was the other way round.",
);
assert.equal(
  talkingPoint(row("inventoryDays")),
  "Arrow carries 18 days less inventory than Avnet, measured against cost of sales. The gap has widened from 10 days a year ago.",
);
assert.equal(
  talkingPoint(row("grossMargin")),
  "Arrow's gross margin is 0.9 points higher than Avnet's (11.8% against 10.9%). The gap has widened from 0.8 points a year ago.",
);

console.log("compare: all tests passed");
