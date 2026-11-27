"use client";

import { funnel, type FunnelStage } from "@/lib/explain/diagrams";
import { VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { SrTable, W } from "./shared";

// Stages with an amount at each, left aligned on one scale from the first stage,
// with the share that moves on from the stage before. One stage is highlighted in
// the subject's colour; the others are medium grey. Used by Design-approved
// billings, Approved pipeline, Approval rate, New registrations and Billings mapped.

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function Funnel({
  stages,
  highlight,
  onSelect,
  format,
  color = VIZ.avnet,
  caption,
}: {
  stages: FunnelStage[];
  highlight: number;
  onSelect?: (i: number) => void;
  format: (v: number) => string;
  color?: string;
  caption: string;
}) {
  const rows = funnel(stages);
  const ROW = 30;
  const BAR = 10;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${rows.length * ROW - 4}`} className="block w-full" aria-hidden>
        {rows.map((r, i) => {
          const on = i === highlight;
          const selectable = onSelect && !on;
          return (
            <g
              key={r.label}
              transform={`translate(0 ${i * ROW})`}
              className={cn(selectable && "cursor-pointer")}
              onClick={selectable ? () => onSelect(i) : undefined}
            >
              <text x={0} y={10} className={cn("fill-ink font-body text-[11px]", on && "font-semibold")}>
                {r.label}
              </text>
              <text x={W} y={10} textAnchor="end" className={cn("fill-ink font-body text-[11px] tabular-nums", on && "font-semibold")}>
                {format(r.value)}
                {r.conversion !== null && <tspan className="fill-ink-muted font-normal"> ({pct(r.conversion)} of the stage before)</tspan>}
              </text>
              <rect
                x={0}
                y={14}
                width={Math.max(1, r.width * W)}
                height={BAR}
                fill={on ? color : VIZ.benchmark}
                className={cn(on && "stroke-ink")}
                strokeWidth={on ? 1 : 0}
              />
              {selectable && <rect x={0} y={0} width={W} height={ROW - 4} fill="transparent" />}
            </g>
          );
        })}
      </svg>
      <SrTable
        caption={caption}
        columns={["Stage", "Amount", "Share of the stage before"]}
        rows={rows.map((r) => [r.label, format(r.value), r.conversion === null ? "" : pct(r.conversion)])}
      />
    </>
  );
}
