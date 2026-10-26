"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, VIZ } from "@/lib/colors";

// Cycle engine charts, on the shared CHART tokens. Nothing here is Avnet's, so
// no series is Avnet Green. Downturns in the reference cycle are shaded grey.

const MARGIN = { top: 12, right: 12, left: 4, bottom: 0 };
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const TOOLTIP = { ...CHART.tooltip, padding: "6px 8px" };
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;
const year = (m: string) => m.slice(0, 4);

/** The reference series' growth with its downturns (peak to trough) shaded. */
export function ReferenceChart({ growth, downturns, height = 260 }: { growth: [string, number][]; downturns: { start: string; end: string }[]; height?: number }) {
  const data = growth.map(([month, value]) => ({ month, value }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {downturns.map((d) => (
          <ReferenceArea key={d.start} x1={d.start} x2={d.end} fill={VIZ.other} fillOpacity={0.5} ifOverflow="hidden" />
        ))}
        <ReferenceLine y={0} stroke={CHART.axis} />
        <XAxis dataKey="month" tickFormatter={year} tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} minTickGap={40} />
        <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={tick} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [pct(v), "Growth on a year ago"]} labelFormatter={(m: string) => m} />
        <Line dataKey="value" stroke={VIZ.arrow} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const LINE_COLORS = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.benchmark, VIZ.yellow];

/** Several indexes' smoothed growth on one time axis. */
export function GrowthLines({ series, from = "2005-01", height = 280 }: { series: { name: string; growth: [string, number][] }[]; from?: string; height?: number }) {
  const months = [...new Set(series.flatMap((s) => s.growth.map(([m]) => m)))].filter((m) => m >= from).sort();
  const maps = series.map((s) => new Map(s.growth));
  const data = months.map((month) => Object.fromEntries([["month", month], ...series.map((s, i) => [s.name, maps[i].get(month)])]));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <ReferenceLine y={0} stroke={CHART.axis} />
        <XAxis dataKey="month" tickFormatter={year} tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} minTickGap={40} />
        <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={tick} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v: number, name: string) => [pct(v), name]} labelFormatter={(m: string) => m} />
        <Legend wrapperStyle={{ fontSize: CHART.tickFontSize }} iconType="plainline" />
        {series.map((s, i) => (
          <Line key={s.name} dataKey={s.name} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Chip makers' revenue growth, AI and datacenter against everyone else, by quarter. */
export function AiGapBars({ rows, height = 240 }: { rows: { quarter: string; ai: number; exai: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={MARGIN}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <ReferenceLine y={0} stroke={CHART.axis} />
        <XAxis dataKey="quarter" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} minTickGap={24} />
        <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={tick} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v: number, name: string) => [pct(v), name]} />
        <Legend wrapperStyle={{ fontSize: CHART.tickFontSize }} />
        <Bar dataKey="ai" name="AI and datacenter" fill={VIZ.arrow} isAnimationActive={false} />
        <Bar dataKey="exai" name="Everyone else" fill={VIZ.orange} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
