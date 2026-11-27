"use client";

import { position, type Range } from "@/lib/explain/diagrams";
import { VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { SrTable, W } from "./shared";

// A bullet scale: an optional shaded band, a reference rule, the earlier periods as
// grey dots and the selected one as a marker. Clicking a dot selects its period.
// Used by Book-to-bill, Inventory days, Approval rate and Share of mapped market.

export interface ScalePoint {
  label: string;
  value: number;
}

export function RatioScale({
  points,
  selected,
  onSelect,
  scale,
  reference,
  band,
  format,
  words,
  color = VIZ.avnet,
  caption,
}: {
  /** Oldest first. */
  points: ScalePoint[];
  selected: number;
  onSelect?: (i: number) => void;
  scale: Range;
  /** The rule drawn across the track, e.g. 1.00 or 90 days. */
  reference: number;
  /** A shaded range, e.g. the flat band. */
  band?: Range;
  format: (v: number) => string;
  /** Words under the low end, the reference and the high end. Never colour alone. */
  words?: [string, string, string];
  /** The selected marker. Avnet green unless the subject is someone else. */
  color?: string;
  /** The hidden table's caption. */
  caption: string;
}) {
  const TRACK = 34;
  const x = (v: number) => position(v, scale) * W;
  const p = points[selected];
  if (!p) return null;
  const mx = x(p.value);
  const anchor = mx < 44 ? "start" : mx > W - 44 ? "end" : "middle";
  const h = words ? 74 : 62;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${h}`} className="block w-full overflow-visible" aria-hidden>
        {band && (
          <rect x={x(band.min)} y={TRACK - 8} width={Math.max(1, x(band.max) - x(band.min))} height={16} className="fill-surface-sunken" />
        )}
        <line x1={0} x2={W} y1={TRACK} y2={TRACK} className="stroke-hairline" strokeWidth={1} />
        <line x1={x(reference)} x2={x(reference)} y1={TRACK - 10} y2={TRACK + 10} className="stroke-ink" strokeWidth={1.5} />
        {[scale.min, scale.max].map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={TRACK - 4} y2={TRACK + 4} className="stroke-ink-subtle" strokeWidth={1} />
        ))}

        {points.map((q, k) => (k === selected ? null : <circle key={q.label} cx={x(q.value)} cy={TRACK} r={3} fill={VIZ.benchmark} />))}

        <g className="motion-safe:transition-transform motion-safe:duration-150" style={{ transform: `translateX(${mx}px)` }}>
          <circle cx={0} cy={TRACK} r={5.5} fill={color} className="stroke-ink" strokeWidth={1} />
          <text x={0} y={12} textAnchor={anchor} className="fill-ink font-display text-[11px] tabular-nums">
            {p.label} {format(p.value)}
          </text>
        </g>

        {onSelect &&
          points.map((q, k) => (
            <circle
              key={`hit-${q.label}`}
              cx={x(q.value)}
              cy={TRACK}
              r={8}
              fill="transparent"
              className={cn(k !== selected && "cursor-pointer")}
              onClick={() => onSelect(k)}
            >
              <title>{`${q.label} ${format(q.value)}`}</title>
            </circle>
          ))}

        <g className="fill-ink-muted font-body text-[10px] tabular-nums">
          <text x={0} y={58} textAnchor="start">
            {format(scale.min)}
          </text>
          <text x={x(reference)} y={58} textAnchor="middle" className="fill-ink">
            {format(reference)}
          </text>
          <text x={W} y={58} textAnchor="end">
            {format(scale.max)}
          </text>
          {words && (
            <>
              <text x={0} y={71} textAnchor="start">
                {words[0]}
              </text>
              <text x={x(reference)} y={71} textAnchor="middle">
                {words[1]}
              </text>
              <text x={W} y={71} textAnchor="end">
                {words[2]}
              </text>
            </>
          )}
        </g>
      </svg>
      <SrTable caption={caption} columns={["Period", "Value"]} rows={points.map((q) => [q.label, format(q.value)])} />
    </>
  );
}
