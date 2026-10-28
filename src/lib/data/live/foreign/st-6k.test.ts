// STMicro's interim 6-K statements. Run with: npx tsx src/lib/data/live/foreign/st-6k.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { amount, parseInterim } from "./st-6k";

assert.equal(amount("3,481"), 3481);
assert.equal(amount("(2,272)"), -2272);
assert.equal(amount("0.24"), 0.24);
assert.equal(amount("(0.11)"), -0.11);
assert.equal(amount("—"), 0);
assert.equal(amount("June 27, 2026"), undefined);
assert.equal(amount("Net revenues"), undefined);

// The statements section of the Q2 2026 interim report (furnished 30 July 2026).
const html = readFileSync(path.join(__dirname, "fixtures", "st-6k-q2-2026.htm"), "utf8");
const facts = parseInterim(html, { filed: "2026-07-30", accn: "0000932787-26-000058", url: "https://example.test/6k" });
const get = (concept: string, start: string | undefined, end: string) =>
  facts.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);

// Three months ended 27 June 2026, as printed.
assert.deepEqual(get("Revenues", "2026-03-29", "2026-06-27"), [3_487e6]);
assert.deepEqual(get("GrossProfit", "2026-03-29", "2026-06-27"), [1_215e6]);
assert.deepEqual(get("OperatingIncomeLoss", "2026-03-29", "2026-06-27"), [187e6]);
assert.deepEqual(get("EarningsPerShareDiluted", "2026-03-29", "2026-06-27"), [0.24]);
// Costs print in parentheses and are stored positive; losses stay negative.
assert.deepEqual(get("CostOfRevenue", "2026-03-29", "2026-06-27"), [2_272e6]);
assert.deepEqual(get("OperatingIncomeLoss", "2025-03-30", "2025-06-28"), [-133e6]);
// Six months: year to date from 1 January, for backing out single quarters.
assert.deepEqual(get("Revenues", "2026-01-01", "2026-06-27"), [6_582e6]);
// Cash flow is year to date only, and its "Inventories" change isn't read as a balance.
assert.deepEqual(get("NetCashProvidedByUsedInOperatingActivities", "2026-01-01", "2026-06-27"), [1_036e6]);
assert.deepEqual(get("PaymentsToAcquirePropertyPlantAndEquipment", "2026-01-01", "2026-06-27"), [1_002e6]);
assert.deepEqual(get("InventoryNet", undefined, "2026-06-27"), [3_188e6]);
assert.deepEqual(get("AccountsPayableCurrent", undefined, "2025-12-31"), [1_487e6]);
// Every fact carries where it came from.
assert.ok(facts.every((f) => f.form === "6-K" && f.filed === "2026-07-30" && f.url === "https://example.test/6k"));
// No figure is read twice with two different values.
const seen = new Map<string, number>();
for (const f of facts) {
  const key = `${f.concept}|${f.start ?? ""}|${f.end}`;
  assert.ok(!seen.has(key) || seen.get(key) === f.val, key);
  seen.set(key, f.val);
}

console.log("st-6k: ok");
