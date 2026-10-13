"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AVNET } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";
import type { Metric, Quarter } from "@/lib/data/live/earnings-model";

// Single-series charts take the company's color (Avnet Green only ever for Avnet).
// Multi-metric charts use a fixed metric palette, so a metric keeps its color
// whichever company is selected.
const METRIC_COLORS = [AVNET.blueDark, AVNET.orange, AVNET.greenDark] as const;

const HEIGHT = 220;
const MARGIN = { top: 12, right: 12, left: 4, bottom: 0 };
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6, border: "1px solid #E3E5E8" };
const xTick = { fontSize: 10, fill: AVNET.grayDark };
const yTick = { fontSize: 11, fill: AVNET.grayMedium };

type Format = (v: number) => string;
const usd: Format = (v) => formatUsdMillions(v / 1e6);
const usdPrecise: Format = (v) => formatUsdMillions(v / 1e6, { precise: true });
const pct: Format = (v) => `${(v * 100).toFixed(1)}%`;
const pctAxis: Format = (v) => `${Math.round(v * 100)}%`;
const days: Format = (v) => `${Math.round(v)}d`;

interface Series {
  metric: Metric;
  label: string;
}

function rows(quarters: Quarter[], series: Series[]) {
  return quarters.map((q) => {
    const row: Record<string, string | number | undefined> = { quarter: q.fiscalLabel };
    for (const s of series) row[s.label] = q.values[s.metric];
    return row;
  });
}

function Empty() {
  return (
    <p className="flex items-center justify-center text-sm text-muted" style={{ height: HEIGHT }}>
      Not reported in a comparable form.
    </p>
  );
}

const hasAny = (quarters: Quarter[], series: Series[]) => quarters.some((q) => series.some((s) => q.values[s.metric] !== undefined));

function Bars({
  quarters,
  series,
  colors,
  axisFormat,
  valueFormat,
}: {
  quarters: Quarter[];
  series: Series[];
  colors: readonly string[];
  axisFormat: Format;
  valueFormat: Format;
}) {
  if (!hasAny(quarters, series)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart data={rows(quarters, series)} margin={MARGIN} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="quarter" tick={xTick} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={axisFormat} tick={yTick} axisLine={false} tickLine={false} width={52} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} formatter={(v: number, n) => [valueFormat(v), n]} contentStyle={TOOLTIP_STYLE} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8} />}
        <ReferenceLine y={0} stroke={AVNET.grayMedium} />
        {series.map((s, i) => (
          <Bar key={s.label} dataKey={s.label} fill={colors[i]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Lines({
  quarters,
  series,
  axisFormat,
  valueFormat,
}: {
  quarters: Quarter[];
  series: Series[];
  axisFormat: Format;
  valueFormat: Format;
}) {
  const shown = series.filter((s) => hasAny(quarters, [s]));
  if (!shown.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <LineChart data={rows(quarters, shown)} margin={MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="quarter" tick={xTick} axisLine={{ stroke: "#E3E5E8" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={axisFormat} tick={yTick} axisLine={false} tickLine={false} width={44} />
        <Tooltip formatter={(v: number, n) => [valueFormat(v), n]} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
        <ReferenceLine y={0} stroke={AVNET.grayMedium} />
        {shown.map((s) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            // Color follows the metric's slot in the full series list, not its rank among those shown.
            stroke={METRIC_COLORS[series.indexOf(s)]}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: METRIC_COLORS[series.indexOf(s)] }}
            activeDot={{ r: 4, stroke: "#FFFFFF", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({ quarters, color }: { quarters: Quarter[]; color: string }) {
  return <Bars quarters={quarters} series={[{ metric: "revenue", label: "Revenue" }]} colors={[color]} axisFormat={usd} valueFormat={usdPrecise} />;
}

export function GrowthChart({ quarters, color }: { quarters: Quarter[]; color: string }) {
  return (
    <Bars quarters={quarters} series={[{ metric: "revenueYoY", label: "Revenue growth YoY" }]} colors={[color]} axisFormat={pctAxis} valueFormat={pct} />
  );
}

export function MarginChart({ quarters }: { quarters: Quarter[] }) {
  return (
    <Lines
      quarters={quarters}
      series={[
        { metric: "grossMargin", label: "Gross margin" },
        { metric: "operatingMargin", label: "Operating margin" },
        { metric: "netMargin", label: "Net margin" },
      ]}
      axisFormat={pctAxis}
      valueFormat={pct}
    />
  );
}

export function WorkingCapitalChart({ quarters }: { quarters: Quarter[] }) {
  return (
    <Lines
      quarters={quarters}
      series={[
        { metric: "inventoryDays", label: "Inventory days" },
        { metric: "receivableDays", label: "Receivable days" },
        { metric: "payableDays", label: "Payable days" },
      ]}
      axisFormat={days}
      valueFormat={days}
    />
  );
}

export function CashFlowChart({ quarters }: { quarters: Quarter[] }) {
  return (
    <Bars
      quarters={quarters}
      series={[
        { metric: "operatingCashFlow", label: "Operating cash flow" },
        { metric: "freeCashFlow", label: "Free cash flow" },
      ]}
      colors={METRIC_COLORS}
      axisFormat={usd}
      valueFormat={usdPrecise}
    />
  );
}
