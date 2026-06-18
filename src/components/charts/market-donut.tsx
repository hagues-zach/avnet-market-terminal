"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartSeriesColor } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// Market segments (regions, end-markets) use the non-green data-viz palette.
export function MarketDonut({ data }: { data: { name: string; value: number }[] }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={sorted} dataKey="value" nameKey="name" innerRadius={58} outerRadius={95} paddingAngle={1} stroke="none">
          {sorted.map((_, i) => (
            <Cell key={i} fill={chartSeriesColor(i)} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, n) => [formatUsdMillions(v), n]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
