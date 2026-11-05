// Read the Taiwan MOPS filers' quarterly statements into a committed snapshot
// (src/lib/data/live/foreign/mops-snapshot.json), so profiles render without
// fetching MOPS's multi-MB pages. Rerun after each filing deadline (mid-May,
// mid-August, mid-November, end of March); between runs, the latest season's
// income comes from TWSE's OpenAPI at request time. Takes several minutes.
//
//   npx tsx scripts/fetch-mops.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import { COMPANIES } from "../src/lib/data/live/earnings-model";
import { fetchMops, mopsSeasons } from "../src/lib/data/live/foreign/mops";
import type { ConceptFact } from "../src/lib/data/live/foreign/st-6k";

const OUT = path.join(process.cwd(), "src/lib/data/live/foreign/mops-snapshot.json");
// Three full years plus this one, so a year-ago comparison exists for every quarter kept.
const YEARS = 3;

async function main() {
  const seasons = mopsSeasons(YEARS);
  const companies: Record<string, ConceptFact[]> = {};
  for (const c of COMPANIES) {
    if (c.foreign?.source !== "mops") continue;
    const started = Date.now();
    companies[c.foreign.coId] = await fetchMops(c.foreign.coId, seasons);
    const ends = new Set(companies[c.foreign.coId].map((f) => f.end));
    console.log(`${c.name}: ${companies[c.foreign.coId].length} facts, ${ends.size} period ends, ${Math.round((Date.now() - started) / 1000)}s`);
  }
  writeFileSync(OUT, `${JSON.stringify({ fetched: new Date().toISOString().slice(0, 10), seasons, companies })}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
