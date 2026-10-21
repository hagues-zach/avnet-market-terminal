"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/colors";

// Economic Signals lines on the shared CHART tokens. Nothing here is Avnet, so
// no series is green. Each line is labelled at its end; labels that would
// overlap are pushed apart.

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  /** Light Blue and Yellow need the heavier line. */
  light?: boolean;
}

export type Row = { label: string } & Record<string, string | number | undefined>;

/** How values print. A name, not a function, so a server component can pass it. */
export type Format = "index" | "percent";
const FORMATS: Record<Format, (v: number) => string> = {
  index: (v) => v.toFixed(0),
  percent: (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`,
};

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const MARGIN = { top: 12, right: 132, left: 4, bottom: 0 };
const X_AXIS = 30; // recharts' default x-axis height
const GAP = 14; // px between end labels

/** Vertical nudges (px) so end labels at least GAP apart; ys are pixel positions, larger is lower. */
export function spread(ys: number[], gap = GAP): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const placed: number[] = [];
  for (const [n, o] of order.entries()) placed[n] = n === 0 ? o.y : Math.max(o.y, placed[n - 1] + gap);
  const out = new Array<number>(ys.length);
  order.forEach((o, n) => (out[o.i] = placed[n] - o.y));
  return out;
}

export function SignalLines({
  rows,
  series,
  format: unit,
  height = 240,
}: {
  rows: Row[];
  series: LineSeries[];
  /** Axis ticks, end labels and tooltip values. */
  format: Format;
  height?: number;
}) {
  const format = FORMATS[unit];
  const values = rows.flatMap((r) => series.map((s) => r[s.key])).filter((v): v is number => typeof v === "number");
  if (!values.length) return <p className="py-10 text-center text-body-sm text-ink-muted">Not available right now.</p>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A round axis: about four steps of 1, 2, 2.5 or 5 times a power of ten.
  const raw = (max - min || 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const plot = height - MARGIN.top - MARGIN.bottom - X_AXIS;
  const lastOf = (key: string) => {
    for (let i = rows.length - 1; i >= 0; i--) if (typeof rows[i][key] === "number") return { i, v: rows[i][key] as number };
    return undefined;
  };
  const ends = series.map((s) => lastOf(s.key));
  const nudge = spread(ends.map((e) => (e ? MARGIN.top + ((hi - e.v) / (hi - lo)) * plot : 0)));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={44} domain={[lo, hi]} ticks={ticks} tickFormatter={format} />
        <Tooltip contentStyle={{ ...CHART.tooltip, padding: "6px 8px" }} formatter={(v: number, n: string) => [format(v), n]} />
        {series.map((s, k) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            type="monotone"
            stroke={s.color}
            strokeWidth={s.light ? CHART.lineWidthLight : CHART.lineWidth}
            dot={false}
            activeDot={CHART.activeDot}
            connectNulls
            isAnimationActive={false}
          >
            <LabelList
              dataKey={s.key}
              content={({ x, y, index, value }) =>
                index === ends[k]?.i ? (
                  <text x={Number(x) + 8} y={Number(y) + nudge[k]} dy={4} fontSize={CHART.tickFontSize} fill={CHART.label}>
                    {s.name} {format(Number(value))}
                  </text>
                ) : null
              }
            />
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
