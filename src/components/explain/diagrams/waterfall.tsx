"use client";

import { position, waterfall, type WaterfallStep } from "@/lib/explain/diagrams";
import { VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { SrTable, W } from "./shared";

// Revenue stepping down to a profit or cash figure, one row per line so the labels
// stay readable at popover width. Totals start at zero; steps float from the
// running total, joined by dashed connectors. One total is highlighted in the
// subject's colour, other totals are medium grey and steps light grey.
// Used by Gross margin, Operating margin, Free cash flow and Diluted EPS.

export function Waterfall({
  steps,
  highlight,
  onSelect,
  format,
  color = VIZ.avnet,
  caption,
}: {
  steps: WaterfallStep[];
  /** The row to highlight, usually a total. */
  highlight: number;
  /** Lets a click on a total move the highlight. */
  onSelect?: (i: number) => void;
  /** Formats an amount, always given as a positive number. */
  format: (v: number) => string;
  color?: string;
  caption: string;
}) {
  const { bars, domain } = waterfall(steps);
  const x = (v: number) => position(v, domain) * W;
  const ROW = 28;
  const BAR = 10;
  const shown = (v: number, kind: WaterfallStep["kind"]) =>
    kind === "total" ? (v < 0 ? `${format(-v)} loss` : format(v)) : v < 0 ? `less ${format(-v)}` : `plus ${format(v)}`;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${bars.length * ROW - 2}`} className="block w-full" aria-hidden>
        {domain.min < 0 && <line x1={x(0)} x2={x(0)} y1={12} y2={bars.length * ROW} className="stroke-ink-subtle" strokeWidth={1} />}
        {bars.map((b, i) => {
          const on = i === highlight;
          const fill = on ? color : b.kind === "total" ? VIZ.benchmark : VIZ.other;
          const next = bars[i + 1];
          const selectable = onSelect && b.kind === "total" && !on;
          return (
            <g
              key={b.label}
              transform={`translate(0 ${i * ROW})`}
              className={cn(selectable && "cursor-pointer")}
              onClick={selectable ? () => onSelect(i) : undefined}
            >
              <text x={0} y={10} className={cn("font-body text-[11px]", on ? "fill-ink font-semibold" : "fill-ink")}>
                {b.label}
              </text>
              <text x={W} y={10} textAnchor="end" className={cn("font-body text-[11px] tabular-nums", on ? "fill-ink font-semibold" : "fill-ink")}>
                {shown(b.value, b.kind)}
              </text>
              <rect
                x={x(b.from)}
                y={14}
                width={Math.max(1, x(b.to) - x(b.from))}
                height={BAR}
                fill={fill}
                className={cn("motion-safe:transition-colors motion-safe:duration-150", on && "stroke-ink")}
                strokeWidth={on ? 1 : 0}
              />
              {next && (
                <line
                  x1={x(b.running)}
                  x2={x(b.running)}
                  y1={14 + BAR}
                  y2={ROW + 14}
                  className="stroke-ink-subtle"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
              {selectable && <rect x={0} y={0} width={W} height={ROW - 2} fill="transparent" />}
            </g>
          );
        })}
      </svg>
      <SrTable caption={caption} columns={["Line", "Amount"]} rows={bars.map((b) => [b.label, shown(b.value, b.kind)])} />
    </>
  );
}
