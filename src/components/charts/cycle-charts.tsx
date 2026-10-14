"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// Group-level charts. Nothing here is Avnet alone, so Avnet Green is never used.
const SERIES_COLORS = [AVNET.blueDark, AVNET.orange, AVNET.greenDark] as const;
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" };
const xTick = { fontSize: 10, fill: AVNET.grayDark };
const yTick = { fontSize: 11, fill: AVNET.grayMedium };
const MARGIN = { top: 12, right: 12, left: 4, bottom: 0 };

export type Unit = "pct" | "pctWhole" | "days" | "usd" | "index" | "level";

const FORMAT: Record<Unit, { axis: (v: number) => string; value: (v: number) => string }> = {
  pct: { axis: (v) => `${Math.round(v * 100)}%`, value: (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%` },
  pctWhole: { axis: (v) => `${Math.round(v * 100)}%`, value: (v) => `${Math.round(v * 100)}%` },
  days: { axis: (v) => `${Math.round(v)}d`, value: (v) => `${Math.round(v)} days` },
  index: { axis: (v) => `${Math.round(v)}`, value: (v) => v.toFixed(1) },
  level: { axis: (v) => `${Math.round(v)}%`, value: (v) => `${v.toFixed(1)}%` },
  usd: { axis: (v) => formatUsdMillions(v / 1e6), value: (v) => formatUsdMillions(v / 1e6, { precise: true }) },
};

export type ChartRow = { label: string } & Record<string, string | number | undefined>;

function Empty({ height }: { height: number }) {
  return (
    <p className="flex items-center justify-center text-sm text-muted" style={{ height }}>
      Not enough companies have reported to show this yet.
    </p>
  );
}

const hasData = (rows: ChartRow[], keys: string[]) => rows.some((r) => keys.some((k) => typeof r[k] === "number"));

/** Up to three named series on one shared axis. */
export function GroupLines({
  rows,
  series,
  unit,
  height = 220,
  colors = SERIES_COLORS,
}: {
  rows: ChartRow[];
  series: string[];
  unit: Unit;
  height?: number;
  /** Override the default palette, e.g. to give a named company its own color. */
  colors?: readonly string[];
}) {
  if (!hasData(rows, series)) return <Empty height={height} />;
  const f = FORMAT[unit];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="label" tick={xTick} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={f.axis} tick={yTick} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
        <Tooltip formatter={(v: number, n) => [f.value(v), n]} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={colors[i]}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: colors[i] }}
            activeDot={{ r: 4, stroke: "#FFFFFF", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** One measure by quarter. */
export function QuarterBars({
  rows,
  dataKey,
  name,
  unit,
  height = 220,
  domain,
}: {
  rows: ChartRow[];
  dataKey: string;
  name: string;
  unit: Unit;
  height?: number;
  domain?: [number, number];
}) {
  if (!hasData(rows, [dataKey])) return <Empty height={height} />;
  const f = FORMAT[unit];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="label" tick={xTick} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={f.axis} tick={yTick} axisLine={false} tickLine={false} width={52} domain={domain} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number) => [f.value(v), name]} contentStyle={TOOLTIP_STYLE} />
        <ReferenceLine y={0} stroke={AVNET.grayMedium} />
        <Bar dataKey={dataKey} fill={AVNET.blueDark} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Small-multiple growth chart for one group: no axis, a zero line, the latest
 * quarter emphasised. The caller prints the group name and latest value as text.
 */
export function GrowthSpark({ rows, name }: { rows: ChartRow[]; name: string }) {
  if (!hasData(rows, ["growth"])) return <Empty height={64} />;
  const lastIndex = rows.reduce((last, r, i) => (typeof r.growth === "number" ? i : last), -1);
  return (
    <ResponsiveContainer width="100%" height={64}>
      <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 0)]} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          formatter={(v: number) => [FORMAT.pct.value(v), `${name} revenue, YoY`]}
          contentStyle={TOOLTIP_STYLE}
          wrapperStyle={{ zIndex: 20 }}
        />
        <ReferenceLine y={0} stroke={AVNET.grayMedium} />
        <Bar dataKey="growth" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={r.label} fill={AVNET.blueDark} fillOpacity={i === lastIndex ? 1 : 0.45} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
