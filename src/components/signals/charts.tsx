"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { endLabels } from "@/components/charts/end-labels";
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={44} domain={[lo, hi]} ticks={ticks} tickFormatter={format} />
        <Tooltip contentStyle={{ ...CHART.tooltip, padding: "6px 8px" }} formatter={(v: number, n: string) => [format(v), n]} />
        {series.map((s) => (
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
          />
        ))}
        {endLabels((key, v) => `${series.find((s) => s.key === key)?.name} ${format(v)}`)}
      </LineChart>
    </ResponsiveContainer>
  );
}
