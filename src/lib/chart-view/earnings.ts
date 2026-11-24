// Chart views for the Earnings page's quarterly detail table: one view per
// section (Income statement, Working capital, Cash and capital), each a set of
// tabs over the section's line items. Pure; safe on server and client.

import { comparableValue, sourceOf, type CompanyEarnings, type Metric } from "@/lib/data/live/earnings-model";
import { describeSeries, type ChartData, type TabSpec, type Unit } from "./model";

export type EarningsSection = "income" | "working" | "cash";

interface SectionSpec {
  title: string;
  tabs: TabSpec[];
  /** The series each tab's sentence is about, with its unit. */
  lead: Record<string, { key: Metric; name: string; unit: Unit }>;
}

export const EARNINGS_SECTIONS: Record<EarningsSection, SectionSpec> = {
  income: {
    title: "Income statement",
    tabs: [
      {
        id: "revenue",
        label: "Revenue and growth",
        panes: [
          { title: "Revenue", unit: "usd", weight: 3, series: [{ key: "revenue", name: "Revenue", mark: "bar", color: "company" }] },
          {
            title: "Growth",
            unit: "growth",
            weight: 2,
            series: [
              { key: "revenueYoY", name: "Year on year", mark: "line", color: 0 },
              { key: "revenueQoQ", name: "Quarter on quarter", mark: "line", color: 1, dashed: true },
            ],
          },
        ],
      },
      {
        id: "margins",
        label: "Margins",
        panes: [
          {
            title: "Margin, % of revenue",
            unit: "pct",
            series: [
              { key: "grossMargin", name: "Gross", mark: "line", color: 0 },
              { key: "operatingMargin", name: "Operating", mark: "line", color: 1 },
              { key: "netMargin", name: "Net", mark: "line", color: 2 },
            ],
          },
        ],
      },
      {
        id: "operating",
        label: "Operating income",
        panes: [
          { title: "Operating income", unit: "usd", weight: 3, series: [{ key: "operatingIncome", name: "Operating income", mark: "bar", color: "company" }] },
          { title: "Operating margin", unit: "pct", weight: 2, series: [{ key: "operatingMargin", name: "Operating margin", mark: "line", color: 0 }] },
        ],
      },
      {
        id: "net",
        label: "Net income and EPS",
        panes: [
          { title: "Net income", unit: "usd", series: [{ key: "netIncome", name: "Net income", mark: "bar", color: "company" }] },
          { title: "Diluted EPS", unit: "eps", series: [{ key: "epsDiluted", name: "Diluted EPS", mark: "bar", color: "company" }] },
        ],
      },
      {
        id: "opex",
        label: "Opex mix",
        panes: [
          {
            title: "Operating expense, % of revenue",
            unit: "pct",
            series: [
              { key: "sgaPct", name: "SG&A", mark: "line", color: 0 },
              { key: "rdPct", name: "R&D", mark: "line", color: 1 },
            ],
          },
        ],
      },
    ],
    lead: {
      revenue: { key: "revenue", name: "Revenue", unit: "usd" },
      margins: { key: "operatingMargin", name: "Operating margin", unit: "pct" },
      operating: { key: "operatingIncome", name: "Operating income", unit: "usd" },
      net: { key: "epsDiluted", name: "Diluted EPS", unit: "eps" },
      opex: { key: "sgaPct", name: "SG&A as a share of revenue", unit: "pct" },
    },
  },
  working: {
    title: "Working capital",
    tabs: [
      {
        id: "inventory",
        label: "Inventory",
        panes: [
          { title: "Inventory", unit: "usd", weight: 3, series: [{ key: "inventory", name: "Inventory", mark: "bar", color: "company" }] },
          { title: "Inventory days", unit: "days", weight: 2, series: [{ key: "inventoryDays", name: "Inventory days", mark: "line", color: 0 }] },
        ],
      },
      {
        id: "days",
        label: "Days",
        panes: [
          {
            title: "Days",
            unit: "days",
            series: [
              { key: "inventoryDays", name: "Inventory", mark: "line", color: 0 },
              { key: "receivableDays", name: "Receivable", mark: "line", color: 1 },
              { key: "payableDays", name: "Payable", mark: "line", color: 2 },
              { key: "cashCycleDays", name: "Cash cycle", mark: "line", color: "muted", dashed: true },
            ],
          },
        ],
      },
      {
        id: "cycle",
        label: "Cash cycle",
        panes: [
          {
            title: "Cash conversion cycle: inventory and receivable days, less payable days",
            unit: "days",
            stacked: true,
            series: [
              { key: "inventoryDays", name: "Inventory days", mark: "bar", color: 0 },
              { key: "receivableDays", name: "Receivable days", mark: "bar", color: 1 },
              { key: "payableDays", name: "Payable days", mark: "bar", color: 2, negate: true },
              { key: "cashCycleDays", name: "Cash cycle", mark: "line", color: "muted" },
            ],
          },
        ],
      },
    ],
    lead: {
      inventory: { key: "inventory", name: "Inventory", unit: "usd" },
      days: { key: "inventoryDays", name: "Inventory days", unit: "days" },
      cycle: { key: "cashCycleDays", name: "The cash conversion cycle", unit: "days" },
    },
  },
  cash: {
    title: "Cash and capital",
    tabs: [
      {
        id: "cashflow",
        label: "Cash flow",
        panes: [
          {
            title: "Cash flow",
            unit: "usd",
            series: [
              { key: "operatingCashFlow", name: "Operating cash flow", mark: "bar", color: "company" },
              { key: "capex", name: "Capital expenditure", mark: "bar", color: "muted", negate: true },
              { key: "freeCashFlow", name: "Free cash flow", mark: "line", color: 0 },
            ],
          },
        ],
      },
      {
        id: "returns",
        label: "Returns to shareholders",
        panes: [
          {
            title: "Paid to shareholders",
            unit: "usd",
            stacked: true,
            series: [
              { key: "buybacks", name: "Share repurchases", mark: "bar", color: 0 },
              { key: "dividends", name: "Dividends", mark: "bar", color: 1 },
              { key: "freeCashFlow", name: "Free cash flow", mark: "line", color: "muted" },
            ],
          },
        ],
      },
      {
        id: "balance",
        label: "Cash and debt",
        panes: [
          {
            title: "Balance sheet",
            unit: "usd",
            series: [
              { key: "cash", name: "Cash and equivalents", mark: "line", color: 0 },
              { key: "longTermDebt", name: "Long-term debt", mark: "line", color: 1 },
            ],
          },
        ],
      },
    ],
    lead: {
      cashflow: { key: "freeCashFlow", name: "Free cash flow", unit: "usd" },
      returns: { key: "buybacks", name: "Share repurchases", unit: "usd" },
      balance: { key: "longTermDebt", name: "Long-term debt", unit: "usd" },
    },
  },
};

/** The chart view for one section of a company's quarterly detail, over the quarters shown in the table. */
export function earningsChartData(earnings: CompanyEarnings, section: EarningsSection, count = 8): ChartData {
  const spec = EARNINGS_SECTIONS[section];
  const quarters = earnings.quarters.slice(-count);
  const periods = quarters.map((q) => q.fiscalLabel);
  const keys = new Set(spec.tabs.flatMap((t) => t.panes.flatMap((p) => p.series.map((s) => s.key as Metric))));
  const series: ChartData["series"] = {};
  for (const key of keys) {
    series[key] = quarters.map((q) => comparableValue(earnings.company, key, q.values[key]) ?? null);
  }
  // Lead with the change on a year ago, which needs four earlier quarters.
  const takeaways = Object.fromEntries(
    spec.tabs.map((t) => {
      const lead = spec.lead[t.id];
      return [t.id, lead ? describeSeries(lead.name, lead.unit, series[lead.key] ?? [], periods) : null];
    }),
  );
  const latest = quarters[quarters.length - 1];
  return {
    eyebrow: `${earnings.company.name} · Quarterly detail`,
    title: spec.title,
    company: earnings.company.slug,
    periods,
    series,
    tabs: spec.tabs,
    takeaways,
    source: sourceOf(earnings.company).filings,
    asOf: latest?.fiscalLabel,
  };
}
