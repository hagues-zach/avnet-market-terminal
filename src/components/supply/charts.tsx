"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART, VIZ } from "@/lib/colors";
import { Segmented } from "@/components/ui/tabs";

// Supply Chain charts on the shared CHART tokens. Prices are rebased to 100 at
// the start of the window so series on different index bases share one axis.

export interface PriceSeries {
  key: string;
  label: string;
  /** Change on a year ago, as a share. */
  yoy?: number;
  points: { date: string; value: number }[];
}

const COLORS = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.yellow] as const;
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const TOOLTIP = { ...CHART.tooltip, padding: "6px 8px" };
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;
const month = (d: string) =>
  new Date(`${d.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

function rebased(series: PriceSeries[], months = 24) {
  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date.slice(0, 7)))))
    .sort()
    .slice(-months);
  const base = Object.fromEntries(series.map((s) => [s.key, s.points.find((p) => p.date.slice(0, 7) >= dates[0])?.value]));
  return dates.map((d) => ({
    label: d,
    ...Object.fromEntries(
      series.map((s) => {
        const v = s.points.find((p) => p.date.slice(0, 7) === d)?.value;
        const b = base[s.key];
        return [s.key, v !== undefined && b ? (v / b) * 100 : undefined];
      }),
    ),
  }));
}

function IndexLines({ series, height = 200 }: { series: PriceSeries[]; height?: number }) {
  if (!series.length) return <p className="py-10 text-center text-body-sm text-ink-muted">These series could not be loaded right now.</p>;
  const rows = rebased(series);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" tickFormatter={month} tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => String(Math.round(v))}
        />
        <Tooltip contentStyle={TOOLTIP} labelFormatter={(l: string) => month(l)} formatter={(v: number, n: string) => [v.toFixed(1), n]} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type="monotone"
            stroke={COLORS[i]}
            strokeWidth={COLORS[i] === VIZ.blueLight || COLORS[i] === VIZ.yellow ? CHART.lineWidthLight : CHART.lineWidth}
            dot={false}
            activeDot={CHART.activeDot}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Producer prices or input metals, rebased, with each series' change on a year ago as its legend. */
export function PricesChart({ producer, metals }: { producer: PriceSeries[]; metals: PriceSeries[] }) {
  const [view, setView] = useState<"producer" | "metals">("producer");
  const series = view === "producer" ? producer : metals;
  return (
    <div className="space-y-3">
      <Segmented
        label="Prices shown"
        value={view}
        onChange={setView}
        options={[
          { value: "producer", label: "Producer prices" },
          { value: "metals", label: "Metals" },
        ]}
      />
      <IndexLines series={series} />
      <ul className="space-y-1">
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3 text-body-sm">
            <span className="inline-flex items-center gap-1.5 text-ink">
              <span className="h-0.5 w-4 shrink-0" style={{ background: COLORS[i] }} aria-hidden />
              {s.label}
            </span>
            <span className="tabular-nums text-ink">{s.yoy === undefined ? "n/a" : `${pct(s.yoy)} YoY`}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-ink-muted">Indexed to 100 two years ago, so the lines share one scale.</p>
    </div>
  );
}

/** Avnet's backlog by quarter (mock), in Avnet Green, the latest labelled. */
export function BacklogBars({ rows, height = 180 }: { rows: { quarter: string; backlog: number }[]; height?: number }) {
  const last = rows.length - 1;
  const fmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => String(r.quarter)), "quarter")}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={48} tickFormatter={fmt} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={TOOLTIP} formatter={(v: number) => [fmt(v), "Backlog (mock)"]} />
        <Bar dataKey="backlog" fill={VIZ.avnet} maxBarSize={32} isAnimationActive={false}>
          <LabelList
            dataKey="backlog"
            content={({ x, y, width, index, value }) =>
              index === last ? (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y)}
                  dy={-6}
                  textAnchor="middle"
                  fontSize={CHART.tickFontSize}
                  fontWeight={600}
                  fill={CHART.label}
                >
                  {fmt(Number(value))}
                </text>
              ) : null
            }
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
