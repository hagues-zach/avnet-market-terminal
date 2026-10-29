"use client";

import { CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART, VIZ } from "@/lib/colors";

/** Supply-chain revenue growth by quarter. Grey: this is the market, not Avnet. */
export function GrowthChart({ data }: { data: { label: string; growth: number }[] }) {
  const last = data.length - 1;
  const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <ReferenceLine y={0} stroke={CHART.axis} />
        {fiscalXAxis(data.map((r) => r.label), "label")}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
        <Tooltip contentStyle={CHART.tooltip} formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, "Revenue growth, YoY"]} />
        <Line dataKey="growth" stroke={VIZ.benchmark} strokeWidth={CHART.lineWidthLight} dot={false} activeDot={CHART.activeDot} isAnimationActive={false}>
          <LabelList
            dataKey="growth"
            content={({ x, y, value, index }) =>
              index === last ? (
                <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill={CHART.label}>
                  {`${Number(value) >= 0 ? "+" : "−"}${Math.abs(Number(value) * 100).toFixed(1)}%`}
                </text>
              ) : null
            }
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
