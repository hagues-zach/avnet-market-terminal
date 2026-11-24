"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { BarChart3, Info } from "lucide-react";
import type { ChartData } from "@/lib/chart-view/model";
import type { ScoreRow, Side } from "@/lib/competitive/compare";
import { NA, format } from "@/components/earnings/format";
import { ChartDrawer } from "@/components/chart-view/chart-drawer";
import { cn } from "@/lib/utils";

// The Avnet vs Arrow scorecard table. Each measure's name is a button that opens
// the chart drawer on that measure; with the drawer open, picking another row or
// pressing ↑ ↓ on a row moves the chart to it, while the table stays readable.

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

function Marker({ side }: { side: Side }) {
  return <span className={cn("inline-block h-2.5 w-2.5 shrink-0", side === "Avnet" ? "bg-viz-avnet" : "bg-viz-arrow")} aria-hidden />;
}

function gapText(row: Pick<ScoreRow, "kind">, gap: number | undefined): string {
  if (gap === undefined) return NA;
  if (row.kind === "usd") return `${gap.toFixed(2)}×`;
  const sign = gap >= 0 ? "+" : "−";
  return row.kind === "days" ? `${sign}${Math.round(Math.abs(gap))}` : `${sign}${(Math.abs(gap) * 100).toFixed(1)} pts`;
}

export function ScorecardTable({ rows, latest, charts }: { rows: ScoreRow[]; latest: string; charts: Record<string, ChartData> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Closing hands focus back to the row whose chart was open.
  const close = useCallback(() => {
    if (selected !== null) buttons.current[selected]?.focus();
    setSelected(null);
  }, [selected]);
  const go = (i: number) => setSelected(Math.max(0, Math.min(rows.length - 1, i)));

  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const j = Math.max(0, Math.min(rows.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    buttons.current[j]?.focus();
    if (selected !== null) setSelected(j);
  };

  const row = selected === null ? null : rows[selected];
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse font-body text-table">
          <caption className="sr-only">Avnet against Arrow on each measure for {latest}. Select a measure to chart its last eight quarters.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "text-left")}>
                Measure
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                <span className="inline-flex items-center gap-1.5">
                  <Marker side="Avnet" />
                  Avnet
                </span>
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                <span className="inline-flex items-center gap-1.5">
                  <Marker side="Arrow" />
                  Arrow
                </span>
              </th>
              <th scope="col" className={cn(TH, "text-right")} title="Avnet minus Arrow, in points or days; a ratio for dollar amounts">
                Gap
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Leads
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Gap a year ago
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const current = i === selected;
              return (
                <tr
                  key={r.metric}
                  onClick={() => go(i)}
                  className={cn(
                    "cursor-pointer border-b border-hairline last:border-b-0",
                    current ? "bg-surface-selected shadow-[inset_3px_0_0_theme(colors.primary)]" : "hover:bg-surface-sunken",
                  )}
                >
                  <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        ref={(el) => {
                          buttons.current[i] = el;
                        }}
                        type="button"
                        aria-pressed={current}
                        onClick={(e) => {
                          e.stopPropagation();
                          go(i);
                        }}
                        onKeyDown={(e) => onKey(e, i)}
                        className="group inline-flex cursor-pointer items-center gap-1.5 text-left text-ink underline-offset-2 hover:underline"
                      >
                        {r.label}
                        <BarChart3 className="h-3.5 w-3.5 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" strokeWidth={1.5} aria-hidden />
                        <span className="sr-only">, chart the last eight quarters</span>
                      </button>
                      {r.caveat && (
                        <span title={r.caveat} className="inline-flex text-ink-muted">
                          <Info className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                          <span className="sr-only">{r.caveat}</span>
                        </span>
                      )}
                    </span>
                  </th>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums text-ink", r.leads === "Avnet" && "font-semibold")}>{format(r.kind, r.avnet)}</td>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums text-ink", r.leads === "Arrow" && "font-semibold")}>{format(r.kind, r.arrow)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">{r.caveat ? NA : gapText(r, r.gap)}</td>
                  <td className="px-3 py-1.5 text-left text-ink">{r.leads ?? <span className="text-ink-muted">n/a</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">{r.caveat ? NA : gapText(r, r.gapYearAgo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ChartDrawer
        data={row ? (charts[row.metric] ?? null) : null}
        position={selected === null ? undefined : `${selected + 1} of ${rows.length}`}
        onClose={close}
        onPrev={selected !== null && selected > 0 ? () => go(selected - 1) : undefined}
        onNext={selected !== null && selected < rows.length - 1 ? () => go(selected + 1) : undefined}
      />
    </>
  );
}
