import type PptxGenJS from "pptxgenjs";
import { plainDashes } from "@/lib/ai/dashes";
import { buildFromTemplate, type Para, type TemplateSlide } from "@/lib/brand/pptx/assemble";
import { chooseLayout, placeholder } from "@/lib/brand/pptx/layouts";
import { AVNET, VIZ } from "@/lib/colors";
import { AREA, barLabelWidth, barNameWidth, bulletsHeight, chartTitle, layoutPanels, PANEL_BULLETS, planSlide, SIDE, withChart, type Callout, type SlidePlan } from "./layout";
import type { Chart, Panel, Preview, SeriesWho } from "./outline";

// The deck's PowerPoint export (the Pitch Deck Builder and Add to deck): the
// previews on screen, written on the Avnet FY27 PowerPoint template
// (src/lib/brand/pptx), laid out by planSlide (./layout.ts) as the on-screen
// slide is. Each slide fills one of the template's layouts and its real
// placeholders: the cover; the headline with the takeaway as its subhead (or the
// headline alone) over a full-height chart, with the key figures or a compact
// table in a panel beside it; large-number tiles or a full table when there is
// no chart; a basic slide for lines; two columns for talking points; then the
// sources and the template's closing slide. Charts are native PowerPoint charts
// from the same figures as the preview. Server-only.

export interface DeckSlide {
  preview: Preview;
  /** Reads any mock source: the footer says "Mock data". */
  mock: boolean;
  kind?: "cover" | "content" | "sources";
}

const BODY = "Arial"; // the template's theme font, headings and body
const INK = AVNET.ink.slice(1);
const MUTED = "6B7075";
const LINE = "E3E5E8";
const PANEL = "F4F5F6";
const hex = (c: string) => c.replace("#", "");
const COLOR: Record<SeriesWho, string> = {
  avnet: hex(VIZ.avnet), // Avnet Green only ever means Avnet
  arrow: hex(VIZ.arrow),
  company: hex(AVNET.grayDark),
  market: hex(VIZ.benchmark),
};
const t = (s?: string) => plainDashes(s ?? "");

// The template's body levels: level 0 is a key statement (bold, green on most
// layouts), level 1 the supporting points with the template's green square
// bullets. Exports use those rather than their own styling.
const STATEMENT = 0;
const POINT = 1;
/** A key statement reads well bold; past this length a sentence is set as plain text instead. */
const SHORT = 120;

const LEFT = AREA.left;
const RIGHT = AREA.right;
const FOOT_Y = AREA.footer;
const BOTTOM = AREA.bottom;

type Box = { x: number; y: number; w: number; h: number };

function numberFormat(c: Chart): string {
  if (c.format === "pct") return "0.0%";
  if (c.format === "days") return "0";
  if (c.format === "eps") return "$0.00";
  if (c.format === "number") return Math.max(...c.series.flatMap((s) => s.points.map((p) => Math.abs(p.value)))) >= 100 ? "0" : "0.0";
  const max = Math.max(...c.series.flatMap((s) => s.points.map((p) => Math.abs(p.value))));
  // Three figures, as on screen: $412B, $77.2B, $1.62B, $850M.
  return max >= 1e12 ? '$#,##0.00,,,,"T"' : max >= 100e9 ? '$#,##0,,,"B"' : max >= 10e9 ? '$#,##0.0,,,"B"' : max >= 1e9 ? '$#,##0.00,,,"B"' : '$#,##0,,"M"';
}

/** The chart, filling its box: values labelled, or (two or more lines) a light value axis set to the data. */
function addChart(pptx: PptxGenJS, slide: PptxGenJS.Slide, c: Chart, box: Box, plan: Pick<SlidePlan, "labels" | "range">) {
  // A comparison (one value per company) is one series with a bar per company, as on screen:
  // each bar named on the axis and in its company's colour, Avnet first, no legend.
  const comparison = c.kind === "bar";
  const colorOf = (s: Chart["series"][number]) => (s.color ? hex(s.color) : COLOR[s.who]);
  const data = comparison
    ? [{ name: t(chartTitle(c) ?? "Value"), labels: c.series.map((s) => t(s.name)), values: c.series.map((s) => s.points[0]?.value ?? 0) }]
    : c.series.map((s) => ({ name: t(s.name), labels: s.points.map((p) => t(p.label)), values: s.points.map((p) => p.value) }));
  const axis = !plan.labels;
  // A comparison's longest bar stops short of the edge by its label's width, so the label isn't cut:
  // the value axis runs past the largest value by that share of the plot.
  const values = c.series.map((s) => s.points[0]?.value ?? 0);
  const plotW = box.w - barNameWidth(c);
  const room = comparison && plan.labels && !plan.range && Math.min(...values) >= 0 && plotW > 1 ? barLabelWidth(c) / plotW : 0;
  const headroom = room > 0 && room < 0.6 ? { valAxisMinVal: 0, valAxisMaxVal: Math.max(...values) / (1 - room) } : {};
  const wide = plan.range && plan.range.max - plan.range.min >= 0.2;
  slide.addChart(c.kind === "line" ? pptx.ChartType.line : pptx.ChartType.bar, data, {
    ...box,
    barDir: c.kind === "bar" ? "bar" : "col",
    // A comparison of two or three bars reads better slim.
    barGapWidthPct: c.kind === "bar" ? 140 : 55,
    chartColors: c.series.map(colorOf),
    // Horizontal bars list bottom up; reversed, the first company sits on top.
    // pptxgenjs writes "maxMin" as given, though its types list only "minMax".
    ...(comparison ? { catAxisOrientation: "maxMin" as unknown as "minMax" } : {}),
    lineSize: 2,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 6,
    showValue: plan.labels,
    dataLabelFormatCode: numberFormat(c),
    dataLabelFontFace: BODY,
    dataLabelFontSize: c.kind === "bar" ? 12 : 9,
    dataLabelFontBold: c.kind === "bar",
    dataLabelColor: INK,
    dataLabelPosition: c.kind === "line" ? "t" : "outEnd",
    valAxisHidden: !axis,
    valGridLine: axis ? { color: LINE, size: 0.75 } : { style: "none" },
    ...(axis ? { valAxisLabelFormatCode: c.format === "pct" ? (wide ? "0%" : "0.0%") : numberFormat(c), valAxisLabelFontSize: 9, valAxisLabelColor: MUTED, valAxisLabelFontFace: BODY, valAxisLineShow: false } : {}),
    ...(plan.range ? { valAxisMinVal: plan.range.min, valAxisMaxVal: plan.range.max } : headroom),
    catAxisLabelFontFace: BODY,
    catAxisLabelFontSize: c.kind === "bar" ? 11 : 9,
    catAxisLabelColor: c.kind === "bar" ? INK : MUTED,
    catAxisLineShow: c.kind !== "bar",
    catAxisLineColor: LINE,
    showLegend: !comparison && c.series.length > 1,
    legendPos: "b",
    legendFontFace: BODY,
    legendFontSize: 9,
  });
}

/** A compact table: headers in small bold grey over a black rule, rows on hairlines. */
function addTable(slide: PptxGenJS.Slide, table: NonNullable<SlidePlan["table"]>, box: { x: number; y: number; w: number; rowH?: number }, size: number) {
  const head = { fontFace: BODY, fontSize: size - 1.5, color: MUTED, bold: true };
  // Top, right, bottom, left: a hairline under each row only.
  const rule: [PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps, PptxGenJS.BorderProps] = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: LINE }, { type: "none" }];
  const headRule: typeof rule = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.75, color: INK }, { type: "none" }];
  const rows: PptxGenJS.TableRow[] = [];
  if (table.headers?.length)
    rows.push(
      table.headers.map((c, i) => ({
        text: t(c),
        options: { ...head, align: i ? ("right" as const) : ("left" as const), border: headRule },
      })),
    );
  for (const f of table.rows)
    rows.push([
      { text: t(f.label), options: { border: rule } },
      ...f.values.map((v) => ({ text: t(v), options: { align: "right" as const, color: v === "n/a" ? MUTED : INK, border: rule } })),
    ]);
  // The label column takes what it needs (about 40%); the values share the rest.
  const values = table.rows[0]?.values.length ?? 0;
  const labelW = values ? box.w * Math.max(0.34, Math.min(0.5, 1 - values * 0.2)) : box.w;
  const colW = [labelW, ...Array.from({ length: values }, () => (box.w - labelW) / values)];
  slide.addTable(rows, { x: box.x, y: box.y, w: box.w, colW, ...(box.rowH ? { rowH: box.rowH } : {}), fontFace: BODY, fontSize: size, color: INK, valign: "middle", margin: [0.04, 0.03, 0.04, 0.03], autoPage: false });
}

const bulletRuns = (lines: string[]) => lines.map((x) => ({ text: t(x), options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 4 } }));

/** The panel beside a chart: the key figures as large numbers, a compact table, any short lines. */
function addSide(slide: PptxGenJS.Slide, p: Preview, plan: SlidePlan, box: Box) {
  slide.addShape("rect", { ...box, fill: { color: PANEL }, line: { type: "none" } });
  const x = box.x + 0.16;
  const w = box.w - 0.32;
  let y = box.y + 0.12;
  if (plan.callouts.length) {
    slide.addText("KEY FIGURES", { x, y, w, h: 0.18, fontFace: BODY, fontSize: 8, bold: true, color: MUTED, charSpacing: 1, margin: 0 });
    y += 0.24;
    // Four figures fit the panel at a denser size.
    const dense = plan.callouts.length > 3;
    const valueH = dense ? 0.28 : 0.36;
    plan.callouts.forEach((c: Callout, i) => {
      if (i) slide.addShape("line", { x, y, w, h: 0, line: { color: LINE, width: 0.75 } });
      const top = y + (dense ? 0.05 : 0.08);
      slide.addText(t(c.value), { x, y: top, w, h: valueH, fontFace: BODY, fontSize: dense ? 17 : 22, bold: true, color: INK, margin: 0, valign: "top" });
      slide.addText(t(c.label), { x, y: top + valueH + 0.02, w, h: 0.17, fontFace: BODY, fontSize: dense ? 9 : 9.5, color: INK, margin: 0 });
      if (c.note) slide.addText(t(c.note), { x, y: top + valueH + 0.19, w, h: 0.15, fontFace: BODY, fontSize: 8, color: MUTED, margin: 0 });
      y = top + valueH + (c.note ? 0.4 : 0.24) + (dense ? 0.02 : 0.04);
    });
    y += 0.06;
  }
  if (plan.table) {
    addTable(slide, plan.table, { x, y, w, rowH: 0.36 }, 9.5);
    y += 0.36 * (plan.table.rows.length + (plan.table.headers ? 1 : 0)) + 0.15;
  }
  if (p.lines?.length && y < box.y + box.h - 0.3)
    slide.addText(bulletRuns(p.lines), { x, y, w, h: box.y + box.h - y - 0.1, fontFace: BODY, fontSize: 10, color: INK, valign: "top", margin: 0 });
}

/** Side-by-side panels: the shared layout's pieces as native shapes and text. */
function addPanels(slide: PptxGenJS.Slide, panels: Panel[], box: Box) {
  for (const it of layoutPanels(panels, box)) {
    if (it.kind === "seg") {
      // A line shape runs top left to bottom right; flipped, bottom left to top right.
      const rising = it.x2 > it.x1 !== it.y2 > it.y1;
      slide.addShape("line", {
        x: Math.min(it.x1, it.x2),
        y: Math.min(it.y1, it.y2),
        w: Math.max(0.001, Math.abs(it.x2 - it.x1)),
        h: Math.abs(it.y2 - it.y1),
        flipV: rising && it.y1 !== it.y2,
        line: { color: hex(it.color), width: it.width },
      });
      continue;
    }
    const at = { x: it.x, y: it.y, w: it.w, h: it.h };
    if (it.kind === "line") slide.addShape("line", { ...at, line: { color: hex(it.color), width: it.width, ...(it.dashed ? { dashType: "dash" as const } : {}) } });
    else if (it.kind === "dot")
      slide.addShape("ellipse", { ...at, fill: { color: hex(it.color), transparency: Math.round((1 - (it.opacity ?? 1)) * 100) }, line: { type: "none" } });
    else if (it.kind === "rect")
      slide.addShape("rect", { ...at, fill: { color: hex(it.color), transparency: Math.round((1 - (it.opacity ?? 1)) * 100) }, line: { type: "none" } });
    else if (it.kind === "pill")
      slide.addShape("roundRect", { ...at, rectRadius: it.h / 2, fill: { color: "FFFFFF" }, line: { color: hex(it.color), width: 0.75, ...(it.dashed ? { dashType: "dash" as const } : {}) } });
    else
      slide.addText(
        it.runs.map((r) => ({ text: t(r.text), options: { fontSize: Math.round(r.size * 10) / 10, bold: Boolean(r.bold), color: r.color ? hex(r.color) : INK } })),
        {
          ...at,
          fontFace: BODY,
          margin: 0,
          align: it.align ?? "left",
          valign: it.valign ?? "top",
          ...(it.spaced ? { charSpacing: 0.5 } : {}),
          ...(it.fill ? { fill: { color: hex(it.fill) } } : {}),
        },
      );
  }
}

/** Source, period and the Mock data tag, beside the template's slide number. */
function addFooter(slide: PptxGenJS.Slide, p: Preview, mock: boolean) {
  slide.addText(`Source: ${t(p.source)}${p.period ? `, ${t(p.period)}` : ""}`, { x: LEFT, y: FOOT_Y, w: mock ? 7.6 : 9, h: 0.2, fontFace: BODY, fontSize: 8, color: MUTED, valign: "middle", margin: 0 });
  if (mock)
    slide.addText("Mock data", {
      x: RIGHT - 1.0,
      y: FOOT_Y,
      w: 1.0,
      h: 0.2,
      fontFace: BODY,
      fontSize: 8,
      bold: true,
      color: INK,
      fill: { color: hex(AVNET.yellow) },
      align: "center",
      valign: "middle",
      margin: 0,
    });
}

/** Text Claude wrote, said so under the headline. */
function addClaude(slide: PptxGenJS.Slide, claude: Preview["claude"], y: number) {
  if (!claude) return;
  slide.addText(`${t(claude.label)}${claude.date ? `, ${t(claude.date)}` : ""}. Check before quoting.`, { x: LEFT, y, w: 8, h: 0.18, fontFace: BODY, fontSize: 8, italic: true, color: MUTED, margin: 0 });
}

/** Rough height of a sentence set at `size` points across `w` inches (Arial averages half an em). */
const textHeight = (s: string, size: number, w: number) => (Math.ceil((s.length * size * 0.5) / (w * 72)) * size * 1.25) / 72;

function cover(p: Preview): TemplateSlide {
  const l = chooseLayout("cover", p.headline);
  return {
    layout: l.n,
    fill: { title: [t(p.headline)], "11": [t(p.text)], "13": ["Prepared with the Avnet Market Intelligence Terminal"] },
    slideNumber: false,
  };
}

function sources(p: Preview): TemplateSlide {
  const l = chooseLayout("basic", p.headline);
  const paras: Para[] = [
    ...(p.text ? [{ text: t(p.text), level: STATEMENT, size: 12 }] : []),
    ...(p.lines ?? []).map((x) => ({ text: t(x), level: POINT, size: 10 })),
  ];
  return { layout: l.n, fill: { title: [t(p.headline)], "10": paras }, draw: (s) => addFooter(s, p, false) };
}

function talking(d: DeckSlide): TemplateSlide {
  const p = d.preview;
  const l = chooseLayout("two-column", p.headline);
  // Each column: its heading as the template's statement, the points as its bullets.
  const column = (g: { title: string; lines: string[] }): Para[] => [
    { text: t(g.title), level: STATEMENT, size: 14 },
    ...g.lines.map((x) => ({ text: t(x), level: POINT, size: 12, spaceAfter: 6 })),
  ];
  const [a, b] = p.groups!;
  return {
    layout: l.n,
    fill: { title: [t(p.headline)], "10": column(a), ...(b ? { "15": column(b) } : {}) },
    draw: (s) => {
      addClaude(s, p.claude, FOOT_Y - 0.24);
      addFooter(s, p, d.mock);
    },
  };
}

function textSlide(d: DeckSlide): TemplateSlide {
  const p = d.preview;
  const l = chooseLayout("basic", p.headline);
  const textOnly = !p.lines?.length;
  const text = t(p.text);
  // A short sentence is the slide's statement; a long one (what management said) is plain text.
  const lead: Para[] = !text
    ? []
    : text.length <= SHORT
      ? [{ text, level: STATEMENT, size: textOnly ? 20 : 14 }]
      : [{ text, level: POINT, bullet: false, size: textOnly ? 18 : 13, spaceAfter: 10 }];
  const paras: Para[] = [...lead, ...(p.lines ?? []).map((x) => ({ text: t(x), level: POINT, size: 13, spaceAfter: 4 }))];
  return {
    layout: l.n,
    fill: { title: [t(p.headline)], "10": paras },
    draw: (s) => {
      addClaude(s, p.claude, FOOT_Y - 0.24);
      addFooter(s, p, d.mock);
    },
  };
}

function content(d: DeckSlide): TemplateSlide {
  // A chart from the figures when the slide was saved without one, as on screen.
  const p = withChart(d.preview);
  const plan = planSlide(p);
  if (plan.kind === "groups") return talking(d);
  if (plan.kind === "text") return textSlide(d);

  // The headline, with the takeaway as its subhead; the headline alone when there is none.
  const sentence = t(p.text);
  const l = chooseLayout(sentence ? "subhead" : "title", p.headline);
  const title = placeholder(l, "title")!;
  const sub = placeholder(l, "11");
  let top = sentence && sub ? sub.y + textHeight(sentence, 14, sub.w) + 0.06 : title.y + title.h + 0.12;
  const claudeAt = top;
  if (p.claude) top += 0.22;
  top += 0.14;
  const h = BOTTOM - top;

  return {
    layout: l.n,
    // The takeaway in black: the layout's subhead style is bold green, which DESIGN.md keeps off white.
    fill: { title: [t(p.headline)], ...(sentence && sub ? { "11": [{ text: sentence, size: 14, bold: false, color: INK }] } : {}) },
    draw: (s, pptx) => {
      addClaude(s, p.claude, claudeAt);
      if (plan.kind === "panels" && p.panels) {
        // Claude's bullets, when there are any, in a strip under the panels.
        const w = RIGHT - LEFT;
        const strip = p.lines?.length ? bulletsHeight(p.lines, w) : 0;
        addPanels(s, p.panels, { x: LEFT, y: top, w, h: h - (strip ? strip + PANEL_BULLETS.gap : 0) });
        if (strip)
          s.addText(
            p.lines!.map((x) => ({ text: t(x), options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: PANEL_BULLETS.spaceAfter } })),
            { x: LEFT, y: BOTTOM - strip, w, h: strip, fontFace: BODY, fontSize: PANEL_BULLETS.size, color: INK, valign: "top", margin: 0 },
          );
      } else if (plan.kind === "chart" && p.chart) {
        const chartW = (plan.side ? RIGHT - plan.sideW - SIDE.gap : RIGHT) - LEFT;
        const label = chartTitle(p.chart);
        const labelH = label ? 0.24 : 0;
        if (label) s.addText(t(label), { x: LEFT, y: top, w: chartW, h: 0.2, fontFace: BODY, fontSize: 10, bold: true, color: INK, margin: 0 });
        addChart(pptx, s, p.chart, { x: LEFT - 0.08, y: top + labelH, w: chartW + 0.08, h: h - labelH }, plan);
        if (plan.side) addSide(s, p, plan, { x: RIGHT - plan.sideW, y: top, w: plan.sideW, h });
      } else if (plan.kind === "figures") {
        // Large-number tiles across the body, each under a short black rule; the lines below them.
        const n = plan.callouts.length;
        const gap = 0.3;
        const w = (RIGHT - LEFT - gap * (n - 1)) / n;
        const tileH = p.lines?.length ? 1.45 : Math.min(2.2, h);
        plan.callouts.forEach((c, i) => {
          const x = LEFT + i * (w + gap);
          s.addShape("line", { x, y: top + 0.1, w, h: 0, line: { color: INK, width: 2 } });
          s.addText(t(c.value), { x, y: top + 0.22, w, h: 0.7, fontFace: BODY, fontSize: 36, bold: true, color: INK, margin: 0, valign: "top", fit: "shrink" });
          s.addText(t(c.label), { x, y: top + 0.92, w, h: 0.45, fontFace: BODY, fontSize: 13, color: INK, margin: 0, valign: "top" });
        });
        if (p.lines?.length) s.addText(bulletRuns(p.lines), { x: LEFT, y: top + tileH + 0.2, w: RIGHT - LEFT, h: h - tileH - 0.2, fontFace: BODY, fontSize: 15, color: INK, valign: "top", margin: 0, paraSpaceAfter: 8 });
      } else if (plan.table) {
        // Rows spaced to use the body, within reason.
        const count = plan.table.rows.length + (plan.table.headers ? 1 : 0);
        const rowH = Math.max(0.32, Math.min(0.5, (h - (p.lines?.length ? 1 : 0)) / count));
        addTable(s, plan.table, { x: LEFT, y: top, w: RIGHT - LEFT, rowH }, 13);
        const used = rowH * count + 0.2;
        if (p.lines?.length && used < h - 0.4)
          s.addText(bulletRuns(p.lines), { x: LEFT, y: top + used, w: RIGHT - LEFT, h: h - used, fontFace: BODY, fontSize: 11, color: INK, valign: "top", margin: 0 });
      }
      addFooter(s, p, d.mock);
    },
  };
}

/** The deck as .pptx bytes, on the Avnet template: the slides given, then the template's closing slide. */
export async function buildDeck(title: string, slides: DeckSlide[]): Promise<Buffer> {
  const out: TemplateSlide[] = slides.map((d) => (d.kind === "cover" ? cover(d.preview) : d.kind === "sources" ? sources(d.preview) : content(d)));
  out.push({ layout: chooseLayout("closing").n, slideNumber: false });
  return buildFromTemplate(out, { title });
}
