"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART, VIZ } from "@/lib/colors";

// Design Pipeline charts on the shared CHART tokens. Both series are Avnet's
// own: the pipeline in Avnet Green, design-approved billings as Avnet's second
// series (Dark Green, dashed), indexed and labelled at the line end.

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };

/**
 * Both series indexed to 100 in the first quarter, so the lead shows: the
 * pipeline turns up before billings do. The dollar values are in the tooltip.
 */
export function PipelineTrend({ rows, height = 250 }: { rows: { quarter: string; pipeline: number; designBillings: number }[]; height?: number }) {
  const base = rows[0];
  const data = rows.map((r) => ({
    ...r,
    pipelineIdx: (r.pipeline / base.pipeline) * 100,
    billingsIdx: (r.designBillings / base.designBillings) * 100,
  }));
  const last = data.length - 1;
  const a = data[last].pipelineIdx;
  const b = data[last].billingsIdx;
  const values = data.flatMap((r) => [r.pipelineIdx, r.billingsIdx]);
  const px = ((a - b) / (Math.max(...values) - Math.min(...values) || 1)) * (height - 50);
  const apart = Math.abs(px) < 14 ? (14 - Math.abs(px)) / 2 : 0;
  const shift = { pipelineIdx: a >= b ? -apart : apart, billingsIdx: a >= b ? apart : -apart };
  const end = (label: string, key: "pipelineIdx" | "billingsIdx") =>
    function EndLabel({ x, y, index, value }: { x?: number | string; y?: number | string; index?: number; value?: number | string }) {
      return index === last ? (
        <text x={Number(x) + 8} y={Number(y) + shift[key]} dy={4} fontSize={CHART.tickFontSize} fill={CHART.label}>
          {label} {Math.round(Number(value))}
        </text>
      ) : null;
    };
  const dollars = (key: "pipelineIdx" | "billingsIdx", q: string) => {
    const r = rows.find((x) => x.quarter === q)!;
    return key === "pipelineIdx" ? r.pipeline : r.designBillings;
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 16, right: 140, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(data.map((r) => String(r.quarter)), "quarter")}
        <YAxis
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={36}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => String(Math.round(v))}
        />
        <Tooltip
          contentStyle={{ ...CHART.tooltip, padding: "6px 8px" }}
          formatter={(v: number, n: string, item: { dataKey?: string | number; payload?: { quarter: string } }) => [
            `${Math.round(v)} (${fmt(dollars(item.dataKey as "pipelineIdx" | "billingsIdx", item.payload!.quarter))})`,
            n,
          ]}
        />
        <Line
          dataKey="pipelineIdx"
          name="Approved pipeline (mock)"
          type="monotone"
          stroke={VIZ.avnet}
          strokeWidth={CHART.lineWidthLight}
          dot={false}
          activeDot={CHART.activeDot}
          isAnimationActive={false}
        >
          <LabelList dataKey="pipelineIdx" content={end("Pipeline", "pipelineIdx")} />
        </Line>
        <Line
          dataKey="billingsIdx"
          name="Design-approved billings (mock)"
          type="monotone"
          stroke={VIZ.avnet2}
          strokeWidth={CHART.lineWidth}
          strokeDasharray="5 4"
          dot={false}
          activeDot={CHART.activeDot}
          isAnimationActive={false}
        >
          <LabelList dataKey="billingsIdx" content={end("Billings", "billingsIdx")} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

const fmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
