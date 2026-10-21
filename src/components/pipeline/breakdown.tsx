"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PIPELINE_STAGES, type PipelineRow } from "@/lib/shells/mock-avnet";
import { DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { cn } from "@/lib/utils";

// The pipeline by supplier, segment or end market, each row opening into its
// own four-stage funnel. All mock except customer growth in the end-market view.

export type View = "supplier" | "segment" | "market";

const VIEWS: { value: View; label: string; noun: string }[] = [
  { value: "supplier", label: "By supplier", noun: "Supplier" },
  { value: "segment", label: "By segment", noun: "Segment" },
  { value: "market", label: "By end market", noun: "End market" },
];

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${v.toFixed(1)}M`);
const count = (n: number) => n.toLocaleString("en-US");
const pct = (v: number) => `${Math.round(v * 100)}%`;
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

/** The opened row: the four stages side by side with conversion from the stage before, divided by hairlines. */
function RowFunnel({ row }: { row: PipelineRow }) {
  const first = row.funnel.submitted.count || 1;
  return (
    <div className="grid grid-cols-2 divide-hairline border-t border-hairline bg-surface-sunken md:grid-cols-4 md:divide-x">
      {PIPELINE_STAGES.map(({ id, label }, i) => {
        const s = row.funnel[id];
        const prev = i > 0 ? row.funnel[PIPELINE_STAGES[i - 1].id].count : undefined;
        return (
          <div key={id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-card-title text-ink">{label}</span>
              <span className="text-caption text-ink-muted">
                {prev ? `${pct(s.count / prev)} of ${PIPELINE_STAGES[i - 1].label.toLowerCase()}` : "100%"}
              </span>
            </div>
            <p className="mt-1 text-body-strong tabular-nums text-ink">{count(s.count)} registrations</p>
            <p className="text-caption tabular-nums text-ink-muted">{money(s.value)} estimated annual billings</p>
            <span className="mt-2 block h-2" aria-hidden>
              <span className="block h-full bg-viz-avnet" style={{ width: `${(s.count / first) * 100}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineBreakdown({
  views,
  growth,
  initialView = "supplier",
}: {
  views: Record<View, PipelineRow[]>;
  /** Live customer revenue growth on a year ago, by end market name; undefined where no customer group matches. */
  growth: Record<string, number | undefined>;
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);
  const [open, setOpen] = useState<string | null>(null);
  const rows = [...views[view]].sort((a, b) => (a.name === "All others" ? 1 : b.name === "All others" ? -1 : b.pipeline - a.pipeline));
  // Pipeline share against billings share: above 1, the group's pipeline is heavier than its billings today.
  const totalPipe = rows.reduce((n, r) => n + r.pipeline, 0);
  const totalBill = rows.reduce((n, r) => n + r.billings, 0);
  const mix = (r: PipelineRow) => r.pipeline / totalPipe / (r.billings / totalBill);
  const maxRatio = Math.max(...rows.map(mix));
  const noun = VIEWS.find((v) => v.value === view)!.noun;
  const pick = (v: View) => {
    setView(v);
    setOpen(null);
  };

  return (
    <div>
      <div role="group" aria-label="Group the pipeline by" className="flex gap-6 border-b border-hairline px-4">
        {VIEWS.map((v) => {
          const active = v.value === view;
          return (
            <button
              key={v.value}
              type="button"
              aria-pressed={active}
              onClick={() => pick(v.value)}
              className={cn(
                "-mb-px inline-flex h-tab cursor-pointer items-center border-b-2 font-body text-body-sm transition-colors",
                active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      <div role="region" aria-label={`Pipeline ${VIEWS.find((v) => v.value === view)!.label.toLowerCase()}`} tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse font-body text-table">
          <caption className="sr-only">
            Design pipeline {VIEWS.find((v) => v.value === view)!.label.toLowerCase()}: registrations at each stage, approved pipeline and its change.
            Mock data.
          </caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "text-left")}>
                {noun}
              </th>
              {PIPELINE_STAGES.map((s) => (
                <th key={s.id} scope="col" className={cn(TH, "text-right")}>
                  {s.label}
                </th>
              ))}
              <th scope="col" className={cn(TH, "text-right")} title="Approved, not yet billing">
                Approved pipeline
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Change YoY
              </th>
              <th
                scope="col"
                className={cn(TH, "text-left")}
                title="Share of the approved pipeline against share of billings in the last 12 months. Above 1×, the pipeline is heavier than billings today"
              >
                Pipeline vs billings
              </th>
              <th scope="col" className={cn(TH, "text-right")} title="Approved over 12 months ago, not yet in production">
                Stalled
              </th>
              {view === "market" && (
                <th
                  scope="col"
                  className={cn(TH, "text-right")}
                  title="Revenue growth of the customer group that buys in this market, from SEC filings"
                >
                  <span className="inline-flex items-center justify-end gap-1.5">
                    Customer growth
                    <DataChip status="live" label="SEC" />
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const expanded = open === r.name;
              const ratio = mix(r);
              const g = growth[r.name];
              return (
                <Fragment key={r.name}>
                  <tr className={cn("border-b border-hairline", expanded ? "bg-surface-sunken" : "hover:bg-surface-sunken")}>
                    <th scope="row" className="px-3 py-1.5 text-left font-normal">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : r.name)}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-ink underline-offset-2 hover:underline"
                      >
                        <ChevronRight
                          className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", expanded && "rotate-90")}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span className={cn(expanded && "font-semibold")}>{r.name}</span>
                        <span className="sr-only">{expanded ? ", hide its funnel" : ", show its funnel"}</span>
                      </button>
                    </th>
                    {PIPELINE_STAGES.map((s) => (
                      <td key={s.id} className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {count(r.funnel[s.id].count)}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-ink">{money(r.pipeline)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Delta value={r.change} display={pct(Math.abs(r.change))} />
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-12 tabular-nums text-ink">{ratio.toFixed(2)}×</span>
                        <span className="block h-2 w-20" aria-hidden>
                          <span className="block h-full bg-viz-benchmark" style={{ width: `${(ratio / maxRatio) * 100}%` }} />
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-ink">{r.stalled}</td>
                    {view === "market" && (
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                        {g === undefined ? (
                          <span className="text-ink-muted" title="No customer group in the app sells into this market">
                            n/a
                          </span>
                        ) : (
                          `${g >= 0 ? "+" : "−"}${Math.abs(g * 100).toFixed(1)}%`
                        )}
                      </td>
                    )}
                  </tr>
                  {expanded && (
                    <tr className="border-b border-hairline">
                      <td colSpan={view === "market" ? 10 : 9} className="p-0">
                        <RowFunnel row={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
