"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

export function ChannelTrend({
  data,
}: {
  data: { year: number; usdM: number; isForecast: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 16, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUsdMillions(v)} tick={{ fontSize: 11, fill: AVNET.grayMedium }} axisLine={false} tickLine={false} width={48} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [formatUsdMillions(v, { precise: true }), "Channel revenue"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Bar dataKey="usdM" radius={[2, 2, 0, 0]} barSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isForecast ? AVNET.blueLight : AVNET.blueDark} />
          ))}
          <LabelList dataKey="usdM" position="top" formatter={(v: number) => formatUsdMillions(v)} style={{ fontSize: 10, fill: AVNET.grayDark }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
