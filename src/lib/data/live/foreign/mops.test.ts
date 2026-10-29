// Taiwan MOPS statements. Run with: npx tsx src/lib/data/live/foreign/mops.test.ts
//
// The fixture is WT Microelectronics' 2026 Q2 page from MOPS, trimmed to the
// mapped inline XBRL facts and one equity-statement fact with a member context.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mopsPeriod, parseMops } from "./mops";

const html = readFileSync(path.join(__dirname, "fixtures", "mops-wt-q2-2026.htm"), "utf8");
const meta = { form: "MOPS Q2", filed: "2026-08-14", url: "https://mopsov.twse.com.tw/server-java/t164sb01?CO_ID=3036" };
const facts = parseMops(html, meta);
const get = (concept: string, start: string | undefined, end: string) =>
  facts.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);

assert.deepEqual(mopsPeriod("From20260401To20260630"), { start: "2026-04-01", end: "2026-06-30" });
assert.deepEqual(mopsPeriod("AsOf20260630"), { end: "2026-06-30" });
assert.equal(mopsPeriod("AsOf20250101_IssuedCapitalMember"), undefined, "equity-statement columns are skipped");

// Amounts are in thousands of NT dollars on the page (scale 3).
assert.deepEqual(get("Revenues", "2026-04-01", "2026-06-30"), [590_693_698_000]);
assert.deepEqual(get("Revenues", "2026-01-01", "2026-06-30"), [1_084_966_618_000]);
assert.deepEqual(get("Revenues", "2025-04-01", "2025-06-30"), [259_503_350_000], "last year's quarter, from the comparative");
assert.deepEqual(get("CostOfRevenue", "2026-04-01", "2026-06-30"), [570_551_265_000]);
assert.deepEqual(get("GrossProfit", "2026-04-01", "2026-06-30"), [20_142_433_000], "the tifrs tag wins over ifrs-full, once");
assert.deepEqual(get("OperatingIncomeLoss", "2026-04-01", "2026-06-30"), [12_993_593_000]);
assert.deepEqual(get("NetIncomeLoss", "2026-04-01", "2026-06-30"), [9_712_906_000]);
// Selling plus administrative.
assert.deepEqual(get("SellingGeneralAndAdministrativeExpense", "2026-04-01", "2026-06-30"), [(5_433_535 + 1_554_675) * 1000]);
// Balances at this quarter end, last year end and a year ago.
assert.deepEqual(get("InventoryNet", undefined, "2026-06-30"), [318_602_436_000]);
assert.deepEqual(get("InventoryNet", undefined, "2025-12-31"), [259_760_361_000]);
assert.deepEqual(get("AccountsReceivableNetCurrent", undefined, "2026-06-30"), [349_112_272_000]);
assert.deepEqual(get("AccountsPayableCurrent", undefined, "2026-06-30"), [557_091_839_000]);
assert.deepEqual(get("LongTermDebtNoncurrent", undefined, "2026-06-30"), [(400_000 + 10_854_968) * 1000], "borrowings plus bonds");
// Cash flow is year to date; capex prints negative (sign="-") and is stored positive.
assert.deepEqual(get("NetCashProvidedByUsedInOperatingActivities", "2026-01-01", "2026-06-30"), [20_730_778_000]);
assert.deepEqual(get("PaymentsToAcquirePropertyPlantAndEquipment", "2026-01-01", "2026-06-30"), [281_406_000]);
assert.ok(facts.every((f) => f.form === "MOPS Q2" && f.filed === "2026-08-14" && f.url === meta.url));

console.log("mops: ok");
