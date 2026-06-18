"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// Horizontal ranking bars. `highlight` rows get Avnet Green (used for Avnet itself);
// everyone else is neutral so green stays reserved for Avnet.
export function RankBars({
  data,
  baseColor = AVNET.grayMedium,
  height = 240,
}: {
  data: { name: string; value: number; highlight?: boolean }[];
  baseColor?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={false} tickLine={false} width={120} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [formatUsdMillions(v, { precise: true }), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={18}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? AVNET.green : baseColor} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: number) => formatUsdMillions(v, { precise: true })} style={{ fontSize: 10, fill: AVNET.grayDark }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
