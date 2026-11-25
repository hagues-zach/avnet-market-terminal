// A table's chart view as a slide (Add to deck, docs/design/deck-tray): one tab
// of the view becomes a Preview, the shape the Pitch Deck Builder exports. The
// tab's first pane with data is the chart, every series in the tab is a row of
// the figures table over the latest quarters, and the tab's takeaway is the
// sentence. Pure.

import type { Chart, Preview, SeriesWho } from "@/lib/deck/outline";
import { formatValue, seriesColor, type ChartData, type PaneSpec, type SeriesSpec, type TabSpec } from "./model";

/** Quarters on the slide's chart and in its figures. */
const CHART_PERIODS = 8;
const FACT_PERIODS = 4;

/** Whose colour a series takes on the slide: Avnet Green only ever means Avnet. */
function whoOf(s: SeriesSpec, company: string): SeriesWho {
  if (/^avnet\b/i.test(s.name)) return "avnet";
  if (/^arrow\b/i.test(s.name)) return "arrow";
  if (s.color === "company") return company === "avnet" ? "avnet" : company === "arrow" ? "arrow" : "company";
  return "market";
}

const hasData = (data: ChartData, s: SeriesSpec) => data.series[s.key]?.some((v) => v !== null) ?? false;
const valueOf = (data: ChartData, s: SeriesSpec, i: number) => {
  const v = data.series[s.key]?.[i];
  return v === null || v === undefined ? null : s.negate ? -v : v;
};

/** The chart's label: the pane's title, with its unit when the title doesn't give one. */
function paneTitle(pane: PaneSpec): string {
  if (/%|\$|points|days|,/.test(pane.title)) return pane.title;
  const unit = pane.unit === "usd" ? "$" : pane.unit === "pts" ? "points" : pane.unit === "growth" ? "% change" : pane.unit === "pct" ? "%" : "";
  return unit ? `${pane.title}, ${unit}` : pane.title;
}

/** The slide's chart from one pane: dollars, percentages, days or EPS. */
function paneChart(data: ChartData, pane: PaneSpec): Chart | undefined {
  const format: Chart["format"] = pane.unit === "pct" || pane.unit === "growth" || pane.unit === "pts" ? "pct" : pane.unit;
  const series = pane.series.filter((s) => hasData(data, s));
  if (!series.length) return undefined;
  // Only quarters every series reports, so the chart's categories line up.
  const idx = data.periods.map((_, i) => i).filter((i) => series.every((s) => valueOf(data, s, i) !== null));
  const shown = idx.slice(-CHART_PERIODS);
  if (!shown.length) return undefined;
  const bars = series.some((s) => s.mark === "bar");
  return {
    kind: shown.length === 1 ? "bar" : bars && (format === "usd" || format === "eps") ? "column" : "line",
    format,
    title: paneTitle(pane),
    series: series.map((s) => ({
      name: s.name,
      who: whoOf(s, data.company),
      // The colour the chart view gives it, so the slide matches the chart it came from.
      color: seriesColor(s.color, data.company, s.mark),
      points: shown.map((i) => ({ label: data.periods[i], value: valueOf(data, s, i)! })),
    })),
  };
}

/** The tab a slide is made from: the one asked for, else the first with data. */
export function slideTab(data: ChartData, tabId?: string): TabSpec | undefined {
  return data.tabs.find((t) => t.id === tabId) ?? data.tabs[0];
}

/** The slide's title: the view's subject and title, and the tab when the view has several. */
export function chartSlideTitle(data: ChartData, tab?: TabSpec): string {
  const subject = data.eyebrow.split(" · ")[0];
  const title = subject && !data.title.toLowerCase().startsWith(subject.toLowerCase()) ? `${subject}: ${data.title}` : data.title;
  return tab && data.tabs.length > 1 && tab.label !== data.title ? `${title}, ${tab.label.toLowerCase()}` : title;
}

export function chartViewToPreview(data: ChartData, tabId?: string): Preview {
  const tab = slideTab(data, tabId);
  const panes = tab?.panes ?? [];
  const chart = panes.map((p) => paneChart(data, p)).find(Boolean);

  // Figures: every series in the tab over the latest quarters that have anything.
  const rows = panes.flatMap((p) => p.series.filter((s) => hasData(data, s)).map((s) => ({ s, unit: p.unit })));
  const cols = data.periods
    .map((_, i) => i)
    .filter((i) => rows.some(({ s }) => valueOf(data, s, i) !== null))
    .slice(-FACT_PERIODS);
  // A series shown in two panes (rare) is listed once.
  const seen = new Set<string>();
  const facts = rows
    .filter(({ s }) => (seen.has(s.key) ? false : (seen.add(s.key), true)))
    .map(({ s, unit }) => ({ label: s.name, values: cols.map((i) => formatValue(unit, valueOf(data, s, i))) }))
    // A slide holds about a dozen rows.
    .slice(0, 12);

  return {
    headline: chartSlideTitle(data, tab),
    text: (tab && data.takeaways[tab.id]) || undefined,
    ...(facts.length && cols.length ? { columns: cols.map((i) => data.periods[i]), facts } : {}),
    ...(chart ? { chart } : {}),
    source: data.source,
    period: data.asOf ? `latest ${data.asOf}` : undefined,
    ...(data.hookups?.length ? { hookups: data.hookups } : {}),
  };
}
