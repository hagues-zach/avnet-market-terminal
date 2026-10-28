import { ChevronRight, ExternalLink } from "lucide-react";
import { getCommentary } from "@/lib/ai/commentary";
import { comparability, comparableValue, sourceOf, type CompanyEarnings, type Metric, type Quarter } from "@/lib/data/live/earnings-model";
import { CaveatMark } from "@/components/ui/caveat-mark";
import { yearAgo } from "@/lib/earnings/season";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { TrendChart } from "./trend-chart";
import { format, longDate, type Row } from "./format";

const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;
const link = "text-ink underline-offset-2 hover:underline";

/** One sentence on the quarter: revenue, its change on a year ago, and operating margin. */
function headline(e: CompanyEarnings): string {
  const q = e.quarters[e.quarters.length - 1];
  const v = q.values;
  const parts = [`${e.company.name} ${q.fiscalLabel}: revenue ${format("usd", v.revenue)}`];
  if (v.revenueYoY !== undefined) parts[0] += `, ${v.revenueYoY >= 0 ? "up" : "down"} ${(Math.abs(v.revenueYoY) * 100).toFixed(1)}% on a year ago`;
  if (v.operatingMargin !== undefined) parts.push(`operating margin ${format("pct", v.operatingMargin)}`);
  return `${parts.join("; ")}.`;
}

/** The selected company's latest quarter: the sentence, the KPIs and the trend. */
export function CompanyResults({ earnings }: { earnings: CompanyEarnings }) {
  const { company, quarters, latestFiling } = earnings;
  const latest = quarters[quarters.length - 1];
  if (!latest) {
    return (
      <Panel>
        <ErrorState title={`${company.name}'s figures could not be loaded right now`} source={sourceOf(company).short} detail={earnings.error} />
      </Panel>
    );
  }
  // Figures that don't compare with the US filers are left out, the rest carry their caveat.
  const shown = (values: Quarter["values"]) =>
    Object.fromEntries(Object.entries(values).map(([m, x]) => [m, comparableValue(company, m as Metric, x)])) as Quarter["values"];
  const caveat = (m: Metric) => comparability(company, m)?.reason;
  const v = shown(latest.values);
  const p = shown(yearAgo(quarters, latest)?.values ?? {});
  const change = (cur?: number, prev?: number) => (cur === undefined || prev === undefined ? undefined : cur - prev);
  const rel = (cur?: number, prev?: number) => (cur === undefined || !prev ? undefined : cur / prev - 1);

  const grossChange = change(v.grossMargin, p.grossMargin);
  const opChange = change(v.operatingMargin, p.operatingMargin);
  const growthChange = change(v.revenueYoY, p.revenueYoY);
  const epsChange = change(v.epsDiluted, p.epsDiluted);
  const fcfChange = change(v.freeCashFlow, p.freeCashFlow);
  const revChange = rel(v.revenue, p.revenue);

  return (
    <>
      <div className="space-y-0.5">
        <h3 className="text-pretty text-lg leading-snug text-ink">{headline(earnings)}</h3>
        <p className="text-caption text-ink-muted">
          Quarter ended {longDate(latest.end)}, calendar {latest.calendarLabel}.
          {latestFiling && (
            <>
              {" "}
              <a href={latestFiling.url} target="_blank" rel="noopener noreferrer" className={`${link} inline-flex items-center gap-1`}>
                {latestFiling.form} filed {longDate(latestFiling.filed)}
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                <span className="sr-only"> (opens the filing)</span>
              </a>
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Revenue" caveat={caveat("revenue")} value={format("usd", v.revenue)} delta={revChange !== undefined ? { value: revChange, period: "YoY" } : undefined} />
        <KpiTile
          label="Revenue growth" caveat={caveat("revenueYoY")}
          value={format("growth", v.revenueYoY)}
          delta={growthChange !== undefined ? { value: growthChange, display: pts(growthChange), period: "YoY" } : undefined}
        />
        <KpiTile
          label="Gross margin" caveat={caveat("grossMargin")}
          value={format("pct", v.grossMargin)}
          delta={grossChange !== undefined ? { value: grossChange, display: pts(grossChange), period: "YoY" } : undefined}
        />
        <KpiTile
          label="Operating margin" caveat={caveat("operatingMargin")}
          value={format("pct", v.operatingMargin)}
          delta={opChange !== undefined ? { value: opChange, display: pts(opChange), period: "YoY" } : undefined}
        />
        <KpiTile
          label="Diluted EPS" caveat={caveat("epsDiluted")}
          value={format("eps", v.epsDiluted)}
          note={latest.backedOut.includes("epsDiluted") ? "derived" : undefined}
          delta={epsChange !== undefined ? { value: epsChange, display: format("eps", Math.abs(epsChange)), period: "YoY" } : undefined}
        />
        <KpiTile
          label="Free cash flow" caveat={caveat("freeCashFlow")}
          value={format("usd", v.freeCashFlow)}
          delta={fcfChange !== undefined ? { value: fcfChange, display: format("usd", Math.abs(fcfChange)), period: "YoY" } : undefined}
        />
      </div>
    </>
  );
}

export function TrendPanel({ earnings }: { earnings: CompanyEarnings }) {
  const quarters = earnings.quarters.slice(-12);
  return (
    <Panel
      className="xl:col-span-8"
      title="Trend"
      subtitle={`${earnings.company.name}, last ${quarters.length} fiscal quarters`}
      footer={<SourceLine source="SEC filings, GAAP as reported" asOf={quarters.at(-1)?.fiscalLabel} />}
    >
      <TrendChart quarters={quarters} isAvnet={earnings.company.slug === "avnet"} />
    </Panel>
  );
}

/* ---------- What management said ---------- */

const TOPICS = [
  ["guidance", "Guidance"],
  ["demand", "Demand"],
  ["inventory", "Inventory"],
  ["leadTimes", "Lead times"],
  ["pricing", "Pricing"],
  ["channel", "Channel"],
] as const;

/** Server component: Claude's digest of the company's latest earnings release. */
export async function ManagementPanel({ company }: { company: string }) {
  const c = await getCommentary(company);
  return (
    <Panel
      className="xl:col-span-4"
      title="What management said"
      subtitle="Written by Claude from the latest earnings release; check the release before quoting it"
      footer={
        c.releaseUrl ? (
          <a href={c.releaseUrl} target="_blank" rel="noopener noreferrer" className={`${link} inline-flex items-center gap-1`}>
            Read the release{c.filed ? `, filed ${longDate(c.filed)}` : ""}
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            <span className="sr-only"> (opens SEC EDGAR)</span>
          </a>
        ) : undefined
      }
      bodyClassName="space-y-2.5"
    >
      {c.status !== "ok" || !c.digest ? (
        <p className="text-body-sm text-ink-muted">{c.message ?? "The latest earnings release could not be read."}</p>
      ) : (
        <>
          <p className="text-base leading-snug text-ink">{c.digest.headline}</p>
          <dl className="space-y-1.5">
            {TOPICS.map(([key, name]) => (
              // Clipped to three lines to sit beside the chart; the full text is in the tooltip and read in full by screen readers.
              <div key={key} className="line-clamp-3 text-body-sm">
                <dt className="inline font-semibold text-ink">{name}: </dt>
                <dd className="inline text-ink" title={c.digest![key] ?? undefined}>
                  {c.digest![key] ?? <span className="text-ink-muted">Not covered in the release.</span>}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </Panel>
  );
}

export function ManagementFallback() {
  return (
    <Panel className="xl:col-span-4" title="What management said">
      <LoadingBlock label="Reading the earnings release…" lines={6} />
    </Panel>
  );
}

/* ---------- Quarterly detail (folded) ---------- */

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

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

export function QuarterlyDetail({ earnings }: { earnings: CompanyEarnings }) {
  const quarters = earnings.quarters.slice(-8);
  if (!quarters.length) return null;
  return (
    <details className="group rounded-sm border border-hairline bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-90" strokeWidth={1.5} aria-hidden />
        <span className="font-display text-card-title text-ink">Quarterly detail, last {quarters.length} quarters</span>
        <span className="ml-auto truncate pl-3 text-caption text-ink-muted">
          The same {DETAIL.reduce((n, s) => n + s.rows.length, 0)} line items for every company
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-hairline">
        <table className="w-full min-w-[760px] border-collapse font-body text-table">
          <caption className="sr-only">
            {earnings.company.name}, every line item for the last {quarters.length} quarters
          </caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={`${TH} text-left`}>
                Line item
              </th>
              {quarters.map((q) => (
                <th key={q.end} scope="col" className={`${TH} text-right`} title={`Quarter ended ${longDate(q.end)}`}>
                  {q.fiscalLabel}
                </th>
              ))}
            </tr>
          </thead>
          {DETAIL.map((section) => (
            <tbody key={section.group}>
              <tr className="border-b border-hairline">
                <th
                  scope="colgroup"
                  colSpan={quarters.length + 1}
                  className="px-3 pb-1 pt-3 text-left font-display text-card-title font-normal text-ink"
                >
                  {section.group}
                </th>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.metric} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                    {row.label}
                    <CaveatMark reason={comparability(earnings.company, row.metric)?.reason} />
                  </th>
                  {quarters.map((q) => (
                    <td key={q.end} className="px-3 py-1.5 text-right tabular-nums text-ink">
                      {format(row.kind, comparableValue(earnings.company, row.metric, q.values[row.metric]))}
                      {row.metric === "epsDiluted" && q.backedOut.includes("epsDiluted") && (
                        <sup className="text-ink-muted" title="Derived from year-to-date totals; approximate">
                          †
                        </sup>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </details>
  );
}
