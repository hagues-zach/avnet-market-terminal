// The Asian source parsers. Run with: npx tsx src/lib/cycle/sources/sources.test.ts
import assert from "node:assert/strict";
import { parseComtrade, periods } from "./comtrade";
import { monthsBehind, parseManualCsv } from "./manual";
import { isSemiconductorSheet, parseSeaj, seajLinks, seajFileUrl } from "./seaj";

// ---- SEAJ: rows as the "Back Number" sheet has them, read as formatted text ----
const head = [
  ["■Back Number", null, "※2024年3月25日： 23/1-12データに修正が入りました。"],
  ["半導体製造装置(日本製装置）"],
  ["Semiconductor Manufacturing Equipment(Japanese Equipment)"],
  ["年　　Year", "月　　Monｔｈ", "3ヶ月移動平均値/3mma", null, null, null, "BBﾚｼｵ　（BB Ratio)"],
  [null, null, "受注額(百万円）", "前年比(%)", "販売額(百万円）", "前年比(%)"],
  [null, null, "Bookings(M\\)", "Growth Rate(%)", "Billings(M\\)", "Growth Rate(%)"],
];
const rows = [
  ...head,
  ["2005", "1", "113,452", "-20.3%", "120,350", "17.0%", "0.94"],
  [null, "2", "100,782", "-21.7%", "121,259", "8.2%", "0.83"],
  ["2017", "3", "181,370", "40.1%", "162,331", "39.5%", "1.12"],
  [null, "4", null, null, "205,500", "30.1%"],
  ["2026", "9", null, null, "629,040", "48.2%"],
  [null, "10"],
  [null, "11", null, null, null, null],
];
const seaj = parseSeaj(rows);
assert.deepEqual(seaj.map((m) => m.month), ["2005-01", "2005-02", "2017-03", "2017-04", "2026-09"], "year carried down, empty months skipped");
assert.deepEqual(seaj[0], { month: "2005-01", bookings: 113452, billings: 120350, bookToBill: 0.94 });
assert.deepEqual(seaj[3], { month: "2017-04", billings: 205500 }, "billings only after March 2017");
assert.equal(seaj.at(-1)!.billings, 629040);
// Numbers can also arrive as numbers.
assert.equal(parseSeaj([...head, [2005, 1, 113452, "-20.3%", 120350, "17.0%", 0.94]])[0].billings, 120350);
// The flat panel workbook is refused.
const fpd = [["■Back Number"], ["FPD製造装置(日本製装置）"], ["FPD Manufacturing Equipment(Japanese Equipment)"], ["2005", "1", "24,883", "-49.8%", "37,848", "28.3%", "0.66"]];
assert.equal(isSemiconductorSheet(fpd), false);
assert.throws(() => parseSeaj(fpd), /Not the SEAJ semiconductor/);
// Links on the statistics page, resolved against it.
assert.deepEqual(seajLinks('<a href="46971333726468.xls">x</a> <a href="a.pdf">y</a> <a href="1797580447475.xls">z</a>'), ["46971333726468.xls", "1797580447475.xls"]);
assert.equal(seajFileUrl("46971333726468.xls"), "https://www.seaj.or.jp/english/statistics/46971333726468.xls");

// ---- Comtrade ----
const recorded = { count: 1, data: [{ period: "202512", reporterCode: 410, flowCode: "X", partnerCode: 0, cmdCode: "8542", primaryValue: 16734567890 }] };
assert.deepEqual(parseComtrade(recorded), { kind: "value", month: "2025-12", value: 16734567890 });
assert.deepEqual(parseComtrade({ count: 0, data: [] }), { kind: "none" });
assert.deepEqual(parseComtrade({ statusCode: 429, message: "Rate limit is exceeded. Try again in 3 seconds." }), { kind: "rate-limited", retryAfter: 3 });
assert.equal(parseComtrade({ error: "Maximum number of periods for preview is 1" }).kind, "error");
assert.deepEqual(periods("2025-11", "2026-02"), ["202511", "202512", "202601", "202602"]);

// ---- Manual CSV ----
const csv = 'month,value\n2026-07,41320\n2026-08, 45,750 \n# note\n2026-9,1\n2026-09,"47,420"\n2026-10,1,2\nbad line\n';
const read = parseManualCsv(csv);
assert.deepEqual(read.points, [
  { month: "2026-07", value: 41320 },
  { month: "2026-08", value: 45750 },
  { month: "2026-09", value: 47420 },
], "thousands separators read as one number, quoted or not");
assert.equal(read.latest, "2026-09");
assert.deepEqual(read.bad.map((b) => b.line), [5, 7, 8], "bad rows reported with their line: a short month, an ambiguous value, no value");
assert.equal(monthsBehind("2026-09", "2026-10-26"), 1);
assert.equal(monthsBehind(null, "2026-10-26"), null);

console.log("cycle sources: ok");
