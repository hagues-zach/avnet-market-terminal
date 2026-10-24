// The PowerPoint export: build a deck from fixed previews and read the file back.
// Run with: npx tsx src/lib/deck/pptx.test.ts (needs the unzip command, standard on macOS and Linux)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildDeck, type DeckSlide } from "./pptx";

const slides: DeckSlide[] = [
  { kind: "cover", mock: false, preview: { headline: "Microchip and Avnet", text: "Supplier pitch, Oct 23", source: "This deck" } },
  {
    mock: false,
    preview: {
      headline: "Microchip grew 38.0% on a year ago",
      text: "Revenue was $1.48B in Q2 2026 — with a 63.2% gross margin.",
      facts: [
        { label: "Revenue", values: ["$1.48B"] },
        { label: "Gross margin", values: ["63.2%"] },
      ],
      chart: {
        kind: "column",
        format: "usd",
        series: [{ name: "Microchip revenue", who: "company", points: [{ label: "Q1 2026", value: 1.3e9 }, { label: "Q2 2026", value: 1.48e9 }] }],
      },
      source: "SEC filings",
      period: "Q2 2026",
    },
  },
  {
    mock: false,
    preview: {
      headline: "Avnet grew faster, Arrow kept the higher margins",
      columns: ["Avnet", "Arrow", "Leads"],
      facts: [
        { label: "Gross margin", values: ["10.4%", "11.3%", "Arrow"] },
        { label: "Free cash flow margin", values: ["n/a", "3.0%", "n/a"] },
      ],
      chart: {
        kind: "bar",
        format: "pct",
        series: [
          { name: "Avnet", who: "avnet", points: [{ label: "Revenue growth on a year ago", value: 0.477 }] },
          { name: "Arrow", who: "arrow", points: [{ label: "Revenue growth on a year ago", value: 0.318 }] },
        ],
      },
      source: "SEC filings",
      period: "Q2 2026",
    },
  },
  {
    mock: true,
    preview: {
      headline: "Avnet's business with Microchip",
      text: "Microchip as a supplier to Avnet.",
      facts: [{ label: "Backlog", values: ["$221.5M"] }],
      source: "Mock model of Avnet",
      period: "Last 12 months",
    },
  },
  {
    mock: false,
    preview: {
      headline: "Talking points for Microchip, on lead times",
      groups: [
        { title: "Talking points", lines: ["Lead times are the open item."] },
        { title: "Questions to ask", lines: ["What lead times are you quoting?"] },
      ],
      claude: { label: "Written by Claude for QBR Prep from the brief", date: "Oct 23" },
      source: "QBR Prep, written by Claude",
    },
  },
  {
    kind: "sources",
    mock: false,
    preview: { headline: "Sources", lines: ["Company at a glance: SEC filings, Q2 2026", "Avnet's business: Mock model of Avnet (mock data)"], source: "This deck" },
  },
];

// A 1x1 PNG stands in for the logo, so the test doesn't depend on the working directory.
const PIXEL = "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const dir = mkdtempSync(path.join(tmpdir(), "deck-test-"));
try {
  (async () => {
    const file = path.join(dir, "deck.pptx");
    const bytes = await buildDeck("Supplier pitch for Microchip", slides, PIXEL);
    writeFileSync(file, bytes);
    assert.equal(bytes.subarray(0, 2).toString(), "PK", "a zip file");

    const list = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n");
    const read = (part: string) => execFileSync("unzip", ["-p", file, part], { encoding: "utf8" });
    assert.ok(list.includes("[Content_Types].xml"), "OOXML content types");
    const slideParts = list.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    assert.equal(slideParts.length, slides.length, "one slide per entry");
    assert.equal(list.filter((p) => /^ppt\/charts\/chart\d+\.xml$/.test(p)).length, 2, "a native chart for each chart slide");
    assert.ok(list.some((p) => p.startsWith("ppt/media/")), "the logo is embedded");

    const text = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
    const texts = slideParts.map((p) => text(read(p)));
    texts.forEach((s, i) => assert.ok(s.includes(slides[i].preview.headline.replace(/'/g, "&apos;")) || s.includes(slides[i].preview.headline), `slide ${i + 1} in order`));
    texts.forEach((s, i) => assert.equal(s.includes("Mock data"), slides[i].mock, `Mock data only on mock slides (slide ${i + 1})`));
    // "n/a" is the app's word for a missing value; any other slash, middle dot or dash is not allowed.
    for (const s of texts) assert.ok(!/[/·—–]/.test(s.replace(/\bn\/a\b/g, "")), `no slash, middle dot or dash: ${s}`);
    assert.match(texts[1], /in Q2 2026, with a 63\.2%/, "dashes rewritten");
    assert.match(texts[4], /Written by Claude/, "Claude text labelled");
    // Chart part numbers run on across decks in one process, so find each chart by its series.
    const charts = list.filter((p) => /^ppt\/charts\/chart\d+\.xml$/.test(p)).map(read);
    const avnetChart = charts.find((x) => x.includes("<c:v>Avnet</c:v>"))!;
    const companyChart = charts.find((x) => x.includes("Microchip revenue"))!;
    assert.match(avnetChart, /41C363/, "Avnet in Avnet Green");
    assert.ok(!/41C363/.test(companyChart), "no Avnet Green on another company's chart");
    console.log("deck pptx: ok");
  })()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => rmSync(dir, { recursive: true, force: true }));
} catch (e) {
  rmSync(dir, { recursive: true, force: true });
  throw e;
}
