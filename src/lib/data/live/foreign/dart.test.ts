// Korea DART statements and segment notes. Run with: npx tsx src/lib/data/live/foreign/dart.test.ts
//
// The fixtures are real DART responses: SK hynix's H1 2026 statements
// (fnlttSinglAcntAll, trimmed to the four statements and the fields read) and
// Samsung Electronics' operating segment note from its H1 2025 XBRL.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { quarterly } from "../earnings";
import { dartAmount, parseDart, parseSegmentXbrl, reportOf, segmentMember, type DartRow } from "./dart";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures", name), "utf8");

assert.equal(dartAmount("1,234,000"), 1_234_000);
assert.equal(dartAmount("-5"), -5);
assert.equal(dartAmount("(5)"), -5);
assert.equal(dartAmount(""), undefined);
assert.equal(dartAmount(undefined), undefined);

// SK hynix, half-year report: income rows carry three months and the year to date.
const h1 = parseDart((JSON.parse(fixture("dart-sk-hynix-h1-2026.json")) as { list: DartRow[] }).list);
const get = (concept: string, start: string | undefined, end: string) =>
  h1.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);

assert.deepEqual(get("Revenues", "2026-04-01", "2026-06-30"), [79_318_746_000_000]);
assert.deepEqual(get("Revenues", "2026-01-01", "2026-06-30"), [131_895_033_000_000]);
assert.deepEqual(get("Revenues", "2025-04-01", "2025-06-30"), [22_231_952_000_000], "last year's quarter, from the comparative");
assert.deepEqual(get("Revenues", "2025-01-01", "2025-06-30"), [39_871_093_000_000]);
assert.deepEqual(get("CostOfRevenue", "2026-04-01", "2026-06-30"), [13_327_390_000_000]);
assert.deepEqual(get("OperatingIncomeLoss", "2026-04-01", "2026-06-30"), [60_542_608_000_000]);
assert.deepEqual(get("NetIncomeLoss", "2026-04-01", "2026-06-30"), [93_820_236_000_000]);
// The EPS row is named for the half year ("희석주당반기순이익"), so it matches on its ID.
assert.deepEqual(get("EarningsPerShareDiluted", "2026-04-01", "2026-06-30"), [131_478]);
// Balances: this quarter end, and the comparative is last year end.
assert.deepEqual(get("InventoryNet", undefined, "2026-06-30"), [17_985_706_000_000]);
assert.deepEqual(get("InventoryNet", undefined, "2025-12-31"), [14_289_390_000_000]);
// Cash flow is year to date; outflows are stored positive.
assert.deepEqual(get("NetCashProvidedByUsedInOperatingActivities", "2026-01-01", "2026-06-30"), [91_742_501_000_000]);
assert.deepEqual(get("PaymentsToAcquirePropertyPlantAndEquipment", "2026-01-01", "2026-06-30"), [18_328_836_000_000]);
assert.ok(h1.every((f) => f.form === "DART H1" && f.filed === "2026-08-14" && f.url?.endsWith("rcpNo=20260814003509")));

// An annual report: the full year, from 1 January.
const row = (r: Partial<DartRow>): DartRow => ({ rcept_no: "20260310000001", reprt_code: "11011", bsns_year: "2025", sj_div: "IS", account_id: "", account_nm: "", ...r });
const fy = parseDart([row({ account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "70,000", frmtrm_amount: "60,000" })]);
assert.deepEqual(
  fy.map((f) => [f.start, f.end, f.val]),
  [
    ["2025-01-01", "2025-12-31", 70_000],
    ["2024-01-01", "2024-12-31", 60_000],
  ],
);

// A year of reports becomes four quarters: Q2 and Q3 as filed, Q4 the annual
// figure less the nine months, cash flow backed out of the year to date.
// Small made-up amounts, to show the arithmetic.
const rev = (code: string, three: string, ytd: string) => row({ reprt_code: code, account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: three, thstrm_add_amount: ytd });
const ocf = (code: string, ytd: string) => row({ reprt_code: code, sj_div: "CF", account_id: "ifrs-full_CashFlowsFromUsedInOperatingActivities", account_nm: "영업활동현금흐름", thstrm_amount: ytd });
const year = [
  ...parseDart([rev("11013", "10", "10"), ocf("11013", "3")]),
  ...parseDart([rev("11012", "11", "21"), ocf("11012", "7")]),
  ...parseDart([rev("11014", "12", "33"), ocf("11014", "12")]),
  ...parseDart([row({ account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "46" }), ocf("11011", "20")]),
];
const byQuarter = (concept: string) =>
  Array.from(quarterly(year.filter((f) => f.concept === concept && f.end.startsWith("2025"))).entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([end, v]) => [end, v.val]);
assert.deepEqual(byQuarter("Revenues"), [
  ["2025-03-31", 10],
  ["2025-06-30", 11],
  ["2025-09-30", 12],
  ["2025-12-31", 13],
]);
assert.deepEqual(byQuarter("NetCashProvidedByUsedInOperatingActivities"), [
  ["2025-03-31", 3],
  ["2025-06-30", 4],
  ["2025-09-30", 5],
  ["2025-12-31", 8],
]);

// Report names from DART's filing list.
assert.equal(reportOf("분기보고서 (2026.03)")?.code, "11013");
assert.equal(reportOf("반기보고서 (2026.06)")?.code, "11012");
assert.equal(reportOf("[기재정정]분기보고서 (2025.09)")?.code, "11014");
assert.equal(reportOf("사업보고서 (2025.12)")?.code, "11011");
assert.equal(reportOf("감사보고서제출"), undefined);

// Samsung's DS segment: the reportable-segment figures Samsung publishes, not
// the second "…OfSegmentsMember" series, the DX segment or the impairment table.
const ds = parseSegmentXbrl(fixture("samsung-segments.xbrl"), segmentMember("DS"), "20250814003156", "DART H1");
const seg = (concept: string, start: string, end: string) => ds.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);
assert.deepEqual(seg("Revenues", "2025-04-01", "2025-06-30"), [27_875_087_000_000]);
assert.deepEqual(seg("OperatingIncomeLoss", "2025-04-01", "2025-06-30"), [350_173_000_000]);
assert.deepEqual(seg("Revenues", "2024-04-01", "2024-06-30"), [28_556_551_000_000], "last year's quarter");
assert.deepEqual(seg("Revenues", "2025-01-01", "2025-06-30"), [53_006_093_000_000]);
assert.equal(ds.length, 8, "revenue and operating profit, for two quarters and two half years");
assert.ok(ds.every((f) => f.form === "DART H1" && f.filed === "2025-08-14"));
// The 2026 name for the same member.
assert.ok(segmentMember("DS").test(":DsSegmentsMemberOfReportableSegmentsMemberOfDisclosureOfOperatingSegmentsTableOfMember"));

console.log("dart: ok");
