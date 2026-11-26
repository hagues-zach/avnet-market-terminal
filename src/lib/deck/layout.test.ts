// How a slide uses its space. Run with: npx tsx src/lib/deck/layout.test.ts
import assert from "node:assert/strict";
import { barLabelWidth, chartFromFacts, layoutPanels, niceRange, planSlide, readFigure, withChart } from "./layout";
import type { Panel, Preview } from "./outline";

const quarters = ["CY24 Q4", "CY25 Q1", "CY25 Q2", "CY25 Q3", "CY25 Q4", "CY26 Q1", "CY26 Q2", "CY26 Q3"];
const line = (name: string, who: "avnet" | "arrow", vals: number[]) => ({ name, who, points: vals.map((value, i) => ({ label: quarters[i], value })) });

// The slide in the screenshot: two lines and a table of the same series over the last four quarters, plus the gap.
const sga: Preview = {
  headline: "Avnet vs Arrow: SG&A, % of revenue",
  text: "Avnet spends 1.0 points less of its revenue on selling and overheads than Arrow.",
  columns: ["CY25 Q4", "CY26 Q1", "CY26 Q2", "CY26 Q3"],
  facts: [
    { label: "Avnet", values: ["7.8%", "7.3%", "6.6%", "5.4%"] },
    { label: "Arrow", values: ["7.3%", "6.9%", "6.9%", "6.4%"] },
    { label: "Gap", values: ["+0.5 pts", "+0.4 pts", "−0.3 pts", "−1.0 pts"] },
  ],
  chart: {
    kind: "line",
    format: "pct",
    title: "SG&A, % of revenue",
    series: [line("Avnet", "avnet", [0.08, 0.082, 0.081, 0.08, 0.078, 0.073, 0.066, 0.054]), line("Arrow", "arrow", [0.079, 0.082, 0.08, 0.079, 0.073, 0.069, 0.069, 0.064])],
  },
  source: "SEC filings",
};
const s = planSlide(sga);
assert.equal(s.kind, "chart");
assert.equal(s.table, undefined, "the chart's own series aren't repeated as a table");
assert.equal(s.side, true, "the key figures go beside the chart");
assert.deepEqual(s.callouts, [
  { label: "Avnet", value: "5.4%", note: "CY26 Q3, from 7.8% in CY25 Q4" },
  { label: "Arrow", value: "6.4%", note: "CY26 Q3, from 7.3% in CY25 Q4" },
  { label: "Gap", value: "−1.0 pts", note: "CY26 Q3, from +0.5 pts in CY25 Q4" },
]);
assert.equal(s.labels, false, "two lines get a value axis, not colliding labels");
assert.ok(s.range && s.range.min > 0 && s.range.min <= 0.054 && s.range.max >= 0.082, "the axis is set to the data, not from zero");

// One series of columns: labelled, and the chart takes the full width when nothing goes beside it.
const revenue: Preview = {
  headline: "Microchip's revenue",
  chart: { kind: "column", format: "usd", series: [{ name: "Revenue", who: "company", points: [{ label: "Q1", value: 1e9 }, { label: "Q2", value: 1.1e9 }] }] },
  source: "SEC",
};
const r = planSlide(revenue);
assert.equal(r.side, false);
assert.equal(r.labels, true);
assert.equal(r.range, undefined, "columns start from zero");

// A comparison table beside a chart: Avnet, Arrow and who leads, row by row.
const arrow: Preview = {
  headline: "Avnet led on growth",
  columns: ["Avnet", "Arrow", "Leads"],
  facts: [
    { label: "Revenue growth YoY", values: ["+81.7%", "+39.0%", "Avnet"] },
    { label: "Gross margin", values: ["10.0%", "10.8%", "Arrow"] },
  ],
  chart: { kind: "bar", format: "pct", series: [{ name: "Avnet", who: "avnet", points: [{ label: "Growth", value: 0.8 }] }] },
  source: "SEC",
};
const a = planSlide(arrow);
assert.equal(a.callouts.length, 0);
assert.deepEqual(a.table?.headers, ["", "Avnet", "Arrow", "Leads"]);
assert.equal(a.side, true);

// One value per row: key figures beside the chart; too many becomes a table.
const glance = (n: number): Preview => ({
  ...revenue,
  facts: Array.from({ length: n }, (_, i) => ({ label: `Figure ${i}`, values: [`${i}%`] })),
  period: "Q3 2026",
});
assert.equal(planSlide(glance(3)).callouts.length, 3);
assert.equal(planSlide(glance(3)).callouts[0].note, "Q3 2026");
assert.equal(planSlide(glance(5)).callouts.length, 0);
assert.ok(planSlide(glance(5)).table, "five figures beside a chart read better as a table");

// No chart.
assert.equal(planSlide({ headline: "x", facts: [{ label: "A", values: ["1"] }], source: "s" }).kind, "figures");
assert.equal(planSlide({ headline: "x", columns: ["", "A", "B"], facts: [{ label: "r", values: ["1", "2"] }], source: "s" }).kind, "table");
assert.equal(planSlide({ headline: "x", text: "y", source: "s" }).kind, "text");
assert.equal(planSlide({ headline: "x", groups: [{ title: "t", lines: ["a"] }], source: "s" }).kind, "groups");

// Ranges.
assert.deepEqual(niceRange([0.4, 0.6]), { min: 0.35, max: 0.65 });
assert.equal(niceRange([5, 10])!.min, 4);
assert.equal(niceRange([0.01, 0.02])!.min >= 0, true, "positive data never gets a negative axis");
assert.equal(niceRange([]), undefined);

/* ---------- A chart from the figures ---------- */

assert.deepEqual(readFigure("85 days"), { format: "days", value: 85 });
assert.deepEqual(readFigure("−7.8%"), { format: "pct", value: -0.078 });
assert.deepEqual(readFigure("$1.19B"), { format: "usd", value: 1.19e9 });
assert.deepEqual(readFigure("$971M"), { format: "usd", value: 971e6 });
assert.deepEqual(readFigure("$0.66"), { format: "eps", value: 0.66 });
assert.equal(readFigure("n/a"), undefined);
assert.equal(readFigure("+0.5 pts"), undefined, "points stay figures, not chart values");

// The working capital slide as saved before days could be charted.
const capital: Preview = {
  headline: "Avnet: Working capital, days",
  text: "Inventory days was 77 days in FY27 Q1, down 16 days on a year ago.",
  columns: ["FY26 Q2", "FY26 Q3", "FY26 Q4", "FY27 Q1"],
  facts: [
    { label: "Inventory", values: ["85 days", "78 days", "74 days", "77 days"] },
    { label: "Receivable", values: ["76 days", "70 days", "76 days", "66 days"] },
    { label: "Payable", values: ["70 days", "66 days", "74 days", "74 days"] },
    { label: "Cash cycle", values: ["91 days", "82 days", "76 days", "69 days"] },
  ],
  source: "Avnet's SEC filings",
};
const made = chartFromFacts(capital)!;
assert.equal(made.kind, "line");
assert.equal(made.format, "days");
assert.deepEqual(
  made.series.map((s) => s.name),
  ["Inventory", "Receivable", "Payable", "Cash cycle"],
);
assert.equal(new Set(made.series.map((s) => s.color)).size, 4, "each line its own colour");
assert.deepEqual(made.series[0].points.map((x) => x.value), [85, 78, 74, 77]);
const drawn = withChart(capital);
assert.equal(planSlide(drawn).kind, "chart", "the saved table is drawn as a chart");
assert.equal(planSlide(drawn).table, undefined);
assert.equal(planSlide(drawn).callouts.length, 4, "with the key figures beside it");
assert.equal(withChart(sga), sga, "a slide with its own chart is left alone");

// Mixed units: the gap in points stays out of the chart; Avnet and Arrow keep their colours.
const pair = chartFromFacts({ ...sga, chart: undefined })!;
assert.deepEqual(
  pair.series.map((s) => [s.name, s.who]),
  [
    ["Avnet", "avnet"],
    ["Arrow", "arrow"],
  ],
);

// Not quarters, or one quarter: no chart.
assert.equal(chartFromFacts(arrow), undefined, "a comparison across companies stays a table");
assert.equal(chartFromFacts({ ...capital, columns: ["FY27 Q1"], facts: [{ label: "Inventory", values: ["77 days"] }] }), undefined);
assert.equal(chartFromFacts({ headline: "x", columns: ["", "A", "B"], facts: [{ label: "r", values: ["1", "2"] }], source: "s" }), undefined);

// Panels: every piece inside the body, the sparks level along the foot, and the row shrunk as one when a column is tall.
{
  const column = (notes: boolean): Panel => ({
    title: "Distributors",
    detail: "Electronic components distribution. 6 of 6 reported",
    metrics: [
      { label: "Revenue growth YoY", value: "+18.1%", change: "+4.0 pts", tone: "good", period: "on prior qtr", large: true },
      { label: "Inventory days", value: "77", change: "\u221216d", tone: "good", period: "YoY" },
      { label: "Operating margin", value: "4.4%" },
    ],
    ...(notes && {
      notesLabel: "Avnet and Arrow",
      notes: [
        { title: "Avnet", value: "+47.7%", text: "Inventory 77 days (\u221216d YoY), margin 4.4%", marker: "#41C363" },
        { title: "Arrow", value: "+31.8%", text: "Inventory 70 days (\u22129d YoY), margin 3.9%", marker: "#4273B8" },
      ],
    }),
    spark: { label: "Growth, last 8 quarters", values: [-0.1, -0.05, 0.02, 0.04, 0.06, 0.1, 0.14, 0.18] },
  });
  const box = { x: 0.5, y: 1.6, w: 9, h: 3.2 };
  const roomy = layoutPanels([column(false), column(false)], box);
  const tight = layoutPanels([column(false), column(true), column(false), column(false), column(false)], box);
  const bottom = (it: (typeof roomy)[number]) => (it.kind === "seg" ? Math.max(it.y1, it.y2) : it.y + it.h);
  for (const items of [roomy, tight]) for (const it of items) assert.ok(bottom(it) <= box.y + box.h + 0.01, `${it.kind} inside the body`);
  const size = (items: typeof roomy, s: string) => items.flatMap((it) => (it.kind === "text" ? it.runs : [])).find((r) => r.text === s)?.size ?? 0;
  assert.equal(size(roomy, "+18.1%"), 19, "full size when it fits");
  assert.ok(size(tight, "+18.1%") < 19 && size(tight, "+18.1%") >= 19 * 0.7, "smaller, within limits, when a column runs long");
  const sparkTops = tight.filter((it) => it.kind === "text" && it.runs[0].text === "GROWTH, LAST 8 QUARTERS").map((it) => (it.kind === "text" ? it.y.toFixed(3) : ""));
  assert.equal(new Set(sparkTops).size, 1, "the sparks level along the foot");
}

// Rows: a value with its grey note and change, a large figure, and a caption under the bar.
{
  const items = layoutPanels(
    [
      {
        rows: [
          { title: "Americas", value: "$210.1B", note: "27%", change: "+22.5%", tone: "good", period: "YoY", bar: { share: 1, color: "#D2D2D2" } },
          { title: "Reported, Q3 2026", value: "+31.0%", large: true, bar: { share: 0.6, color: "#000000" }, caption: "48 chip makers, combined revenue on a year ago" },
        ],
      },
    ],
    { x: 0.5, y: 1.6, w: 9, h: 3.2 },
  );
  const runs = items.flatMap((it) => (it.kind === "text" ? it.runs : []));
  assert.ok(runs.some((r) => r.text === "  27%" && r.color), "the note in grey after the value");
  assert.ok(runs.some((r) => r.text === " YoY"), "the change's period");
  const big = runs.find((r) => r.text === "+31.0%")!.size;
  const plain = runs.find((r) => r.text === "$210.1B")!.size;
  assert.equal(big / plain, 18 / 9.5, "a large value as a figure");
  assert.ok(plain > 9.5 && plain <= 9.5 * 1.5, "a short list grows to use the slide, within limits");
  const caption = items.find((it) => it.kind === "text" && it.runs[0].text.startsWith("48 chip makers"));
  const bar = items.filter((it) => it.kind === "rect").at(-1)!;
  assert.ok(caption && caption.kind === "text" && bar.kind === "rect" && caption.y >= bar.y + bar.h, "the caption under the bar");
}

// A digest column: a marker before the title, the lead sentence, and paragraphs opening in bold.
{
  const items = layoutPanels(
    [{ title: "Arrow", marker: "#4273B8", lede: "Demand improved across regions.", paragraphs: [{ lead: "Demand", text: "Orders rose." }, { text: "Not covered." }] }],
    { x: 0.5, y: 1.6, w: 4, h: 3 },
  );
  const marker = items.find((it) => it.kind === "rect");
  const title = items.find((it) => it.kind === "text" && it.runs[0].text === "Arrow");
  assert.ok(marker && title && marker.kind === "rect" && title.kind === "text" && marker.x < title.x, "the marker before the title");
  const para = items.find((it) => it.kind === "text" && it.runs[0].text === "Demand: ");
  assert.ok(para && para.kind === "text" && para.runs[0].bold && !para.runs[1].bold, "the paragraph's label in bold");
}

// A panel's bars: a forecast period is drawn lighter, the actual years solid.
{
  const box = { x: 0.5, y: 1.5, w: 9, h: 4 };
  const items = layoutPanels([{ title: "TAM", bars: { labels: ["2024", "2025", "2026F"], values: [1, 2, 3], color: "#808080", forecast: [false, false, true] } }], box);
  const rects = items.filter((it) => it.kind === "rect");
  assert.equal(rects.length, 3, "a bar per period");
  assert.deepEqual(rects.map((r) => (r.kind === "rect" ? r.opacity ?? 1 : 0)), [1, 1, 0.4], "only the forecast bar is lighter");
}

// Columns of figures with small columns under them (the TAM funnel): whatever wraps above, the
// share bars and the small columns start level across the row.
{
  const box = { x: 0.5, y: 1.5, w: 9, h: 4.2 };
  const bars = { labels: ["2024", "2025"], values: [1, 2], color: "#808080" };
  const step = (note: string): Panel => ({ kicker: "Step", figure: { value: "$1.0B", note }, bar: { share: 0.5, color: "#808080", label: "Half" }, bars });
  const items = layoutPanels([step("Short"), step("A much longer line under the figure that wraps onto a second line in a third of the slide"), step("Short")], box);
  const tops = (pick: (h: number) => boolean) => {
    const rects = items.filter((it): it is Extract<typeof it, { kind: "rect" }> => it.kind === "rect" && pick(it.h));
    return [0, 1, 2].map((col) => Math.min(...rects.filter((r) => r.x >= box.x + col * 3 - 0.01 && r.x < box.x + (col + 1) * 3 - 0.2).map((r) => r.y + r.h)));
  };
  const bases = tops((h) => h > 0.15);
  assert.ok(bases.every((b) => Math.abs(b - bases[0]) < 1e-9), `small columns share a baseline: ${bases}`);
  // With room under them, the columns grow into it: the baseline sits near the foot of the box.
  assert.ok(box.y + box.h - bases[0] < 0.6, `the columns fill the foot: baseline ${bases[0]}, box ends ${box.y + box.h}`);
}

// A scatter: a dot per point inside the plot, the strong one named, the medians dashed.
{
  const box = { x: 0.5, y: 1.5, w: 9, h: 4.2 };
  const items = layoutPanels(
    [
      {
        scatter: {
          x: { label: "Growth", format: "growth", min: 0, max: 1 },
          y: { label: "Margin", format: "pct", min: 0, max: 0.5 },
          points: [
            { x: 0, y: 0, color: "#808080" },
            { x: 1, y: 0.5, color: "#808080" },
            { x: 0.5, y: 0.25, color: "#4DB848", strong: true, label: "Avnet" },
          ],
          medians: { x: 0.3, y: 0.2 },
        },
      },
    ],
    box,
  );
  const dots = items.filter((it) => it.kind === "dot");
  assert.equal(dots.length, 3, "a dot per point");
  for (const d of dots) assert.ok(d.x >= box.x && d.x + d.w <= box.x + box.w + 0.1 && d.y >= box.y && d.y + d.h <= box.y + box.h + 0.1, "dots inside the box");
  const [lo, hi] = [dots[0], dots[1]];
  assert.ok(hi.x > lo.x && hi.y < lo.y, "higher values to the right and up");
  assert.ok(items.some((it) => it.kind === "text" && it.runs[0].text === "Avnet"), "the strong point named");
  assert.equal(items.filter((it) => it.kind === "line" && it.dashed).length, 2, "both medians dashed");
  assert.ok(items.some((it) => it.kind === "text" && it.runs[0].text === "+50%"), "growth ticks signed");
}

// A comparison's labels get the room their widest value needs, not a fixed gap.
{
  const bar = (v: number) => ({ kind: "bar" as const, format: "pct" as const, series: [{ name: "Micron", who: "market" as const, points: [{ label: "Growth", value: v }] }] });
  const wide = barLabelWidth(bar(3.793));
  assert.ok(wide > 44 / 72, `"379.3%" gets more than the old 44pt: ${wide}`);
  assert.ok(barLabelWidth(bar(0.05)) < wide, "a short label takes less room");
}

console.log("layout.test.ts: ok");
