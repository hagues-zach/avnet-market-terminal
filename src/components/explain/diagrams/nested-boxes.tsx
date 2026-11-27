import { nested, type NestLevel } from "@/lib/explain/diagrams";
import { VIZ } from "@/lib/colors";
import { SrTable, W } from "./shared";

// One market inside another, areas to scale: the outer box is the whole, each level
// inside it sits in the lower left corner, so the share is the inner box's area
// over the outer one's. The innermost level is the subject, in its colour; outer
// levels are greys. Used by Share of mapped market.

export function NestedBoxes({
  levels,
  format,
  color = VIZ.avnet,
  caption,
}: {
  /** Outermost first, e.g. the mapped market, then Avnet's mapped billings. */
  levels: NestLevel[];
  format: (v: number) => string;
  color?: string;
  caption: string;
}) {
  const H = 132;
  const sides = nested(levels);
  const last = levels.length - 1;
  const fills = levels.map((_, i) => (i === last ? color : i === 0 ? VIZ.other : VIZ.benchmark));
  const share = (i: number) => (levels[0].value > 0 ? levels[i].value / levels[0].value : 0);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden>
        {levels.map((l, i) => {
          const w = sides[i] * W;
          const h = sides[i] * H;
          return <rect key={l.label} x={0} y={H - h} width={Math.max(1, w)} height={Math.max(1, h)} fill={fills[i]} className={i === last ? "stroke-ink" : undefined} strokeWidth={i === last ? 1 : 0} />;
        })}
        {/* The outer label in its top left; each inner one beside its box, at the box's top. */}
        <text x={8} y={16} className="fill-ink font-body text-[11px]">
          {levels[0].label}
        </text>
        <text x={8} y={30} className="fill-ink font-body text-[11px] tabular-nums">
          {format(levels[0].value)}
        </text>
        {levels.slice(1).map((l, k) => {
          const i = k + 1;
          const w = sides[i] * W;
          const top = H - sides[i] * H;
          const y = Math.min(H - 18, Math.max(46, top + 10));
          return (
            <g key={l.label}>
              <text x={w + 8} y={y} className={i === last ? "fill-ink font-body text-[11px] font-semibold" : "fill-ink font-body text-[11px]"}>
                {l.label}
              </text>
              <text x={w + 8} y={y + 14} className="fill-ink font-body text-[11px] tabular-nums">
                {format(l.value)}, {pct(share(i))}
              </text>
            </g>
          );
        })}
      </svg>
      <SrTable
        caption={caption}
        columns={["Level", "Amount", `Share of ${levels[0].label.toLowerCase()}`]}
        rows={levels.map((l, i) => [l.label, format(l.value), pct(share(i))])}
      />
    </div>
  );
}
