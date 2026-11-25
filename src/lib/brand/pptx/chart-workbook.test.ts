// The workbook behind each exported chart. pptxgenjs embeds one that PowerPoint,
// Keynote and Quick Look can't read, and they drop the chart with it; the
// assembler rebuilds it from the chart's cached values. Run with:
// npx tsx src/lib/brand/pptx/chart-workbook.test.ts (needs the unzip command)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { buildDeck } from "@/lib/deck/pptx";
import { chartWorkbook } from "./assemble";

// From the chart's caches: names across row 1, categories down column A, values beside them.
const chartXml = `<c:chartSpace><c:chart><c:plotArea><c:lineChart>
<c:ser><c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Avnet</c:v></c:pt></c:strCache></c:strRef></c:tx>
<c:cat><c:multiLvlStrRef><c:f>Sheet1!$A$2:$A$3</c:f><c:multiLvlStrCache><c:ptCount val="2"/><c:lvl><c:pt idx="0"><c:v>Q1 &amp; Q2</c:v></c:pt><c:pt idx="1"><c:v>Q3</c:v></c:pt></c:lvl></c:multiLvlStrCache></c:multiLvlStrRef></c:cat>
<c:val><c:numRef><c:f>Sheet1!$B$2:$B$3</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>0.08</c:v></c:pt><c:pt idx="1"><c:v>0.054</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
<c:ser><c:tx><c:strRef><c:f>Sheet1!$C$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Arrow</c:v></c:pt></c:strCache></c:strRef></c:tx>
<c:cat><c:multiLvlStrRef><c:f>Sheet1!$A$2:$A$3</c:f><c:multiLvlStrCache><c:ptCount val="2"/><c:lvl><c:pt idx="0"><c:v>Q1 &amp; Q2</c:v></c:pt><c:pt idx="1"><c:v>Q3</c:v></c:pt></c:lvl></c:multiLvlStrCache></c:multiLvlStrRef></c:cat>
<c:val><c:numRef><c:f>Sheet1!$C$2:$C$3</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>0.079</c:v></c:pt><c:pt idx="1"><c:v>0.064</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
</c:lineChart></c:plotArea></c:chart></c:chartSpace>`;

const sheetOf = (bytes: Uint8Array) => {
  const book = XLSX.read(bytes, { type: "array" });
  assert.deepEqual(book.SheetNames, ["Sheet1"], "one sheet, named as the chart's references expect");
  return XLSX.utils.sheet_to_json<(string | number)[]>(book.Sheets.Sheet1, { header: 1, defval: "" });
};

assert.deepEqual(sheetOf(chartWorkbook(chartXml)), [
  ["", "Avnet", "Arrow"],
  ["Q1 & Q2", 0.08, 0.079],
  ["Q3", 0.054, 0.064],
]);

// Every chart in an exported deck carries a workbook that opens.
const dir = mkdtempSync(path.join(tmpdir(), "chart-book-"));
(async () => {
  const file = path.join(dir, "deck.pptx");
  writeFileSync(
    file,
    await buildDeck("Workbook check", [
      {
        mock: false,
        preview: {
          headline: "Revenue",
          chart: { kind: "column", format: "usd", series: [{ name: "Revenue", who: "company", points: [{ label: "Q1", value: 1e9 }, { label: "Q2", value: 1.2e9 }] }] },
          source: "SEC",
        },
      },
    ]),
  );
  const books = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" }).split("\n").filter((p) => /^ppt\/embeddings\/.+\.xlsx$/.test(p));
  assert.equal(books.length, 1);
  const bytes = execFileSync("unzip", ["-p", file, books[0]]);
  assert.deepEqual(sheetOf(new Uint8Array(bytes)), [["", "Revenue"], ["Q1", 1e9], ["Q2", 1.2e9]], "the deck's workbook holds the chart's data");
  console.log("chart-workbook.test.ts: ok");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
