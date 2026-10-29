"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { Metric, Quarter } from "@/lib/data/live/earnings-model";
import { CHART, VIZ } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import { Segmented } from "@/components/ui/tabs";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";

// One chart with a measure switch, on the shared CHART tokens. A single series
// is the company's colour (Avnet Green for Avnet, Dark Blue for anyone else);
// several measures of one company use the validated order, labelled at the end.

type View = "revenue" | "growth" | "margins" | "working" | "cash";
type Unit = "usd" | "growth" | "pct" | "days";

const VIEWS: { value: View; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "growth", label: "Growth" },
  { value: "margins", label: "Margins" },
  { value: "working", label: "Working capital" },
  { value: "cash", label: "Cash flow" },
];

const SERIES: Record<View, { unit: Unit; kind: "bar" | "line"; metrics: { metric: Metric; name: string }[] }> = {
  revenue: { unit: "usd", kind: "bar", metrics: [{ metric: "revenue", name: "Revenue" }] },
  growth: { unit: "growth", kind: "bar", metrics: [{ metric: "revenueYoY", name: "Revenue growth YoY" }] },
  margins: {
    unit: "pct",
    kind: "line",
    metrics: [
      { metric: "grossMargin", name: "Gross" },
      { metric: "operatingMargin", name: "Operating" },
      { metric: "netMargin", name: "Net" },
    ],
  },
  working: {
    unit: "days",
    kind: "line",
    metrics: [
      { metric: "inventoryDays", name: "Inventory" },
      { metric: "receivableDays", name: "Receivable" },
      { metric: "payableDays", name: "Payable" },
    ],
  },
  cash: {
    unit: "usd",
    kind: "bar",
    metrics: [
      { metric: "operatingCashFlow", name: "Operating cash flow" },
      { metric: "freeCashFlow", name: "Free cash flow" },
    ],
  },
};

const AXIS: Record<Unit, (v: number) => string> = {
  usd: (v) => formatUsdMillions(v / 1e6),
  growth: (v) => `${Math.round(v * 100)}%`,
  pct: (v) => `${Math.round(v * 100)}%`,
  days: (v) => `${Math.round(v)}d`,
};
const VALUE: Record<Unit, (v: number) => string> = {
  usd: (v) => `${v < 0 ? "−" : ""}${formatUsdMillions(Math.abs(v) / 1e6, { precise: true })}`,
  growth: (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`,
  pct: (v) => `${(v * 100).toFixed(1)}%`,
  days: (v) => `${Math.round(v)} days`,
};

const ORDER = [VIZ.arrow, VIZ.orange, VIZ.blueLight] as const;
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const TOOLTIP = { ...CHART.tooltip, padding: "6px 8px" };

export function TrendChart({ quarters, isAvnet, height = 260 }: { quarters: Quarter[]; isAvnet: boolean; height?: number }) {
  const [view, setView] = useState<View>("revenue");
  const spec = SERIES[view];
  const rows = quarters.map((q) => ({ label: q.fiscalLabel, ...Object.fromEntries(spec.metrics.map((m) => [m.metric, q.values[m.metric]])) }));
  const has = rows.some((r) => spec.metrics.some((m) => typeof (r as Record<string, unknown>)[m.metric] === "number"));
  const single = spec.metrics.length === 1;
  const color = (i: number) => (single ? (isAvnet ? VIZ.avnet : VIZ.arrow) : ORDER[i]);
  const last = rows.length - 1;
  const labels = rows.map((r) => r.label);

  return (
    <div className="space-y-3">
      <Segmented label="Measure" value={view} onChange={setView} options={VIEWS} />
      {!has ? (
        <p className="flex items-center justify-center text-body-sm text-ink-muted" style={{ height }}>
          Not reported in a comparable form.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {spec.kind === "bar" ? (
            <BarChart data={rows} margin={{ top: 20, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              {fiscalXAxis(labels, "label")}
              <YAxis tickFormatter={AXIS[spec.unit]} tick={tick} axisLine={false} tickLine={false} width={56} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} contentStyle={TOOLTIP} formatter={(v: number, n: string) => [VALUE[spec.unit](v), n]} />
              <ReferenceLine y={0} stroke={CHART.tick} />
              {spec.metrics.map((m, i) => (
                <Bar key={m.metric} dataKey={m.metric} name={m.name} fill={color(i)} maxBarSize={single ? 36 : 18} isAnimationActive={false}>
                  {single && (
                    <LabelList
                      dataKey={m.metric}
                      content={({ x, y, width, index, value }) =>
                        index === last && typeof value === "number" ? (
                          <text
                            x={Number(x) + Number(width) / 2}
                            y={Number(y)}
                            dy={-6}
                            textAnchor="middle"
                            fontSize={CHART.tickFontSize}
                            fontWeight={600}
                            fill={CHART.label}
                          >
                            {VALUE[spec.unit](value)}
                          </text>
                        ) : null
                      }
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          ) : (
            <LineChart data={rows} margin={{ top: 16, right: 110, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              {fiscalXAxis(labels, "label")}
              <YAxis tickFormatter={AXIS[spec.unit]} tick={tick} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: number, n: string) => [VALUE[spec.unit](v), n]} />
              {spec.metrics.map((m, i) => (
                <Line
                  key={m.metric}
                  type="monotone"
                  dataKey={m.metric}
                  name={m.name}
                  stroke={color(i)}
                  strokeWidth={color(i) === VIZ.blueLight ? CHART.lineWidthLight : CHART.lineWidth}
                  dot={false}
                  activeDot={CHART.activeDot}
                  connectNulls
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={m.metric}
                    content={({ x, y, index, value }) =>
                      index === last && typeof value === "number" ? (
                        <text x={Number(x) + 8} y={Number(y)} dy={4 + (i - 1) * 2} fontSize={CHART.tickFontSize} fill={CHART.label}>
                          {m.name} {VALUE[spec.unit](value)}
                        </text>
                      ) : null
                    }
                  />
                </Line>
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
      {spec.kind === "bar" && !single && (
        <p className="flex gap-4 text-caption text-ink">
          {spec.metrics.map((m, i) => (
            <span key={m.metric} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ background: color(i) }} aria-hidden />
              {m.name}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
