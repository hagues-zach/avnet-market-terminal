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
    mock: false,
    preview: {
      headline: "The chain, from customers back to equipment",
      panels: [
        {
          title: "Distributors",
          detail: "Electronic components distribution. 6 of 6 reported",
          metrics: [
            { label: "Revenue growth YoY", value: "+18.1%", change: "+4.0 pts", tone: "good", period: "on prior qtr", large: true },
            { label: "Inventory days", value: "77", change: "\u221216d", tone: "good", period: "YoY" },
          ],
          notes: [{ title: "Avnet", value: "+47.7%", text: "Inventory 77 days (\u221216d YoY), margin 4.4%", marker: "#41C363" }],
          spark: { label: "Growth, last 8 quarters", values: [-0.1, -0.05, 0.02, 0.18] },
        },
        { kicker: "SOM, Avnet", tag: "Mock", tagMock: true, figure: { value: "$16.4B", note: "Avnet billings" }, bar: { share: 0.118, color: "#41C363", label: "11.8% of SAM" } },
        {
          title: "By WSTS category",
          rowRules: true,
          rows: [
            {
              title: "Gross margin",
              strong: true,
              markers: [{ text: "Avnet 10.4%", color: "#41C363", strong: true }, { text: "Arrow 11.3%", color: "#4273B8" }],
              text: "Avnet's gross margin is lower.",
              lines: [{ values: [1, 3, 2, null, 4], color: "#4273B8" }, { values: [2, 1, 3, 4, 5], color: "#41C363", width: 2 }],
            },
          ],
          table: { columns: ["Category", "Sales", "Growth"], rows: [{ label: "Logic", cells: ["$295.9B", { change: "+39.9%", tone: "plain" }] }] },
          bars: { labels: ["Q1", "Q2"], values: [1, 2], valueLabels: ["$1B", "$2B"], color: "#919191" },
          pairs: [{ label: "Microsoft", value: "+103.0%" }],
        },
      ],
      source: "SEC filings",
    },
  },
  {
    kind: "sources",
    mock: false,
    preview: { headline: "Sources", lines: ["Company at a glance: SEC filings, Q2 2026", "Avnet's business: Mock model of Avnet (mock data)"], source: "This deck" },
  },
];

const texts0 = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
const slideParts0 = (list: string[]) => list.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

const dir = mkdtempSync(path.join(tmpdir(), "deck-test-"));
try {
  (async () => {
    const file = path.join(dir, "deck.pptx");
    const bytes = await buildDeck("Supplier pitch for Microchip", slides);
    writeFileSync(file, bytes);
    assert.equal(bytes.subarray(0, 2).toString(), "PK", "a zip file");

    const list = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n");
    const read = (part: string) => execFileSync("unzip", ["-p", file, part], { encoding: "utf8" });
    assert.ok(list.includes("[Content_Types].xml"), "OOXML content types");
    const slideParts = list.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    assert.equal(slideParts.length, slides.length + 1, "one slide per entry, then the closing slide");
    assert.equal(list.filter((p) => /^ppt\/charts\/chart\d+\.xml$/.test(p)).length, 2, "a native chart for each chart slide");

    // Each slide on the template layout its content calls for, the closing slide last.
    const layoutName = (n: number) => {
      const target = read(`ppt/slides/_rels/slide${n}.xml.rels`).match(/slideLayouts\/(slideLayout\d+\.xml)/)![1];
      return read(`ppt/slideLayouts/${target}`).match(/<p:cSld name="([^"]*)"/)![1].replace(/&amp;/g, "&");
    };
    assert.deepEqual(
      slides.map((_, i) => layoutName(i + 1)),
      ["Cover - Full Image - 1 Line", "Title and Subhead - 1 Line", "2-Line Title", "Title and Subhead - 1 Line", "2 Column - 1 Line", "1 Line - Title", "Basic - 1 Line"],
    );
    assert.equal(layoutName(slides.length + 1), "Closing");
    // A chart with key figures beside it: the side panel's figures are written, and its title is the comparison's.
    assert.match(texts0(read(slideParts0(list)[1])), /KEY FIGURES[\s\S]*\$1\.48B/, "the key figures beside the chart");
    assert.match(texts0(read(slideParts0(list)[2])), /Revenue growth on a year ago/, "a comparison chart is titled by what it measures");
    assert.match(read("ppt/slides/slide2.xml"), /<p:ph type="title"\/>[\s\S]*?Microchip grew 38\.0%/, "headlines fill the title placeholder");
    assert.ok(!list.some((p) => /slideLayout(9|42|65|102)\.xml$/.test(p)), "no slash pattern layouts");
    // Panels are native shapes and text, as the page draws them: no picture, no chart.
    const panelsXml = read(slideParts0(list)[5]);
    const panelsText = texts0(panelsXml);
    for (const want of ["Distributors", "REVENUE GROWTH YOY", "+18.1%", "\u2191 +4.0 pts", "on prior qtr", "\u2193 \u221216d", "Inventory 77 days", "GROWTH, LAST 8 QUARTERS", "SOM, AVNET", "$16.4B", "11.8% of SAM", "Mock"])
      assert.ok(panelsText.includes(want), `the panels slide shows ${want}: ${panelsText}`);
    assert.ok(!/<p:pic>|<c:chart/.test(panelsXml), "panels drawn natively");
    for (const want of ["Gross margin", "Avnet 10.4%", "Avnet&apos;s gross margin is lower.", "CATEGORY", "Logic", "\u2191 +39.9%", "$2B", "Q2", "Microsoft", "+103.0%"])
      assert.ok(panelsText.includes(want), `the panels slide shows ${want}`);
    assert.ok((panelsXml.match(/prst="line"/g) ?? []).length >= 7, "the row's line chart as native strokes");
    assert.match(panelsXml, /flipV="1"/, "rising strokes flipped");
    assert.match(panelsXml, /prst="roundRect"[\s\S]*?prstDash val="dash"/, "the Mock tag a dashed pill");
    assert.ok((panelsXml.match(/prst="rect"/g) ?? []).length >= 6, "the spark's bars, the share bar and the marker");

    const text = (xml: string) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ");
    const texts = slideParts.slice(0, slides.length).map((p) => text(read(p)));
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

    // A chart slide whose bullets won't fit beside the key figures: they go in a strip under the chart, on the slide.
    const lines = [
      "This slide is on mock data, so these are not Avnet's real results.",
      "Mock billings rose each quarter, from $5.79B in FY26 Q2 to $6.58B in FY27 Q1.",
      "Mock bookings rose from $6.14B to $7.17B over the same four quarters.",
      "Connect real sources before using these figures outside the team.",
    ];
    const q = ["FY25 Q2", "FY25 Q3", "FY25 Q4", "FY26 Q1", "FY26 Q2", "FY26 Q3", "FY26 Q4", "FY27 Q1"];
    const pts = (v: number[]) => v.map((value, i) => ({ label: q[i], value }));
    const stripFile = path.join(dir, "strip.pptx");
    writeFileSync(
      stripFile,
      await buildDeck("Strip", [
        {
          mock: true,
          preview: {
            headline: "Mock data shows bookings staying ahead of billings in every quarter shown",
            text: "In the mock model, FY27 Q1 billings reached $6.58B and bookings $7.17B, up 25% on a year ago.",
            columns: q.slice(4),
            facts: [
              { label: "Billings", values: ["$5.79B", "$6.02B", "$6.31B", "$6.58B"] },
              { label: "Bookings", values: ["$6.14B", "$6.51B", "$6.94B", "$7.17B"] },
            ],
            chart: { kind: "line", format: "usd", series: [{ name: "Billings", who: "avnet", points: pts([5.48, 5.4, 5.42, 5.56, 5.79, 6.02, 6.31, 6.58].map((x) => x * 1e9)) }, { name: "Bookings", who: "market", points: pts([5.15, 5.22, 5.42, 5.73, 6.14, 6.51, 6.94, 7.17].map((x) => x * 1e9)) }] },
            lines,
            source: "Mock model of Avnet",
          },
        },
      ]),
    );
    const stripXml = execFileSync("unzip", ["-p", stripFile, "ppt/slides/slide1.xml"], { encoding: "utf8" });
    const EMU = 914400;
    const shape = stripXml.split("<p:sp>").find((sp) => sp.includes("Connect real sources"))!;
    assert.ok(shape.includes("This slide is on mock data"), "all four bullets in one box");
    const [, x, y] = shape.match(/<a:off x="(\d+)" y="(\d+)"/)!.map(Number);
    const [, cx, cy] = shape.match(/<a:ext cx="(\d+)" cy="(\d+)"/)!.map(Number);
    assert.ok((y + cy) / EMU <= 5.12 + 1e-6, `the strip ends on the slide body: ${(y + cy) / EMU}`);
    assert.ok(x / EMU < 0.6 && cx / EMU > 5 && (x + cx) / EMU < 6.5, `under the chart, clear of the key figures: ${x / EMU} to ${(x + cx) / EMU}`);
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
