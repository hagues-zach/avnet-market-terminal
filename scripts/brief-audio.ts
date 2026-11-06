// The B4 listening test: renders one test profile's brief two ways with Google
// Cloud Text-to-Speech, stitched from shared clips and as whole-brief audio, and
// writes both to .cache/brief-audio/out/ (WAV, plus MP3 when ffmpeg is installed)
// with their chapter marks. Listen to the joins between stories and chapters.
//
//   npx tsx scripts/brief-audio.ts --fixture                       free summaries: the recorded ones, a short brief
//   npx tsx scripts/brief-audio.ts                                 today's corpus and stored summaries (scripts/summarize-corpus.ts first)
//   npx tsx scripts/brief-audio.ts --profile power-analog-seller --voice en-US-Neural2-F
//
// Needs GOOGLE_TTS_API_KEY (environment, .env.local or .env). Spends Text-to-Speech
// characters, printed at the end: a 10-minute brief both ways is about 18,000.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getCorpus } from "../src/lib/brief/corpus";
import { FIXTURES } from "../src/lib/brief/fixtures";
import { TEST_PROFILES } from "../src/lib/brief/profile";
import { CHAPTER_TITLES, planBrief } from "../src/lib/brief/rank";
import { buildScript } from "../src/lib/brief/script";
import { fixtureSummaries } from "../src/lib/brief/synthesis-eval";
import { store } from "../src/lib/store";
import { SUMMARY_NS, type StorySummary } from "../src/lib/brief/synthesis";
import { fileClips, googleTts, renderStitched, renderWhole, type RenderedBrief } from "../src/lib/brief/tts";

const ROOT = path.resolve(__dirname, "..");
for (const file of [".env.local", ".env"]) if (existsSync(path.join(ROOT, file))) process.loadEnvFile(path.join(ROOT, file));

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

function save(dir: string, name: string, r: RenderedBrief) {
  const wav = path.join(dir, `${name}.wav`);
  writeFileSync(wav, r.wav);
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "64k", path.join(dir, `${name}.mp3`)]);
  } catch {
    // No ffmpeg: the WAV is enough to listen to.
  }
  const marks = r.chapters.map((c) => `${Math.floor(c.startSeconds / 60)}:${String(Math.round(c.startSeconds % 60)).padStart(2, "0")} ${CHAPTER_TITLES[c.chapter]}`);
  writeFileSync(path.join(dir, `${name}.chapters.txt`), marks.join("\n") + "\n");
  const chars = r.characters.shared + r.characters.personal;
  console.log(`${name}: ${(r.seconds / 60).toFixed(1)} min; ${chars} characters voiced (${r.characters.shared} shared, ${r.characters.personal} personal, ${r.characters.reused} reused); about $${r.dollars.toFixed(3)} at list price`);
  for (const m of marks) console.log(`  ${m}`);
  if (r.dropped.length) console.log(`  cut for length: ${r.dropped.join(", ")}`);
}

async function main() {
  const profile = TEST_PROFILES.find((p) => p.id === (arg("profile") ?? "power-analog-seller"));
  if (!profile) throw new Error(`No test profile. Use one of: ${TEST_PROFILES.map((p) => p.id).join(", ")}`);
  if (arg("voice")) profile.voice = arg("voice")!;

  const fixture = process.argv.includes("--fixture");
  const corpus = fixture ? FIXTURES.normal : await getCorpus();
  if (!corpus) throw new Error("No corpus for today. Run scripts/build-corpus.ts, or pass --fixture.");
  const summaries: Record<string, StorySummary> = fixture ? fixtureSummaries() : await store.getAll<StorySummary>(SUMMARY_NS);
  const script = buildScript(planBrief(corpus, profile), profile, summaries);
  if (script.missing.length) console.log(`No summary yet for ${script.missing.length} picked stories; they are left out.`);

  const synthesize = googleTts();
  const dir = path.join(ROOT, ".cache", "brief-audio", "out");
  mkdirSync(dir, { recursive: true });
  const base = `${corpus.date}-${profile.id}-${profile.voice}`;
  save(dir, `${base}-stitched`, await renderStitched(script, { synthesize, clips: fileClips() }));
  save(dir, `${base}-whole`, await renderWhole(script, { synthesize }));
  console.log(`\nWritten to ${dir}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
