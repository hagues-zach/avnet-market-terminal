"use client";

import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import type { CompanyEarnings, Quarter } from "@/lib/data/live/earnings-model";
import { AVNET } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { CashFlowChart, GrowthChart, MarginChart, RevenueChart, WorkingCapitalChart } from "@/components/charts/earnings-charts";
import { cn } from "@/lib/utils";
import { format, longDate, type Row } from "./format";

const DAY = 86_400_000;

/** The quarter ending about a year before `q`, if it is in the series. */
function yearAgo(quarters: Quarter[], q: Quarter): Quarter | undefined {
  const target = Date.parse(q.end) - 364 * DAY;
  return quarters.find((p) => Math.abs(Date.parse(p.end) - target) <= 20 * DAY);
}

interface Delta {
  text: string;
  up: boolean;
  good: boolean;
}

function Tile({ label, value, delta, note }: { label: string; value: string; delta?: Delta; note?: string }) {
  const Arrow = delta?.up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span className="font-display text-2xs uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1.5 font-display text-2xl tabular text-ink">{value}</div>
      {delta ? (
        <div className={cn("mt-1 inline-flex items-center gap-0.5 text-xs tabular", delta.good ? "text-avnet-greenDark" : "text-danger")}>
          <Arrow className="h-3.5 w-3.5" />
          {delta.text}
          <span className="ml-1 text-muted">YoY</span>
        </div>
      ) : (
        <div className="mt-1 text-xs text-muted">{note ?? "No year-ago comparison"}</div>
      )}
    </div>
  );
}

/** Year-over-year change for a tile. `mode` picks how the change is expressed. */
function delta(
  cur: number | undefined,
  prev: number | undefined,
  mode: "relative" | "points" | "days" | "usd" | "eps",
  upIsGood = true,
): Delta | undefined {
  if (cur === undefined || prev === undefined) return undefined;
  const diff = cur - prev;
  const up = diff >= 0;
  const magnitude = Math.abs(diff);
  let text: string;
  if (mode === "relative") {
    if (prev === 0) return undefined;
    text = `${((magnitude / Math.abs(prev)) * 100).toFixed(1)}%`;
  } else if (mode === "points") {
    text = `${(magnitude * 100).toFixed(1)} pts`;
  } else if (mode === "days") {
    text = `${Math.round(magnitude)} days`;
  } else {
    // Absolute change: a percentage misleads when the base is small or changes sign.
    text = format(mode, magnitude);
  }
  return { text, up, good: up === upIsGood };
}

const DETAIL: { group: string; rows: Row[] }[] = [
  {
    group: "Income statement",
    rows: [
      { metric: "revenue", label: "Revenue", kind: "usd" },
      { metric: "revenueYoY", label: "Revenue growth YoY", kind: "growth" },
      { metric: "revenueQoQ", label: "Revenue growth QoQ", kind: "growth" },
      { metric: "grossMargin", label: "Gross margin", kind: "pct" },
      { metric: "operatingIncome", label: "Operating income", kind: "usd" },
      { metric: "operatingMargin", label: "Operating margin", kind: "pct" },
      { metric: "netIncome", label: "Net income", kind: "usd" },
      { metric: "epsDiluted", label: "Diluted EPS", kind: "eps" },
      { metric: "rdPct", label: "R&D, % of revenue", kind: "pct" },
      { metric: "sgaPct", label: "SG&A, % of revenue", kind: "pct" },
    ],
  },
  {
    group: "Working capital",
    rows: [
      { metric: "inventory", label: "Inventory", kind: "usd" },
      { metric: "inventoryDays", label: "Inventory days", kind: "days" },
      { metric: "receivableDays", label: "Receivable days", kind: "days" },
      { metric: "payableDays", label: "Payable days", kind: "days" },
      { metric: "cashCycleDays", label: "Cash conversion cycle, days", kind: "days" },
    ],
  },
  {
    group: "Cash and capital",
    rows: [
      { metric: "operatingCashFlow", label: "Operating cash flow", kind: "usd" },
      { metric: "capex", label: "Capital expenditure", kind: "usd" },
      { metric: "freeCashFlow", label: "Free cash flow", kind: "usd" },
      { metric: "buybacks", label: "Share repurchases", kind: "usd" },
      { metric: "dividends", label: "Dividends paid", kind: "usd" },
      { metric: "cash", label: "Cash and equivalents", kind: "usd" },
      { metric: "longTermDebt", label: "Long-term debt", kind: "usd" },
    ],
  },
];

export function CompanyView({ earnings }: { earnings: CompanyEarnings }) {
  const { company, quarters, latestFiling } = earnings;
  const latest = quarters[quarters.length - 1];

  if (!latest) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-muted">
          {company.name}&apos;s filings could not be loaded from SEC EDGAR right now{earnings.error ? ` (${earnings.error})` : ""}.
        </p>
      </Card>
    );
  }

  const prior = yearAgo(quarters, latest);
  // Avnet Green only ever represents Avnet.
  const color = company.slug === "avnet" ? AVNET.green : AVNET.blueDark;
  const detailQuarters = quarters.slice(-8);
  const v = latest.values;
  const p = prior?.values ?? {};

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 className="font-display text-lg uppercase tracking-wide text-ink">
          {company.name} <span className="text-muted">· {latest.fiscalLabel}</span>
        </h2>
        <p className="text-xs text-muted">
          Quarter ended {longDate(latest.end)} · {latest.calendarLabel}
          {latestFiling && (
            <>
              {" · "}
              <a
                href={latestFiling.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark"
              >
                {latestFiling.form} filed {longDate(latestFiling.filed)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Tile label="Revenue" value={format("usd", v.revenue)} delta={delta(v.revenue, p.revenue, "relative")} />
        <Tile label="Gross margin" value={format("pct", v.grossMargin)} delta={delta(v.grossMargin, p.grossMargin, "points")} />
        <Tile label="Operating margin" value={format("pct", v.operatingMargin)} delta={delta(v.operatingMargin, p.operatingMargin, "points")} />
        <Tile label="Diluted EPS" value={format("eps", v.epsDiluted)} delta={delta(v.epsDiluted, p.epsDiluted, "eps")} />
        <Tile
          label="Inventory days"
          value={format("days", v.inventoryDays)}
          delta={delta(v.inventoryDays, p.inventoryDays, "days", false)}
          note={v.inventoryDays === undefined ? "Not reported" : undefined}
        />
        <Tile label="Free cash flow" value={format("usd", v.freeCashFlow)} delta={delta(v.freeCashFlow, p.freeCashFlow, "usd")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Revenue" subtitle="By fiscal quarter">
          <RevenueChart quarters={quarters} color={color} />
        </Card>
        <Card title="Revenue growth" subtitle="Year over year, by fiscal quarter">
          <GrowthChart quarters={quarters} color={color} />
        </Card>
        <Card title="Margins" subtitle="Share of revenue">
          <MarginChart quarters={quarters} />
        </Card>
        <Card title="Working capital" subtitle="Days of inventory, receivables and payables">
          <WorkingCapitalChart quarters={quarters} />
        </Card>
        <Card title="Cash flow" subtitle="Operating and free cash flow by quarter" className="xl:col-span-2">
          <CashFlowChart quarters={quarters} />
        </Card>
      </div>

      <Card
        title="Quarterly detail"
        subtitle={`${company.name} · last ${detailQuarters.length} quarters · same line items for every company`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Line item
                </th>
                {detailQuarters.map((q) => (
                  <th key={q.end} scope="col" className="px-3 py-2 font-normal" title={`Quarter ended ${longDate(q.end)}`}>
                    {q.fiscalLabel}
                  </th>
                ))}
              </tr>
            </thead>
            {DETAIL.map((section) => (
              <tbody key={section.group}>
                <tr className="border-b border-line bg-canvas">
                  <th
                    scope="colgroup"
                    colSpan={detailQuarters.length + 1}
                    className="px-4 py-1.5 text-left font-display text-2xs uppercase tracking-widest text-muted"
                  >
                    {section.group}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.metric} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-4 py-1.5 text-left font-normal text-ink">
                      {row.label}
                    </th>
                    {detailQuarters.map((q) => (
                      <td key={q.end} className="px-3 py-1.5 text-right tabular text-ink">
                        {format(row.kind, q.values[row.metric])}
                        {row.metric === "epsDiluted" && q.backedOut.includes("epsDiluted") && <sup className="text-muted">†</sup>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </>
  );
}
