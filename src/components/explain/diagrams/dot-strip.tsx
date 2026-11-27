import { count, dotRows, median, position, type Range } from "@/lib/explain/diagrams";
import { VIZ, companyColor } from "@/lib/colors";
import { SrTable, W } from "./shared";

// One dot per company on a single scale, stacked where they would overlap, with a
// zero rule and the median marked. Avnet is green and Arrow dark blue, everyone
// else grey, so the two stand out of the crowd. Used by Companies growing and
// Median revenue growth.

export interface StripDot {
  slug: string;
  name: string;
  value: number;
}

export function DotStrip({
  dots,
  scale,
  format,
  words,
  caption,
}: {
  dots: StripDot[];
  scale: Range;
  format: (v: number) => string;
  /** Words under the low and high ends. */
  words: [string, string];
  caption: string;
}) {
  const R = 3;
  const STEP = 7;
  const MAX_ROWS = 8;
  const x = (v: number) => R + position(v, scale) * (W - 2 * R);
  const xs = dots.map((d) => x(d.value));
  const rows = dotRows(xs, 2 * R + 0.5).map((r) => Math.min(r, MAX_ROWS - 1));
  const depth = Math.max(1, ...rows.map((r) => r + 1));
  const BASE = 22 + depth * STEP;
  const m = median(dots.map((d) => d.value));
  const zero = scale.min < 0 && scale.max > 0 ? x(0) : undefined;
  // Avnet and Arrow last, so they sit on top of the greys.
  const order = dots.map((d, i) => i).sort((a, b) => Number(["avnet", "arrow"].includes(dots[a].slug)) - Number(["avnet", "arrow"].includes(dots[b].slug)));
  const h = BASE + 32;
  const beyond = dots.filter((d) => d.value > scale.max || d.value < scale.min).length;

  return (
    <>
      <svg viewBox={`0 0 ${W} ${h}`} className="block w-full overflow-visible" aria-hidden>
        <line x1={0} x2={W} y1={BASE + 4} y2={BASE + 4} className="stroke-hairline" strokeWidth={1} />
        {zero !== undefined && <line x1={zero} x2={zero} y1={16} y2={BASE + 8} className="stroke-ink-subtle" strokeWidth={1} />}
        {m !== undefined && (
          <g>
            <line x1={x(m)} x2={x(m)} y1={14} y2={BASE + 8} className="stroke-ink" strokeWidth={1.5} />
            <text x={x(m)} y={10} textAnchor={x(m) < 50 ? "start" : x(m) > W - 50 ? "end" : "middle"} className="fill-ink font-display text-[11px] tabular-nums">
              Median {format(m)}
            </text>
          </g>
        )}
        {order.map((i) => {
          const d = dots[i];
          const mark = d.slug === "avnet" || d.slug === "arrow";
          return (
            <circle
              key={d.slug}
              cx={xs[i]}
              cy={BASE - rows[i] * STEP}
              r={mark ? R + 1 : R}
              fill={mark ? companyColor(d.slug) : VIZ.benchmark}
              className={mark ? "stroke-ink" : undefined}
              strokeWidth={mark ? 1 : 0}
            >
              <title>{`${d.name} ${format(d.value)}`}</title>
            </circle>
          );
        })}
        <g className="fill-ink-muted font-body text-[10px] tabular-nums">
          <text x={0} y={BASE + 18} textAnchor="start">
            {format(scale.min)}
          </text>
          {zero !== undefined && (
            <text x={zero} y={BASE + 18} textAnchor="middle" className="fill-ink">
              {format(0)}
            </text>
          )}
          <text x={W} y={BASE + 18} textAnchor="end">
            {format(scale.max)}
          </text>
          <text x={0} y={BASE + 30} textAnchor="start">
            {words[0]}
          </text>
          <text x={W} y={BASE + 30} textAnchor="end">
            {words[1]}
          </text>
        </g>
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted">
        {dots
          .filter((d) => d.slug === "avnet" || d.slug === "arrow")
          .map((d) => (
            <li key={d.slug} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: companyColor(d.slug) }} />
              {d.name} {format(d.value)}
            </li>
          ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: VIZ.benchmark }} />
          Other companies
        </li>
      </ul>
      {beyond > 0 && (
        <p className="mt-1 text-caption text-ink-muted">
          {beyond === 1 ? "One company is" : `${count(beyond).replace(/^./, (c) => c.toUpperCase())} companies are`} beyond the scale and sit at its ends.
        </p>
      )}
      <SrTable
        caption={caption}
        columns={["Company", "Revenue growth"]}
        rows={[...dots].sort((a, b) => b.value - a.value).map((d) => [d.name, format(d.value)])}
      />
    </>
  );
}
