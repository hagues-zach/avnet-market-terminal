import type { ConceptFact } from "./st-6k";

// RS Group's first halves (April to September), kept by hand from the statutory
// statements in its half-year reports on the FCA's National Storage Mechanism.
// ESEF carries only the annual report, so the second half is the year less this.
// In £m. Cash is left out: the half-year balance sheet shows cash before
// overdrafts and the annual ESEF figure is after them. Add a row when RS reports
// its next half (early November).

interface Half {
  start: string;
  end: string;
  filed: string;
  url: string;
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  operatingProfit: number;
  profitToOwners: number;
  operatingCash: number;
  capex: number;
  dividends: number;
  inventories: number;
  receivables: number;
  payables: number;
}

const H1_FY26_REPORT = "https://data.fca.org.uk/artefacts/NSM/RNS/de085599-2091-4f55-bd89-e0bf58e34910.html";
const H1_FY25_REPORT = "https://data.fca.org.uk/artefacts/NSM/RNS/5420160.html";

const HALVES: Half[] = [
  // H1 FY26, reported 6 November 2025.
  {
    start: "2025-04-01", end: "2025-09-30", filed: "2025-11-06", url: H1_FY26_REPORT,
    revenue: 1402.8, costOfSales: 798.0, grossProfit: 604.8, operatingProfit: 122.1, profitToOwners: 83.0,
    operatingCash: 121.6, capex: 8.9, dividends: 65.1, inventories: 599.5, receivables: 677.5, payables: 591.1,
  },
  // H1 FY25 as restated in the H1 FY26 report (US inventory provisioning, note 16).
  {
    start: "2024-04-01", end: "2024-09-30", filed: "2025-11-06", url: H1_FY26_REPORT,
    revenue: 1441.2, costOfSales: 826.2, grossProfit: 615.0, operatingProfit: 119.0, profitToOwners: 77.4,
    operatingCash: 114.0, capex: 4.4, dividends: 64.9, inventories: 625.6, receivables: 628.2, payables: 547.4,
  },
  // H1 FY24, the comparative in the H1 FY25 report of 7 November 2024.
  {
    start: "2023-04-01", end: "2023-09-30", filed: "2024-11-07", url: H1_FY25_REPORT,
    revenue: 1446.7, costOfSales: 813.8, grossProfit: 632.9, operatingProfit: 138.8, profitToOwners: 92.2,
    operatingCash: 45.0, capex: 7.0, dividends: 64.8, inventories: 719.7, receivables: 687.7, payables: 624.8,
  },
];

const FLOWS: [keyof Half, string][] = [
  ["revenue", "Revenues"],
  ["costOfSales", "CostOfRevenue"],
  ["grossProfit", "GrossProfit"],
  ["operatingProfit", "OperatingIncomeLoss"],
  ["profitToOwners", "NetIncomeLoss"],
  ["operatingCash", "NetCashProvidedByUsedInOperatingActivities"],
  ["capex", "PaymentsToAcquirePropertyPlantAndEquipment"],
  ["dividends", "PaymentsOfDividends"],
];
const BALANCES: [keyof Half, string][] = [
  ["inventories", "InventoryNet"],
  ["receivables", "AccountsReceivableNetCurrent"],
  ["payables", "AccountsPayableCurrent"],
];

/** The halves as facts in pounds, under the "Manual" form the earnings build accepts. */
export function rsHalves(): ConceptFact[] {
  return HALVES.flatMap((h) => {
    const meta = { form: "Manual H1", filed: h.filed, accn: h.url, url: h.url };
    return [
      ...FLOWS.map(([k, concept]) => ({ concept, start: h.start, end: h.end, val: (h[k] as number) * 1e6, ...meta })),
      ...BALANCES.map(([k, concept]) => ({ concept, end: h.end, val: (h[k] as number) * 1e6, ...meta })),
    ];
  });
}
