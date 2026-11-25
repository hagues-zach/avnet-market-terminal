// How a slide uses its space, decided once for the on-screen preview, the
// printed PDF and the PowerPoint file (src/lib/deck/pptx.ts), so all three
// agree. Pure.
//
// The rules, in the manner of a consulting deck:
// - The headline is the slide's point. The supporting sentence sits under it as
//   the takeaway.
// - A chart takes the full working height of the body, on the left. Beside it,
//   a narrow column carries the key figures as large numbers (the latest value
//   of each row and where it started), a compact table when the figures compare
//   things rather than quarters, and any short lines.
// - The chart is labelled, never both labelled and tabled: a table whose rows
//   are the chart's own series is not repeated; their values become data labels
//   (one series) or a light value axis (two or more lines, where labels collide),
//   and the latest values become key figures.
// - Nothing to put beside the chart: the chart takes the full width.
// - No chart: the figures are large-number tiles across the body, or a full-width
//   table when there are too many or they compare things.

import type { Chart, Preview } from "./outline";

/** The slide in inches: the FY27 template's 10 by 5.625. */
export const SLIDE = { w: 10, h: 5.625 } as const;
/** The template's content area: the title at 0.32 in, the body from 0.5 to 9.5, ending above the footer. */
export const AREA = { left: 0.5, right: 9.5, bottom: 5.12, footer: 5.27 } as const;
/** The column beside a chart (wider when it holds a table), and the gutter between them. */
export const SIDE = { w: 2.85, table: 3.4, gap: 0.35 } as const;

export const MAX_CALLOUTS = 4;
/** Tiles across a slide with no chart. */
export const MAX_TILES = 5;

export interface Callout {
  label: string;
  value: string;
  /** "CY26 Q3, from 7.8% in CY25 Q4". */
  note?: string;
}

export interface SlidePlan {
  kind: "chart" | "figures" | "table" | "text" | "groups";
  /** Something goes beside the chart; without it the chart takes the full width. */
  side: boolean;
  /** The side column's width in inches. */
  sideW: number;
  callouts: Callout[];
  /** A comparison table: beside the chart, or across the body with no chart. */
  table?: { headers?: string[]; rows: { label: string; values: string[] }[] };
  /** Data labels on every point, or a light value axis instead (two or more lines). */
  labels: boolean;
  /** The value axis for a line chart, set to its data rather than from zero. */
  range?: { min: number; max: number };
}

/** The value columns' headers: `columns` names either every column or only the values. */
function valueHeaders(p: Preview): string[] | undefined {
  const width = p.facts?.[0]?.values.length ?? 0;
  if (!p.columns?.length || !width) return undefined;
  return p.columns.length === width + 1 ? p.columns.slice(1) : p.columns;
}

function allHeaders(p: Preview): string[] | undefined {
  const width = (p.facts?.[0]?.values.length ?? 0) + 1;
  if (!p.columns?.length) return undefined;
  return p.columns.length === width ? p.columns : ["", ...p.columns];
}

/** A tidy axis range around the data: about a tenth of the span either side, on round steps. */
export function niceRange(values: number[]): { min: number; max: number } | undefined {
  if (!values.length) return undefined;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  // Rounded, so 7 steps of 0.05 reads 0.35 rather than 0.35000000000000003.
  const tidy = (x: number) => Number(x.toPrecision(12));
  const min = tidy(Math.floor((lo - span * 0.1) / step) * step);
  const max = tidy(Math.ceil((hi + span * 0.1) / step) * step);
  // Don't cross zero for data that doesn't.
  return { min: lo >= 0 && min < 0 ? 0 : min, max: hi <= 0 && max > 0 ? 0 : max };
}

/** What the chart measures: its own title, or for a one-period comparison the period's label ("Revenue growth on a year ago"). */
export const chartTitle = (c: Chart): string | undefined => c.title ?? (c.kind === "bar" ? c.series[0]?.points[0]?.label : undefined);

const isTimeSeries =(p: Preview, c: Chart) => {
  const heads = valueHeaders(p);
  const periods = new Set(c.series.flatMap((s) => s.points.map((x) => x.label)));
  return Boolean(heads?.length && heads.every((h) => periods.has(h)));
};

/** Each row's latest value as a key figure, with where it started when there's more than one quarter. */
function seriesCallouts(p: Preview): Callout[] {
  const heads = valueHeaders(p) ?? [];
  return (p.facts ?? []).flatMap((f) => {
    const i = f.values.findLastIndex((v) => v !== "n/a");
    if (i < 0) return [];
    const first = f.values.findIndex((v) => v !== "n/a");
    const from = first >= 0 && first < i ? `, from ${f.values[first]} in ${heads[first]}` : "";
    return [{ label: f.label, value: f.values[i], note: heads[i] ? `${heads[i]}${from}` : undefined }];
  });
}

/** One value per row: each row is a key figure as it stands. */
const singleCallouts = (p: Preview): Callout[] => (p.facts ?? []).map((f) => ({ label: f.label, value: f.values[0] ?? "n/a", note: p.period }));

const tableOf = (p: Preview): SlidePlan["table"] => (p.facts?.length ? { headers: allHeaders(p), rows: p.facts } : undefined);

export function planSlide(p: Preview): SlidePlan {
  if (p.groups?.length) return { kind: "groups", side: false, sideW: 0, callouts: [], labels: true };
  const single = (p.facts ?? []).every((f) => f.values.length === 1);
  const c = p.chart;

  if (c) {
    const lines = c.kind === "line" && c.series.length > 1;
    const range = c.kind === "line" ? niceRange(c.series.flatMap((s) => s.points.map((x) => x.value))) : undefined;
    let callouts: Callout[] = [];
    let table: SlidePlan["table"];
    if (p.facts?.length) {
      if (isTimeSeries(p, c)) callouts = seriesCallouts(p);
      else if (single) callouts = singleCallouts(p);
      else table = tableOf(p);
      // Too many figures to read as large numbers: a compact table instead.
      if (callouts.length > MAX_CALLOUTS) {
        callouts = [];
        table = tableOf(p);
      }
    }
    const side = callouts.length > 0 || Boolean(table) || Boolean(p.lines?.length);
    return { kind: "chart", side, sideW: table ? SIDE.table : SIDE.w, callouts, table, labels: !lines, range };
  }

  if (p.facts?.length) {
    if (single && p.facts.length <= MAX_TILES && !p.columns?.length) return { kind: "figures", side: false, sideW: 0, callouts: singleCallouts(p), labels: true };
    return { kind: "table", side: false, sideW: 0, callouts: [], table: tableOf(p), labels: true };
  }
  return { kind: "text", side: false, sideW: 0, callouts: [], labels: true };
}
