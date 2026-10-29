import type { ComponentProps, ReactElement } from "react";
import { XAxis } from "recharts";
import { CHART } from "@/lib/colors";

// A two-level x-axis for quarters: the quarter under each bar or point, the
// fiscal or calendar year centred under its quarters, hairline dividers between
// years through both rows. Used only when every label reads like "FY26 Q2" or
// every label like "CY26 Q2"; anything else (months, years) keeps the plain axis.
//
// Recharts reads its axes from the chart's direct children, so this returns the
// axis elements as children rather than a component: {fiscalXAxis(...)}.

const QUARTER = /^(FY|CY)\d{2} Q[1-4]$/;
const tick = { fontSize: CHART.tickFontSize, fill: CHART.tick };
const QUARTER_HEIGHT = 22;
const YEAR_HEIGHT = 24;

type Group = { fy: string; start: boolean; size: number };

const groupsOf = (labels: string[]): Group[] =>
  labels.map((label, i) => {
    const fy = label.slice(0, 4);
    const start = i === 0 || labels[i - 1].slice(0, 4) !== fy;
    let size = 0;
    while (start && labels[i + size]?.slice(0, 4) === fy) size++;
    return { fy, start, size };
  });

type TickProps = { x: number; y: number; width: number; payload: { index: number; offset: number } };

function YearTick({ x, y, width: axisWidth, payload, groups, quarterHeight }: TickProps & { groups: Group[]; quarterHeight: number }) {
  const g = groups[payload.index];
  if (!g?.start) return null;
  const n = groups.length;
  // Bars sit on a band scale (offset is half a band); lines on a point scale,
  // where the step is the axis width over the gaps between points.
  const band = payload.offset > 0;
  const step = band ? payload.offset * 2 : n > 1 ? axisWidth / (n - 1) : axisWidth;
  const first = payload.index === 0;
  const lastIndex = payload.index + g.size - 1;
  const left = band || !first ? x - step / 2 : x;
  const right = x + (g.size - 1) * step + (band || lastIndex < n - 1 ? step / 2 : 0);
  const label = right - left < 34 ? `'${g.fy.slice(2)}` : g.fy;
  const divider = x - step / 2;
  return (
    <g>
      {!first && <line x1={divider} x2={divider} y1={y - quarterHeight - 8} y2={y + 16} stroke={CHART.axis} />}
      <text x={(left + right) / 2} y={y} dy={10} textAnchor="middle" fontSize={CHART.tickFontSize} fontWeight={600} fill={CHART.label}>
        {label}
      </text>
    </g>
  );
}

type QuarterTickProps = { x: number; y: number; payload: { value: string; index: number } };

/**
 * The x-axis for a chart keyed by quarter label. Quarter labels get the quarter
 * and year rows; anything else gets the plain axis with `plain` applied.
 * `quarterTick` replaces the quarter row's label (it gets the full label as
 * payload.value) with `quarterHeight` room.
 */
export function fiscalXAxis(
  labels: string[],
  dataKey: string,
  plain: Partial<ComponentProps<typeof XAxis>> = {},
  { quarterTick, quarterHeight = QUARTER_HEIGHT }: { quarterTick?: (props: QuarterTickProps) => ReactElement<SVGElement>; quarterHeight?: number } = {},
): ReactElement[] {
  const kind = labels[0]?.slice(0, 2);
  if (labels.length === 0 || !labels.every((l) => QUARTER.test(l) && l.startsWith(kind))) {
    return [<XAxis key="x" dataKey={dataKey} tick={tick} axisLine={{ stroke: CHART.axis }} tickLine={false} interval="preserveStartEnd" {...plain} />];
  }
  const groups = groupsOf(labels);
  return [
    <XAxis
      key="x"
      dataKey={dataKey}
      tickFormatter={(v: string) => v.slice(5)}
      tick={quarterTick ?? tick}
      axisLine={{ stroke: CHART.axis }}
      tickLine={false}
      interval={0}
      height={quarterHeight}
    />,
    <XAxis
      key="fy"
      xAxisId="fy"
      dataKey={dataKey}
      axisLine={false}
      tickLine={false}
      interval={0}
      height={YEAR_HEIGHT}
      tick={(props: TickProps) => <YearTick {...props} groups={groups} quarterHeight={quarterHeight} />}
    />,
  ];
}
