"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import type { TamPoint } from "@/lib/data/types";

export function TamTrend({ trend }: { trend: TamPoint[] }) {
  const data = trend.map((p) => ({
    year: p.year,
    TAM: p.tamUsdM,
    SAM: p.samUsdM,
    SOM: p.somUsdM,
    isForecast: p.isForecast,
  }));
  const firstForecast = data.find((d) => d.isForecast)?.year;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUsdMillions(v)} tick={{ fontSize: 11, fill: AVNET.grayMedium }} axisLine={false} tickLine={false} width={52} />
        <Tooltip formatter={(v: number, n) => [formatUsdMillions(v, { precise: true }), n]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {firstForecast && (
          <ReferenceLine x={firstForecast} stroke={AVNET.grayMedium} strokeDasharray="4 4" label={{ value: "Forecast →", fontSize: 10, fill: AVNET.grayMedium, position: "insideTopRight" }} />
        )}
        {/* TAM (total market) neutral; SAM (distribution slice) blue; SOM (Avnet) = green */}
        <Area type="monotone" dataKey="TAM" stroke={AVNET.grayMedium} fill={AVNET.grayLight} fillOpacity={0.5} strokeWidth={2} />
        <Area type="monotone" dataKey="SAM" stroke={AVNET.blueDark} fill={AVNET.blueLight} fillOpacity={0.5} strokeWidth={2} />
        <Area type="monotone" dataKey="SOM" stroke={AVNET.green} fill={AVNET.green} fillOpacity={0.55} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
