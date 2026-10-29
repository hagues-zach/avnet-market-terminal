// UK ESEF annual reports and RS Group's half years. Run with: npx tsx src/lib/data/live/foreign/esef.test.ts
//
// The fixture is RS Group's FY26 annual report as xBRL-JSON from
// filings.xbrl.org, trimmed to the mapped group facts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { quarterly } from "../earnings";
import { parseEsef, type EsefJson } from "./esef";
import { rsHalves } from "./rs-halves";

const json = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "esef-rs-fy26.json"), "utf8")) as EsefJson;
const meta = { form: "ESEF annual", filed: "2026-06-11", url: "https://filings.xbrl.org/549300KVXDURRKVW7R37/2026-03-31/" };
const facts = parseEsef(json, "GBP", meta);
const get = (concept: string, start: string | undefined, end: string) =>
  facts.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);

// xBRL-JSON's exclusive ends become the last day of the year.
assert.deepEqual(get("Revenues", "2025-04-01", "2026-03-31"), [2_881_100_000]);
assert.deepEqual(get("Revenues", "2024-04-01", "2025-03-31"), [2_903_500_000], "last year, from the comparative");
assert.deepEqual(get("CostOfRevenue", "2025-04-01", "2026-03-31"), [1_630_800_000]);
assert.deepEqual(get("OperatingIncomeLoss", "2025-04-01", "2026-03-31"), [238_600_000]);
assert.deepEqual(get("NetIncomeLoss", "2025-04-01", "2026-03-31"), [162_000_000]);
assert.deepEqual(get("InventoryNet", undefined, "2026-03-31"), [595_000_000]);
assert.deepEqual(get("InventoryNet", undefined, "2025-03-31"), [617_300_000]);
// Dividends are tagged twice; one fact, stored positive.
assert.deepEqual(get("PaymentsOfDividends", "2025-04-01", "2026-03-31"), [105_900_000]);
assert.equal(parseEsef(json, "USD", meta).length, 0, "only the reporting currency is read");

// The hand-kept first halves: income adds up, and the second half is the year less the first.
for (const end of ["2023-09-30", "2024-09-30", "2025-09-30"]) {
  const v = (c: string) => rsHalves().find((f) => f.concept === c && f.end === end && f.start)!.val;
  assert.ok(Math.abs(v("Revenues") - v("CostOfRevenue") - v("GrossProfit")) < 1, `revenue less cost is gross profit, ${end}`);
}
const revenue = quarterly([...facts, ...rsHalves()].filter((f) => f.concept === "Revenues"), true);
assert.deepEqual(revenue.get("2025-09-30"), { val: 1_402_800_000, backedOut: false });
assert.deepEqual(revenue.get("2026-03-31"), { val: 2_881_100_000 - 1_402_800_000, backedOut: true });
assert.equal(quarterly(facts.filter((f) => f.concept === "Revenues")).size, 0, "a full year alone makes no quarters");

console.log("esef: ok");
