import type { ConceptFact } from "./st-6k";

// Taiwan's Market Observation Post System (MOPS, run by TWSE): each listed
// company's quarterly consolidated statements as one inline XBRL page, under
// Taiwan IFRS, in NT dollars. Tags are ifrs-full plus Taiwan's own tifrs
// extensions; each is mapped to the us-gaap concept the 10-Q filers carry, so
// the quarters go through the one earnings build. Parsing is pure; the fetcher
// below needs no key.

const PAGE = "https://mopsov.twse.com.tw/server-java/t164sb01";
const TIMEOUT_MS = 30_000;
// MOPS answers rapid queries with a "too frequent" page instead of the report.
const PAUSE_MS = 1_500;

/** Seasons and the quarter each closes. Taiwanese filers here keep a calendar fiscal year. */
export const SEASONS = [
  { season: 1, name: "Q1", end: "03-31", deadline: "05-15" },
  { season: 2, name: "Q2", end: "06-30", deadline: "08-14" },
  { season: 3, name: "Q3", end: "09-30", deadline: "11-14" },
  { season: 4, name: "annual", end: "12-31", deadline: "03-31" },
] as const;

// Tags in priority order: per period, the first tag with a value wins. `cost`
// amounts are stored positive, as us-gaap tags them; `sum` tags are added up.
const TAGS: { tags: string[]; concept: string; cost?: boolean; sum?: boolean }[] = [
  { tags: ["ifrs-full:Revenue"], concept: "Revenues" },
  { tags: ["tifrs-bsci-ci:OperatingCosts", "ifrs-full:CostOfSales"], concept: "CostOfRevenue", cost: true },
  { tags: ["tifrs-bsci-ci:GrossProfitLossFromOperations", "ifrs-full:GrossProfit"], concept: "GrossProfit" },
  { tags: ["ifrs-full:SellingExpense", "ifrs-full:AdministrativeExpense"], concept: "SellingGeneralAndAdministrativeExpense", cost: true, sum: true },
  { tags: ["ifrs-full:ResearchAndDevelopmentExpense"], concept: "ResearchAndDevelopmentExpense", cost: true },
  { tags: ["ifrs-full:ProfitLossFromOperatingActivities"], concept: "OperatingIncomeLoss" },
  { tags: ["ifrs-full:ProfitLossAttributableToOwnersOfParent"], concept: "NetIncomeLoss" },
  { tags: ["ifrs-full:DilutedEarningsLossPerShare"], concept: "EarningsPerShareDiluted" },
  { tags: ["ifrs-full:CashAndCashEquivalents"], concept: "CashAndCashEquivalentsAtCarryingValue" },
  { tags: ["ifrs-full:Inventories"], concept: "InventoryNet" },
  { tags: ["tifrs-bsci-ci:AccountsReceivableNet", "ifrs-full:CurrentTradeReceivables"], concept: "AccountsReceivableNetCurrent" },
  { tags: ["ifrs-full:TradeAndOtherCurrentPayablesToTradeSuppliers", "tifrs-bsci-ci:AccountsPayable"], concept: "AccountsPayableCurrent" },
  { tags: ["ifrs-full:LongtermBorrowings", "ifrs-full:NoncurrentPortionOfNoncurrentBondsIssued"], concept: "LongTermDebtNoncurrent", sum: true },
  { tags: ["ifrs-full:CashFlowsFromUsedInOperatingActivities"], concept: "NetCashProvidedByUsedInOperatingActivities" },
  { tags: ["ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"], concept: "PaymentsToAcquirePropertyPlantAndEquipment", cost: true },
  { tags: ["ifrs-full:DividendsPaidClassifiedAsFinancingActivities", "tifrs-SCF:CashDividendsPaid"], concept: "PaymentsOfDividends", cost: true },
  { tags: ["ifrs-full:PaymentsToAcquireOrRedeemEntitysShares", "tifrs-SCF:PaymentsToAcquireTreasuryShares"], concept: "PaymentsForRepurchaseOfCommonStock", cost: true },
];

const iso = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

/** "From20260401To20260630" → a duration, "AsOf20260630" → an instant; contexts with a member suffix → undefined. */
export function mopsPeriod(contextRef: string): { start?: string; end: string } | undefined {
  const d = /^From(\d{8})To(\d{8})$/.exec(contextRef);
  if (d) return { start: iso(d[1]), end: iso(d[2]) };
  const i = /^AsOf(\d{8})$/.exec(contextRef);
  return i ? { end: iso(i[1]) } : undefined;
}

/** The viewer page for one company's season. */
export const mopsPage = (coId: string, year: number, season: number) =>
  `${PAGE}?step=1&CO_ID=${coId}&SYEAR=${year}&SSEASON=${season}&REPORT_ID=C`;

/**
 * One season's page as us-gaap facts, this year's and the comparatives. Only
 * facts on the whole group count: equity-statement columns carry a member suffix
 * on the context and are skipped.
 */
export function parseMops(html: string, meta: { form: string; filed: string; url: string }): ConceptFact[] {
  const values = new Map<string, number>(); // tag|start|end → value
  for (const m of html.matchAll(/<ix:nonFraction\b([^>]*)>([^<]*)</g)) {
    const attrs = m[1];
    const tag = /\bname="([^"]+)"/.exec(attrs)?.[1];
    const context = /\bcontextRef="([^"]+)"/.exec(attrs)?.[1];
    const period = context && mopsPeriod(context);
    if (!tag || !period) continue;
    const raw = m[2].replace(/[,\s]/g, "");
    if (!raw || !/^\d+(\.\d+)?$/.test(raw)) continue;
    const scale = Number(/\bscale="(-?\d+)"/.exec(attrs)?.[1] ?? 0);
    const sign = /\bsign="-"/.test(attrs) ? -1 : 1;
    const key = `${tag}|${period.start ?? ""}|${period.end}`;
    // A statement can show one tag twice (the cash flow statement repeats some); the first wins.
    if (!values.has(key)) values.set(key, sign * Number(raw) * 10 ** scale);
  }

  const periods = new Set(Array.from(values.keys()).map((k) => k.slice(k.indexOf("|") + 1)));
  const out: ConceptFact[] = [];
  for (const rule of TAGS) {
    for (const p of periods) {
      const found = rule.tags.map((t) => values.get(`${t}|${p}`)).filter((v): v is number => v !== undefined);
      if (!found.length) continue;
      const val = rule.sum ? found.reduce((s, v) => s + v, 0) : found[0];
      const [start, end] = p.split("|");
      out.push({ concept: rule.concept, end, val: rule.cost ? Math.abs(val) : val, ...(start ? { start } : {}), ...meta, accn: meta.url });
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Every mapped fact from `years` years of a company's seasons. A season not filed
 * yet comes back as a page with no XBRL and adds nothing. MOPS doesn't print a
 * filing date, so `filed` is the statutory deadline for the season.
 */
export async function fetchMops(coId: string, years = 4, today = new Date()): Promise<ConceptFact[]> {
  const thisYear = today.getUTCFullYear();
  const facts: ConceptFact[] = [];
  for (let year = thisYear - years + 1; year <= thisYear; year++) {
    for (const s of SEASONS) {
      const end = `${year}-${s.end}`;
      if (end > today.toISOString().slice(0, 10)) continue;
      const url = mopsPage(coId, year, s.season);
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) throw new Error(`MOPS returned ${res.status}`);
      // The page is Big5; only the ASCII tags and numbers are read, so latin1 is enough.
      const html = new TextDecoder("latin1").decode(await res.arrayBuffer());
      const filed = `${s.season === 4 ? year + 1 : year}-${s.deadline}`;
      facts.push(...parseMops(html, { form: `MOPS ${s.name}`, filed, url }));
      await sleep(PAUSE_MS);
    }
  }
  return facts;
}
