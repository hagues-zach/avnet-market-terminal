// Korea DART statements. Run with: npx tsx src/lib/data/live/foreign/dart.test.ts
//
// The rows follow the field layout in DART's guide for fnlttSinglAcntAll
// (opendart.fss.or.kr, "단일회사 전체 재무제표"); the amounts are made up. Replace
// them with a captured response once a DART_API_KEY is available.
import assert from "node:assert/strict";
import { quarterly } from "../earnings";
import { corpCodeFor, dartAmount, parseDart, parseSegmentCsv, type DartRow } from "./dart";

assert.equal(dartAmount("1,234,000"), 1_234_000);
assert.equal(dartAmount("-5"), -5);
assert.equal(dartAmount("(5)"), -5);
assert.equal(dartAmount(""), undefined);
assert.equal(dartAmount(undefined), undefined);

const row = (r: Partial<DartRow>): DartRow => ({
  rcept_no: "20260814000123",
  reprt_code: "11012",
  bsns_year: "2026",
  sj_div: "IS",
  account_id: "",
  account_nm: "",
  ...r,
});

// A half-year report: income rows carry three months and the year to date.
const h1 = parseDart([
  row({ account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "20,000", thstrm_add_amount: "36,000", frmtrm_q_amount: "15,000", frmtrm_add_amount: "28,000" }),
  // The same account again on the comprehensive income statement: read once.
  row({ sj_div: "CIS", account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "99", thstrm_add_amount: "99" }),
  // Not a standard account ID: matched on the Korean name.
  row({ account_id: "-표준계정코드 미사용-", account_nm: "영업이익", thstrm_amount: "6,000", thstrm_add_amount: "10,000" }),
  row({ account_id: "ifrs-full_CostOfSales", account_nm: "매출원가", thstrm_amount: "12,000", thstrm_add_amount: "22,000" }),
  row({ sj_div: "BS", account_id: "ifrs-full_Inventories", account_nm: "재고자산", thstrm_amount: "8,000", frmtrm_amount: "7,000" }),
  row({ sj_div: "CF", account_id: "ifrs-full_CashFlowsFromUsedInOperatingActivities", account_nm: "영업활동현금흐름", thstrm_amount: "9,000", frmtrm_amount: "7,500" }),
  row({ sj_div: "CF", account_id: "ifrs-full_PurchaseOfPropertyPlantAndEquipment", account_nm: "유형자산의 취득", thstrm_amount: "-4,000" }),
  // Accounts outside the metric set are ignored.
  row({ account_id: "ifrs-full_FinanceIncome", account_nm: "금융수익", thstrm_amount: "1" }),
]);
const get = (concept: string, start: string | undefined, end: string) =>
  h1.filter((f) => f.concept === concept && f.start === start && f.end === end).map((f) => f.val);

assert.deepEqual(get("Revenues", "2026-04-01", "2026-06-30"), [20_000]);
assert.deepEqual(get("Revenues", "2026-01-01", "2026-06-30"), [36_000]);
assert.deepEqual(get("Revenues", "2025-04-01", "2025-06-30"), [15_000], "last year's quarter, from the comparative");
assert.deepEqual(get("Revenues", "2025-01-01", "2025-06-30"), [28_000]);
assert.deepEqual(get("OperatingIncomeLoss", "2026-04-01", "2026-06-30"), [6_000]);
assert.deepEqual(get("CostOfRevenue", "2026-04-01", "2026-06-30"), [12_000]);
// Balances: this quarter end, and the comparative is last year end.
assert.deepEqual(get("InventoryNet", undefined, "2026-06-30"), [8_000]);
assert.deepEqual(get("InventoryNet", undefined, "2025-12-31"), [7_000]);
// Cash flow is year to date; outflows are stored positive.
assert.deepEqual(get("NetCashProvidedByUsedInOperatingActivities", "2026-01-01", "2026-06-30"), [9_000]);
assert.deepEqual(get("PaymentsToAcquirePropertyPlantAndEquipment", "2026-01-01", "2026-06-30"), [4_000]);
assert.ok(!h1.some((f) => f.val === 99));
assert.ok(h1.every((f) => f.form === "DART H1" && f.filed === "2026-08-14" && f.url?.endsWith("rcpNo=20260814000123")));

// An annual report: the full year, from 1 January.
const fy = parseDart([row({ reprt_code: "11011", bsns_year: "2025", account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "70,000", frmtrm_amount: "60,000" })]);
assert.deepEqual(
  fy.map((f) => [f.start, f.end, f.val]),
  [
    ["2025-01-01", "2025-12-31", 70_000],
    ["2024-01-01", "2024-12-31", 60_000],
  ],
);

// A year of reports becomes four quarters: Q2 and Q3 as filed, Q4 the annual
// figure less the nine months, cash flow backed out of the year to date.
const rev = (code: string, three: string, ytd: string) => row({ reprt_code: code, bsns_year: "2025", account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: three, thstrm_add_amount: ytd });
const ocf = (code: string, ytd: string) => row({ reprt_code: code, bsns_year: "2025", sj_div: "CF", account_id: "ifrs-full_CashFlowsFromUsedInOperatingActivities", account_nm: "영업활동현금흐름", thstrm_amount: ytd });
const year = [
  ...parseDart([rev("11013", "10", "10"), ocf("11013", "3")]),
  ...parseDart([rev("11012", "11", "21"), ocf("11012", "7")]),
  ...parseDart([rev("11014", "12", "33"), ocf("11014", "12")]),
  ...parseDart([row({ reprt_code: "11011", bsns_year: "2025", account_id: "ifrs-full_Revenue", account_nm: "매출액", thstrm_amount: "46" }), ocf("11011", "20")]),
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

// Corp codes come from DART's own list, by stock code.
const list = `<result><list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code></list>
<list><corp_code>00999999</corp_code><corp_name>비상장</corp_name><stock_code> </stock_code></list></result>`;
assert.equal(corpCodeFor(list, "005930"), "00126380");
assert.equal(corpCodeFor(list, "000660"), undefined);

// A segment kept by hand.
const seg = parseSegmentCsv("quarter_end,revenue,operating_income\n# won\n2026-06-30,\"30,000\",5000\n2026-07-15,1,1\n", "data/foreign/x.csv");
assert.deepEqual(seg.bad, [4]);
assert.deepEqual(
  seg.facts.map((f) => [f.concept, f.start, f.end, f.val]),
  [
    ["Revenues", "2026-04-01", "2026-06-30", 30_000],
    ["OperatingIncomeLoss", "2026-04-01", "2026-06-30", 5_000],
  ],
);

console.log("dart: ok");
