/**
 * Eight quarters of growth as tiny bars around a zero line: one colour, no
 * axes, no track. The latest quarter is solid, earlier ones lighter. Decorative
 * next to the number it explains, so it is hidden from screen readers.
 */
export function Spark({ values, width = 72, height = 20 }: { values: (number | undefined)[]; width?: number; height?: number }) {
  const known = values.filter((v): v is number => v !== undefined);
  if (!known.length) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const max = Math.max(0, ...known);
  const min = Math.min(0, ...known);
  const span = max - min || 1;
  const zero = (max / span) * height;
  const gap = 2;
  const w = (width - gap * (values.length - 1)) / values.length;
  const last = values.reduce<number>((l, v, i) => (v === undefined ? l : i), -1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="inline-block align-middle">
      <line x1={0} x2={width} y1={zero} y2={zero} className="stroke-hairline" strokeWidth={1} />
      {values.map((v, i) => {
        if (v === undefined) return null;
        const h = Math.max(1, (Math.abs(v) / span) * height);
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={v >= 0 ? zero - h : zero}
            width={w}
            height={h}
            className="fill-viz-arrow"
            fillOpacity={i === last ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}
