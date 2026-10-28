// Quarterly earnings framework: one metric set, applied identically to every
// company, built from SEC XBRL "company facts". Pure types and constants only —
// safe to import from client components.

export type Cohort =
  | "distributor"
  | "manufacturer"
  | "platform"
  | "connectivity"
  | "memory"
  | "equipment"
  | "software"
  | "components"
  | "ems"
  | "hyperscaler"
  | "systems"
  | "auto"
  | "industrial";

export const COHORT_LABELS: Record<Cohort, string> = {
  distributor: "Distributors",
  manufacturer: "Manufacturers",
  platform: "Large players",
  connectivity: "AI & connectivity",
  memory: "Memory & storage",
  equipment: "Equipment & packaging",
  software: "Design software",
  components: "Interconnect & passives",
  ems: "Contract manufacturers",
  hyperscaler: "Hyperscalers",
  systems: "Devices & systems",
  auto: "Automotive",
  industrial: "Industrial OEMs",
};

// The last four groups are buyers of components, tracked as a read on demand
// rather than as part of the semiconductor supply chain.
export const DEMAND_COHORTS: Cohort[] = ["hyperscaler", "systems", "auto", "industrial"];
export const isDemand = (c: Cohort) => DEMAND_COHORTS.includes(c);

export const COHORTS = Object.keys(COHORT_LABELS) as Cohort[];

export interface Company {
  slug: string;
  name: string;
  cik: number;
  cohort: Cohort;
}

// Every company here files 10-Q/10-K with the SEC under US GAAP, so its numbers
// arrive in the same structured format and refresh without manual work. Each CIK
// was checked against the registrant name on EDGAR. To add a company, add a row.
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
  { slug: "skyworks", name: "Skyworks", cik: 4127, cohort: "manufacturer" },
  { slug: "monolithic-power", name: "Monolithic Power", cik: 1280452, cohort: "manufacturer" },
  { slug: "lattice", name: "Lattice", cik: 855658, cohort: "manufacturer" },
  { slug: "wolfspeed", name: "Wolfspeed", cik: 895419, cohort: "manufacturer" },
  { slug: "silicon-labs", name: "Silicon Labs", cik: 1038074, cohort: "manufacturer" },
  { slug: "power-integrations", name: "Power Integrations", cik: 833640, cohort: "manufacturer" },
  { slug: "allegro", name: "Allegro MicroSystems", cik: 866291, cohort: "manufacturer" },
  { slug: "diodes", name: "Diodes", cik: 29002, cohort: "manufacturer" },
  { slug: "semtech", name: "Semtech", cik: 88941, cohort: "manufacturer" },
  { slug: "macom", name: "MACOM", cik: 1493594, cohort: "manufacturer" },
  { slug: "cirrus-logic", name: "Cirrus Logic", cik: 772406, cohort: "manufacturer" },
  { slug: "synaptics", name: "Synaptics", cik: 817720, cohort: "manufacturer" },
  { slug: "rambus", name: "Rambus", cik: 917273, cohort: "manufacturer" },
  { slug: "teledyne", name: "Teledyne", cik: 1094285, cohort: "manufacturer" },
  { slug: "vicor", name: "Vicor", cik: 751978, cohort: "manufacturer" },
  { slug: "sitime", name: "SiTime", cik: 1451809, cohort: "manufacturer" },
  { slug: "maxlinear", name: "MaxLinear", cik: 1288469, cohort: "manufacturer" },
  { slug: "digi", name: "Digi International", cik: 854775, cohort: "manufacturer" },
  { slug: "navitas", name: "Navitas", cik: 1821769, cohort: "manufacturer" },
  { slug: "nvidia", name: "Nvidia", cik: 1045810, cohort: "platform" },
  { slug: "broadcom", name: "Broadcom", cik: 1730168, cohort: "platform" },
  { slug: "amd", name: "AMD", cik: 2488, cohort: "platform" },
  { slug: "qualcomm", name: "Qualcomm", cik: 804328, cohort: "platform" },
  { slug: "intel", name: "Intel", cik: 50863, cohort: "platform" },
  { slug: "marvell", name: "Marvell", cik: 1835632, cohort: "connectivity" },
  { slug: "astera-labs", name: "Astera Labs", cik: 1736297, cohort: "connectivity" },
  { slug: "credo", name: "Credo", cik: 1807794, cohort: "connectivity" },
  { slug: "coherent", name: "Coherent", cik: 820318, cohort: "connectivity" },
  { slug: "lumentum", name: "Lumentum", cik: 1633978, cohort: "connectivity" },
  { slug: "micron", name: "Micron", cik: 723125, cohort: "memory" },
  { slug: "western-digital", name: "Western Digital", cik: 106040, cohort: "memory" },
  { slug: "sandisk", name: "Sandisk", cik: 2023554, cohort: "memory" },
  { slug: "seagate", name: "Seagate", cik: 1137789, cohort: "memory" },
  { slug: "gsi-technology", name: "GSI Technology", cik: 1126741, cohort: "memory" },
  { slug: "applied-materials", name: "Applied Materials", cik: 6951, cohort: "equipment" },
  { slug: "lam-research", name: "Lam Research", cik: 707549, cohort: "equipment" },
  { slug: "kla", name: "KLA", cik: 319201, cohort: "equipment" },
  { slug: "teradyne", name: "Teradyne", cik: 97210, cohort: "equipment" },
  { slug: "entegris", name: "Entegris", cik: 1101302, cohort: "equipment" },
  { slug: "onto", name: "Onto Innovation", cik: 704532, cohort: "equipment" },
  { slug: "amkor", name: "Amkor", cik: 1047127, cohort: "equipment" },
  { slug: "synopsys", name: "Synopsys", cik: 883241, cohort: "software" },
  { slug: "cadence", name: "Cadence", cik: 813672, cohort: "software" },
  { slug: "amphenol", name: "Amphenol", cik: 820313, cohort: "components" },
  { slug: "te-connectivity", name: "TE Connectivity", cik: 1385157, cohort: "components" },
  { slug: "vishay", name: "Vishay", cik: 103730, cohort: "components" },
  { slug: "littelfuse", name: "Littelfuse", cik: 889331, cohort: "components" },
  { slug: "sensata", name: "Sensata", cik: 1477294, cohort: "components" },
  { slug: "bel-fuse", name: "Bel Fuse", cik: 729580, cohort: "components" },
  { slug: "corning", name: "Corning", cik: 24741, cohort: "components" },
  { slug: "itt", name: "ITT", cik: 216228, cohort: "components" },
  { slug: "cts", name: "CTS", cik: 26058, cohort: "components" },
  { slug: "jabil", name: "Jabil", cik: 898293, cohort: "ems" },
  { slug: "flex", name: "Flex", cik: 866374, cohort: "ems" },
  { slug: "sanmina", name: "Sanmina", cik: 897723, cohort: "ems" },
  { slug: "plexus", name: "Plexus", cik: 785786, cohort: "ems" },
  { slug: "benchmark", name: "Benchmark Electronics", cik: 863436, cohort: "ems" },
  { slug: "microsoft", name: "Microsoft", cik: 789019, cohort: "hyperscaler" },
  { slug: "alphabet", name: "Alphabet", cik: 1652044, cohort: "hyperscaler" },
  { slug: "amazon", name: "Amazon", cik: 1018724, cohort: "hyperscaler" },
  { slug: "meta", name: "Meta", cik: 1326801, cohort: "hyperscaler" },
  { slug: "oracle", name: "Oracle", cik: 1341439, cohort: "hyperscaler" },
  { slug: "apple", name: "Apple", cik: 320193, cohort: "systems" },
  { slug: "dell", name: "Dell", cik: 1571996, cohort: "systems" },
  { slug: "hpe", name: "HPE", cik: 1645590, cohort: "systems" },
  { slug: "cisco", name: "Cisco", cik: 858877, cohort: "systems" },
  { slug: "super-micro", name: "Super Micro", cik: 1375365, cohort: "systems" },
  { slug: "ibm", name: "IBM", cik: 51143, cohort: "systems" },
  { slug: "gm", name: "General Motors", cik: 1467858, cohort: "auto" },
  { slug: "ford", name: "Ford", cik: 37996, cohort: "auto" },
  { slug: "tesla", name: "Tesla", cik: 1318605, cohort: "auto" },
  { slug: "honeywell", name: "Honeywell", cik: 773840, cohort: "industrial" },
  { slug: "rockwell", name: "Rockwell Automation", cik: 1024478, cohort: "industrial" },
  { slug: "emerson", name: "Emerson", cik: 32604, cohort: "industrial" },
  { slug: "deere", name: "Deere", cik: 315189, cohort: "industrial" },
  { slug: "caterpillar", name: "Caterpillar", cik: 18230, cohort: "industrial" },
];

/** How a company relates to Avnet. Drives the Network pillar's directory and profiles. */
export type Role = "avnet" | "supplier" | "competitor" | "customer" | "ecosystem";

export const ROLE_LABELS: Record<Role, string> = {
  avnet: "Avnet",
  supplier: "Suppliers",
  competitor: "Competitors",
  customer: "Customers",
  ecosystem: "Ecosystem",
};

export const ROLE_SINGULAR: Record<Role, string> = {
  avnet: "Avnet",
  supplier: "Supplier",
  competitor: "Competitor",
  customer: "Customer",
  ecosystem: "Ecosystem",
};

export const ROLES: Role[] = ["supplier", "competitor", "customer", "ecosystem"];

// Component makers are suppliers; other distributors are competitors; buyers of
// components (including contract manufacturers) are customers; equipment and
// design-software companies sit upstream of the suppliers.
const ROLE_OF_COHORT: Record<Cohort, Role> = {
  distributor: "competitor",
  manufacturer: "supplier",
  platform: "supplier",
  connectivity: "supplier",
  memory: "supplier",
  components: "supplier",
  equipment: "ecosystem",
  software: "ecosystem",
  ems: "customer",
  hyperscaler: "customer",
  systems: "customer",
  auto: "customer",
  industrial: "customer",
};

export const roleOf = (c: Company): Role => (c.slug === "avnet" ? "avnet" : ROLE_OF_COHORT[c.cohort]);

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

/** One row of the cross-company table: a company and its most recent reported quarter. */
export interface PeerRow {
  company: Company;
  latest: Quarter | null;
}
