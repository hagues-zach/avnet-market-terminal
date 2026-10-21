"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
}: {
  rows: PairRow[];
  unit: Unit;
  height?: number;
  names?: { avnet: string; arrow: string };
}) {
  if (!rows.some((r) => r.avnet !== undefined || r.arrow !== undefined)) {
    return (
      <p className="flex items-center justify-center text-body-sm text-ink-muted" style={{ height }}>
        Not reported yet.
      </p>
    );
  }
  const last = (k: "avnet" | "arrow") => rows.reduce((l, r, i) => (r[k] === undefined ? l : i), -1);
  const ends = { avnet: last("avnet"), arrow: last("arrow") };
  // Push the two end labels apart when the lines finish close together.
  const a = rows[ends.avnet]?.avnet;
  const b = rows[ends.arrow]?.arrow;
  const values = rows.flatMap((r) => [r.avnet, r.arrow]).filter((v): v is number => v !== undefined);
  const range = Math.max(...values) - Math.min(...values) || 1;
  const px = (((a ?? 0) - (b ?? 0)) / range) * (height - 50);
  const apart = a !== undefined && b !== undefined && Math.abs(px) < 13 ? (13 - Math.abs(px)) / 2 : 0;
  const offset = { avnet: (a ?? 0) >= (b ?? 0) ? -apart : apart, arrow: (a ?? 0) >= (b ?? 0) ? apart : -apart };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 12, right: 92, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" />
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
          >
            <LabelList
              dataKey={k}
              content={({ x, y, index, value }) =>
                index === ends[k] && typeof value === "number" ? (
                  <text x={Number(x) + 8} y={Number(y) + offset[k]} dy={4} fontSize={CHART.tickFontSize} fill={CHART.label}>
                    {names[k].split(" ")[0]} {VALUE[unit](value)}
                  </text>
                ) : null
              }
            />
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
