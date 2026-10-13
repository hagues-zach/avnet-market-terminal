// Quarterly earnings framework: one metric set, applied identically to every
// company, built from SEC XBRL "company facts". Pure types and constants only —
// safe to import from client components.

export type Cohort = "distributor" | "manufacturer" | "platform";

export const COHORT_LABELS: Record<Cohort, string> = {
  distributor: "Distributors",
  manufacturer: "Manufacturers",
  platform: "Large players",
};

export interface Company {
  slug: string;
  name: string;
  cik: number;
  cohort: Cohort;
}

// Every company here files 10-Q/10-K with the SEC, so its numbers arrive in the
// same structured format and refresh without manual work.
export const COMPANIES: Company[] = [
  { slug: "avnet", name: "Avnet", cik: 8858, cohort: "distributor" },
  { slug: "arrow", name: "Arrow Electronics", cik: 7536, cohort: "distributor" },
  { slug: "td-synnex", name: "TD Synnex", cik: 1177394, cohort: "distributor" },
  { slug: "wesco", name: "Wesco", cik: 929008, cohort: "distributor" },
  { slug: "scansource", name: "ScanSource", cik: 918965, cohort: "distributor" },
  { slug: "richardson", name: "Richardson Electronics", cik: 355948, cohort: "distributor" },
  { slug: "texas-instruments", name: "Texas Instruments", cik: 97476, cohort: "manufacturer" },
  { slug: "analog-devices", name: "Analog Devices", cik: 6281, cohort: "manufacturer" },
  { slug: "microchip", name: "Microchip", cik: 827054, cohort: "manufacturer" },
  { slug: "onsemi", name: "onsemi", cik: 1097864, cohort: "manufacturer" },
  { slug: "nxp", name: "NXP", cik: 1413447, cohort: "manufacturer" },
  { slug: "nvidia", name: "Nvidia", cik: 1045810, cohort: "platform" },
  { slug: "broadcom", name: "Broadcom", cik: 1730168, cohort: "platform" },
  { slug: "amd", name: "AMD", cik: 2488, cohort: "platform" },
  { slug: "qualcomm", name: "Qualcomm", cik: 804328, cohort: "platform" },
  { slug: "intel", name: "Intel", cik: 50863, cohort: "platform" },
];

export const DEFAULT_COMPANY = "avnet";

/** Reported line items. Flow = earned over the quarter; instant = balance at quarter end. */
export type FlowMetric =
  | "revenue"
  | "costOfRevenue"
  | "grossProfit"
  | "operatingIncome"
  | "netIncome"
  | "epsDiluted"
  | "rd"
  | "sga"
  | "operatingCashFlow"
  | "capex"
  | "buybacks"
  | "dividends";

export type InstantMetric = "inventory" | "receivables" | "payables" | "cash" | "longTermDebt";

/** Ratios computed the same way for every company from the line items above. */
export type DerivedMetric =
  | "revenueYoY"
  | "revenueQoQ"
  | "grossMargin"
  | "operatingMargin"
  | "netMargin"
  | "rdPct"
  | "sgaPct"
  | "freeCashFlow"
  | "fcfMargin"
  | "inventoryDays"
  | "receivableDays"
  | "payableDays"
  | "cashCycleDays";

export type Metric = FlowMetric | InstantMetric | DerivedMetric;

// Companies tag the same line item with different XBRL concepts, and switch tags
// over time. Each metric lists accepted us-gaap concepts in priority order; per
// period, the first concept that has a value wins.
export const FLOW_CONCEPTS: Record<FlowMetric, string[]> = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
  ],
  costOfRevenue: [
    "CostOfRevenue",
    "CostOfGoodsAndServicesSold",
    "CostOfGoodsSold",
    "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization",
  ],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  epsDiluted: ["EarningsPerShareDiluted"],
  rd: ["ResearchAndDevelopmentExpense"],
  sga: ["SellingGeneralAndAdministrativeExpense"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"],
  buybacks: ["PaymentsForRepurchaseOfCommonStock"],
  dividends: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
};

export const INSTANT_CONCEPTS: Record<InstantMetric, string[]> = {
  inventory: ["InventoryNet"],
  receivables: ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent", "AccountsAndOtherReceivablesNetCurrent"],
  payables: ["AccountsPayableCurrent", "AccountsPayableTradeCurrent"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  longTermDebt: ["LongTermDebtNoncurrent", "LongTermDebt", "LongTermDebtAndCapitalLeaseObligations"],
};

export interface Quarter {
  end: string; // YYYY-MM-DD, last day of the fiscal quarter
  fiscalLabel: string; // company's own fiscal calendar, e.g. "FY26 Q4"
  calendarLabel: string; // calendar quarter the period mostly falls in, e.g. "CY26 Q2"
  values: Partial<Record<Metric, number>>;
  /** Line items not reported for the quarter on its own, backed out of year-to-date totals. */
  backedOut: FlowMetric[];
}

export interface Filing {
  form: string;
  filed: string; // YYYY-MM-DD
  url: string;
}

export interface CompanyEarnings {
  company: Company;
  quarters: Quarter[]; // oldest → newest
  latestFiling: Filing | null;
  error?: string;
}

export interface EarningsData {
  companies: CompanyEarnings[];
  fetchedAt: string; // ISO
}
