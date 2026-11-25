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

import { AVNET, VIZ } from "@/lib/colors";
import type { Chart, Panel, PanelTone, Preview, SeriesWho } from "./outline";

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
  kind: "chart" | "figures" | "table" | "text" | "groups" | "panels";
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

/* ---------- A chart from the figures ---------- */

/** A quarter as the app writes one: "FY27 Q1", "CY26 Q3" or "Q3 2026". */
const PERIOD = /^(?:(?:FY|CY)\d{2} Q[1-4]|Q[1-4] \d{4})$/;

/** A figure read back from how the app writes it, with its unit; undefined for anything else ("n/a", text, points). */
export function readFigure(s: string): { format: Chart["format"]; value: number } | undefined {
  const t = s.trim().replace(/−/g, "-");
  let m = t.match(/^([+-]?)(\d[\d,]*(?:\.\d+)?)%$/);
  if (m) return { format: "pct", value: (m[1] === "-" ? -1 : 1) * Number(m[2].replace(/,/g, "")) / 100 };
  m = t.match(/^([+-]?)(\d[\d,]*) days?$/);
  if (m) return { format: "days", value: (m[1] === "-" ? -1 : 1) * Number(m[2].replace(/,/g, "")) };
  m = t.match(/^([+-]?)\$(\d[\d,]*(?:\.\d+)?)([BM])$/);
  if (m) return { format: "usd", value: (m[1] === "-" ? -1 : 1) * Number(m[2].replace(/,/g, "")) * (m[3] === "B" ? 1e9 : 1e6) };
  m = t.match(/^([+-]?)\$(\d+\.\d{2})$/);
  if (m) return { format: "eps", value: (m[1] === "-" ? -1 : 1) * Number(m[2]) };
  return undefined;
}

/** Colours for series that aren't Avnet or Arrow, in the app's chart order (src/lib/chart-view/model.ts). */
const OTHERS = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.yellow];

/**
 * The chart a slide's figures make when the slide has none: quarters across
 * the columns, one series per row in the figures' most common unit (rows in
 * another unit, such as a gap in points, stay in the key figures). Slides saved
 * before a unit could be charted, or any table of quarters, become charts this
 * way. Undefined when the figures aren't quarters of one unit.
 */
export function chartFromFacts(p: Preview): Chart | undefined {
  const heads = valueHeaders(p);
  if (!heads || heads.length < 2 || !heads.every((h) => PERIOD.test(h.trim()))) return undefined;
  const rows = (p.facts ?? []).map((f) => ({ label: f.label, read: f.values.map(readFigure) }));
  const counts = new Map<Chart["format"], number>();
  for (const r of rows) {
    const f = r.read.find(Boolean)?.format;
    if (f && r.read.every((x) => !x || x.format === f)) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const format = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!format) return undefined;
  const kept = rows.filter((r) => r.read.some(Boolean) && r.read.every((x) => !x || x.format === format)).slice(0, 6);
  // Only quarters every kept row reports, so the categories line up.
  const cols = heads.map((_, i) => i).filter((i) => kept.every((r) => r.read[i]));
  if (cols.length < 2) return undefined;
  const arrow = kept.some((r) => /^arrow\b/i.test(r.label));
  let other = arrow ? 1 : 0;
  return {
    kind: kept.length === 1 && (format === "usd" || format === "eps") ? "column" : "line",
    format,
    series: kept.map((r) => {
      const who: SeriesWho = /^avnet\b/i.test(r.label) ? "avnet" : /^arrow\b/i.test(r.label) ? "arrow" : "market";
      return {
        name: r.label,
        who,
        ...(who === "market" ? { color: OTHERS[other++ % OTHERS.length] } : {}),
        points: cols.map((i) => ({ label: heads[i], value: r.read[i]!.value })),
      };
    }),
  };
}

/** The slide as it is drawn: its own chart, or one made from its figures. */
export const withChart = (p: Preview): Preview => (p.chart ? p : ((c) => (c ? { ...p, chart: c } : p))(chartFromFacts(p)));

/** A change as the page's Delta shows it: an arrow from its sign, then the change. "+1.2 pts" reads "↑ +1.2 pts". */
export const panelChange = (change: string): string =>
  `${/^\+/.test(change) ? "\u2191" : /^[-\u2212]/.test(change) ? "\u2193" : "\u2192"} ${change}`;

/** The gap between panels, in inches. */
export const PANEL_GAP = 0.28;

/** A run of text in a panel: its size in points, and black unless a colour is given. */
export interface PanelRun {
  text: string;
  size: number;
  bold?: boolean;
  color?: string;
}

/**
 * What a panels slide draws, in inches from the slide's top left, so the PowerPoint
 * file and the on-screen preview place every piece in the same spot.
 */
export type PanelItem =
  | { kind: "text"; x: number; y: number; w: number; h: number; runs: PanelRun[]; align?: "left" | "center" | "right"; valign?: "top" | "middle" | "bottom"; spaced?: boolean; fill?: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; opacity?: number }
  /** A hairline: horizontal when h is 0, vertical when w is 0. Width in points. */
  | { kind: "line"; x: number; y: number; w: number; h: number; color: string; width: number }
  /** A chip: a rounded outline, dashed on Mock. */
  | { kind: "pill"; x: number; y: number; w: number; h: number; color: string; dashed: boolean }
  /** A straight stroke from one point to another, for small line charts. Width in points. */
  | { kind: "seg"; x1: number; y1: number; x2: number; y2: number; color: string; width: number };

const PANEL_INK = { muted: "#6B7075", line: "#E3E5E8", good: "#138036", bad: "#D7263D" } as const;
const PANEL_TONE = { good: PANEL_INK.good, bad: PANEL_INK.bad, neutral: PANEL_INK.muted, plain: "#000000" } as const;

/** A change as runs: its arrow and value in its tone, then the period in grey. */
const changeRuns = (change: string | undefined, tone: PanelTone | undefined, period: string | undefined, size: number): PanelRun[] =>
  change ? [{ text: panelChange(change), size, color: PANEL_TONE[tone ?? "neutral"] }, ...(period ? [{ text: ` ${period}`, size, color: PANEL_INK.muted }] : [])] : [];

/** Panels at scale k (1 is full size), and how far the tallest runs past the box. */
function placePanels(panels: Panel[], box: { x: number; y: number; w: number; h: number }, k: number): { items: PanelItem[]; over: number } {
  const z = (n: number) => n * k;
  const n = Math.max(1, panels.length);
  const gap = PANEL_GAP;
  const w = (box.w - gap * (n - 1)) / n;
  const bottom = box.y + box.h;
  const lineCount = (s: string, size: number, cw = w) => Math.max(1, Math.ceil((s.length * size * 0.5) / (cw * 72)));
  const tall = (s: string, size: number, cw = w) => (lineCount(s, size, cw) * size * 1.25) / 72;
  const fits = (s: string, size: number) => s.length * size * 0.55 <= w * 72;
  // One size for every title and figure, and one height for the details, so the columns read as a row.
  const titleSize = [12, 11, 10, 9].map(z).find((sz) => panels.every((p) => !p.title || fits(p.title, sz))) ?? z(9);
  const figureSize = [26, 22, 18].map(z).find((sz) => panels.every((p) => !p.figure || fits(p.figure.value, sz * 0.95))) ?? z(18);
  const large = z(19);
  const small = z(11.5);
  const ch = z(7.5);
  const label = z(6.5);
  // A large measure's change sits beside it when every one fits; otherwise each goes on the line below, as the page wraps it.
  const inline = panels.every((p) =>
    (p.metrics ?? []).every((m) => !m.large || !m.change || m.value.length * large * 0.6 + 6 + `${m.change} ${m.period ?? ""}`.length * ch * 0.52 <= w * 72),
  );
  const detailH = Math.max(0, ...panels.map((p) => (p.detail ? tall(p.detail, z(8)) : 0)));
  const sparkH = panels.some((p) => p.spark && p.spark.values.length > 1) ? z(0.52) : 0;

  const items: PanelItem[] = [];
  const text = (x: number, y: number, cw: number, h: number, runs: PanelRun[], o: Partial<Extract<PanelItem, { kind: "text" }>> = {}) =>
    items.push({ kind: "text", x, y, w: cw, h, runs, ...o });
  const caps = (s: string, x: number, y: number, cw = w) => text(x, y, cw, label / 72 + 0.04, [{ text: s.toUpperCase(), size: label, bold: true, color: PANEL_INK.muted }], { spaced: true });
  const rule = (x: number, y: number, width = 0.75) => items.push({ kind: "line", x, y, w, h: 0, color: PANEL_INK.line, width });
  let over = -Infinity;

  panels.forEach((p, i) => {
    const x = box.x + i * (w + gap);
    if (i) items.push({ kind: "line", x: x - gap / 2, y: box.y, w: 0, h: box.h, color: PANEL_INK.line, width: 0.75 });
    let y = box.y;
    const tagW = p.tag ? Math.min(1.3, 0.16 + p.tag.length * 0.052) * k : 0;
    if (p.tag) {
      items.push({ kind: "pill", x: x + w - tagW, y, w: tagW, h: z(0.18), color: p.tagMock ? AVNET.yellow : PANEL_INK.line, dashed: Boolean(p.tagMock) });
      text(x + w - tagW, y, tagW, z(0.18), [{ text: p.tag, size: z(7) }], { align: "center", valign: "middle" });
    }
    if (p.kicker) {
      text(x, y, w - tagW - 0.05, z(0.18), [{ text: p.kicker.toUpperCase(), size: z(7.5), bold: true, color: PANEL_INK.muted }], { spaced: true, valign: "middle" });
      y += z(0.24);
    }
    if (p.title) {
      const h = (titleSize * 1.25) / 72;
      text(x, y, w - (p.kicker ? 0 : tagW + 0.05), h, [{ text: p.title, size: titleSize, bold: true }]);
      y += h + z(0.04);
    }
    if (detailH) {
      if (p.detail) text(x, y, w, detailH, [{ text: p.detail, size: z(8), color: PANEL_INK.muted }]);
      y += detailH + z(0.04);
    }
    if (p.figure) {
      text(x, y, w, (figureSize * 1.15) / 72, [{ text: p.figure.value, size: figureSize, bold: true }]);
      y += figureSize / 72 + z(0.12);
      if (p.figure.note || p.figure.change) {
        const h = tall(`${p.figure.note ?? ""} ${p.figure.change ?? ""} ${p.figure.period ?? ""}`, z(9.5));
        text(x, y, w, h, [...(p.figure.note ? [{ text: p.figure.note + (p.figure.change ? " " : ""), size: z(9.5) }] : []), ...changeRuns(p.figure.change, p.figure.tone, p.figure.period, z(8.5))]);
        y += h + z(0.04);
      }
      if (p.next) {
        // The funnel's chevron on the divider, level with the figure, as on the page.
        const cy = box.y + (p.kicker ? z(0.24) : 0) + figureSize / 144;
        text(x + w + gap / 2 - z(0.09), cy - z(0.11), z(0.18), z(0.22), [{ text: "›", size: z(16), color: PANEL_INK.muted }], { align: "center", valign: "middle", fill: "#FFFFFF" });
      }
    }
    for (const m of p.metrics ?? []) {
      rule(x, y + z(0.02));
      caps(m.label, x, y + z(0.06));
      const size = m.large ? large : small;
      const vh = (size * 1.2) / 72;
      const below = Boolean(m.large && m.change && !inline);
      text(x, y + z(0.19), w, vh, [{ text: m.value, size, bold: Boolean(m.large) }, ...(m.change && !below ? [{ text: "  ", size: ch }, ...changeRuns(m.change, m.tone, m.period, ch)] : [])], {
        valign: "bottom",
      });
      y += z(0.21) + vh;
      if (below) {
        text(x, y, w, z(0.14), changeRuns(m.change, m.tone, m.period, ch));
        y += z(0.15);
      }
    }
    if (p.bar) {
      y += z(0.1);
      items.push({ kind: "rect", x, y, w: Math.max(0.03, w * p.bar.share), h: z(0.1), color: p.bar.color });
      if (p.bar.label) text(x, y + z(0.14), w, z(0.18), [{ text: p.bar.label, size: z(8), color: PANEL_INK.muted }]);
      y += p.bar.label ? z(0.36) : z(0.18);
    }
    if (p.notes?.length) {
      rule(x, y + z(0.02));
      y += z(0.06);
      if (p.notesLabel) {
        caps(p.notesLabel, x, y);
        y += z(0.16);
      }
      p.notes.forEach((note, j) => {
        if (j) rule(x, y - z(0.02), 0.5);
        if (note.marker) items.push({ kind: "rect", x, y: y + z(0.045), w: z(0.08), h: z(0.08), color: note.marker });
        const at = note.marker ? z(0.13) : 0;
        text(x + at, y, w * 0.6 - at, z(0.17), [{ text: note.title, size: z(8.5), bold: true }]);
        if (note.value) text(x + w * 0.5, y, w * 0.5, z(0.17), [{ text: note.value, size: z(8.5) }], { align: "right" });
        y += z(0.16);
        if (note.text) {
          const h = tall(note.text, z(7));
          text(x, y, w, h, [{ text: note.text, size: z(7), color: PANEL_INK.muted }]);
          y += h + z(0.04);
        }
      });
    }
    if (p.rows?.length) {
      const linesW = p.rows.some((r) => r.lines?.length) ? z(1.15) : 0;
      const tw = w - (linesW ? linesW + z(0.2) : 0);
      p.rows.forEach((r, j) => {
        if (j && p.rowRules) {
          rule(x, y);
          y += z(0.14);
        }
        const top = y;
        const size = r.strong ? z(12) : z(9.5);
        const value = r.value ? [{ text: r.value, size: z(9.5) }, ...(r.change ? [{ text: "  ", size: z(8) }, ...changeRuns(r.change, r.tone, undefined, z(8.5))] : [])] : [];
        const valueW = value.length ? Math.min(tw * 0.6, (value.reduce((n, v) => n + v.text.length * v.size, 0) * 0.55) / 72 + 0.05) : 0;
        // The label wraps beside its value, as the page's does, and the row grows with it.
        const h = tall(r.title, r.strong ? size * 1.1 : size, tw - valueW - 0.05);
        text(x, y, tw - valueW - 0.05, h, [{ text: r.title, size, bold: Boolean(r.strong) }]);
        if (value.length) text(x + tw - valueW, y + (size - z(9.5)) / 72, valueW, (z(9.5) * 1.25) / 72, value, { align: "right" });
        y += h + z(0.03);
        if (r.markers?.length) {
          let mx = x;
          for (const m of r.markers) {
            items.push({ kind: "rect", x: mx, y: y + z(0.045), w: z(0.09), h: z(0.09), color: m.color });
            const mw = (m.text.length * z(9.5) * (m.strong ? 0.62 : 0.56)) / 72 + 0.1;
            text(mx + z(0.14), y + z(0.01), mw, z(0.19), [{ text: m.text, size: z(9.5), bold: Boolean(m.strong), color: m.strong ? undefined : PANEL_INK.muted }]);
            mx += z(0.14) + mw + z(0.2);
          }
          y += z(0.25);
        }
        if (r.text) {
          const th = tall(r.text, z(10), tw);
          text(x, y, tw, th, [{ text: r.text, size: z(10) }]);
          y += th + z(0.03);
        }
        if (r.bar) {
          items.push({ kind: "rect", x, y: y + z(0.01), w: Math.max(0.02, tw * r.bar.share), h: z(0.09), color: r.bar.color });
          y += z(0.14);
        }
        if (linesW && r.lines?.length) {
          // The page's pair spark: both lines on one scale, the last drawn on top.
          const all = r.lines.flatMap((l) => l.values.filter((v): v is number => v !== null));
          if (all.length > 1) {
            const lo = Math.min(...all);
            const span = Math.max(...all) - lo || 1;
            const n = Math.max(...r.lines.map((l) => l.values.length));
            const sx = x + w - linesW;
            const sh = z(0.5);
            const sy = top + z(0.04);
            for (const l of r.lines) {
              const pts = l.values.map((v, k) => (v === null ? null : { x: sx + (k / (n - 1 || 1)) * linesW, y: sy + sh - ((v - lo) / span) * sh }));
              for (let k = 1; k < pts.length; k++) {
                const a = pts[k - 1];
                const b = pts[k];
                if (a && b) items.push({ kind: "seg", x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: l.color, width: l.width ?? 1.5 });
              }
            }
          }
          y = Math.max(y, top + z(0.6));
        }
        y += p.rowRules ? z(0.06) : z(0.1);
      });
    }
    if (p.table?.rows.length) {
      const cols = p.table.columns;
      const first = cols.length > 1 ? w * 0.46 : w;
      const cw = cols.length > 1 ? (w - first) / (cols.length - 1) : 0;
      const colX = (c: number) => (c === 0 ? x : x + first + (c - 1) * cw);
      const rowH = z(0.21);
      y += z(0.04);
      cols.forEach((c, k) => text(colX(k), y, k ? cw : first, z(0.16), [{ text: c.toUpperCase(), size: label, bold: true, color: PANEL_INK.muted }], { spaced: true, align: k ? "right" : "left", valign: "bottom" }));
      y += z(0.18);
      rule(x, y);
      for (const row of p.table.rows) {
        text(colX(0), y + z(0.03), first - 0.05, rowH - z(0.03), [{ text: row.label, size: z(8.5) }], { valign: "middle" });
        row.cells.forEach((c, k) =>
          text(colX(k + 1), y + z(0.03), cw, rowH - z(0.03), typeof c === "string" ? [{ text: c, size: z(8.5) }] : changeRuns(c.change, c.tone, undefined, z(8.5)), {
            align: "right",
            valign: "middle",
          }),
        );
        y += rowH;
        rule(x, y, 0.5);
      }
      y += z(0.08);
    }
    if (p.bars && p.bars.values.some((v) => v !== null)) {
      const vals = p.bars.values;
      const max = Math.max(...vals.map((v) => v ?? 0)) || 1;
      const gapB = z(0.06);
      const bw = (w - gapB * (vals.length - 1)) / vals.length;
      const chartH = z(0.7);
      const base = y + z(0.16) + chartH;
      vals.forEach((v, k) => {
        const bx = x + k * (bw + gapB);
        if (v !== null) {
          const bh = Math.max(0.01, (v / max) * chartH);
          items.push({ kind: "rect", x: bx, y: base - bh, w: bw, h: bh, color: p.bars!.color });
          const vl = p.bars!.valueLabels?.[k];
          if (vl) text(bx - 0.1, base - bh - z(0.15), bw + 0.2, z(0.14), [{ text: vl, size: z(6.5), color: PANEL_INK.muted }], { align: "center", valign: "bottom" });
        }
        text(bx - 0.1, base + z(0.03), bw + 0.2, z(0.14), [{ text: p.bars!.labels[k] ?? "", size: z(6.5), color: PANEL_INK.muted }], { align: "center" });
      });
      rule(x, base, 0.5);
      y = base + z(0.22);
    }
    if (p.pairs?.length) {
      const per = 3;
      const cw = (w - z(0.2) * (per - 1)) / per;
      p.pairs.forEach((pr, k) => {
        const cx = x + (k % per) * (cw + z(0.2));
        const cy = y + Math.floor(k / per) * z(0.18);
        text(cx, cy, cw * 0.62, z(0.17), [{ text: pr.label, size: z(8) }]);
        text(cx + cw * 0.5, cy, cw * 0.5, z(0.17), [{ text: pr.value, size: z(8), color: PANEL_INK.muted }], { align: "right" });
      });
      y += Math.ceil(p.pairs.length / per) * z(0.18) + z(0.04);
    }
    if (sparkH && p.spark && p.spark.values.length > 1) {
      // Along the foot, as on the page: bars around a zero line, negatives below it, the latest solid.
      const top = Math.max(y + z(0.06), bottom - sparkH);
      rule(x, top);
      caps(p.spark.label, x, top + z(0.05));
      const vals = p.spark.values;
      const max = Math.max(0, ...vals);
      const min = Math.min(0, ...vals);
      const span = max - min || 1;
      const H = z(0.28);
      const zero = top + z(0.2) + (max / span) * H;
      const bw = (w - 0.02 * (vals.length - 1)) / vals.length;
      rule(x, zero, 0.5);
      vals.forEach((v, j) => {
        const h = Math.max(0.01, (Math.abs(v) / span) * H);
        items.push({ kind: "rect", x: x + j * (bw + 0.02), y: v >= 0 ? zero - h : zero, w: bw, h, color: p.spark!.color ?? VIZ.arrow, opacity: j === vals.length - 1 ? 1 : 0.45 });
      });
      over = Math.max(over, top + sparkH - bottom);
    } else over = Math.max(over, y - bottom);
  });
  return { items, over };
}

/**
 * Side-by-side panels, drawn as the page draws them: each column's title, detail,
 * measures under hairlines, share bar, notes and small bar chart along the foot.
 * When the tallest column will not fit, every column shrinks by the same amount
 * (to no less than 70%), so the row keeps one size.
 */
export function layoutPanels(panels: Panel[], box: { x: number; y: number; w: number; h: number }): PanelItem[] {
  let k = 1;
  let r = placePanels(panels, box, k);
  for (let i = 0; i < 4 && r.over > 0.005 && k > 0.7; i++) {
    k = Math.max(0.7, k * (box.h / (box.h + r.over)));
    r = placePanels(panels, box, k);
  }
  return r.items;
}

export function planSlide(p: Preview): SlidePlan {
  if (p.panels?.length) return { kind: "panels", side: false, sideW: 0, callouts: [], labels: true };
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
