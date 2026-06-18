"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AVNET } from "@/lib/colors";
import type { IpPoint } from "@/lib/data/types";

export function IpTrendChart({ data }: { data: IpPoint[] }) {
  // contiguous recession spans for shading
  const spans: [string, string][] = [];
  let start: string | null = null;
  data.forEach((p, i) => {
    if (p.recession && start === null) start = p.date;
    if (!p.recession && start !== null) {
      spans.push([start, data[i - 1].date]);
      start = null;
    }
  });
  if (start !== null) spans.push([start, data[data.length - 1].date]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="ipg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AVNET.blueDark} stopOpacity={0.3} />
            <stop offset="100%" stopColor={AVNET.blueDark} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="date" interval={11} tickFormatter={(d: string) => d.slice(0, 4)} tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} />
        <YAxis domain={["dataMin-5", "dataMax+5"]} tick={{ fontSize: 11, fill: AVNET.grayMedium }} axisLine={false} tickLine={false} width={36} />
        <Tooltip formatter={(v: number) => [v, "Index (2017=100)"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        {spans.map(([x1, x2], i) => (
          <ReferenceArea key={i} x1={x1} x2={x2} fill={AVNET.grayMedium} fillOpacity={0.16} label={{ value: "Recession", fontSize: 9, fill: AVNET.grayDark, position: "insideTop" }} />
        ))}
        <Area dataKey="value" stroke={AVNET.blueDark} fill="url(#ipg)" strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
