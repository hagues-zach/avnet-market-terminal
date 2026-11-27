import { SrTable, W } from "./shared";

// Shares of a whole as one stacked bar per period (now, a year ago), segments in
// the same order on every bar, each labelled under the first bar. One segment can
// be outlined to tie it to the tile. Used by Top 10 and Top 100 customers.

export interface ShareRow {
  label: string;
  /** Shares in segment order, adding to one. */
  shares: number[];
}

export function ShareBar({
  segments,
  rows,
  colors,
  highlight,
  caption,
}: {
  /** Segment names, e.g. "Top 10", "Next 90", "Everyone else". */
  segments: string[];
  rows: ShareRow[];
  colors: string[];
  /** Segment indexes to outline, e.g. [0, 1] for the top 100. */
  highlight: number[];
  caption: string;
}) {
  const BAR = 14;
  const ROW = 32;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const h = rows.length * ROW;
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${h}`} className="block w-full" aria-hidden>
        {rows.map((r, i) => {
          let x = 0;
          const lit = highlight.reduce((a, k) => a + (r.shares[k] ?? 0), 0);
          const start = highlight.length ? r.shares.slice(0, Math.min(...highlight)).reduce((a, v) => a + v, 0) : 0;
          return (
            <g key={r.label} transform={`translate(0 ${i * ROW})`}>
              <text x={0} y={10} className="fill-ink font-body text-[11px]">
                {r.label}
              </text>
              <text x={W} y={10} textAnchor="end" className="fill-ink font-body text-[11px] font-semibold tabular-nums">
                {pct(lit)}
              </text>
              {r.shares.map((s, k) => {
                const w = s * W;
                const el = <rect key={k} x={x} y={14} width={Math.max(0, w - (k < r.shares.length - 1 ? 1 : 0))} height={BAR} fill={colors[k]} />;
                x += w;
                return el;
              })}
              {highlight.length > 0 && (
                <rect x={start * W + 0.5} y={14.5} width={Math.max(0, lit * W - 1)} height={BAR - 1} fill="none" className="stroke-ink" strokeWidth={1} />
              )}
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted">
        {segments.map((s, k) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2" style={{ background: colors[k] }} />
            {s} {pct(rows[0]?.shares[k] ?? 0)}
          </li>
        ))}
      </ul>
      <SrTable caption={caption} columns={["Period", ...segments]} rows={rows.map((r) => [r.label, ...r.shares.map(pct)])} />
    </div>
  );
}
