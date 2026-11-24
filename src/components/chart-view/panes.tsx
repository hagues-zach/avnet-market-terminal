"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fiscalXAxis } from "@/components/charts/fiscal-axis";
import { CHART } from "@/lib/colors";
import { formatAxis, formatValue, isLight, seriesColor, type ChartData, type PaneSpec, type SeriesSpec, type TabSpec } from "@/lib/chart-view/model";
import { cn } from "@/lib/utils";

// One tab of a chart view: single-axis panes stacked on one shared period axis,
// with one hover that moves through every pane together and a hover box listing
// every value for that period. Every pane has its own y-axis; only the last
// draws the quarter axis.
//
// The panes and the values table below them share one column grid: a label
// column of LABEL_COL px on the left (the y-axis sits at its right edge), then
// one equal column per period with nothing to the right. So each period's bars
// and points sit directly over that period's column in the table.

const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const AXIS_HEIGHT = 46; // fiscalXAxis: quarter row + year row
const Y_WIDTH = 56;
/** Width of the table's line-item column, and of the space left of each pane's plot. */
export const LABEL_COL = 184;

const valueAt = (data: ChartData, s: SeriesSpec, i: number) => {
  const v = data.series[s.key]?.[i];
  return v === null || v === undefined ? null : s.negate ? -v : v;
};

/** Every series in a tab once, with the unit of the pane it sits in. */
export function tabSeries(tab: TabSpec): { series: SeriesSpec; pane: PaneSpec }[] {
  const seen = new Set<string>();
  return tab.panes.flatMap((pane) =>
    pane.series.flatMap((series) => {
      if (seen.has(series.key)) return [];
      seen.add(series.key);
      return [{ series, pane }];
    }),
  );
}

/** A small swatch: a square for bars, a short rule for lines. */
export function Swatch({ series, company }: { series: SeriesSpec; company: string }) {
  const color = seriesColor(series.color, company, series.mark);
  if (series.mark === "bar") return <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: color }} aria-hidden />;
  return (
    <svg width="14" height="10" className="shrink-0" aria-hidden>
      <line x1="0" x2="14" y1="5" y2="5" stroke={color} strokeWidth={isLight(color) ? CHART.lineWidthLight : CHART.lineWidth} strokeDasharray={series.dashed ? "3 2" : undefined} />
    </svg>
  );
}

/** Every value of the tab for one period, shown while hovering the chart. */
function HoverBox({ data, tab, label }: { data: ChartData; tab: TabSpec; label?: string }) {
  const i = label === undefined ? -1 : data.periods.indexOf(label);
  if (i < 0) return null;
  return (
    <div className="min-w-56 rounded-sm border border-hairline bg-surface px-3 py-2 shadow-overlay">
      <p className="font-display text-label uppercase text-ink-muted">{label}</p>
      <dl className="mt-1 space-y-0.5">
        {tabSeries(tab).map(({ series, pane }) => (
          <div key={series.key} className="flex items-center gap-1.5 text-caption">
            <Swatch series={series} company={data.company} />
            <dt className="min-w-0 flex-1 truncate pr-3 text-ink-muted">{series.name}</dt>
            <dd className="tabular-nums text-ink">{formatValue(pane.unit, data.series[series.key]?.[i])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Pane({
  data,
  tab,
  pane,
  height,
  last,
  syncId,
  showBox,
  labelCol,
}: {
  data: ChartData;
  tab: TabSpec;
  pane: PaneSpec;
  height: number;
  last: boolean;
  syncId: string;
  labelCol: number;
  /** Only the hovered pane shows the hover box; the others show just the highlight. */
  showBox: boolean;
}) {
  const rows = data.periods.map((label, i) => ({ label, ...Object.fromEntries(pane.series.map((s) => [s.key, valueAt(data, s, i)])) }));
  const hasBars = pane.series.some((s) => s.mark === "bar");
  const hasNegative = pane.series.some((s) => data.periods.some((_, i) => (valueAt(data, s, i) ?? 0) < 0));
  const margin = { top: 10, right: 0, left: Math.max(0, labelCol - Y_WIDTH), bottom: 0 };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
        <span className="font-display text-label uppercase text-ink-muted">{pane.title}</span>
        {pane.series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-caption text-ink">
            <Swatch series={s} company={data.company} />
            {s.name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={margin} syncId={syncId} stackOffset={pane.stacked ? "sign" : undefined} barGap={2}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          {last ? fiscalXAxis(data.periods, "label") : <XAxis dataKey="label" hide />}
          <YAxis
            width={Y_WIDTH}
            tick={tick}
            axisLine={false}
            tickLine={false}
            tickCount={4}
            tickFormatter={(v: number) => formatAxis(pane.unit, v)}
            domain={hasBars ? undefined : ["auto", "auto"]}
          />
          <Tooltip
            content={({ label }) => (showBox ? <HoverBox data={data} tab={tab} label={label as string | undefined} /> : null)}
            cursor={{ fill: "rgba(0,0,0,0.04)", stroke: CHART.axis }}
            allowEscapeViewBox={{ x: false, y: true }}
            wrapperStyle={{ zIndex: 10, outline: "none" }}
            isAnimationActive={false}
          />
          {(hasBars || hasNegative) && <ReferenceLine y={0} stroke={CHART.tick} />}
          {/* A chart with a bar puts each quarter in a band, with its label and points in
              the middle. A line-only pane would use a point scale instead, spanning a
              different width, so it gets an invisible bar and every pane's quarters line up. */}
          {!hasBars && pane.series[0] && (
            <Bar dataKey={pane.series[0].key} fill="transparent" legendType="none" isAnimationActive={false} aria-hidden />
          )}
          {pane.series.map((s) => {
            const color = seriesColor(s.color, data.company, s.mark);
            return s.mark === "bar" ? (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={color}
                stackId={pane.stacked ? "stack" : undefined}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={isLight(color) ? CHART.lineWidthLight : CHART.lineWidth}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                dot={{ r: 2.5, fill: color, stroke: color }}
                activeDot={CHART.activeDot}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The panes of one tab, sharing one hover. `height` is the plotting height, shared by weight. */
export function StackedPanes({
  data,
  tab,
  height,
  syncId,
  labelCol = LABEL_COL,
}: {
  data: ChartData;
  tab: TabSpec;
  height: number;
  syncId: string;
  /** Must match the values table's labelCol so the columns line up. */
  labelCol?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = tab.panes.reduce((n, p) => n + (p.weight ?? 1), 0);
  return (
    <div className="space-y-3" onMouseLeave={() => setHovered(null)}>
      {tab.panes.map((pane, i) => {
        const last = i === tab.panes.length - 1;
        const h = Math.round((height * (pane.weight ?? 1)) / total) + (last ? AXIS_HEIGHT : 0);
        return (
          <div key={`${tab.id}-${i}`} onMouseEnter={() => setHovered(i)}>
            <Pane data={data} tab={tab} pane={pane} height={h} last={last} syncId={syncId} showBox={hovered === i} labelCol={labelCol} />
          </div>
        );
      })}
    </div>
  );
}

/** The exact figures behind the tab: one row per series, one column per period, latest in bold. */
export function ValuesTable({
  data,
  tab,
  labelCol = LABEL_COL,
  compact = false,
}: {
  data: ChartData;
  tab: TabSpec;
  /** Must match the panes' labelCol so the columns line up. */
  labelCol?: number;
  /** Narrow containers: smaller type and short period labels ("Q3 '26"). */
  compact?: boolean;
}) {
  const last = data.periods.length - 1;
  const short = (p: string) => p.replace(/^(?:FY|CY)(\d{2}) (Q\d)$/, "$2 '$1");
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full table-fixed border-collapse font-body", compact ? "text-caption" : "text-table")}>
        <caption className="sr-only">
          {data.title}, {tab.label}: the figures charted above
        </caption>
        <colgroup>
          <col style={{ width: labelCol }} />
          {data.periods.map((p) => (
            <col key={p} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="h-control px-2 text-left font-display text-label font-normal uppercase text-ink-muted">
              {compact ? <span className="sr-only">Line item</span> : "Line item"}
            </th>
            {data.periods.map((p, i) => (
              <th
                key={p}
                scope="col"
                title={compact ? p : undefined}
                className={cn("h-control whitespace-nowrap px-1 text-center font-display text-label font-normal uppercase", i === last ? "text-ink" : "text-ink-muted")}
              >
                {compact ? short(p) : p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabSeries(tab).map(({ series, pane }) => (
            <tr key={series.key} className="border-b border-hairline last:border-b-0">
              <th scope="row" className="truncate whitespace-nowrap px-2 py-1 text-left font-normal text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <Swatch series={series} company={data.company} />
                  {series.name}
                </span>
              </th>
              {data.periods.map((p, i) => (
                <td key={p} className={cn("whitespace-nowrap px-1 py-1 text-center tabular-nums text-ink", i === last && "font-semibold")}>
                  {/* Compact cells drop the unit word ("98", not "98 days"); the pane title names it. */}
                  {compact ? formatValue(pane.unit, data.series[series.key]?.[i]).replace(/ (days|pts)$/, "") : formatValue(pane.unit, data.series[series.key]?.[i])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The figures of one tab as CSV text, for download. */
export function tabCsv(data: ChartData, tab: TabSpec): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [["Line item", ...data.periods].map(esc).join(",")];
  for (const { series } of tabSeries(tab)) {
    lines.push([series.name, ...data.periods.map((_, i) => String(data.series[series.key]?.[i] ?? ""))].map(esc).join(","));
  }
  return `${lines.join("\n")}\n`;
}
