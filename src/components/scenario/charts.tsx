"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART, VIZ } from "@/lib/colors";
import { money } from "@/lib/scenario/model";

// Scenario Modeler chart on the shared CHART tokens. Both lines are Avnet's own
// billings: the scenario in Avnet Green, holding share as Avnet's second
// series (Dark Green, dashed), each labelled at its end, pushed apart when close.

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };

export function HorizonChart({ rows, height = 240 }: { rows: { label: string; scenario: number; hold: number }[]; height?: number }) {
  const last = rows.length - 1;
  const a = rows[last].scenario;
  const b = rows[last].hold;
  const values = rows.flatMap((r) => [r.scenario, r.hold]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const px = ((a - b) / (hi - lo || 1)) * (height - 50);
  const apart = Math.abs(px) < 16 ? (16 - Math.abs(px)) / 2 : 0;
  const shift = { scenario: a >= b ? -apart : apart, hold: a >= b ? apart : -apart };
  const end = (label: string, key: "scenario" | "hold") =>
    function EndLabel({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: number | string }) {
      return index === last ? (
        <text x={Number(x) + 8} y={Number(y) + shift[key]} dy={4} fontSize={CHART.tickFontSize} fill={CHART.label}>
          {label} {money(Number(value))}
        </text>
      ) : null;
    };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 16, right: 150, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => String(r.label)), "label")}
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={[(min: number) => Math.floor(min / 1000) * 1000, (max: number) => Math.ceil(max / 1000) * 1000]}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}B`}
        />
        <Tooltip contentStyle={{ ...CHART.tooltip, padding: "6px 8px" }} formatter={(v: number, n: string) => [money(v), n]} />
        <Line
          dataKey="hold"
          name="Holding share (mock)"
          type="monotone"
          stroke={VIZ.avnet2}
          strokeWidth={CHART.lineWidth}
          strokeDasharray="5 4"
          dot={false}
          activeDot={CHART.activeDot}
          isAnimationActive={false}
        >
          <LabelList dataKey="hold" content={end("Holding share", "hold")} />
        </Line>
        <Line
          dataKey="scenario"
          name="Scenario (mock)"
          type="monotone"
          stroke={VIZ.avnet}
          strokeWidth={CHART.lineWidthLight}
          dot={false}
          activeDot={CHART.activeDot}
          isAnimationActive={false}
        >
          <LabelList dataKey="scenario" content={end("Scenario", "scenario")} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
