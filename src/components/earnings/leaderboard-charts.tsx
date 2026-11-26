"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useRouter } from "next/navigation";
import { CHART, VIZ, companyColor } from "@/lib/colors";
import { formatAxis, formatValue, type Unit } from "@/lib/chart-view/model";
import { scatterWindow } from "@/lib/chart-view/scatter";

// The leaderboard's two charts. Avnet is green and Arrow dark blue on every
// chart; every other company is grey, so the two stand out in a crowd. One y-axis.

export interface RankPoint {
  slug: string;
  name: string;
  value: number;
  growth?: number;
  margin?: number;
}

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const TOOLTIP = { ...CHART.tooltip, padding: "6px 8px" };
const ROW = 22;

/** Every company ranked on one measure, best at the top, with the median marked. A bar opens the company's profile. */
export function RankChart({ points, unit, median }: { points: RankPoint[]; unit: Unit; median?: number }) {
  const router = useRouter();
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, points.length * ROW + 40)}>
      <BarChart data={points} layout="vertical" margin={{ top: 18, right: 64, left: 0, bottom: 0 }} barCategoryGap={4}>
        <CartesianGrid stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} tickFormatter={(v: number) => formatAxis(unit, v)} />
        <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={170} interval={0} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={TOOLTIP} formatter={(v: number) => [formatValue(unit, v), "Value"]} />
        <ReferenceLine x={0} stroke={CHART.tick} />
        {median !== undefined && (
          <ReferenceLine
            x={median}
            stroke={CHART.label}
            strokeDasharray="4 3"
            label={{ value: `Median ${formatValue(unit, median)}`, position: "top", fontSize: CHART.tickFontSize, fill: CHART.label }}
          />
        )}
        <Bar dataKey="value" isAnimationActive={false} onClick={(d: RankPoint) => router.push(`/network/${d.slug}`)} cursor="pointer">
          {points.map((p) => (
            <Cell key={p.slug} fill={companyColor(p.slug)} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v: number) => formatValue(unit, v)} fontSize={CHART.tickFontSize} fill={CHART.label} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Revenue growth against operating margin, one dot per company, with lines at the medians. */
export function GrowthMarginChart({ points, medianGrowth, medianMargin }: { points: RankPoint[]; medianGrowth?: number; medianMargin?: number }) {
  const router = useRouter();
  const all = points.filter((p): p is RankPoint & { growth: number; margin: number } => p.growth !== undefined && p.margin !== undefined);
  const { shown: data, x, y, off } = scatterWindow(all);
  // Draw the grey crowd first, then Arrow and Avnet on top.
  const order = (s: string) => (s === "avnet" ? 2 : s === "arrow" ? 1 : 0);
  const sorted = [...data].sort((a, b) => order(a.slug) - order(b.slug));
  return (
    <div>
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis type="number" dataKey="growth" name="Revenue growth" domain={x} tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} tickFormatter={(v: number) => formatAxis("growth", v)} />
        <YAxis type="number" dataKey="margin" name="Operating margin" domain={y} tick={tick} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => formatAxis("pct", v)} />
        <ZAxis range={[48, 48]} />
        {medianGrowth !== undefined && <ReferenceLine x={medianGrowth} stroke={CHART.tick} strokeDasharray="4 3" />}
        {medianMargin !== undefined && <ReferenceLine y={medianMargin} stroke={CHART.tick} strokeDasharray="4 3" />}
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={TOOLTIP}
          content={({ payload }) => {
            const p = payload?.[0]?.payload as (RankPoint & { growth: number; margin: number }) | undefined;
            if (!p) return null;
            return (
              <div style={TOOLTIP} className="bg-surface text-caption text-ink">
                <p className="font-semibold">{p.name}</p>
                <p>Growth {formatValue("growth", p.growth)}</p>
                <p>Op margin {formatValue("pct", p.margin)}</p>
              </div>
            );
          }}
        />
        <Scatter data={sorted} isAnimationActive={false} onClick={(d: RankPoint) => router.push(`/network/${d.slug}`)} cursor="pointer">
          {sorted.map((p) => (
            <Cell key={p.slug} fill={p.slug === "avnet" || p.slug === "arrow" ? companyColor(p.slug) : VIZ.benchmark} fillOpacity={p.slug === "avnet" || p.slug === "arrow" ? 1 : 0.6} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
    {off > 0 && (
      <p className="mt-1 text-caption text-ink-muted">
        {off} {off === 1 ? "company is" : "companies are"} off the scale; {off === 1 ? "it is" : "they are"} in the ranking and the table.
      </p>
    )}
    </div>
  );
}
