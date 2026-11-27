import { SrTable, W } from "./shared";

// Amounts on one scale from zero, the longest bar full width. With two rows, the
// gap between them is outlined and can carry a label. Used by Book-to-bill, Revenue
// growth, Backlog and Billings, last 12 months.

export interface PairBar {
  label: string;
  value: number;
  fill: string;
}

export function PairBars({
  rows,
  format,
  gapText,
  caption,
}: {
  rows: PairBar[];
  format: (v: number) => string;
  /** The gap in words, e.g. "$470M more orders than shipments". Shown with two rows. */
  gapText?: string;
  caption: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const BAR = 10;
  const ROW = 28;
  const y = (i: number) => i * ROW;
  const pair = rows.length === 2;
  const [a, b] = rows;
  const shortIdx = pair && a.value < b.value ? 0 : 1;
  const short = rows[shortIdx];
  const long = rows[1 - shortIdx];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${rows.length * ROW - 2}`} className="block w-full" aria-hidden>
        {rows.map((row, i) => (
          <g key={row.label} transform={`translate(0 ${y(i)})`}>
            <text x={0} y={10} className="fill-ink font-body text-[11px]">
              {row.label}
            </text>
            <text x={W} y={10} textAnchor="end" className="fill-ink font-body text-[11px] tabular-nums">
              {format(row.value)}
            </text>
            <rect x={0} y={14} width={(Math.max(0, row.value) / max) * W} height={BAR} fill={row.fill} />
          </g>
        ))}
        {/* No outline when the gap is under a pixel wide (equal Avnet and Arrow revenue, say). */}
        {pair && ((long.value - Math.max(0, short.value)) / max) * W >= 1 && (
          <rect
            x={(Math.max(0, short.value) / max) * W}
            y={y(shortIdx) + 14.5}
            width={((long.value - Math.max(0, short.value)) / max) * W - 0.5}
            height={BAR - 1}
            fill="none"
            className="stroke-ink"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}
      </svg>
      {pair && gapText && <p className="mt-1 text-right text-caption text-ink">{gapText}</p>}
      <SrTable caption={caption} columns={["Series", "Amount"]} rows={rows.map((r) => [r.label, format(r.value)])} />
    </div>
  );
}
