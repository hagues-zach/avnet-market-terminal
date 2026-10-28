import JSZip from "jszip";
import type { ConceptFact } from "./st-6k";

// Korea's DART (Open DART, run by the Financial Supervisory Service): full
// consolidated statements from every periodic report, under K-IFRS, in won.
// Each account row is mapped to the us-gaap concept the 10-Q filers carry, so the
// quarters go through the one earnings build. Parsing is pure; the fetchers below
// need DART_API_KEY (free, from opendart.fss.or.kr).

const API = "https://opendart.fss.or.kr/api";
const TIMEOUT_MS = 20_000;

/** Report codes and the quarter each one closes. Korean filers here all keep a calendar fiscal year. */
export const REPORTS = [
  { code: "11013", name: "Q1", end: "03-31" },
  { code: "11012", name: "H1", end: "06-30" },
  { code: "11014", name: "Q3", end: "09-30" },
  { code: "11011", name: "annual", end: "12-31" },
] as const;

export interface DartRow {
  rcept_no: string;
  reprt_code: string;
  bsns_year: string;
  sj_div: string; // BS, IS, CIS, CF, SCE
  account_id: string;
  account_nm: string;
  thstrm_amount?: string;
  thstrm_add_amount?: string;
  frmtrm_amount?: string;
  frmtrm_q_amount?: string;
  frmtrm_add_amount?: string;
  currency?: string;
}

type Sheet = "income" | "balance" | "cash";
const SHEET: Record<string, Sheet> = { IS: "income", CIS: "income", BS: "balance", CF: "cash" };

// The standard account ID first; filers that use their own account show
// "-표준계정코드 미사용-" there, so the Korean account name is the fallback.
// `cost` amounts are stored positive, as us-gaap tags them.
const ACCOUNTS: { sheet: Sheet; ids: string[]; names: RegExp; concept: string; cost?: boolean }[] = [
  { sheet: "income", ids: ["ifrs-full_Revenue"], names: /^(매출액|수익\(매출액\)|영업수익)$/, concept: "Revenues" },
  { sheet: "income", ids: ["ifrs-full_CostOfSales"], names: /^매출원가$/, concept: "CostOfRevenue", cost: true },
  { sheet: "income", ids: ["ifrs-full_GrossProfit"], names: /^매출총이익$/, concept: "GrossProfit" },
  {
    sheet: "income",
    ids: ["dart_TotalSellingGeneralAdministrativeExpenses", "ifrs-full_SellingGeneralAndAdministrativeExpense"],
    names: /^판매비와\s?관리비$/,
    concept: "SellingGeneralAndAdministrativeExpense",
    cost: true,
  },
  { sheet: "income", ids: ["dart_OperatingIncomeLoss"], names: /^영업이익(\(손실\))?$/, concept: "OperatingIncomeLoss" },
  {
    sheet: "income",
    ids: ["ifrs-full_ProfitLossAttributableToOwnersOfParent"],
    names: /^지배기업(의)? ?소유주(지분|에게 귀속되는 당기순이익)/,
    concept: "NetIncomeLoss",
  },
  { sheet: "income", ids: ["ifrs-full_DilutedEarningsLossPerShare"], names: /^희석주당(순)?이익/, concept: "EarningsPerShareDiluted" },
  { sheet: "balance", ids: ["ifrs-full_CashAndCashEquivalents"], names: /^현금및현금성자산$/, concept: "CashAndCashEquivalentsAtCarryingValue" },
  { sheet: "balance", ids: ["ifrs-full_Inventories"], names: /^재고자산$/, concept: "InventoryNet" },
  {
    sheet: "balance",
    ids: ["dart_ShortTermTradeReceivable", "ifrs-full_CurrentTradeReceivables", "ifrs-full_TradeAndOtherCurrentReceivables"],
    names: /^매출채권/,
    concept: "AccountsReceivableNetCurrent",
  },
  {
    sheet: "balance",
    ids: ["dart_ShortTermTradePayable", "ifrs-full_TradeAndOtherCurrentPayablesToTradeSuppliers", "ifrs-full_TradeAndOtherCurrentPayables"],
    names: /^매입채무/,
    concept: "AccountsPayableCurrent",
  },
  { sheet: "balance", ids: ["ifrs-full_LongtermBorrowings", "ifrs-full_NoncurrentPortionOfNoncurrentBorrowings"], names: /^장기차입금$/, concept: "LongTermDebtNoncurrent" },
  {
    sheet: "cash",
    ids: ["ifrs-full_CashFlowsFromUsedInOperatingActivities"],
    names: /^영업활동(으로 인한 )?현금흐름$/,
    concept: "NetCashProvidedByUsedInOperatingActivities",
  },
  { sheet: "cash", ids: ["ifrs-full_PurchaseOfPropertyPlantAndEquipment"], names: /^유형자산의 ?취득$/, concept: "PaymentsToAcquirePropertyPlantAndEquipment", cost: true },
  { sheet: "cash", ids: ["ifrs-full_DividendsPaidClassifiedAsFinancingActivities"], names: /^배당금(의)? ?지급$/, concept: "PaymentsOfDividends", cost: true },
  {
    sheet: "cash",
    ids: ["ifrs-full_PaymentsToAcquireOrRedeemEntitysShares", "dart_AcquisitionOfTreasuryShares"],
    names: /^자기주식의 ?취득$/,
    concept: "PaymentsForRepurchaseOfCommonStock",
    cost: true,
  },
];

/** "1,234", "-5", "(5)", "" → a number, or undefined when blank. */
export function dartAmount(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const c = s.replace(/[,\s]/g, "");
  if (!c || c === "-") return undefined;
  const m = /^(\()?(-)?(\d+(\.\d+)?)\)?$/.exec(c);
  if (!m) return undefined;
  const v = Number(m[3]);
  return m[1] || m[2] ? -v : v;
}

const quarterStart = (year: number, endMonthDay: string) => `${year}-${String(Number(endMonthDay.slice(0, 2)) - 2).padStart(2, "0")}-01`;

/** DART's viewer for a receipt number; its first eight digits are the filing date. */
export const dartViewer = (rceptNo: string) => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
const filedOn = (rceptNo: string) => `${rceptNo.slice(0, 4)}-${rceptNo.slice(4, 6)}-${rceptNo.slice(6, 8)}`;

/**
 * One report's rows as us-gaap facts, this year's and the comparative year's.
 * Quarterly income rows carry the three months and the year to date; cash flow
 * rows only the year to date, which the earnings build backs quarters out of.
 */
export function parseDart(rows: DartRow[]): ConceptFact[] {
  const out: ConceptFact[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const sheet = SHEET[row.sj_div];
    if (!sheet) continue;
    const rule = ACCOUNTS.find((a) => a.sheet === sheet && (a.ids.includes(row.account_id) || a.names.test(row.account_nm.trim())));
    if (!rule) continue;
    const report = REPORTS.find((r) => r.code === row.reprt_code);
    if (!report) continue;
    const year = Number(row.bsns_year);
    const meta = { form: `DART ${report.name}`, filed: filedOn(row.rcept_no), accn: row.rcept_no, url: dartViewer(row.rcept_no) };
    const push = (val: number | undefined, end: string, start?: string) => {
      if (val === undefined) return;
      // A statement can list one account twice (IS and CIS); the first wins.
      const key = `${rule.concept}|${start ?? ""}|${end}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ concept: rule.concept, end, val: rule.cost ? Math.abs(val) : val, ...(start ? { start } : {}), ...meta });
    };
    const annual = report.code === "11011";
    for (const [y, current] of [
      [year, true],
      [year - 1, false],
    ] as const) {
      const end = `${y}-${report.end}`;
      const yearStart = `${y}-01-01`;
      if (sheet === "balance") {
        // The comparative balance in a quarterly report is the prior year end, not the same quarter.
        if (current) push(dartAmount(row.thstrm_amount), end);
        else push(dartAmount(row.frmtrm_amount), `${y}-12-31`);
      } else if (annual || sheet === "cash") {
        push(dartAmount(current ? row.thstrm_amount : row.frmtrm_amount), end, yearStart);
      } else {
        push(dartAmount(current ? row.thstrm_amount : row.frmtrm_q_amount), end, quarterStart(y, report.end));
        push(dartAmount(current ? row.thstrm_add_amount : row.frmtrm_add_amount), end, yearStart);
      }
    }
  }
  return out;
}

/** The DART corp code for a KRX stock code, from the corpCode.xml list. Pure over the XML. */
export function corpCodeFor(xml: string, stockCode: string): string | undefined {
  for (const m of xml.matchAll(/<list>([\s\S]*?)<\/list>/g)) {
    const field = (name: string) => new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`).exec(m[1])?.[1];
    if (field("stock_code") === stockCode) return field("corp_code");
  }
  return undefined;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`DART returned ${res.status}`);
  return (await res.json()) as T;
}

let corpCodes: Promise<string> | undefined;

/** The full corp code list, read once per process (a few MB zipped). */
async function corpCodeXml(key: string): Promise<string> {
  corpCodes ??= (async () => {
    const res = await fetch(`${API}/corpCode.xml?crtfc_key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!res.ok) throw new Error(`DART returned ${res.status} for the company list`);
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const file = Object.values(zip.files).find((f) => /\.xml$/i.test(f.name));
    if (!file) throw new Error("DART's company list had no XML file");
    return file.async("string");
  })().catch((e) => {
    corpCodes = undefined;
    throw e;
  });
  return corpCodes;
}

// Status "013" is DART's "no data": a report not filed yet.
const NO_DATA = "013";

/** Every mapped fact from `years` years of a company's reports, consolidated. */
export async function fetchDart(stockCode: string, key: string, years = 4, today = new Date()): Promise<ConceptFact[]> {
  const corpCode = corpCodeFor(await corpCodeXml(key), stockCode);
  if (!corpCode) throw new Error(`DART has no company with stock code ${stockCode}`);
  const thisYear = today.getUTCFullYear();
  const requests = Array.from({ length: years }, (_, i) => thisYear - i).flatMap((year) => REPORTS.map((r) => ({ year, code: r.code })));
  const facts: ConceptFact[] = [];
  // A period also appears as the comparative in the next year's report; the
  // earnings build keeps the most recently filed value, so restatements win.
  for (const { year, code } of requests) {
    const url = `${API}/fnlttSinglAcntAll.json?crtfc_key=${encodeURIComponent(key)}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${code}&fs_div=CFS`;
    const body = await getJson<{ status: string; message: string; list?: DartRow[] }>(url);
    if (body.status === NO_DATA) continue;
    if (body.status !== "000") throw new Error(`DART: ${body.message} (${body.status})`);
    facts.push(...parseDart(body.list ?? []));
  }
  return facts;
}

/**
 * A segment's quarters from a hand-kept CSV (data/foreign/<slug>.csv): rows of
 * "quarter_end,revenue,operating_income" in won, as the group's earnings release
 * prints them. DART's statements carry the group, not its segments.
 */
export function parseSegmentCsv(text: string, source: string): { facts: ConceptFact[]; bad: number[] } {
  const facts: ConceptFact[] = [];
  const bad: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || /^quarter_end\s*,/i.test(line)) return;
    // Release tables print thousands separators, so a figure may be quoted ("30,000").
    const [end, revenue, operating] = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const rev = dartAmount(revenue);
    const op = dartAmount(operating);
    if (!/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(end) || rev === undefined) {
      bad.push(i + 1);
      return;
    }
    const start = quarterStart(Number(end.slice(0, 4)), end.slice(5));
    const meta = { start, end, form: "Manual", filed: end, url: source };
    facts.push({ concept: "Revenues", val: rev, ...meta });
    if (op !== undefined) facts.push({ concept: "OperatingIncomeLoss", val: op, ...meta });
  });
  return { facts, bad };
}
