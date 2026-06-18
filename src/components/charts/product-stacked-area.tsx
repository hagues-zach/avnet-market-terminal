"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AVNET, chartSeriesColor } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import { PRODUCT_LABEL, type ProductCategory } from "@/lib/data/types";

// Stacking order: largest → smallest for a readable band.
const ORDER: ProductCategory[] = ["logic", "memory", "analog", "micro", "optoelectronics", "discretes", "sensors"];

export function ProductStackedArea({
  data,
}: {
  data: { year: number; values: Partial<Record<ProductCategory, number>> }[];
}) {
  const rows = data.map((d) => {
    const row: Record<string, number | string> = { year: d.year };
    ORDER.forEach((p) => {
      row[PRODUCT_LABEL[p]] = d.values[p] ?? 0;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={rows} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUsdMillions(v)} tick={{ fontSize: 11, fill: AVNET.grayMedium }} axisLine={false} tickLine={false} width={52} />
        <Tooltip formatter={(v: number, n) => [formatUsdMillions(v), n]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {/* Market segments — non-green data-viz palette (green stays reserved for Avnet). */}
        {ORDER.map((p, i) => (
          <Area
            key={p}
            type="monotone"
            dataKey={PRODUCT_LABEL[p]}
            stackId="1"
            stroke={chartSeriesColor(i)}
            fill={chartSeriesColor(i)}
            fillOpacity={0.75}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
