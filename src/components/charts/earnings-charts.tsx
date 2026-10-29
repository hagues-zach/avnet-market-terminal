"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import type { Metric, Quarter } from "@/lib/data/live/earnings-model";

// One company's revenue or growth by quarter, in its own colour: Avnet Green for
// Avnet, Dark Blue for Arrow, grey for everyone else (one-colour bars). Tooltip
// values are in ink, never the series colour.

const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, left: 4, bottom: 0 };
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };

type Format = (v: number) => string;
const usd: Format = (v) => formatUsdMillions(v / 1e6);
const usdPrecise: Format = (v) => formatUsdMillions(v / 1e6, { precise: true });
const pct: Format = (v) => `${(v * 100).toFixed(1)}%`;
const pctAxis: Format = (v) => `${Math.round(v * 100)}%`;

function Bars({
  quarters,
  metric,
  label,
  color,
  axisFormat,
  valueFormat,
}: {
  quarters: Quarter[];
  metric: Metric;
  label: string;
  color: string;
  axisFormat: Format;
  valueFormat: Format;
}) {
  const data = quarters.map((q) => ({ quarter: q.fiscalLabel, [label]: q.values[metric] }));
  if (!quarters.some((q) => q.values[metric] !== undefined))
    return (
      <p className="flex items-center justify-center text-body-sm text-ink-muted" style={{ height: HEIGHT }}>
        Not reported in a comparable form.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(data.map((r) => String(r.quarter)), "quarter")}
        <YAxis tickFormatter={axisFormat} tick={tick} axisLine={false} tickLine={false} width={52} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number, n) => [valueFormat(v), n]} contentStyle={CHART.tooltip} itemStyle={{ color: CHART.label }} />
        <ReferenceLine y={0} stroke={CHART.axis} />
        <Bar dataKey={label} fill={color} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ quarters, color }: { quarters: Quarter[]; color: string }) {
  return <Bars quarters={quarters} metric="revenue" label="Revenue" color={color} axisFormat={usd} valueFormat={usdPrecise} />;
}

export function GrowthChart({ quarters, color }: { quarters: Quarter[]; color: string }) {
  return <Bars quarters={quarters} metric="revenueYoY" label="Revenue growth YoY" color={color} axisFormat={pctAxis} valueFormat={pct} />;
}
