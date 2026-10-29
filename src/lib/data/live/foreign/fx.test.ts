// Converting won reporters to dollars. Run with: npx tsx src/lib/data/live/foreign/fx.test.ts
import assert from "node:assert/strict";
import { parseFredCsv, type FredPoint } from "../fred";
import type { Quarter } from "../earnings-model";
import { convert, perDollarPoints, rateFor } from "./fx";

assert.deepEqual(parseFredCsv("observation_date,DEXKOUS\n2026-10-22,1326.23\n2026-10-23,.\n2026-10-24,1325.06\n"), [
  { date: "2026-10-22", value: 1326.23 },
  { date: "2026-10-24", value: 1325.06 },
]);

// A flat 1,000 won a dollar through 2025, then 1,250 from 2026: growth in dollars
// should differ from growth in won by exactly the currency's move.
const points: FredPoint[] = [];
for (let t = Date.parse("2024-12-01T00:00:00Z"); t <= Date.parse("2026-12-31T00:00:00Z"); t += 86_400_000) {
  const date = new Date(t).toISOString().slice(0, 10);
  const day = new Date(t).getUTCDay();
  if (day !== 0 && day !== 6) points.push({ date, value: date < "2026-01-01" ? 1000 : 1250 });
}

assert.deepEqual(rateFor(points, "2025-06-30"), { average: 1000, close: 1000 });
assert.equal(rateFor(points, "2027-03-31"), undefined, "no rates for a quarter not yet traded");

const q = (end: string, revenue: number, yoy?: number): Quarter => ({
  end,
  fiscalLabel: "",
  calendarLabel: "",
  backedOut: [],
  values: {
    revenue,
    grossProfit: revenue * 0.4,
    grossMargin: 0.4,
    inventory: revenue * 2,
    inventoryDays: 120,
    epsDiluted: 5000,
    ...(yoy === undefined ? {} : { revenueYoY: yoy }),
  },
});
const won = [q("2025-06-30", 1_000e9), q("2026-06-30", 1_500e9, 0.5)];
const { quarters, localYoY } = convert(won, points);

assert.equal(quarters[0].values.revenue, 1e9);
assert.equal(quarters[1].values.revenue, 1.2e9);
assert.equal(quarters[1].values.inventory, 2.4e9, "balances at the quarter-end rate");
// Ratios and days are currency-free and pass through untouched.
assert.equal(quarters[1].values.grossMargin, 0.4);
assert.equal(quarters[1].values.inventoryDays, 120);
// Growth: +50% in won, +20% in dollars after the won fell 20%.
assert.equal(localYoY["2026-06-30"], 0.5);
assert.ok(Math.abs(quarters[1].values.revenueYoY! - 0.2) < 1e-12);
// Won per share isn't shown as dollars.
assert.equal(quarters[1].values.epsDiluted, undefined);
// The input is left alone.
assert.equal(won[1].values.revenue, 1_500e9);

// Sterling is quoted as dollars per pound; it is turned into pounds per dollar.
assert.deepEqual(perDollarPoints([{ date: "2026-10-23", value: 1.25 }], "GBP"), [{ date: "2026-10-23", value: 0.8 }]);
assert.deepEqual(perDollarPoints([{ date: "2026-10-23", value: 32.5 }], "TWD"), [{ date: "2026-10-23", value: 32.5 }]);

// Half years average the rate over six months and have no sequential growth.
assert.equal(rateFor(points, "2025-09-30", 182)?.average, 1000);
const halves = convert([q("2025-03-31", 1_000e9), q("2025-09-30", 1_100e9)], points, 182).quarters;
assert.equal(halves[1].values.revenue, 1.1e9);
assert.equal(halves[1].values.revenueQoQ, undefined);

console.log("fx: ok");
