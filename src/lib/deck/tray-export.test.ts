// Add to deck shipped as PowerPoint: a tray in, a deck on the Avnet template out.
// Run with: npx tsx src/lib/deck/tray-export.test.ts (needs the unzip command)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ChartData } from "@/lib/chart-view/model";
import { chartViewToPreview } from "@/lib/chart-view/to-preview";
import type { Hookup } from "@/lib/hookups";
import { buildDeck } from "./pptx";
import { trayDeckSlides, type TrayItem } from "./tray";

const register = [
  { id: "sec", status: "live" },
  { id: "billings", status: "mock" },
] as Hookup[];

const scorecard: ChartData = {
  eyebrow: "Avnet vs Arrow · Scorecard",
  title: "Gross margin",
  company: "avnet",
  periods: ["Q1 2026", "Q2 2026", "Q3 2026"],
  series: { avnet: [0.105, 0.106, 0.108], arrow: [0.11, 0.111, 0.112] },
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
      ],
    },
  ],
  takeaways: { trend: "Arrow's gross margin is 0.4 points above Avnet's." },
  source: "SEC filings, GAAP as reported",
  asOf: "Q3 2026",
};

const items: TrayItem[] = [
  {
    id: "chart:scorecard",
    kind: "chart",
    title: "Avnet vs Arrow: Gross margin",
    from: { page: "Avnet vs Arrow", href: "/competitive" },
    addedAt: "2026-11-25T10:00:00.000Z",
    preview: chartViewToPreview(scorecard),
    note: "Margins recovered, but Arrow still leads",
    included: true,
  },
  {
    id: "view:share",
    kind: "view",
    title: "Avnet's share of the segment",
    from: { page: "Market Share", href: "/market-share" },
    addedAt: "2026-11-25T10:01:00.000Z",
    preview: { headline: "Avnet holds 4.4% of analog", source: "Mock model of Avnet", hookups: ["billings"] },
    included: true,
  },
  {
    id: "view:cycle",
    kind: "view",
    title: "Where the cycle is",
    from: { page: "Market Cycle", href: "/cycle" },
    addedAt: "2026-11-25T10:02:00.000Z",
    preview: { headline: "Left out", source: "SEC filings" },
    included: false,
  },
];

const slides = trayDeckSlides(items, { title: "Microchip supplier review", audience: "Supplier pitch", date: "November 25, 2026" }, register);
assert.equal(slides.length, 4, "a cover, the two included slides and the sources");
assert.equal(slides[0].preview.headline, "Microchip supplier review");
assert.equal(slides[0].preview.text, "Supplier pitch, November 25, 2026");
assert.equal(slides[1].preview.headline, "Margins recovered, but Arrow still leads", "the reader's point is the title");
assert.equal(slides[1].mock, false);
assert.equal(slides[2].mock, true);
assert.equal(slides[3].kind, "sources");
assert.equal(slides[3].preview.lines?.length, 2, "the sources list only what ships");

const dir = mkdtempSync(path.join(tmpdir(), "tray-test-"));
(async () => {
  const file = path.join(dir, "deck.pptx");
  writeFileSync(file, await buildDeck("Microchip supplier review", slides));
  const list = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n");
  const read = (part: string) => execFileSync("unzip", ["-p", file, part], { encoding: "utf8" });
  const parts = list.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  assert.equal(parts.length, slides.length + 1, "then the template's closing slide");
  const text = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
  assert.match(text(read(parts[1])), /Margins recovered, but Arrow still leads/);
  assert.ok(!text(read(parts[1])).includes("Mock data"));
  assert.match(text(read(parts[2])), /Mock data/, "the mock slide says so");
  const charts = list.filter((p) => /^ppt\/charts\/chart\d+\.xml$/.test(p)).map(read);
  assert.equal(charts.length, 1, "a native chart for the chart view");
  assert.match(charts[0], /41C363/, "Avnet in Avnet Green");
  assert.match(charts[0], /<c:v>Arrow<\/c:v>/);
  console.log("tray-export.test.ts: ok");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
