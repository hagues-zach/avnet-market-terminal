// The chart behind one row of the Avnet vs Arrow scorecard: both companies over
// the last eight calendar quarters they have both reported, and the gap between
// them in a pane below. Pure; built on the server, drawn in the drawer.

import { talkingPoint, type Kind, type ScoreRow } from "@/lib/competitive/compare";
import { formatValue, type ChartData, type Unit } from "./model";

const UNIT: Record<Kind, Unit> = { usd: "usd", pct: "pct", growth: "growth", days: "days" };
/** The gap is a plain difference: dollars, days, or points between two percentages. */
const GAP_UNIT: Record<Kind, Unit> = { usd: "usd", pct: "pts", growth: "pts", days: "days" };
/** The gap's unit in its pane title, since the drawer's compact figures drop it. */
const GAP_TITLE: Record<Kind, string> = { usd: "", pct: ", points", growth: ", points", days: ", days" };

export interface PairPoint {
  label: string;
  avnet?: number;
  arrow?: number;
}

/** The sentence above the chart: the scorecard's talking point when one side leads, else the two figures. */
export function scorecardTakeaway(row: ScoreRow, latest: string): string {
  if ((row.leads === "Avnet" || row.leads === "Arrow") && !row.caveat) return talkingPoint(row);
  const unit = UNIT[row.kind];
  const both = `${row.label} in ${latest}: Avnet ${formatValue(unit, row.avnet)}, Arrow ${formatValue(unit, row.arrow)}.`;
  if (row.caveat) return `${both} ${row.caveat}`;
  if (row.leads === "Even") return `${both} The two are level.`;
  return both;
}

export function scorecardChartData(row: ScoreRow, points: PairPoint[], latest: string): ChartData {
  const unit = UNIT[row.kind];
  const avnet = points.map((p) => p.avnet ?? null);
  const arrow = points.map((p) => p.arrow ?? null);
  const gap = points.map((p) => (p.avnet === undefined || p.arrow === undefined ? null : p.avnet - p.arrow));
  return {
    eyebrow: "Avnet vs Arrow · Scorecard",
    title: row.label,
    company: "avnet",
    periods: points.map((p) => p.label),
    series: { avnet, arrow, gap },
    tabs: [
      {
        id: "trend",
        label: row.label,
        panes: [
          {
            title: row.label,
            unit,
            weight: 3,
            series: [
              { key: "avnet", name: "Avnet", mark: "line", color: "company" },
              { key: "arrow", name: "Arrow", mark: "line", color: 0 },
            ],
          },
          // A gap between figures that can't be compared would mislead, so it is left out.
          ...(row.caveat
            ? []
            : [{ title: `Gap, Avnet minus Arrow${GAP_TITLE[row.kind]}`, unit: GAP_UNIT[row.kind], weight: 2, series: [{ key: "gap", name: "Gap", mark: "bar" as const, color: "muted" as const }] }]),
        ],
      },
    ],
    takeaways: { trend: scorecardTakeaway(row, latest) },
    source: "SEC filings, GAAP as reported",
    asOf: latest,
  };
}
