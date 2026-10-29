"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { endLabels } from "@/components/charts/end-labels";
import { CHART, VIZ } from "@/lib/colors";
import { formatUsdMillions } from "@/lib/format";

// Market Cycle charts, on the shared CHART tokens: solid horizontal gridlines,
// 2px tooltips, values and labels in ink, never in the series colour. Nothing
// here is Avnet except the order book, so only that chart uses Avnet Green.

const MARGIN = { top: 20, right: 12, left: 4, bottom: 0 };
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const TOOLTIP = { ...CHART.tooltip, padding: "6px 8px" };
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;

/**
 * With fill, the chart grows to the space its panel leaves (height becomes the
 * minimum), so a chart beside a taller panel fills the row instead of leaving a
 * gap above the footer. The absolute inner box keeps the chart from feeding its
 * own size back into the row height. The panel body needs bodyClassName="flex flex-col".
 */
function Frame({ fill, height, children }: { fill?: boolean; height: number; children: React.ReactElement }) {
  if (!fill) return <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>;
  return (
    <div className="relative flex-1" style={{ minHeight: height }}>
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function Empty({ height }: { height: number }) {
  return (
    <p className="flex items-center justify-center text-body-sm text-ink-muted" style={{ height }}>
      Not enough companies have reported to show this yet.
    </p>
  );
}

/** Supply-chain growth by quarter, one colour, with each quarter's phase written under its label. */
export function GrowthBars({
  rows,
  height = 260,
  fill,
}: {
  rows: { label: string; growth?: number; phase: string | null }[];
  height?: number;
  fill?: boolean;
}) {
  if (!rows.some((r) => r.growth !== undefined)) return <Empty height={height} />;
  const byLabel = new Map(rows.map((r) => [r.label, r.phase]));
  return (
    <Frame fill={fill} height={height}>
      <BarChart data={rows} margin={{ ...MARGIN, bottom: 18 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => r.label), "label", {}, {
          quarterHeight: 36,
          quarterTick: ({ x, y, payload }) => {
            const phase = byLabel.get(payload.value);
            return (
              <g transform={`translate(${x},${y})`}>
                <text dy={12} textAnchor="middle" fontSize={CHART.tickFontSize} fill={CHART.label}>
                  {payload.value.slice(5)}
                </text>
                {/* The bar's sign already says expansion or contraction; the word under it says which way it is moving. */}
                {phase && (
                  <text dy={26} textAnchor="middle" fontSize={10} fill={CHART.tick}>
                    {phase.split(", ")[1].replace(/^./, (c) => c.toUpperCase())}
                  </text>
                )}
              </g>
            );
          },
        })}
        <YAxis tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={tick} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={TOOLTIP}
          formatter={(v: number) => [pct(v), "Supply-chain revenue, YoY"]}
          labelFormatter={(l: string) => `${l}${byLabel.get(l) ? `, ${byLabel.get(l)}` : ""}`}
        />
        <ReferenceLine y={0} stroke={CHART.tick} />
        <Bar dataKey="growth" fill={VIZ.arrow} maxBarSize={40} isAnimationActive={false}>
          <LabelList dataKey="growth" position="top" formatter={(v: number) => pct(v)} style={{ fontSize: CHART.tickFontSize, fill: CHART.label }} />
        </Bar>
      </BarChart>
    </Frame>
  );
}

const LINE_COLORS = [VIZ.arrow, VIZ.orange, VIZ.blueLight] as const;

/** Up to three groups' median inventory days, labelled at the end of each line instead of a legend. */
export function InventoryLines({
  rows,
  series,
  short = {},
  height = 240,
  fill,
}: {
  rows: ({ label: string } & Record<string, number | string | undefined>)[];
  series: string[];
  /** Shorter names for the end-of-line labels. */
  short?: Record<string, string>;
  height?: number;
  fill?: boolean;
}) {
  if (!rows.some((r) => series.some((s) => typeof r[s] === "number"))) return <Empty height={height} />;
  return (
    <Frame fill={fill} height={height}>
      <LineChart data={rows} margin={{ ...MARGIN, right: 124 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => String(r.label)), "label")}
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v)}d`}
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={40}
          domain={["auto", "auto"]}
        />
        <Tooltip contentStyle={TOOLTIP} formatter={(v: number, n: string) => [`${Math.round(v)} days`, n]} />
        {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={LINE_COLORS[i]}
              strokeWidth={LINE_COLORS[i] === VIZ.blueLight ? CHART.lineWidthLight : CHART.lineWidth}
              dot={false}
              activeDot={CHART.activeDot}
              connectNulls
              isAnimationActive={false}
            />
        ))}
        {endLabels((s, v) => `${short[s] ?? s} ${Math.round(v)}d`)}
      </LineChart>
    </Frame>
  );
}

/** Combined hyperscaler capex by quarter. */
export function CapexBars({ rows, height = 150 }: { rows: { label: string; capex?: number }[]; height?: number }) {
  if (!rows.some((r) => r.capex !== undefined)) return <Empty height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => String(r.label)), "label")}
        <YAxis tickFormatter={(v: number) => formatUsdMillions(v / 1e6)} tick={tick} axisLine={false} tickLine={false} width={52} />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={TOOLTIP}
          formatter={(v: number) => [formatUsdMillions(v / 1e6, { precise: true }), "Combined capex"]}
        />
        <Bar dataKey="capex" fill={VIZ.benchmark} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Avnet's book-to-bill (mock) against parity. */
export function BookToBill({ rows, height = 150 }: { rows: { quarter: string; bookToBill: number }[]; height?: number }) {
  const last = rows.length - 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 16, right: 28, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        {fiscalXAxis(rows.map((r) => String(r.quarter)), "quarter")}
        <YAxis tick={tick} axisLine={false} tickLine={false} width={36} domain={[0.9, "auto"]} tickFormatter={(v: number) => v.toFixed(2)} />
        <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [v.toFixed(2), "Book-to-bill (mock)"]} />
        <ReferenceLine
          y={1}
          stroke={CHART.tick}
          strokeDasharray="4 3"
          label={{ value: "1.0", position: "insideTopLeft", fontSize: 10, fill: CHART.tick }}
        />
        <Line
          type="monotone"
          dataKey="bookToBill"
          stroke={VIZ.avnet}
          strokeWidth={CHART.lineWidthLight}
          dot={false}
          activeDot={CHART.activeDot}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="bookToBill"
            content={({ x, y, index, value }) =>
              index === last ? (
                <text x={Number(x)} y={Number(y)} dy={-8} textAnchor="middle" fontSize={CHART.tickFontSize} fontWeight={600} fill={CHART.label}>
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
