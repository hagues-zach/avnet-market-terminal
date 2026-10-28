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
  { sheet: "cash", ids: ["ifrs-full_PurchaseOfPropertyPlantAndEquipment", "ifrs-full_PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"], names: /^유형자산의 ?취득$/, concept: "PaymentsToAcquirePropertyPlantAndEquipment", cost: true },
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
  const byId = (row: DartRow) => ACCOUNTS.find((a) => a.sheet === SHEET[row.sj_div] && a.ids.includes(row.account_id));
  // Names repeat across statements (comprehensive income attributable to owners
  // is "지배기업의 소유주지분" too), so a name only counts where no row had the ID.
  const matchedById = new Set(rows.map((r) => byId(r)?.concept));
  for (const row of rows) {
    const sheet = SHEET[row.sj_div];
    if (!sheet) continue;
    const rule =
      byId(row) ?? ACCOUNTS.find((a) => a.sheet === sheet && !matchedById.has(a.concept) && a.names.test(row.account_nm.trim()));
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`DART returned ${res.status}`);
  return (await res.json()) as T;
}

// Status "013" is DART's "no data": a report not filed yet.
const NO_DATA = "013";

/** Every mapped fact from `years` years of a company's reports, consolidated. */
export async function fetchDart(corpCode: string, key: string, years = 4, today = new Date()): Promise<ConceptFact[]> {
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

// The statements API carries the group only; a segment's figures are in the
// operating segment note of each report's XBRL instance, on ifrs-full:SegmentsAxis.
const SEGMENT_CONCEPTS: Record<string, string> = {
  "ifrs-full:Revenue": "Revenues",
  "dart:OperatingIncomeLoss": "OperatingIncomeLoss",
};

/**
 * The segment's member in the operating segment note, under reportable segments:
 * the figures Samsung publishes. Samsung has renamed it ("DsDivisionMember…" in
 * 2025, "DsSegmentsMember…" from 2026). The note also repeats the segment under
 * a second parent ("…OfSegmentsMember") with a different measure, and other
 * tables such as impairment reuse it; both are skipped.
 */
export const segmentMember = (segment: string) =>
  new RegExp(`:${segment[0]}${segment.slice(1).toLowerCase()}(Segments|Division)MemberOfReportableSegmentsMember\\w*OperatingSegmentsTable`);

/**
 * One report's segment revenue and operating profit, before internal sales are
 * eliminated, for every duration the instance holds (three months, year to date,
 * and last year's comparatives). Pure over the instance document.
 */
export function parseSegmentXbrl(xbrl: string, member: RegExp, rceptNo: string, form: string): ConceptFact[] {
  const periods = new Map<string, { start: string; end: string }>();
  for (const m of xbrl.matchAll(/<xbrli:context id="([^"]+)">([\s\S]*?)<\/xbrli:context>/g)) {
    const body = m[2];
    if (!member.test(body) || /Elimination/i.test(body)) continue;
    const start = /<xbrli:startDate>([^<]+)</.exec(body)?.[1];
    const end = /<xbrli:endDate>([^<]+)</.exec(body)?.[1];
    if (start && end) periods.set(m[1], { start, end });
  }
  const meta = { form, filed: filedOn(rceptNo), accn: rceptNo, url: dartViewer(rceptNo) };
  const out: ConceptFact[] = [];
  for (const m of xbrl.matchAll(/<([\w-]+:\w+)\b[^>]*\bcontextRef="([^"]+)"[^>]*>([^<]*)</g)) {
    const concept = SEGMENT_CONCEPTS[m[1]];
    const period = periods.get(m[2]);
    const val = dartAmount(m[3]);
    if (concept && period && val !== undefined) out.push({ concept, val, ...period, ...meta });
  }
  return out;
}

/** "분기보고서 (2026.03)" → the report code and its name; anything else (audit, correction notices) → undefined. */
export function reportOf(reportName: string): (typeof REPORTS)[number] | undefined {
  if (/사업보고서/.test(reportName)) return REPORTS[3];
  if (/반기보고서/.test(reportName)) return REPORTS[1];
  const month = /분기보고서\s*\(\d{4}\.(\d{2})\)/.exec(reportName)?.[1];
  return month === "03" ? REPORTS[0] : month === "09" ? REPORTS[2] : undefined;
}

/**
 * A segment's facts from `years` years of periodic reports' XBRL. Samsung's
 * reports tag the segment note from 2025; each also carries the prior year's
 * comparatives, so two years of reports reach back to the start of 2024.
 */
export async function fetchDartSegment(corpCode: string, key: string, segment: string, years = 2, today = new Date()): Promise<ConceptFact[]> {
  const since = `${today.getUTCFullYear() - years + 1}0101`;
  // last_reprt_at=Y keeps only the latest version of a report that was amended.
  const list = await getJson<{ status: string; message: string; list?: { rcept_no: string; report_nm: string }[] }>(
    `${API}/list.json?crtfc_key=${encodeURIComponent(key)}&corp_code=${corpCode}&bgn_de=${since}&pblntf_ty=A&last_reprt_at=Y&page_count=100`,
  );
  if (list.status === NO_DATA) return [];
  if (list.status !== "000") throw new Error(`DART: ${list.message} (${list.status})`);
  const member = segmentMember(segment);
  const filings = (list.list ?? []).flatMap((f) => {
    const report = reportOf(f.report_nm);
    return report ? [{ ...f, report }] : [];
  });
  // Each archive takes several seconds to arrive, so a few are read at a time.
  const read = async ({ rcept_no, report }: (typeof filings)[number]): Promise<ConceptFact[]> => {
    const url = `${API}/fnlttXbrl.xml?crtfc_key=${encodeURIComponent(key)}&rcept_no=${rcept_no}&reprt_code=${report.code}`;
    const get = () => fetch(url, { signal: AbortSignal.timeout(60_000), cache: "no-store" });
    const res = await get().catch(get);
    if (!res.ok) throw new Error(`DART returned ${res.status} for filing ${rcept_no}`);
    // A filing without XBRL comes back as a small status message, not a zip.
    const zip = await JSZip.loadAsync(await res.arrayBuffer()).catch(() => undefined);
    const instance = zip && Object.values(zip.files).find((f) => /\.xbrl$/i.test(f.name));
    return instance ? parseSegmentXbrl(await instance.async("string"), member, rcept_no, `DART ${report.name}`) : [];
  };
  const facts: ConceptFact[] = [];
  for (let i = 0; i < filings.length; i += XBRL_AT_ONCE) {
    for (const batch of await Promise.all(filings.slice(i, i + XBRL_AT_ONCE).map(read))) facts.push(...batch);
  }
  return facts;
}

const XBRL_AT_ONCE = 4;
