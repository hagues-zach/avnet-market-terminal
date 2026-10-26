// Download the cycle engine's long history: every FRED series in the catalog
// (keyless CSV) and quarterly revenue and operating income for the chip makers
// in Market Cycle's groups (SEC filings). Public data, committed under
// data/cycle/history so the engine runs without fetching. Rerun to refresh.
//
//   npx tsx scripts/fetch-history.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FRED_IDS, SERIES } from "../src/lib/cycle/catalog";
import { toMonthly, type CompanyQuarters } from "../src/lib/cycle/transform";
import { loadFromSec } from "../src/lib/data/live/earnings";
import { COMPANIES } from "../src/lib/data/live/earnings-model";

const ROOT = path.join(process.cwd(), "data", "cycle");
const HISTORY = path.join(ROOT, "history");
// The chip makers: AI and datacenter (platform, connectivity) against the rest of
// the manufacturers, which is the ex-AI cut; memory counts toward all chips only.
const CHIP_COHORTS = new Set(["manufacturer", "platform", "connectivity", "memory"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fred(id: string): Promise<{ date: string; value: number }[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
    if (res?.ok) {
      const rows = (await res.text()).trim().split("\n").slice(1);
      return rows.flatMap((r) => {
        const [date, v] = r.split(",");
        const value = Number(v);
        return v && v !== "." && Number.isFinite(value) ? [{ date, value }] : [];
      });
    }
    await sleep(2000 * attempt);
  }
  throw new Error(`FRED didn't return ${id}`);
}

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
  for (const c of COMPANIES.filter((x) => CHIP_COHORTS.has(x.cohort))) {
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

  writeFileSync(path.join(ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${FRED_IDS.length} FRED series and ${companies.length} chip makers for ${SERIES.length} catalog series.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
