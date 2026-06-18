"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// How the WSTS 2026 forecast was revised across vintages — the current release in green.
export function VintageBars({
  data,
}: {
  data: { vintage: string; proj2026: number; isCurrent: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 0 }}>
        <XAxis type="number" hide domain={[600_000, 1_050_000]} />
        <YAxis type="category" dataKey="vintage" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={false} tickLine={false} width={92} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [formatUsdMillions(v, { precise: true }), "2026 projection"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Bar dataKey="proj2026" radius={[0, 3, 3, 0]} barSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isCurrent ? AVNET.green : AVNET.grayMedium} />
          ))}
          <LabelList dataKey="proj2026" position="right" formatter={(v: number) => formatUsdMillions(v, { precise: true })} style={{ fontSize: 10, fill: AVNET.grayDark }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
