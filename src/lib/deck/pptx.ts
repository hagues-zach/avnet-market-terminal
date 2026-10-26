import type PptxGenJS from "pptxgenjs";
import { plainDashes } from "@/lib/ai/dashes";
import { buildFromTemplate, type Para, type TemplateSlide } from "@/lib/brand/pptx/assemble";
import { chooseLayout, placeholder } from "@/lib/brand/pptx/layouts";
import { AVNET, VIZ } from "@/lib/colors";
import type { Chart, Preview, SeriesWho } from "./outline";

// The Pitch Deck Builder's export (step 3.3): the previews on screen, written on
// the Avnet FY27 PowerPoint template (src/lib/brand/pptx). Each slide uses one
// of the template's layouts and fills its real placeholders: the cover, a title
// and subhead over a chart or the figures, a basic slide for lines, two columns
// for talking points, then the sources and the template's closing slide. Charts
// are native PowerPoint charts from the same figures as the preview. Server-only.

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

// The template's content area: the body placeholders sit 0.5 inches in and run to
// 9.5; the master's slide number sits at the foot on the left, so the footer runs
// beside it.
const LEFT = 0.5;
const RIGHT = 9.5;
const FOOT_Y = 5.27;
const BOTTOM = 5.12;

type Box = { x: number; y: number; w: number; h: number };

function numberFormat(c: Chart): string {
  if (c.format === "pct") return "0.0%";
  const max = Math.max(...c.series.flatMap((s) => s.points.map((p) => Math.abs(p.value))));
  return max >= 1e9 ? '$#,##0.00,,,"B"' : '$#,##0,,"M"';
}

function addChart(pptx: PptxGenJS, slide: PptxGenJS.Slide, c: Chart, box: Box) {
  const data = c.series.map((s) => ({ name: t(s.name), labels: s.points.map((p) => t(p.label)), values: s.points.map((p) => p.value) }));
  slide.addChart(c.kind === "line" ? pptx.ChartType.line : pptx.ChartType.bar, data, {
    ...box,
    barDir: c.kind === "bar" ? "bar" : "col",
    barGapWidthPct: 60,
    chartColors: c.series.map((s) => COLOR[s.who]),
    lineSize: 2,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 6,
    showValue: true,
    dataLabelFormatCode: numberFormat(c),
    dataLabelFontFace: BODY,
    dataLabelFontSize: 9,
    dataLabelColor: INK,
    dataLabelPosition: c.kind === "line" ? "t" : "outEnd",
    valAxisHidden: true,
    valGridLine: { style: "none" },
    catAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 9,
    catAxisLabelColor: MUTED,
    catAxisLineShow: c.kind !== "bar",
    showLegend: c.series.length > 1,
    legendPos: "b",
    legendFontFace: BODY,
    legendFontSize: 9,
  });
}

function addFacts(slide: PptxGenJS.Slide, p: Preview, box: { x: number; y: number; w: number }) {
  if (!p.facts?.length) return;
  const head = { fontFace: BODY, fontSize: 8, color: MUTED, bold: true };
  const rows: PptxGenJS.TableRow[] = [];
  if (p.columns?.length) {
    // Headers either name every column or only the value columns; line them up either way.
    const headers = p.columns.length === p.facts[0].values.length + 1 ? p.columns : ["", ...p.columns];
    rows.push(headers.map((c, i) => ({ text: t(c).toUpperCase(), options: { ...head, align: i ? ("right" as const) : ("left" as const) } })));
  }
  for (const f of p.facts)
    rows.push([
      { text: t(f.label), options: { color: MUTED } },
      ...f.values.map((v) => ({ text: t(v), options: { align: "right" as const, color: v === "n/a" ? MUTED : INK } })),
    ]);
  slide.addTable(rows, { ...box, fontFace: BODY, fontSize: 10, color: INK, border: { type: "solid", pt: 0.5, color: LINE }, margin: 0.05, autoPage: false });
}

/** Source, period and the Mock data tag, beside the template's slide number. */
function addFooter(slide: PptxGenJS.Slide, p: Preview, mock: boolean, claude?: Preview["claude"]) {
  if (claude)
    slide.addText(`${t(claude.label)}${claude.date ? `, ${t(claude.date)}` : ""}. Check before quoting.`, {
      x: LEFT,
      y: FOOT_Y - 0.24,
      w: 8,
      h: 0.2,
      fontFace: BODY,
      fontSize: 8,
      italic: true,
      color: MUTED,
      margin: 0,
    });
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

/** Rough height of a sentence set at `size` points across `w` inches (Arial averages half an em). */
const textHeight = (s: string, size: number, w: number) => Math.ceil((s.length * size * 0.5) / (w * 72)) * size * 1.25 / 72;

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
    draw: (s) => addFooter(s, p, d.mock, p.claude),
  };
}

function content(d: DeckSlide): TemplateSlide {
  const p = d.preview;
  if (p.groups?.length) return talking(d);
  // Lines or the sentence alone: a basic slide, the sentence then the lines as bullets.
  if (!p.chart && !p.facts?.length) {
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
    return { layout: l.n, fill: { title: [t(p.headline)], "10": paras }, draw: (s) => addFooter(s, p, d.mock, p.claude) };
  }
  // A chart or figures: the sentence in the subhead, the chart and the figures drawn below it.
  const l = chooseLayout("subhead", p.headline);
  const sub = placeholder(l, "11")!;
  const sentence = t(p.text);
  const top = sub.y + (sentence ? textHeight(sentence, 13, sub.w) : 0) + 0.25;
  const h = BOTTOM - (p.claude ? 0.25 : 0) - top;
  return {
    layout: l.n,
    fill: { title: [t(p.headline)], ...(sentence ? { "11": [{ text: sentence, size: 13 }] } : {}) },
    draw: (s, pptx) => {
      if (p.chart && p.facts?.length) {
        addChart(pptx, s, p.chart, { x: LEFT - 0.1, y: top, w: 5.2, h });
        addFacts(s, p, { x: 5.6, y: top + 0.05, w: RIGHT - 5.6 });
      } else if (p.chart) addChart(pptx, s, p.chart, { x: LEFT - 0.1, y: top, w: RIGHT - LEFT + 0.1, h });
      else addFacts(s, p, { x: LEFT, y: top, w: p.columns?.length ? RIGHT - LEFT : 6 });
      if (p.lines?.length)
        s.addText(
          p.lines.map((x) => ({ text: t(x), options: { bullet: true, breakLine: true } })),
          { x: LEFT, y: top + 0.32 * ((p.facts?.length ?? 0) + 1) + 0.1, w: RIGHT - LEFT, h: 1.2, fontFace: BODY, fontSize: 11, color: INK, valign: "top", margin: 0 },
        );
      addFooter(s, p, d.mock, p.claude);
    },
  };
}

/** The deck as .pptx bytes, on the Avnet template: the slides given, then the template's closing slide. */
export async function buildDeck(title: string, slides: DeckSlide[]): Promise<Buffer> {
  const out: TemplateSlide[] = slides.map((d) => (d.kind === "cover" ? cover(d.preview) : d.kind === "sources" ? sources(d.preview) : content(d)));
  out.push({ layout: chooseLayout("closing").n, slideNumber: false });
  return buildFromTemplate(out, { title });
}
