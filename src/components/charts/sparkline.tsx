// Lightweight inline SVG sparkline — cheaper than a Recharts instance per row.
export function Sparkline({
  data,
  color,
  width = 64,
  height = 22,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / span) * (height - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = width - 1;
  const lastY = height - 1 - ((data[data.length - 1] - min) / span) * (height - 2);
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={1.8} fill={color} />
    </svg>
  );
}
