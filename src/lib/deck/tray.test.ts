// Add to deck: the tray's model and the chart view to slide adapter.
// Run with: npx tsx src/lib/deck/tray.test.ts
import assert from "node:assert/strict";
import type { ChartData } from "@/lib/chart-view/model";
import { chartSlideTitle, chartViewToPreview } from "@/lib/chart-view/to-preview";
import type { Hookup } from "@/lib/hookups";
import {
  addItem,
  chartItemId,
  isMock,
  moveItem,
  parseTray,
  PreviewSchema,
  removeItem,
  slidePreview,
  TRAY_LIMIT,
  TrayItemSchema,
  traySources,
  trayLead,
  updateItem,
  viewItemId,
  type TrayItem,
} from "./tray";

const register = [
  { id: "sec", status: "live" },
  { id: "billings", status: "mock" },
] as Hookup[];

const item = (id: string, over: Partial<TrayItem> = {}): TrayItem => ({
  id,
  kind: "chart",
  title: `Slide ${id}`,
  from: { page: "Market Share", href: "/market-share" },
  addedAt: "2026-11-25T10:00:00.000Z",
  preview: { headline: `Headline ${id}`, source: "SEC filings", period: "latest Q3 2026" },
  included: true,
  ...over,
});

/* ---------- Ids ---------- */

assert.equal(chartItemId("Microchip · Quarterly detail", "Income statement", "Revenue"), "chart:microchip-quarterly-detail:income-statement:revenue");
assert.equal(viewItemId("company", "microchip"), "view:company:microchip");
assert.equal(viewItemId("cycle"), "view:cycle");

/* ---------- Changes ---------- */

let r = addItem([], item("a"));
assert.ok(r.added);
r = addItem(r.items, item("b"));
assert.deepEqual(
  r.items.map((x) => x.id),
  ["a", "b"],
);
const dup = addItem(r.items, item("a"));
assert.equal(dup.added, false);
assert.equal(!dup.added && dup.reason, "duplicate");
assert.equal(dup.items.length, 2, "a duplicate leaves the tray alone");

const full = Array.from({ length: TRAY_LIMIT }, (_, i) => item(`x${i}`));
const over = addItem(full, item("one-more"));
assert.equal(!over.added && over.reason, "full");
assert.equal(over.items.length, TRAY_LIMIT);

const three = [item("a"), item("b"), item("c")];
assert.deepEqual(
  moveItem(three, "c", -1).map((x) => x.id),
  ["a", "c", "b"],
);
assert.equal(moveItem(three, "a", -1), three, "the first can't move up");
assert.equal(moveItem(three, "c", 1), three, "the last can't move down");
assert.equal(moveItem(three, "zz", 1), three, "an unknown id does nothing");
assert.deepEqual(
  removeItem(three, "b").map((x) => x.id),
  ["a", "c"],
);
const noted = updateItem(three, "b", { note: "Margins recovered faster than Arrow's", included: false });
assert.equal(noted[1].note, "Margins recovered faster than Arrow's");
assert.equal(noted[1].included, false);
assert.equal(noted[0], three[0], "other items are untouched");

/* ---------- Reading ---------- */

assert.equal(slidePreview(item("a")).headline, "Headline a");
assert.equal(slidePreview(item("a", { note: "  My point  " })).headline, "My point", "the reader's point is the title");
assert.equal(slidePreview(item("a", { note: "   " })).headline, "Headline a", "a blank point is ignored");

const mockItem = item("m", { preview: { headline: "Share", source: "Avnet billings", hookups: ["billings", "sec"] } });
assert.equal(isMock(mockItem, register), true);
assert.equal(isMock(item("a", { preview: { headline: "x", source: "SEC", hookups: ["sec"] } }), register), false);
assert.equal(isMock(item("a"), register), false, "no sources listed is not mock");

assert.equal(trayLead([], register), "No slides yet");
assert.equal(trayLead([item("a")], register), "1 slide");
assert.equal(trayLead([item("a"), mockItem], register), "2 slides, 1 on mock data");

const src = traySources([item("a"), mockItem], register);
assert.equal(src.text, "1 of 2 slides uses mock data until Avnet's sources are hooked up.");
assert.deepEqual(src.lines, ["Slide a: SEC filings, latest Q3 2026", "Slide m: Avnet billings (mock data)"]);
assert.equal(traySources([item("a")], register).text, "Every slide is on live data.");

/* ---------- Saved tray and the schema ---------- */

assert.deepEqual(parseTray(null), []);
assert.deepEqual(parseTray("not json"), []);
assert.deepEqual(parseTray(JSON.stringify({ v: 1 })), [], "an old shape is dropped");
assert.deepEqual(parseTray(JSON.stringify([item("a")])), [item("a")]);
assert.equal(parseTray(JSON.stringify(Array.from({ length: TRAY_LIMIT + 1 }, (_, i) => item(`x${i}`)))).length, 0, "over the limit is refused");

const bad = (over: object) => !TrayItemSchema.safeParse({ ...item("a"), ...over }).success;
assert.ok(bad({ from: { page: "x", href: "https://evil.example" } }), "an outside link is refused");
assert.ok(bad({ from: { page: "x", href: "//evil.example" } }), "a protocol-relative link is refused");
assert.ok(bad({ from: { page: "x", href: "javascript:alert(1)" } }), "a script link is refused");
assert.ok(bad({ title: "x".repeat(201) }), "an oversized title is refused");
assert.ok(bad({ note: "x".repeat(301) }), "an oversized note is refused");
assert.ok(bad({ kind: "other" }));
assert.ok(!bad({ from: { page: "Company Profiles", href: "/network/microchip?tab=earnings" } }));

/* ---------- Chart view to slide ---------- */

const periods = ["Q4 2024", "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];
const earnings: ChartData = {
  eyebrow: "Microchip · Quarterly detail",
  title: "Income statement",
  company: "microchip",
  periods,
  series: {
    revenue: [1.0e9, 1.1e9, 1.2e9, 1.15e9, 1.2e9, 1.25e9, 1.3e9, 1.35e9, 1.4e9],
    growth: [null, null, null, null, 0.2, 0.14, 0.08, 0.17, 0.17],
    eps: [0.5, 0.52, 0.55, 0.5, 0.6, 0.61, 0.62, 0.64, 0.66],
  },
  tabs: [
    {
      id: "revenue",
      label: "Revenue",
      panes: [
        { title: "Revenue", unit: "usd", series: [{ key: "revenue", name: "Revenue", mark: "bar", color: "company" }] },
        { title: "Growth", unit: "growth", series: [{ key: "growth", name: "Growth on a year ago", mark: "line", color: 0 }] },
      ],
    },
    { id: "eps", label: "Diluted EPS", panes: [{ title: "Diluted EPS", unit: "eps", series: [{ key: "eps", name: "Diluted EPS", mark: "bar", color: "company" }] }] },
  ],
  takeaways: { revenue: "Revenue was $1.40B in Q4 2026, up 16.7% on a year ago.", eps: null },
  source: "SEC filings, GAAP as reported",
  asOf: "Q4 2026",
};

const p = chartViewToPreview(earnings, "revenue");
assert.equal(p.headline, "Microchip: Income statement, revenue");
assert.equal(p.text, "Revenue was $1.40B in Q4 2026, up 16.7% on a year ago.");
assert.equal(p.chart?.kind, "column");
assert.equal(p.chart?.format, "usd");
assert.equal(p.chart?.series.length, 1, "the chart is the first pane only: one axis");
assert.equal(p.chart?.series[0].who, "company", "Microchip's own series is grey, never Avnet Green");
assert.equal(p.chart?.series[0].points.length, 8, "the latest eight quarters");
assert.equal(p.chart?.series[0].points.at(-1)?.label, "Q4 2026");
assert.deepEqual(p.columns, ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"]);
assert.deepEqual(
  p.facts?.map((f) => f.label),
  ["Revenue", "Growth on a year ago"],
  "every series in the tab is a row of figures",
);
assert.equal(p.facts?.[0].values.length, 4);
assert.equal(p.period, "latest Q4 2026");
assert.equal(p.hookups, undefined);
assert.ok(PreviewSchema.safeParse(p).success, "the adapter's output passes the tray's schema");

const e = chartViewToPreview(earnings, "eps");
assert.equal(e.chart?.kind, "column", "EPS is charted, as columns");
assert.equal(e.chart?.format, "eps", "in dollars and cents");
assert.equal(e.chart?.title, "Diluted EPS", "titled by its pane");
assert.equal(e.text, undefined, "no takeaway, no sentence");
assert.equal(e.facts?.[0].values.at(-1), "$0.66");

const pair: ChartData = {
  eyebrow: "Avnet vs Arrow · Scorecard",
  title: "Gross margin",
  company: "avnet",
  periods: ["Q1 2026", "Q2 2026", "Q3 2026"],
  series: { avnet: [0.105, null, 0.108], arrow: [0.11, 0.111, 0.112], gap: [-0.005, null, -0.004] },
  tabs: [
    {
      id: "trend",
      label: "Gross margin",
      panes: [
        {
          title: "Gross margin",
          unit: "pct",
          series: [
            { key: "avnet", name: "Avnet", mark: "line", color: "company" },
            { key: "arrow", name: "Arrow", mark: "line", color: 0 },
          ],
        },
        { title: "Gap", unit: "pts", series: [{ key: "gap", name: "Gap", mark: "bar", color: "muted" }] },
      ],
    },
  ],
  takeaways: { trend: null },
  source: "SEC filings, GAAP as reported",
};
const g = chartViewToPreview(pair);
assert.equal(g.headline, "Avnet vs Arrow: Gross margin", "one tab named like the view adds nothing to the title");
assert.equal(g.chart?.kind, "line");
assert.deepEqual(
  g.chart?.series.map((s) => s.who),
  ["avnet", "arrow"],
);
assert.deepEqual(
  g.chart?.series[0].points.map((x) => x.label),
  ["Q1 2026", "Q3 2026"],
  "only quarters both report",
);
assert.equal(g.facts?.[0].values[1], "n/a", "a gap in the figures reads n/a");

const share: ChartData = {
  eyebrow: "Share by segment · Mock",
  title: "Analog",
  company: "avnet",
  periods: ["Q3 2026"],
  series: { share: [0.044] },
  tabs: [{ id: "share", label: "Analog", panes: [{ title: "Avnet share", unit: "pct", series: [{ key: "share", name: "Avnet share", mark: "line", color: "company" }] }] }],
  takeaways: { share: null },
  source: "Avnet billings",
  hookups: ["billings"],
};
const s = chartViewToPreview(share);
assert.equal(s.chart?.kind, "bar", "one quarter is a bar, not a line");
assert.equal(s.chart?.series[0].who, "avnet");
assert.deepEqual(s.hookups, ["billings"]);
assert.equal(isMock({ preview: s }, register), true, "mock chart views make mock slides");
assert.equal(chartSlideTitle(share), "Share by segment: Analog");

console.log("tray.test.ts: ok");
