"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

/** Short axis labels: $1.2T, $640B, $9.5B. */
const tickMoney = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}T` : v >= 1e5 ? `$${Math.round(v / 1000)}B` : `$${(v / 1000).toFixed(v >= 1e4 ? 0 : 1)}B`);

/**
 * One measure over the years on its own scale: solid to the last actual year,
 * dashed into the forecast. TAM, SAM and SOM differ by 50 times, so each gets
 * its own small chart instead of sharing one axis.
 */
export function TrendMini({
  points,
  color,
  light = false,
  name,
}: {
  points: { year: number; value: number; forecast: boolean }[];
  color: string;
  light?: boolean;
  name: string;
}) {
  const lastActual = points.filter((p) => !p.forecast).at(-1)?.year;
  const data = points.map((p) => ({
    year: String(p.year) + (p.forecast ? "F" : ""),
    actual: p.forecast ? undefined : p.value,
    forecast: p.forecast || p.year === lastActual ? p.value : undefined,
  }));
  const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
  const width = light ? CHART.lineWidthLight : CHART.lineWidth;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="year" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={tick} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} tickFormatter={tickMoney} />
        <Tooltip
          contentStyle={CHART.tooltip}
          formatter={(v: number, key: string) => [formatUsdMillions(v, { precise: true }), key === "forecast" ? `${name}, forecast` : name]}
        />
        <Line dataKey="actual" stroke={color} strokeWidth={width} dot={false} activeDot={CHART.activeDot} isAnimationActive={false} />
        <Line dataKey="forecast" stroke={color} strokeWidth={width} strokeDasharray="4 4" dot={false} activeDot={CHART.activeDot} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
