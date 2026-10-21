/**
 * Eight quarters of one measure for Avnet (green) and Arrow (Dark Blue) as two
 * small lines on a shared scale. No axes; decorative next to the figures it
 * sits beside, so it is hidden from screen readers.
 */
export function PairSpark({
  avnet,
  arrow,
  width = 112,
  height = 32,
}: {
  avnet: (number | undefined)[];
  arrow: (number | undefined)[];
  width?: number;
  height?: number;
}) {
  const all = [...avnet, ...arrow].filter((v): v is number => v !== undefined);
  if (all.length < 2) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const n = Math.max(avnet.length, arrow.length);
  const path = (series: (number | undefined)[]) =>
    series
      .map((v, i) => (v === undefined ? null : `${(i / (n - 1 || 1)) * (width - 4) + 2},${height - 3 - ((v - lo) / span) * (height - 6)}`))
      .filter(Boolean)
      .map((p, i) => `${i ? "L" : "M"}${p}`)
      .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <path d={path(arrow)} fill="none" className="stroke-viz-arrow" strokeWidth={1.5} />
      <path d={path(avnet)} fill="none" className="stroke-viz-avnet" strokeWidth={2} />
    </svg>
  );
}
