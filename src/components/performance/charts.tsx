"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART, VIZ } from "@/lib/colors";

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const billions = (v: number) => `$${(v / 1000).toFixed(1)}B`;

/** A small key in ink-muted text: used only where direct labels would collide. */
export function Key({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Billings and bookings by quarter, $M. Both are Avnet: green and Avnet's second green. */
export function BillingsBookingsChart({ data }: { data: { quarter: string; billings: number; bookings: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(data.map((r) => String(r.quarter)), "quarter", { interval: 0 })}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}B`} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={CHART.tooltip}
          formatter={(v: number, name: string) => [billions(v), name === "billings" ? "Billings" : "Bookings"]}
        />
        <Bar dataKey="billings" fill={VIZ.avnet} isAnimationActive={false} />
        <Bar dataKey="bookings" fill={VIZ.avnet2} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Book-to-bill by quarter against a reference line at 1.0, where bookings equal billings. */
export function BookToBillChart({ data }: { data: { quarter: string; bookToBill: number }[] }) {
  const last = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 40, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <ReferenceLine
          y={1}
          stroke={VIZ.benchmark}
          strokeDasharray="4 4"
          label={{ value: "Bookings equal billings", position: "insideBottomRight", fontSize: 11, fill: CHART.tick }}
        />
        {fiscalXAxis(data.map((r) => String(r.quarter)), "quarter")}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={36} domain={[0.9, 1.15]} ticks={[0.9, 0.95, 1, 1.05, 1.1, 1.15]} tickFormatter={(v: number) => v.toFixed(2)} />
        <Tooltip contentStyle={CHART.tooltip} formatter={(v: number) => [v.toFixed(2), "Book-to-bill"]} />
        <Line dataKey="bookToBill" stroke={VIZ.avnet} strokeWidth={CHART.lineWidth} dot={false} activeDot={CHART.activeDot} isAnimationActive={false}>
          <LabelList
            dataKey="bookToBill"
            content={({ x, y, value, index }) =>
              index === last ? (
                <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill={CHART.label}>
                  {Number(value).toFixed(2)}
                </text>
              ) : null
            }
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Avnet's reported revenue by segment and quarter, $M, labelled at the line ends. */
export function SegmentRevenueChart({ data, series }: { data: Record<string, number | string | undefined>[]; series: { key: string; name: string; color: string }[] }) {
  const lastIndex = (key: string) => data.map((r) => r[key]).findLastIndex((v) => typeof v === "number");
  // Room for the longest end label ("Electronic Components $7.8B") at about 7px a character.
  const right = Math.max(...series.map((s) => (s.name.length + 7) * 7)) + 8;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(data.map((r) => String(r.label)), "label")}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={44} domain={[0, "auto"]} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}B`} />
        <Tooltip contentStyle={CHART.tooltip} formatter={(v: number, name: string) => [billions(v), name]} />
        {series.map((s) => {
          const end = lastIndex(s.key);
          return (
            <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={CHART.lineWidth} dot={false} activeDot={CHART.activeDot} connectNulls isAnimationActive={false}>
              <LabelList
                dataKey={s.key}
                content={({ x, y, value, index }) =>
                  index === end ? (
                    <text x={Number(x) + 8} y={Number(y) + 4} fontSize={12} fill={CHART.label}>
                      {`${s.name} ${billions(Number(value))}`}
                    </text>
                  ) : null
                }
              />
            </Line>
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
