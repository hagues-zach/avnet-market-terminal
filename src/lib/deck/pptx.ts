import { promises as fs } from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { plainDashes } from "@/lib/ai/dashes";
import { AVNET, VIZ } from "@/lib/colors";
import type { Chart, Preview, SeriesWho } from "./outline";

// The Pitch Deck Builder's export (step 3.3): the previews on screen, written as an
// editable PowerPoint. The Avnet layouts are drawn here rather than taken from the
// old template, whose masters still carry the slash mark the brand kit dropped.
// Charts are native PowerPoint charts from the same figures as the preview, so a
// seller can restyle them and the numbers sit in the chart's own data sheet.
// Server-only.

export interface DeckSlide {
  preview: Preview;
  /** Reads any mock source: the footer says "Mock data". */
  mock: boolean;
  kind?: "cover" | "content" | "sources";
}

const W = 13.333; // LAYOUT_WIDE, inches
const X = 0.6;
const HEAD = "Arial Narrow";
const BODY = "Arial";
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
/** Every string the deck shows goes through the app's no-dash rule. */
const t = (s?: string) => plainDashes(s ?? "");

async function logoData(): Promise<string> {
  const png = await fs.readFile(path.join(process.cwd(), "public", "avnet-logo.png"));
  return `image/png;base64,${png.toString("base64")}`;
}
const LOGO_RATIO = 411 / 1872;

function numberFormat(c: Chart): string {
  if (c.format === "pct") return "0.0%";
  const max = Math.max(...c.series.flatMap((s) => s.points.map((p) => Math.abs(p.value))));
  return max >= 1e9 ? '$#,##0.00,,,"B"' : '$#,##0,,"M"';
}

function addChart(pptx: PptxGenJS, slide: PptxGenJS.Slide, c: Chart, box: { x: number; y: number; w: number; h: number }) {
  const data = c.series.map((s) => ({ name: t(s.name), labels: s.points.map((p) => t(p.label)), values: s.points.map((p) => p.value) }));
  const type = c.kind === "line" ? pptx.ChartType.line : pptx.ChartType.bar;
  slide.addChart(type, data, {
    ...box,
    barDir: c.kind === "bar" ? "bar" : "col",
    barGapWidthPct: 60,
    chartColors: c.series.map((s) => COLOR[s.who]),
    lineSize: 2.5,
    lineDataSymbol: "circle",
    lineDataSymbolSize: 7,
    showValue: true,
    dataLabelFormatCode: numberFormat(c),
    dataLabelFontFace: BODY,
    dataLabelFontSize: 10,
    dataLabelColor: INK,
    dataLabelPosition: c.kind === "line" ? "t" : "outEnd",
    valAxisHidden: true,
    valGridLine: { style: "none" },
    catAxisLabelFontFace: BODY,
    catAxisLabelFontSize: 10,
    catAxisLabelColor: MUTED,
    catAxisLineShow: c.kind !== "bar",
    showLegend: c.series.length > 1,
    legendPos: "b",
    legendFontFace: BODY,
    legendFontSize: 10,
  });
}

function addFacts(slide: PptxGenJS.Slide, p: Preview, box: { x: number; y: number; w: number }) {
  if (!p.facts?.length) return;
  const head = { fontFace: HEAD, fontSize: 11, color: MUTED, bold: false };
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
  slide.addTable(rows, {
    ...box,
    fontFace: BODY,
    fontSize: 12,
    color: INK,
    border: { type: "solid", pt: 0.75, color: LINE },
    margin: 0.06,
    autoPage: false,
  });
}

function addFooter(slide: PptxGenJS.Slide, p: Preview, mock: boolean) {
  slide.addShape("line", { x: X, y: 6.85, w: W - 2 * X, h: 0, line: { color: LINE, width: 0.75 } });
  const where = `Source: ${t(p.source)}${p.period ? `, ${t(p.period)}` : ""}`;
  slide.addText(where, { x: X, y: 6.92, w: mock ? 8.6 : 10, h: 0.35, fontFace: BODY, fontSize: 9, color: MUTED, valign: "middle", margin: 0 });
  if (mock)
    slide.addText("Mock data", {
      x: 9.35,
      y: 6.95,
      w: 1.2,
      h: 0.28,
      fontFace: BODY,
      fontSize: 9,
      bold: true,
      color: INK,
      fill: { color: hex(AVNET.yellow) },
      align: "center",
      valign: "middle",
      margin: 0,
    });
}

function content(pptx: PptxGenJS, d: DeckSlide) {
  const p = d.preview;
  const slide = pptx.addSlide({ masterName: "CONTENT" });
  slide.addText(t(p.headline), { x: X, y: 0.4, w: 10.4, h: 0.95, fontFace: HEAD, fontSize: 30, color: INK, valign: "top", fit: "shrink", margin: 0 });
  let y = 1.45;
  const bottom = p.claude ? 6.3 : 6.65;
  // A slide that is only its sentence (what management said, a technology) gives the sentence the room.
  const textOnly = !p.chart && !p.facts?.length && !p.lines?.length;
  if (p.text) {
    const h = textOnly ? bottom - y - 0.3 : 0.95;
    slide.addText(t(p.text), { x: X, y, w: textOnly ? 10.4 : 11.6, h, fontFace: BODY, fontSize: textOnly ? 22 : 15, color: INK, valign: "top", fit: "shrink", margin: 0, paraSpaceAfter: 8 });
    y += 1.1;
  }
  if (p.chart) {
    const facts = Boolean(p.facts?.length);
    addChart(pptx, slide, p.chart, { x: X - 0.1, y, w: facts ? 7.4 : 12.2, h: bottom - y });
    if (facts) addFacts(slide, p, { x: 8.2, y: y + 0.1, w: 4.5 });
  } else if (p.facts?.length) {
    addFacts(slide, p, { x: X, y, w: p.columns?.length ? 12.1 : 7.5 });
  }
  if (p.lines?.length) {
    const top = p.facts?.length && !p.chart ? Math.min(bottom - 1.2, y + 0.45 * (p.facts.length + 1) + 0.3) : y;
    slide.addText(
      p.lines.map((l) => ({ text: t(l), options: { bullet: d.kind !== "sources", breakLine: true } })),
      { x: X, y: top, w: 12.1, h: bottom - top, fontFace: BODY, fontSize: d.kind === "sources" ? 11 : 14, color: INK, valign: "top", paraSpaceAfter: 6, fit: "shrink", margin: 0 },
    );
  }
  if (p.groups?.length) {
    const gap = 0.4;
    const w = (W - 2 * X - gap * (p.groups.length - 1)) / p.groups.length;
    p.groups.forEach((g, i) => {
      const x = X + i * (w + gap);
      slide.addText(t(g.title).toUpperCase(), { x, y, w, h: 0.35, fontFace: HEAD, fontSize: 12, color: MUTED, margin: 0 });
      slide.addText(
        g.lines.map((l) => ({ text: t(l), options: { bullet: { type: "number" as const }, breakLine: true } })),
        { x, y: y + 0.45, w, h: bottom - y - 0.5, fontFace: BODY, fontSize: 13, color: INK, valign: "top", paraSpaceAfter: 8, fit: "shrink", margin: 0 },
      );
    });
  }
  if (p.claude)
    slide.addText(`${t(p.claude.label)}${p.claude.date ? `, ${t(p.claude.date)}` : ""}. Check before quoting.`, {
      x: X,
      y: 6.4,
      w: 12,
      h: 0.35,
      fontFace: BODY,
      fontSize: 10,
      italic: true,
      color: MUTED,
      margin: 0,
    });
  addFooter(slide, p, d.mock);
}

function cover(pptx: PptxGenJS, d: DeckSlide, logo: string) {
  const slide = pptx.addSlide({ masterName: "COVER" });
  slide.addImage({ data: logo, x: X, y: 0.7, w: 2.6, h: 2.6 * LOGO_RATIO });
  slide.addShape("rect", { x: X, y: 3.05, w: 1.2, h: 0.08, fill: { color: hex(AVNET.green) }, line: { color: hex(AVNET.green), width: 0 } });
  slide.addText(t(d.preview.headline), { x: X, y: 3.35, w: 11.5, h: 1.6, fontFace: HEAD, fontSize: 44, color: INK, valign: "top", fit: "shrink", margin: 0 });
  slide.addText(t(d.preview.text), { x: X, y: 5.0, w: 11.5, h: 0.6, fontFace: BODY, fontSize: 18, color: MUTED, margin: 0 });
}

/** The deck as .pptx bytes. Slides are written in the order given. */
export async function buildDeck(title: string, slides: DeckSlide[], logo?: string): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = t(title);
  pptx.company = "Avnet";
  pptx.author = "Avnet Market Intelligence Terminal";
  const image = logo ?? (await logoData());
  const logoW = 1.45;
  pptx.defineSlideMaster({ title: "COVER", background: { color: "FFFFFF" }, objects: [] });
  pptx.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [{ image: { data: image, x: W - X - logoW, y: 0.45, w: logoW, h: logoW * LOGO_RATIO } }],
    slideNumber: { x: W - X - 0.6, y: 6.92, w: 0.6, h: 0.35, fontFace: BODY, fontSize: 9, color: MUTED, align: "right" },
  });
  for (const d of slides) {
    if (d.kind === "cover") cover(pptx, d, image);
    else content(pptx, d);
  }
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
