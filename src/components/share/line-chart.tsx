"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { endLabels } from "@/components/charts/end-labels";
import { CHART } from "@/lib/colors";

export interface LineSeries {
  key: string;
  name: string;
  color: string;
  /** Light colours (greys, light blue, yellow) draw thicker. */
  light?: boolean;
}

type Row = { label: string } & Record<string, number | string | undefined>;

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;

/**
 * A line chart labelled at the line ends (name and last value, in ink), so it
 * reads without a legend. Values are fractions; `signed` shows growth rates
 * with a sign and a zero line.
 */
export function LabelledLines({
  data,
  series,
  signed = false,
  rightMargin = 112,
}: {
  data: Row[];
  series: LineSeries[];
  signed?: boolean;
  rightMargin?: number;
}) {
  const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
  const fmt = signed ? signedPct : (v: number) => pct(v);

  const values = data.flatMap((r) => series.map((s) => r[s.key])).filter((v): v is number => typeof v === "number");
  const range = Math.max(...values) - Math.min(...values) || 1;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: rightMargin, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {signed && <ReferenceLine y={0} stroke={CHART.axis} />}
        {fiscalXAxis(data.map((r) => String(r.label)), "label")}
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => (signed ? `${Math.round(v * 100)}%` : pct(v, range < 0.02 ? 1 : 0))}
        />
        <Tooltip contentStyle={CHART.tooltip} formatter={(v: number, name: string) => [fmt(v), name]} />
        {series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.light ? CHART.lineWidthLight : CHART.lineWidth}
              dot={false}
              activeDot={CHART.activeDot}
              connectNulls
              isAnimationActive={false}
            />
        ))}
        {endLabels((key, v) => `${series.find((s) => s.key === key)?.name} ${fmt(v)}`, { fontSize: 12 })}
      </LineChart>
    </ResponsiveContainer>
  );
}
