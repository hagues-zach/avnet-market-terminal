// The slide each card makes. Run with: npx tsx src/lib/deck/slides.test.ts
import assert from "node:assert/strict";
import { panelChange, planSlide } from "./layout";
import { comparisonSlide, figuresSlide, formatFigure, linesSlide, panelsSlide, seriesSlide, tableSlide } from "./slides";
import { PreviewSchema } from "./tray";

const valid = (p: unknown, what: string) => {
  const r = PreviewSchema.safeParse(p);
  assert.ok(r.success, `${what} passes the tray's schema: ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 2))}`);
};

// The market by year: one dollar series over years, a forecast year at the end.
const market = seriesSlide({
  key: "overview:market-by-year",
  title: "The market by year",
  text: "World semiconductor sales, 2019 to the 2026 forecast",
  unit: "usd",
  periods: ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026 forecast"],
  series: [{ name: "World market", values: [412e9, 440e9, 556e9, 574e9, 527e9, 631e9, 772e9, 976e9] }],
  source: "WSTS Autumn 2025",
});
assert.equal(market.id, "card:overview-market-by-year");
assert.equal(market.preview.chart?.kind, "column", "one dollar series is columns");
assert.equal(market.preview.chart?.series[0].points.length, 8);
assert.equal(market.preview.chart?.series[0].points.at(-1)?.label, "2026 forecast");
assert.deepEqual(market.preview.columns, ["2023", "2024", "2025", "2026 forecast"]);
assert.equal(market.preview.facts?.[0].values.at(-1), "$976B", "dollars to three figures");
assert.equal(planSlide(market.preview).kind, "chart");
valid(market.preview, "a series slide");

// Two lines against each other: Avnet and Arrow keep their colours; others take the order.
const pair = seriesSlide({
  key: "competitive:gross-margin",
  title: "Gross margin",
  unit: "pct",
  periods: ["Q1", "Q2", "Q3"],
  series: [
    { name: "Avnet", values: [0.105, null, 0.1] },
    { name: "Arrow", values: [0.11, 0.111, 0.108] },
  ],
  source: "SEC filings",
});
assert.deepEqual(
  pair.preview.chart?.series.map((s) => s.who),
  ["avnet", "arrow"],
);
assert.deepEqual(
  pair.preview.chart?.series[0].points.map((x) => x.label),
  ["Q1", "Q3"],
  "only periods both report",
);
assert.equal(pair.preview.facts?.[0].values[1], "n/a");
const three = seriesSlide({ key: "x", title: "x", unit: "number", periods: ["a", "b"], series: [{ name: "Semis", values: [100, 141] }, { name: "Electronics", values: [100, 120] }], source: "Fed" });
assert.notEqual(three.preview.chart?.series[0].color, three.preview.chart?.series[1].color, "other series get distinct colours");
assert.equal(three.preview.chart?.format, "number");

// Monthly series thin to twelve points, ending on the latest.
const months = Array.from({ length: 36 }, (_, i) => `M${i}`);
const monthly = seriesSlide({ key: "signals:capacity", title: "Capacity", unit: "pct", periods: months, series: [{ name: "Utilization", values: months.map((_, i) => 0.7 + i / 1000) }], source: "Fed" });
const pts = monthly.preview.chart!.series[0].points;
assert.ok(pts.length <= 12, `${pts.length} points`);
assert.equal(pts.at(-1)?.label, "M35", "ends on the latest month");
valid(monthly.preview, "a monthly slide");

// A comparison: bars largest first, with extra columns in the table.
const growth = comparisonSlide({
  key: "overview:what-carried-growth",
  title: "What carried the growth",
  unit: "usd",
  measure: "2025 sales",
  items: [
    { name: "DRAM", value: 128e9, extra: ["+48.0%"] },
    { name: "GPUs", value: 140e9, extra: ["+52.0%"] },
    { name: "Flash", value: 72e9, extra: ["+22.0%"] },
  ],
  extraColumns: ["Growth"],
  source: "WSTS",
  hookups: ["wsts"],
});
assert.equal(growth.preview.chart?.kind, "bar");
assert.deepEqual(
  growth.preview.chart?.series.map((s) => s.name),
  ["GPUs", "DRAM", "Flash"],
);
assert.deepEqual(growth.preview.columns, ["", "2025 sales", "Growth"]);
assert.deepEqual(growth.preview.facts?.[0], { label: "GPUs", values: ["$140B", "+52.0%"] });
assert.deepEqual(growth.preview.hookups, ["wsts"]);
assert.equal(planSlide(growth.preview).table?.headers?.length, 3, "a comparison table beside the bars");
valid(growth.preview, "a comparison slide");

// A table as written; oversized input is cut to the tray's limits.
const big = tableSlide({
  key: "competitive:scorecard",
  title: "Scorecard",
  columns: ["Measure", "Avnet", "Arrow", "Gap", "Leads"],
  rows: Array.from({ length: 20 }, (_, i) => ({ label: `Measure ${i}`, values: ["1", "2", "-1", "Avnet"] })),
  source: "SEC filings",
});
assert.equal(big.preview.facts?.length, 16);
assert.equal(planSlide(big.preview).kind, "table");
valid(big.preview, "a table slide");

// Tiles and points.
const tiles = figuresSlide({ key: "tam:opportunity", title: "The opportunity in 2025", figures: [{ label: "TAM", value: "$772.2B" }, { label: "SAM", value: "$139.0B" }, { label: "SOM", value: "$16.4B" }], source: "WSTS" });
assert.equal(planSlide(tiles.preview).kind, "figures");
valid(tiles.preview, "a figures slide");
const points = linesSlide({ key: "competitive:avnet-stronger", title: "Where Avnet is stronger", lines: ["a".repeat(400), "", "b"], source: "SEC" });
assert.equal(points.preview.lines?.length, 2, "empty lines dropped");
assert.ok(points.preview.lines![0].length <= 300, "long lines cut");
valid(points.preview, "a lines slide");

// Panels: columns drawn as the page draws them.
const chain = panelsSlide({
  key: "cycle:the-chain",
  title: "The chain, from customers back to equipment",
  panels: [
    ...Array.from({ length: 7 }, (_, i) => ({
      title: `Stage ${i}`,
      detail: "d".repeat(300),
      metrics: [{ label: "Revenue growth YoY", value: "+12.0%", change: "+1.2 pts", tone: "good" as const, period: "on prior qtr", large: true }],
      spark: { label: "Growth, last 8 quarters", values: [0.1, -0.05, NaN, 0.2] },
    })),
  ],
  source: "SEC filings",
});
assert.equal(chain.preview.panels?.length, 6, "six panels at most");
assert.ok(chain.preview.panels![0].detail!.length <= 200, "long detail cut");
assert.deepEqual(chain.preview.panels![0].spark?.values, [0.1, -0.05, 0.2], "non-numbers dropped from the spark");
assert.equal(planSlide(chain.preview).kind, "panels");
valid(chain.preview, "a panels slide");
const funnel = panelsSlide({
  key: "tam:opportunity",
  title: "The opportunity in 2025",
  panels: [
    { kicker: "TAM, total market", tag: "WSTS Autumn 2025", figure: { value: "$772.2B", note: "World semiconductor sales,", change: "+22.5%", tone: "good", period: "on 2024" }, bar: { share: 1.4, color: "#A7A8AA" } },
    { kicker: "SOM, Avnet", tag: "Mock", tagMock: true, figure: { value: "$16.4B" }, bar: { share: -1, color: "#41C363", label: "11.8% of SAM" } },
  ],
  source: "WSTS",
});
assert.equal(funnel.preview.panels![0].bar?.share, 1, "bar share capped at 1");
assert.equal(funnel.preview.panels![1].bar?.share, 0, "and floored at 0");
valid(funnel.preview, "a funnel panels slide");
assert.equal(panelChange("+1.2 pts"), "\u2191 +1.2 pts");
assert.equal(panelChange("\u221216d"), "\u2193 \u221216d");
assert.equal(panelChange("0d"), "\u2192 0d");

// Formatting.
assert.equal(formatFigure("number", 141.2), "141");
assert.equal(formatFigure("number", 74.4), "74.4");
assert.equal(formatFigure("pct", -0.081), "−8.1%");
assert.equal(formatFigure("days", 76.6), "77 days");
assert.equal(formatFigure("usd", null), "n/a");
assert.equal(formatFigure("usd", 77.2e9), "$77.2B");
assert.equal(formatFigure("usd", 1.62e9), "$1.62B");
assert.equal(formatFigure("usd", 850e6), "$850M");
assert.equal(formatFigure("usd", -2.43e9), "−$2.43B");
assert.equal(seriesSlide({ key: "k", title: "t", unit: "pct", periods: ["a"], series: [{ name: "x", values: [null] }], source: "s" }).preview.chart, undefined, "nothing to chart");

console.log("slides.test.ts: ok");
