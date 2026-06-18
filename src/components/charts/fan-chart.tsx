"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import type { ForecastPoint, Scenario } from "@/lib/data/types";

const SCEN_COLOR: Record<Scenario, string> = {
  base: AVNET.blueDark,
  bull: AVNET.greenDark,
  bear: AVNET.danger,
};
const SCEN_LABEL: Record<Scenario, string> = { base: "Base", bull: "Bull", bear: "Bear" };

function FanTooltip({ active, payload, label, scenario }: any) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p: any) => p.dataKey === k)?.value;
  const actual = get("Actual");
  const forecast = get("Forecast");
  return (
    <div className="rounded border border-line bg-surface p-2 text-xs shadow-card">
      <div className="font-display tabular text-ink">{label}</div>
      {actual != null && <div className="text-muted">Actual: <span className="tabular text-ink">{formatUsdMillions(actual, { precise: true })}</span></div>}
      {forecast != null && (
        <div style={{ color: SCEN_COLOR[scenario as Scenario] }}>
          {SCEN_LABEL[scenario as Scenario]}: <span className="tabular">{formatUsdMillions(forecast, { precise: true })}</span>
        </div>
      )}
    </div>
  );
}

export function FanChart({ points, scenario }: { points: ForecastPoint[]; scenario: Scenario }) {
  const data = points.map((p) => ({
    year: p.year,
    Actual: p.actual,
    band: p.low,
    bandRange: p.high != null && p.low != null ? p.high - p.low : undefined,
    Forecast: p[scenario],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 16, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: AVNET.grayDark }} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUsdMillions(v)} tick={{ fontSize: 11, fill: AVNET.grayMedium }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<FanTooltip scenario={scenario} />} />
        <ReferenceLine x={2025} stroke={AVNET.grayMedium} strokeDasharray="4 4" label={{ value: "Forecast →", fontSize: 10, fill: AVNET.grayMedium, position: "insideTopRight" }} />
        {/* confidence band: transparent base + visible range */}
        <Area dataKey="band" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} connectNulls />
        <Area dataKey="bandRange" stackId="b" stroke="none" fill={AVNET.blueLight} fillOpacity={0.4} isAnimationActive={false} connectNulls />
        {/* actual (solid) + scenario forecast (dashed) */}
        <Line dataKey="Actual" stroke={AVNET.grayDark} strokeWidth={2.5} dot={false} connectNulls />
        <Line dataKey="Forecast" stroke={SCEN_COLOR[scenario]} strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
