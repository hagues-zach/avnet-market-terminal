// Download the cycle engine's long history: every FRED series in the catalog
// (keyless CSV) and quarterly revenue and operating income for the chip makers
// in Market Cycle's groups (SEC filings). Public data, committed under
// data/cycle/history so the engine runs without fetching. Rerun to refresh.
//
//   npx tsx scripts/fetch-history.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FRED_IDS, SERIES } from "../src/lib/cycle/catalog";
import { comtradeUrl, parseComtrade, periods } from "../src/lib/cycle/sources/comtrade";
import { MANUAL, monthsBehind, parseManualCsv } from "../src/lib/cycle/sources/manual";
import { parseSeaj, SEAJ_INDEX, seajFileUrl, seajLinks } from "../src/lib/cycle/sources/seaj";
import { toMonthly, type CompanyQuarters } from "../src/lib/cycle/transform";
import { existsSync, readFileSync } from "node:fs";
import { loadFromSec } from "../src/lib/data/live/earnings";
import { fred } from "../src/lib/data/live/fred";
import { COMPANIES } from "../src/lib/data/live/earnings-model";

const ROOT = path.join(process.cwd(), "data", "cycle");
const HISTORY = path.join(ROOT, "history");
// The chip makers: AI and datacenter (platform, connectivity) against the rest of
// the manufacturers, which is the ex-AI cut; memory counts toward all chips only.
const CHIP_COHORTS = new Set(["manufacturer", "platform", "connectivity", "memory"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(path.join(HISTORY, "fred"), { recursive: true });
  const manifest: Record<string, unknown> = { fetched: new Date().toISOString().slice(0, 10), vintage: "revised", note: "FRED serves revised data, so backtests use today's revised figures, not what was published at the time.", fred: {}, sec: {} };

  for (const id of FRED_IDS) {
    const monthly = toMonthly(await fred(id));
    writeFileSync(path.join(HISTORY, "fred", `${id}.json`), JSON.stringify(monthly.map((p) => [p.month, Math.round(p.value * 1e6) / 1e6])));
    (manifest.fred as Record<string, unknown>)[id] = { first: monthly[0]?.month, last: monthly.at(-1)?.month, months: monthly.length };
    console.log(`FRED ${id}: ${monthly.length} months, ${monthly[0]?.month} to ${monthly.at(-1)?.month}`);
    await sleep(300);
  }

  const companies: CompanyQuarters[] = [];
  // US GAAP filers only, as in the Market Cycle rollups (src/lib/data/live/cycle.ts).
  for (const c of COMPANIES.filter((x) => CHIP_COHORTS.has(x.cohort) && !x.foreign)) {
    try {
      const e = await loadFromSec(c);
      companies.push({
        slug: c.slug,
        cohort: c.cohort,
        quarters: e.quarters.map((q) => ({
          quarter: q.calendarLabel,
          revenue: q.values.revenue,
          operatingIncome: q.values.revenue !== undefined && q.values.operatingMargin !== undefined ? q.values.revenue * q.values.operatingMargin : undefined,
        })),
      });
      console.log(`SEC ${c.name}: ${e.quarters.length} quarters`);
    } catch (err) {
      console.warn(`SEC ${c.name}: skipped (${err instanceof Error ? err.message : err})`);
    }
    await sleep(250); // SEC asks for no more than ten requests a second
  }
  writeFileSync(path.join(HISTORY, "sec-companies.json"), JSON.stringify(companies));
  manifest.sec = { companies: companies.length, cohorts: [...CHIP_COHORTS] };

  const failed: { source: string; reason: string }[] = [];
  const fail = (source: string, e: unknown) => {
    failed.push({ source, reason: e instanceof Error ? e.message : String(e) });
    console.warn(`${source}: kept the previous file (${failed.at(-1)!.reason})`);
  };

  // SEAJ: the statistics page links the workbooks; keep the semiconductor one.
  try {
    // The .xls reader is optional: SheetJS (xlsx) has to be installed for this step.
    const reader = "xlsx"; // a variable, so the app builds without the package
    const XLSX = (await import(reader).catch(() => null)) as null | { read: (b: ArrayBuffer, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> }; utils: { sheet_to_json: (s: unknown, o: object) => unknown[][] } };
    if (!XLSX) throw new Error("The xlsx reader isn't installed; see docs/cycle-engine.md");
    const index = await (await fetch(SEAJ_INDEX, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
    let done = false;
    for (const href of seajLinks(index)) {
      const book = XLSX.read(await (await fetch(seajFileUrl(href), { headers: { "User-Agent": "Mozilla/5.0" } })).arrayBuffer(), { type: "array" });
      for (const name of book.SheetNames) {
        // Formatted text, so growth rates keep their % and drop out of the values.
        const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false }) as (string | null)[][];
        try {
          const months = parseSeaj(rows);
          writeFileSync(path.join(HISTORY, "seaj.json"), JSON.stringify(months));
          manifest.seaj = { first: months[0]?.month, last: months.at(-1)?.month, months: months.length };
          console.log(`SEAJ: ${months.length} months, ${months[0]?.month} to ${months.at(-1)?.month}`);
          done = true;
          break;
        } catch {
          // Not the semiconductor sheet.
        }
      }
      if (done) break;
    }
    if (!done) throw new Error("No semiconductor equipment sheet found");
  } catch (e) {
    fail("SEAJ", e);
  }

  // Comtrade: Korea's chip exports, only the months not already held; one call every 6 seconds.
  try {
    const file = path.join(HISTORY, "comtrade-kr-8542.json");
    const held = new Map<string, number>(existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as [string, number][]) : []);
    const today = new Date().toISOString().slice(0, 7);
    let empties = 0;
    for (const p of periods("2013-01", today)) {
      const month = `${p.slice(0, 4)}-${p.slice(4)}`;
      if (held.has(month)) continue;
      let r = parseComtrade(await (await fetch(comtradeUrl(p))).json().catch(() => null));
      for (let tries = 0; r.kind === "rate-limited" && tries < 5; tries++) {
        await sleep((r.retryAfter + 2) * 1000);
        r = parseComtrade(await (await fetch(comtradeUrl(p))).json().catch(() => null));
      }
      if (r.kind === "value") {
        held.set(month, r.value);
        empties = 0;
      } else if (r.kind === "none") empties += 1;
      else throw new Error(r.kind === "error" ? r.message : "Rate limited");
      // Three empty months after data means Comtrade hasn't caught up further.
      if (empties >= 3 && held.size) break;
      await sleep(6000);
    }
    const rows = [...held.entries()].sort(([a], [b]) => a.localeCompare(b));
    writeFileSync(file, JSON.stringify(rows));
    manifest.comtrade = { first: rows[0]?.[0], last: rows.at(-1)?.[0], months: rows.length };
    console.log(`Comtrade Korea 8542: ${rows.length} months, ${rows[0]?.[0]} to ${rows.at(-1)?.[0]}`);
  } catch (e) {
    fail("UN Comtrade", e);
  }

  // Manual sources: nothing to fetch; record how current each file is.
  manifest.manual = MANUAL.map((m) => {
    const file = path.join(ROOT, "manual", `${m.key}.csv`);
    if (!existsSync(file)) return { key: m.key, status: "missing" };
    const read = parseManualCsv(readFileSync(file, "utf8"));
    return { key: m.key, latest: read.latest, behind: monthsBehind(read.latest, new Date().toISOString().slice(0, 10)), bad: read.bad.length };
  });
  manifest.failed = failed;

  writeFileSync(path.join(ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${FRED_IDS.length} FRED series and ${companies.length} chip makers for ${SERIES.length} catalog series.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
