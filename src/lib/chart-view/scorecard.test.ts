// Scorecard drawer data. Run with: npx tsx src/lib/chart-view/scorecard.test.ts
import assert from "node:assert/strict";
import { MEASURES, type ScoreRow } from "@/lib/competitive/compare";
import { formatAxis, formatValue, seriesColor } from "./model";
import { scorecardChartData, scorecardTakeaway } from "./scorecard";
import { VIZ } from "@/lib/colors";

const measure = (metric: string) => MEASURES.find((m) => m.metric === metric)!;
const row = (metric: string, over: Partial<ScoreRow>): ScoreRow => ({ ...measure(metric), leads: null, ...over });
const points = [
  { label: "CY26 Q1", avnet: 100, arrow: 88 },
  { label: "CY26 Q2", avnet: 99, arrow: undefined },
  { label: "CY26 Q3", avnet: 98, arrow: 84 },
];

// Points between two percentages.
assert.equal(formatValue("pts", 0.003), "+0.3 pts");
assert.equal(formatValue("pts", -0.012), "−1.2 pts");
assert.equal(formatAxis("pts", -0.015), "−1.5");

// Inventory days: Avnet green, Arrow blue, gap in days, missing quarters left null.
const inv = row("inventoryDays", { avnet: 98, arrow: 84, gap: 14, gapYearAgo: 19, leads: "Arrow" });
const data = scorecardChartData(inv, points, "CY26 Q3");
assert.deepEqual(data.periods, ["CY26 Q1", "CY26 Q2", "CY26 Q3"]);
assert.deepEqual(data.series.gap, [12, null, 14]);
assert.deepEqual(data.series.arrow, [88, null, 84]);
const [lines, gap] = data.tabs[0].panes;
assert.equal(seriesColor(lines.series[0].color, data.company, "line"), VIZ.avnet);
assert.equal(seriesColor(lines.series[1].color, data.company, "line"), VIZ.arrow);
assert.equal(gap.unit, "days");
assert.equal(data.takeaways.trend, "Arrow carries 14 days less inventory than Avnet, measured against cost of sales. The gap has narrowed from 19 days a year ago.");

// Margins: the gap is in points.
const op = row("operatingMargin", { avnet: 0.034, arrow: 0.031, gap: 0.003, leads: "Avnet" });
assert.equal(scorecardChartData(op, points, "CY26 Q3").tabs[0].panes[1].unit, "pts");

// A measure that can't be compared has no gap pane, and the sentence says why.
const rec = row("receivableDays", { avnet: 51, arrow: 74, gap: -23 });
const recData = scorecardChartData(rec, points, "CY26 Q3");
assert.equal(recData.tabs[0].panes.length, 1);
assert.match(recData.takeaways.trend!, /^Receivable days in CY26 Q3: Avnet 51 days, Arrow 74 days\. Not comparable:/);

// Level, and no better direction.
assert.equal(scorecardTakeaway(row("grossMargin", { avnet: 0.115, arrow: 0.1152, leads: "Even" }), "CY26 Q3"), "Gross margin in CY26 Q3: Avnet 11.5%, Arrow 11.5%. The two are level.");
assert.equal(scorecardTakeaway(row("revenue", { avnet: 5.9e9, arrow: 7.1e9 }), "CY26 Q3"), "Revenue in CY26 Q3: Avnet $5.90B, Arrow $7.10B.");

console.log("scorecard chart: ok");
