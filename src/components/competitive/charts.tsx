"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { endLabels } from "@/components/charts/end-labels";
import { CHART, VIZ } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// Avnet against Arrow, on the shared CHART tokens. Avnet is always green and
// Arrow always Dark Blue; each line is labelled at its end, in ink.

export type Unit = "growth" | "pct" | "days" | "usd";

const AXIS: Record<Unit, (v: number) => string> = {
  growth: (v) => `${Math.round(v * 100)}%`,
  pct: (v) => `${(v * 100).toFixed(1)}%`,
  days: (v) => `${Math.round(v)}d`,
  usd: (v) => formatUsdMillions(v / 1e6),
};
const VALUE: Record<Unit, (v: number) => string> = {
  growth: (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`,
  pct: (v) => `${(v * 100).toFixed(1)}%`,
  days: (v) => `${Math.round(v)} days`,
  usd: (v) => formatUsdMillions(v / 1e6, { precise: true }),
};

export interface PairRow {
  label: string;
  avnet?: number;
  arrow?: number;
}

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };

/** Avnet and Arrow on one measure by calendar quarter. */
export function PairLines({
  rows,
  unit,
  height = 180,
  names = { avnet: "Avnet", arrow: "Arrow" },
  fill,
}: {
  rows: PairRow[];
  unit: Unit;
  height?: number;
  names?: { avnet: string; arrow: string };
  /** Grow to the space the parent flex column leaves; height becomes the minimum. */
  fill?: boolean;
}) {
  if (!rows.some((r) => r.avnet !== undefined || r.arrow !== undefined)) {
    return (
      <p className="flex items-center justify-center text-body-sm text-ink-muted" style={{ height }}>
        Not reported yet.
      </p>
    );
  }
  const chart = (
    <LineChart data={rows} margin={{ top: 12, right: 92, left: 4, bottom: 0 }}>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      {fiscalXAxis(rows.map((r) => r.label), "label")}
      <YAxis tickFormatter={AXIS[unit]} tick={tick} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
      <Tooltip contentStyle={{ ...CHART.tooltip, padding: "6px 8px" }} formatter={(v: number, n: string) => [VALUE[unit](v), n]} />
      {(["avnet", "arrow"] as const).map((k) => (
        <Line
          key={k}
          type="monotone"
          dataKey={k}
          name={names[k]}
          stroke={k === "avnet" ? VIZ.avnet : VIZ.arrow}
          strokeWidth={k === "avnet" ? CHART.lineWidthLight : CHART.lineWidth}
          dot={false}
          activeDot={CHART.activeDot}
          connectNulls
          isAnimationActive={false}
        />
      ))}
      {endLabels((k, v) => `${names[k as "avnet" | "arrow"].split(" ")[0]} ${VALUE[unit](v)}`)}
    </LineChart>
  );
  if (!fill) return <ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer>;
  // The absolute inner box keeps the chart from feeding its own size back into the row height.
  return (
    <div className="relative flex-1" style={{ minHeight: height }}>
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
    </div>
  );
}
