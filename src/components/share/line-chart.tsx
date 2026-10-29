"use client";

import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
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

  // Last value of each series, and a nudge apart when two end labels would touch.
  const ends = series.map((s) => {
    const i = data.map((r) => r[s.key]).findLastIndex((v) => typeof v === "number");
    return { key: s.key, index: i, value: i >= 0 ? (data[i][s.key] as number) : undefined };
  });
  const values = data.flatMap((r) => series.map((s) => r[s.key])).filter((v): v is number => typeof v === "number");
  const range = Math.max(...values) - Math.min(...values) || 1;
  const nudge = new Map<string, number>();
  const ranked = ends.filter((e) => e.value !== undefined).sort((a, b) => b.value! - a.value!);
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i - 1].value! - ranked[i].value! < range * 0.12) {
      nudge.set(ranked[i - 1].key, (nudge.get(ranked[i - 1].key) ?? 0) - 7);
      nudge.set(ranked[i].key, 7);
    }
  }

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
        {series.map((s) => {
          const end = ends.find((e) => e.key === s.key)!;
          return (
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
            >
              <LabelList
                dataKey={s.key}
                content={({ x, y, value, index }) =>
                  index === end.index ? (
                    <text x={Number(x) + 8} y={Number(y) + 4 + (nudge.get(s.key) ?? 0)} fontSize={12} fill={CHART.label}>
                      {`${s.name} ${fmt(Number(value))}`}
                    </text>
                  ) : null
                }
              />
            </Line>
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
