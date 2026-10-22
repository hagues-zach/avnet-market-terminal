"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, VIZ } from "@/lib/colors";

// The world market by year, published totals in one colour (this is the market,
// not Avnet, so never green), with next year's forecast drawn as an outline.

const bn = (v: number) => (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}T` : `$${Math.round(v / 1000)}B`);

export function MarketByYear({ points }: { points: { year: number; usdM: number; forecast: boolean }[] }) {
  const data = points.map((p) => ({ year: p.forecast ? `${p.year} forecast` : String(p.year), usdM: p.usdM, forecast: p.forecast }));
  return (
    <div
      role="img"
      aria-label={`World semiconductor sales by year: ${points.map((p) => `${p.year}${p.forecast ? " forecast" : ""} ${bn(p.usdM)}`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: CHART.tickFontSize, fill: CHART.tick }} axisLine={{ stroke: CHART.axis }} tickLine={false} />
          <YAxis tickFormatter={bn} tick={{ fontSize: CHART.tickFontSize, fill: CHART.tick }} axisLine={false} tickLine={false} width={52} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [bn(v), "World market"]} contentStyle={CHART.tooltip} />
          <Bar dataKey="usdM" maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.year}
                fill={d.forecast ? "transparent" : VIZ.arrow}
                stroke={d.forecast ? VIZ.arrow : undefined}
                strokeDasharray={d.forecast ? "4 3" : undefined}
                strokeWidth={d.forecast ? 1.5 : 0}
              />
            ))}
            <LabelList dataKey="usdM" position="top" formatter={bn} stroke="none" style={{ fontSize: CHART.tickFontSize, fill: CHART.label }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
