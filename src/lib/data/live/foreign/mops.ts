import type { ConceptFact } from "./st-6k";

// Taiwan's Market Observation Post System (MOPS, run by TWSE): each listed
// company's quarterly consolidated statements as one inline XBRL page, under
// Taiwan IFRS, in NT dollars. Tags are ifrs-full plus Taiwan's own tifrs
// extensions; each is mapped to the us-gaap concept the 10-Q filers carry, so
// the quarters go through the one earnings build. Parsing is pure.
//
// Each page is 1–2 MB and MOPS can serve it at a few KB/s, far too slow to fetch
// while a page renders. So the pages are read by scripts/fetch-mops.ts into a
// committed snapshot (mops-snapshot.json), and at request time only TWSE's
// OpenAPI is called, which lists every company's latest income statement in one
// fast JSON response, to add a season filed since the snapshot.

const PAGE = "https://mopsov.twse.com.tw/server-java/t164sb01";
const OPENAPI_INCOME = "https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci";
const OPENAPI_TIMEOUT_MS = 15_000;

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

/**
 * The filed seasons whose pages cover the last `years` full years and this one. Every
 * page also carries the same season a year earlier, so a year whose seasons all
 * appear as comparatives on the next year's pages is skipped.
 */
export function mopsSeasons(years: number, today = new Date()): { year: number; season: number }[] {
  const day = today.toISOString().slice(0, 10);
  // Filed once its deadline has passed; a page fetched earlier may be empty.
  const ended = (year: number, s: (typeof SEASONS)[number]) => `${s.season === 4 ? year + 1 : year}-${s.deadline}` < day;
  const out: { year: number; season: number }[] = [];
  const thisYear = today.getUTCFullYear();
  for (let year = thisYear; year > thisYear - years - 1; year--) {
    for (const s of SEASONS) {
      if (!ended(year, s)) continue;
      // Covered by next year's page for the same season.
      if (year < thisYear && ended(year + 1, s) && out.some((o) => o.year === year + 1 && o.season === s.season)) continue;
      out.push({ year, season: s.season });
    }
  }
  return out;
}

/**
 * Every mapped fact on the given seasons' pages, a few pages at a time. A season
 * not filed yet comes back as a page with no XBRL and adds nothing. MOPS doesn't
 * print a filing date, so `filed` is the statutory deadline for the season.
 * Slow (minutes): for scripts/fetch-mops.ts, not for rendering.
 */
export async function fetchMops(coId: string, seasons: { year: number; season: number }[], atOnce = 4): Promise<ConceptFact[]> {
  const read = async ({ year, season }: { year: number; season: number }): Promise<ConceptFact[]> => {
    const s = SEASONS[season - 1];
    const url = mopsPage(coId, year, season);
    const res = await fetch(url, { signal: AbortSignal.timeout(15 * 60_000), cache: "no-store" });
    if (!res.ok) throw new Error(`MOPS returned ${res.status} for ${coId} ${year} Q${season}`);
    // The page is Big5; only the ASCII tags and numbers are read, so latin1 is enough.
    const html = new TextDecoder("latin1").decode(await res.arrayBuffer());
    const filed = `${season === 4 ? year + 1 : year}-${s.deadline}`;
    return parseMops(html, { form: `MOPS ${s.name}`, filed, url });
  };
  const facts: ConceptFact[] = [];
  for (let i = 0; i < seasons.length; i += atOnce) {
    for (const batch of await Promise.all(seasons.slice(i, i + atOnce).map(read))) facts.push(...batch);
  }
  return facts;
}

/** One company's row in TWSE's OpenAPI income statement listing, as published (Chinese field names). */
export type OpenApiIncomeRow = Record<string, string>;

// Year-to-date amounts in thousands of NT dollars.
const OPENAPI_FIELDS: [string, string, boolean?][] = [
  ["營業收入", "Revenues"],
  ["營業成本", "CostOfRevenue", true],
  ["營業毛利（毛損）淨額", "GrossProfit"],
  ["營業利益（損失）", "OperatingIncomeLoss"],
  ["淨利（淨損）歸屬於母公司業主", "NetIncomeLoss"],
];

/** "1151030" (ROC year 115) → "2026-10-30". */
const rocDate = (d: string) => `${Number(d.slice(0, d.length - 4)) + 1911}-${d.slice(-4, -2)}-${d.slice(-2)}`;

/** The company's latest season from the OpenAPI listing, as year-to-date income facts. */
export function parseOpenApiIncome(rows: OpenApiIncomeRow[], coId: string): ConceptFact[] {
  const row = rows.find((r) => r["公司代號"] === coId);
  const s = row && SEASONS[Number(row["季別"]) - 1];
  if (!row || !s) return [];
  const year = Number(row["年度"]) + 1911;
  const url = mopsPage(coId, year, s.season);
  const meta = { form: `MOPS ${s.name}`, filed: rocDate(row["出表日期"]), accn: url, url };
  return OPENAPI_FIELDS.flatMap(([field, concept, cost]) => {
    const v = Number(row[field]);
    if (!row[field] || !Number.isFinite(v)) return [];
    return [{ concept, start: `${year}-01-01`, end: `${year}-${s.end}`, val: (cost ? Math.abs(v) : v) * 1000, ...meta }];
  });
}

/** The latest season's income from the OpenAPI; empty when it can't be reached in time. */
export async function fetchMopsLatest(coId: string): Promise<ConceptFact[]> {
  try {
    const res = await fetch(OPENAPI_INCOME, { signal: AbortSignal.timeout(OPENAPI_TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return [];
    return parseOpenApiIncome((await res.json()) as OpenApiIncomeRow[], coId);
  } catch {
    return [];
  }
}
