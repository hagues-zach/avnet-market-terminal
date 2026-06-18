"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AVNET, chartSeriesColor } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

export function EndMarketBars({ data }: { data: { name: string; value: number }[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={false} tickLine={false} width={96} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [formatUsdMillions(v), "Market"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={20}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={chartSeriesColor(i)} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: number) => formatUsdMillions(v)} style={{ fontSize: 10, fill: AVNET.grayDark }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
