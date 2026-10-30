import type { ConceptFact } from "./st-6k";

// UK and EU listed companies file their annual report as ESEF (inline XBRL under
// IFRS) with their national storage mechanism. filings.xbrl.org collects them and
// serves each as xBRL-JSON, keyed by the company's LEI, with no key needed. ESEF
// covers the annual report only; half-year figures come from rs-halves.ts.
// Parsing is pure; the fetcher below reads the index and then each filing.

const BASE = "https://filings.xbrl.org";
// Each filing's JSON is a few MB; fetched together so a cold profile stays well
// inside a serverless function's time limit.
const TIMEOUT_MS = 25_000;

// Undimensioned ifrs-full facts only: the group, not the parent company's own
// statements or a segment. `cost` amounts are stored positive, as us-gaap tags them.
const TAGS: { tags: string[]; concept: string; cost?: boolean }[] = [
  { tags: ["ifrs-full:Revenue"], concept: "Revenues" },
  { tags: ["ifrs-full:CostOfSales"], concept: "CostOfRevenue", cost: true },
  { tags: ["ifrs-full:GrossProfit"], concept: "GrossProfit" },
  { tags: ["ifrs-full:ProfitLossFromOperatingActivities"], concept: "OperatingIncomeLoss" },
  { tags: ["ifrs-full:ProfitLossAttributableToOwnersOfParent"], concept: "NetIncomeLoss" },
  { tags: ["ifrs-full:Inventories"], concept: "InventoryNet" },
  { tags: ["ifrs-full:TradeAndOtherCurrentReceivables"], concept: "AccountsReceivableNetCurrent" },
  { tags: ["ifrs-full:TradeAndOtherCurrentPayables"], concept: "AccountsPayableCurrent" },
  { tags: ["ifrs-full:LongtermBorrowings"], concept: "LongTermDebtNoncurrent" },
  { tags: ["ifrs-full:CashFlowsFromUsedInOperatingActivities"], concept: "NetCashProvidedByUsedInOperatingActivities" },
  { tags: ["ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"], concept: "PaymentsToAcquirePropertyPlantAndEquipment", cost: true },
  { tags: ["ifrs-full:DividendsPaidClassifiedAsFinancingActivities", "ifrs-full:DividendsPaid"], concept: "PaymentsOfDividends", cost: true },
  { tags: ["ifrs-full:PaymentsToAcquireOrRedeemEntitysShares"], concept: "PaymentsForRepurchaseOfCommonStock", cost: true },
];

export interface EsefJson {
  facts: Record<string, { value: string; dimensions: Record<string, string> }>;
}

// xBRL-JSON writes periods as instants at midnight: a year to 31 March ends
// "…-04-01T00:00:00", and a balance on 31 March is dated 1 April.
const dayBefore = (stamp: string) => new Date(Date.parse(`${stamp.slice(0, 10)}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** One annual filing's group figures as us-gaap facts, this year's and the comparatives. */
export function parseEsef(json: EsefJson, unit: string, meta: { form: string; filed: string; url: string }): ConceptFact[] {
  const values = new Map<string, number>(); // tag|start|end → value
  for (const { value, dimensions: d } of Object.values(json.facts)) {
    // concept, entity, period and unit; anything more is a dimension.
    if (Object.keys(d).length > 4 || d.unit !== `iso4217:${unit}` || !d.period) continue;
    const [a, b] = d.period.split("/");
    const key = b ? `${d.concept}|${a.slice(0, 10)}|${dayBefore(b)}` : `${d.concept}||${dayBefore(a)}`;
    const v = Number(value);
    if (Number.isFinite(v) && !values.has(key)) values.set(key, v);
  }
  const periods = new Set(Array.from(values.keys()).map((k) => k.slice(k.indexOf("|") + 1)));
  const out: ConceptFact[] = [];
  for (const rule of TAGS) {
    for (const p of periods) {
      const val = rule.tags.map((t) => values.get(`${t}|${p}`)).find((v) => v !== undefined);
      if (val === undefined) continue;
      const [start, end] = p.split("|");
      out.push({ concept: rule.concept, end, val: rule.cost ? Math.abs(val) : val, ...(start ? { start } : {}), ...meta, accn: meta.url });
    }
  }
  return out;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`filings.xbrl.org returned ${res.status}`);
  return (await res.json()) as T;
}

interface EsefIndex {
  data: { attributes: { period_end: string; date_added: string; json_url?: string; viewer_url?: string } }[];
}

/** The last `years` annual filings of the company with this LEI. */
export async function fetchEsef(lei: string, unit: string, years = 3): Promise<ConceptFact[]> {
  const index = await getJson<EsefIndex>(`${BASE}/api/filings?filter%5Bentity.identifier%5D=${lei}&sort=-period_end`);
  const filings = index.data
    .map((d) => d.attributes)
    .filter((f) => f.json_url)
    .sort((a, b) => b.period_end.localeCompare(a.period_end))
    .slice(0, years);
  const read = async (f: (typeof filings)[number]) => {
    const meta = { form: "ESEF annual", filed: f.date_added.slice(0, 10), url: `${BASE}${f.viewer_url ?? f.json_url}` };
    return parseEsef(await getJson<EsefJson>(`${BASE}${f.json_url}`), unit, meta);
  };
  return (await Promise.all(filings.map(read))).flat();
}
