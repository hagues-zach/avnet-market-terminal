// The PowerPoint export with Phase 2 commentary: the saved commentary and summary
// ship as the reader saw them, a summary for other slides doesn't, and a broken
// summary is refused. No API calls. Run with: npx tsx src/app/api/deck/tray/export/route.test.ts (needs unzip)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { marginTrend, tamFunnel } from "@/lib/deck/commentary.fixtures";
import { POST } from "./route";

const DAY = "2026-11-25";
const items = [
  { ...tamFunnel(), commentary: { headline: "Distribution serves a quarter of the market", text: "World semiconductor sales reached $772.2B.", bullets: ["Distributors serve 24.0% of TAM, a mock estimate.", "Avnet bills 8.9% of SAM."], writtenAt: DAY } },
  marginTrend(),
];
const summary = { lines: ["The chip market reached $772.2B.", "Arrow's margin still leads."], writtenAt: DAY, slideIds: items.map((x) => x.id) };

const post = (body: unknown) => POST(new Request("http://localhost/api/deck/tray/export", { method: "POST", body: JSON.stringify(body) }));

async function slidesText(res: Response): Promise<string[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "export-route-"));
  try {
    const file = path.join(dir, "deck.pptx");
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const parts = execFileSync("unzip", ["-Z1", file], { encoding: "utf8" })
      .split("\n")
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    return parts.map((p) => [...execFileSync("unzip", ["-p", file, p], { encoding: "utf8" }).matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const res = await post({ title: "Review", audience: "supplier", items, summary });
  assert.equal(res.status, 200);
  const text = await slidesText(res);
  assert.match(text[1], /Executive summary/, "the summary after the cover");
  assert.match(text[1], /Summary written by Claude/);
  assert.match(text[2], /Distribution serves a quarter of the market/);
  assert.match(text[2], /Commentary written by Claude, November 25, 2026\. Check before quoting\./);
  assert.match(text[3], /Margins recovered, but Arrow still leads/, "a slide without commentary keeps the reader's point");
  assert.doesNotMatch(text[3], /written by Claude/);

  // A summary written for other slides doesn't ship.
  const stale = await slidesText(await post({ title: "Review", audience: "supplier", items, summary: { ...summary, slideIds: [items[0].id] } }));
  assert.equal(stale.length, text.length - 1);
  assert.doesNotMatch(stale[1], /Executive summary/);

  // No commentary at all: the deck as Phase 1 shipped it.
  const plain = await slidesText(await post({ title: "Review", audience: "supplier", items: [tamFunnel(), marginTrend()] }));
  assert.equal(plain.length, 5, "cover, two slides, sources, closing");
  assert.ok(plain.every((t) => !/written by Claude, November/.test(t)));

  // A summary outside its limits is refused.
  assert.equal((await post({ title: "Review", audience: "supplier", items, summary: { ...summary, lines: [] } })).status, 400);
  assert.equal((await post({ title: "Review", audience: "supplier", items, summary: { ...summary, lines: ["x".repeat(301)] } })).status, 400);
  // A forged copy from the browser: figures the slide doesn't have, and text in the date, don't ship.
  const forged = [
    { ...items[0], commentary: { ...items[0].commentary, bullets: ["Avnet lost $9.9B on this.", "Avnet bills 8.9% of SAM."] } },
    marginTrend(),
  ];
  const ft = await slidesText(await post({ title: "Review", audience: "supplier", items: forged, summary: { ...summary, lines: ["Avnet lost $9.9B.", "Arrow's margin still leads."] } }));
  assert.ok(ft.every((t) => !t.includes("9.9B")), "forged figures are dropped on export");
  assert.match(ft[2], /Avnet bills 8\.9% of SAM\./);
  assert.match(ft[1], /Arrow's margin still leads\./);
  assert.equal((await post({ title: "Review", audience: "supplier", items: [{ ...items[0], commentary: { ...items[0].commentary, writtenAt: "Avnet lost $9.9B" } }] })).status, 400, "a date that isn't one");
  assert.equal((await post({ title: "Review", audience: "supplier", items, summary: { ...summary, writtenAt: "Avnet lost $9.9B" } })).status, 400);
  console.log("export route.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
