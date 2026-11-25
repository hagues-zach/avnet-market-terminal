// The chart behind one row of the Market Share breakdown (a segment, supplier or
// region): Avnet's share of it by quarter. Pure.

import { describeSeries, type ChartData } from "./model";

export function shareChartData({
  view,
  name,
  history,
  periods,
  source,
  hookups,
}: {
  /** "Share by segment", "Share by supplier" or "Share by region". */
  view: string;
  name: string;
  history: number[];
  periods: string[];
  source: string;
  hookups?: string[];
}): ChartData {
  return {
    eyebrow: `${view} · Mock`,
    title: name,
    company: "avnet",
    periods,
    series: { share: history },
    tabs: [
      {
        id: "share",
        label: name,
        panes: [{ title: "Avnet share", unit: "pct", series: [{ key: "share", name: "Avnet share", mark: "line", color: "company" }] }],
      },
    ],
    takeaways: { share: describeSeries(`Avnet's share of ${name}`, "pct", history, periods) },
    source: `${source}. Quarters before the latest are modelled`,
    asOf: periods[periods.length - 1],
    hookups,
  };
}
