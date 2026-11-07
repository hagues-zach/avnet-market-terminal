// Local demo data for the morning brief on Market News, free: the fixture day's
// corpus stored as today's, its recorded summaries, and every test profile's clips
// voiced by macOS's own `say` voice (or a tone elsewhere), never Google. Writes
// only to this checkout's .cache (not committed); the next real corpus job
// replaces today's corpus.
//
//   npx tsx scripts/brief-demo.ts            seed today's demo brief
//   npx tsx scripts/brief-demo.ts --no-audio corpus and summaries only (the "audio off" state)

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { toWav } from "../src/lib/brief/audio";
import { CORPUS_NS, easternDate, type Corpus } from "../src/lib/brief/corpus";
import { FIXTURES } from "../src/lib/brief/fixtures";
import { TEST_PROFILES } from "../src/lib/brief/profile";
import { planBrief } from "../src/lib/brief/rank";
import { buildScript } from "../src/lib/brief/script";
import { SUMMARY_NS } from "../src/lib/brief/synthesis";
import { fixtureSummaries } from "../src/lib/brief/synthesis-eval";
import { fileClips, renderStitched, SAMPLE_RATE, type Synthesize } from "../src/lib/brief/tts";
import { store } from "../src/lib/store";

if ((process.env.STORE_ADAPTER ?? "file") !== "file") throw new Error("Demo data goes to the local file store only; unset STORE_ADAPTER.");

const tmp = mkdtempSync(path.join(tmpdir(), "brief-demo-"));
const localVoice: Synthesize = async (text) => {
  try {
    const out = path.join(tmp, "clip.wav");
    execFileSync("say", ["-o", out, "--file-format=WAVE", `--data-format=LEI16@${SAMPLE_RATE}`, text]);
    return readFileSync(out);
  } catch {
    const n = Math.round((text.length / 15) * SAMPLE_RATE);
    return toWav({ sampleRate: SAMPLE_RATE, samples: Int16Array.from({ length: n }, (_, i) => Math.round(3000 * Math.sin((2 * Math.PI * 220 * i) / SAMPLE_RATE))) });
  }
};

async function main() {
  const date = easternDate(new Date());
  const corpus: Corpus = { ...FIXTURES.normal, date };
  await store.set<Corpus>(CORPUS_NS, date, corpus);
  const summaries = fixtureSummaries();
  await store.setMany(SUMMARY_NS, summaries);
  console.log(`Stored the fixture corpus as ${date} and ${Object.keys(summaries).length} summaries.`);
  if (process.argv.includes("--no-audio")) return;
  for (const p of TEST_PROFILES) {
    const r = await renderStitched(buildScript(planBrief(corpus, p), p, summaries), { synthesize: localVoice, clips: fileClips() });
    console.log(`${p.id}: ${(r.seconds / 60).toFixed(1)} min, ${r.chapters.length} chapters`);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => rmSync(tmp, { recursive: true, force: true }));
