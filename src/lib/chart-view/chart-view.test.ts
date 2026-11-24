// Chart view model and Earnings specs. Run with: npx tsx src/lib/chart-view/chart-view.test.ts
import assert from "node:assert/strict";
import { VIZ } from "@/lib/colors";
import { COMPANIES, type CompanyEarnings, type Quarter } from "@/lib/data/live/earnings-model";
import { EARNINGS_SECTIONS, earningsChartData } from "./earnings";
import { describeChange, describeSeries, formatAxis, formatValue, seriesColor, tabHasData } from "./model";

// Colours: green only ever means Avnet, and Arrow's own measures skip Arrow's blue.
assert.equal(seriesColor("company", "avnet"), VIZ.avnet);
assert.equal(seriesColor("company", "arrow"), VIZ.arrow);
assert.equal(seriesColor("company", "wesco"), VIZ.benchmark);
assert.equal(seriesColor(0, "avnet"), VIZ.arrow);
assert.equal(seriesColor(0, "arrow"), VIZ.orange);
assert.equal(seriesColor("muted", "avnet", "bar"), VIZ.other);
assert.equal(seriesColor("muted", "avnet", "line"), VIZ.benchmark);
for (const role of [0, 1, 2, 3, "muted"] as const) {
  for (const co of ["avnet", "arrow", "wesco"]) assert.notEqual(seriesColor(role, co), VIZ.avnet, `${role} for ${co} must not be green`);
}

// Formatting.
assert.equal(formatValue("pct", 0.115), "11.5%");
assert.equal(formatValue("days", 97.6), "98 days");
assert.equal(formatValue("eps", -0.5), "−$0.50");
assert.equal(formatValue("usd", null), "n/a");
assert.equal(formatAxis("pct", 0.041), "4.1%");
assert.equal(formatAxis("pct", 0.04), "4%");
assert.equal(formatAxis("growth", -0.45), "-45%");
assert.equal(describeChange("pct", 0.039, 0.042), "down 0.3 pts");
assert.equal(describeChange("usd", 110, 100), "up 10.0%");
assert.equal(describeChange("days", 98, 107), "down 9 days");
// Across zero or from a loss, a percentage misleads: say the dollar change.
assert.equal(describeChange("usd", -867e6, 278e6), "down $1.15B");
assert.equal(describeChange("usd", 50e6, -20e6), "up $70M");

// Sentences: latest value, change on a year ago, and a run worth naming.
const P = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
assert.equal(
  describeSeries("Inventory days", "days", [110, 107, 104, 101, 99, 98], P),
  "Inventory days was 98 days in Q6, down 9 days on a year ago. It has fallen five quarters running.",
);
assert.equal(describeSeries("Revenue", "usd", [null, null, 1e9, 2e9], ["a", "b", "c", "d"]), "Revenue was $2.00B in d.");
assert.equal(describeSeries("Revenue", "usd", [1, 2, null], ["a", "b", "c"]), null);
// A change that rounds to zero is "about level", with no run named.
assert.equal(describeSeries("Share", "pct", [0.016, 0.015, 0.014, 0.013, 0.012], ["a", "b", "c", "d", "e"]), "Share was 1.2% in e, down 0.4 pts on a year ago. It has fallen four quarters running.");
assert.equal(describeSeries("Share", "pct", [0.013, 0.01302, 0.01301, 0.0130, 0.01299], ["a", "b", "c", "d", "e"]), "Share was 1.3% in e, about level with a year ago.");
// A flat quarter ends the run.
assert.equal(describeSeries("X", "days", [1, 2, 3, 3, 4], P.slice(0, 5)), "X was 4 days in Q5, up 3 days on a year ago.");

// Earnings: every series a tab draws is built, over the table's eight quarters.
const avnet = COMPANIES.find((c) => c.slug === "avnet")!;
const quarters: Quarter[] = Array.from({ length: 10 }, (_, i) => ({
  end: `2026-0${(i % 9) + 1}-28`,
  fiscalLabel: `FY${25 + Math.floor(i / 4)} Q${(i % 4) + 1}`,
  calendarLabel: "CY",
  values: { revenue: 5e9 + i * 1e8, revenueYoY: 0.05, inventoryDays: 100 - i, capex: 4e7 },
  backedOut: [],
}));
const earnings: CompanyEarnings = { company: avnet, quarters, latestFiling: null };
for (const section of Object.keys(EARNINGS_SECTIONS) as (keyof typeof EARNINGS_SECTIONS)[]) {
  const data = earningsChartData(earnings, section);
  assert.equal(data.periods.length, 8);
  assert.equal(data.periods[7], "FY27 Q2");
  for (const tab of data.tabs) {
    for (const pane of tab.panes) for (const s of pane.series) assert.ok(data.series[s.key], `${section}/${tab.id} missing ${s.key}`);
    assert.ok(tab.id in data.takeaways, `${section}/${tab.id} has no takeaway entry`);
  }
}
const income = earningsChartData(earnings, "income");
assert.equal(income.series.revenue[7], 5.9e9);
assert.equal(income.series.grossMargin[0], null);
assert.ok(tabHasData(income, income.tabs[0]));
assert.ok(!tabHasData(income, income.tabs.find((t) => t.id === "opex")!));
assert.match(income.takeaways.revenue!, /^Revenue was \$5\.90B in FY27 Q2, up 7\.3% on a year ago\. It has risen seven quarters running\.$/);
assert.equal(earningsChartData(earnings, "working").takeaways.days, "Inventory days was 91 days in FY27 Q2, down 4 days on a year ago. It has fallen seven quarters running.");

console.log("chart-view: ok");
