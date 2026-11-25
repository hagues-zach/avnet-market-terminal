// How a slide uses its space. Run with: npx tsx src/lib/deck/layout.test.ts
import assert from "node:assert/strict";
import { chartFromFacts, niceRange, planSlide, readFigure, withChart } from "./layout";
import type { Preview } from "./outline";

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

console.log("layout.test.ts: ok");
