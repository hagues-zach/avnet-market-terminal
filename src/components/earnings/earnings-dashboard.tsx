"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import {
  COHORT_LABELS,
  type Cohort,
  type CompanyEarnings,
  type EarningsData,
  type Metric,
  type Quarter,
} from "@/lib/data/live/earnings-model";
import { AVNET } from "@/lib/colors";
import { formatPctSigned, formatUsdMillions } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { CashFlowChart, GrowthChart, MarginChart, RevenueChart, WorkingCapitalChart } from "@/components/charts/earnings-charts";
import { cn } from "@/lib/utils";

const COHORTS: Cohort[] = ["distributor", "manufacturer", "platform"];
const DAY = 86_400_000;
const DASH = "—";

type Kind = "usd" | "pct" | "growth" | "days" | "eps";

function format(kind: Kind, v: number | undefined): string {
  if (v === undefined) return DASH;
  switch (kind) {
    case "usd":
      return `${v < 0 ? "−" : ""}${formatUsdMillions(Math.abs(v) / 1e6, { precise: true })}`;
    case "pct":
      return `${(v * 100).toFixed(1)}%`;
    case "growth":
      return formatPctSigned(v);
    case "days":
      return `${Math.round(v)}`;
    case "eps":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
  }
}

const longDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

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
function delta(cur: number | undefined, prev: number | undefined, mode: "relative" | "points" | "days" | "usd" | "eps", upIsGood = true): Delta | undefined {
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

interface Row {
  metric: Metric;
  label: string;
  kind: Kind;
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

const PEER_COLUMNS: Row[] = [
  { metric: "revenue", label: "Revenue", kind: "usd" },
  { metric: "revenueYoY", label: "YoY", kind: "growth" },
  { metric: "grossMargin", label: "Gross margin", kind: "pct" },
  { metric: "operatingMargin", label: "Op margin", kind: "pct" },
  { metric: "inventoryDays", label: "Inv days", kind: "days" },
  { metric: "fcfMargin", label: "FCF margin", kind: "pct" },
];

function Chip({ label, active, onClick, dot }: { label: string; active: boolean; onClick: () => void; dot?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40",
        active ? "bg-ink text-white" : "text-muted hover:bg-canvas",
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />}
      {label}
    </button>
  );
}

export function EarningsDashboard({ data, initialCompany }: { data: EarningsData; initialCompany: string }) {
  const [slug, setSlug] = useState(initialCompany);
  const [cohort, setCohort] = useState<Cohort | "all">("all");

  const select = (next: string) => {
    setSlug(next);
    // Keep the choice in the URL so the view can be bookmarked or shared.
    window.history.replaceState(null, "", `?company=${next}`);
  };

  const inCohort = useMemo(
    () => data.companies.filter((c) => cohort === "all" || c.company.cohort === cohort),
    [data.companies, cohort],
  );
  const selected: CompanyEarnings = data.companies.find((c) => c.company.slug === slug) ?? data.companies[0];
  const { company, quarters, latestFiling } = selected;
  const latest = quarters[quarters.length - 1];
  const prior = latest ? yearAgo(quarters, latest) : undefined;
  const isAvnet = company.slug === "avnet";
  const color = isAvnet ? AVNET.green : AVNET.blueDark;
  const detailQuarters = quarters.slice(-8);
  const v = latest?.values ?? {};
  const p = prior?.values ?? {};
  const failed = data.companies.filter((c) => c.error);

  return (
    <>
      {/* filters: one row above everything they scope */}
      <Card bodyClassName="space-y-3">
        <div className="flex items-start gap-2">
          <p className="w-20 shrink-0 pt-1 font-display text-2xs uppercase tracking-widest text-muted">Group</p>
          <div className="flex flex-wrap gap-1">
            <Chip label="All" active={cohort === "all"} onClick={() => setCohort("all")} />
            {COHORTS.map((c) => (
              <Chip key={c} label={COHORT_LABELS[c]} active={cohort === c} onClick={() => setCohort(c)} />
            ))}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <p className="w-20 shrink-0 pt-1 font-display text-2xs uppercase tracking-widest text-muted">Company</p>
          <div className="flex flex-wrap gap-1">
            {inCohort.map((c) => (
              <Chip
                key={c.company.slug}
                label={c.company.name}
                active={c.company.slug === slug}
                onClick={() => select(c.company.slug)}
                dot={c.company.slug === "avnet"}
              />
            ))}
          </div>
        </div>
      </Card>

      {!latest ? (
        <Card>
          <p className="py-10 text-center text-sm text-muted">
            {company.name}&apos;s filings could not be loaded from SEC EDGAR right now{selected.error ? ` (${selected.error})` : ""}.
          </p>
        </Card>
      ) : (
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

          <Card title="Quarterly detail" subtitle={`${company.name} · last ${detailQuarters.length} quarters · same line items for every company`} bodyClassName="p-0">
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
                      <th scope="colgroup" colSpan={detailQuarters.length + 1} className="px-4 py-1.5 text-left font-display text-2xs uppercase tracking-widest text-muted">
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
      )}

      <Card
        title="Latest quarter across the set"
        subtitle={`${inCohort.length} companies · each row is that company's most recent reported quarter · select a row to open it`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Company
                </th>
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  Group
                </th>
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  Quarter
                </th>
                {PEER_COLUMNS.map((c) => (
                  <th key={c.metric} scope="col" className="px-3 py-2 font-normal">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inCohort.map((c) => {
                const q = c.quarters[c.quarters.length - 1];
                const active = c.company.slug === slug;
                return (
                  <tr
                    key={c.company.slug}
                    className={cn("border-b border-line last:border-b-0 transition-colors duration-200", active ? "bg-avnet-green/10" : "hover:bg-canvas")}
                  >
                    <th scope="row" className="px-4 py-1.5 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => select(c.company.slug)}
                        className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-avnet-greenDark cursor-pointer focus:outline-none focus-visible:underline"
                      >
                        {c.company.slug === "avnet" && <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />}
                        {c.company.name}
                      </button>
                    </th>
                    <td className="px-3 py-1.5 text-left text-muted">{COHORT_LABELS[c.company.cohort]}</td>
                    <td className="px-3 py-1.5 text-left text-muted" title={q ? `Quarter ended ${longDate(q.end)}` : undefined}>
                      {q ? `${q.fiscalLabel} · ${q.calendarLabel}` : "Unavailable"}
                    </td>
                    {PEER_COLUMNS.map((col) => (
                      <td key={col.metric} className="px-3 py-1.5 text-right tabular text-ink">
                        {format(col.kind, q?.values[col.metric])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="px-1 text-2xs text-muted">
        Source: SEC EDGAR structured data from each company&apos;s 10-Q and 10-K filings, as reported (GAAP, not adjusted). Fiscal
        quarters follow each company&apos;s own calendar; the CY label is the calendar quarter the period mostly falls in. Fourth
        quarters and all cash-flow items are filed as year-to-date totals, so the quarter is the difference between consecutive
        totals; † marks EPS derived that way, which is approximate. Days metrics use the quarter-end balance against 91 days of
        revenue or cost of revenue. {DASH} means the company does not report the item in a comparable form. Checked for new
        filings about every 6 hours.
        {failed.length > 0 && ` Could not load: ${failed.map((c) => c.company.name).join(", ")}.`}
      </p>
    </>
  );
}
