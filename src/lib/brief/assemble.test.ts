// The page's brief assembly: corpus, plan, stored summaries and stored clips put
// together without calling Claude or Google. Run with: npx tsx src/lib/brief/assemble.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Store } from "@/lib/store";
import { assembleBrief, briefKey, fileBriefs, isBriefKey, MORE_MAX, type BriefAudioMeta, type BriefAudioStore } from "./assemble";
import { toWav } from "./audio";
import { CORPUS_NS, type Corpus } from "./corpus";
import { BUILT_AT, FIXTURES } from "./fixtures";
import { TEST_PROFILES } from "./profile";
import { planBrief } from "./rank";
import { buildScript } from "./script";
import { SUMMARY_NS, type StorySummary } from "./synthesis";
import { fixtureSummaries } from "./synthesis-eval";
import { clipId, renderStitched, SAMPLE_RATE, type ClipStore, type Synthesize } from "./tts";

const now = new Date(BUILT_AT);
const profile = (id: string) => TEST_PROFILES.find((p) => p.id === id)!;

function memoryStore(data: Record<string, Record<string, unknown>> = {}): Store {
  return {
    get: async <T>(ns: string, key: string) => data[ns]?.[key] as T | undefined,
    getAll: async <T>(ns: string) => (data[ns] ?? {}) as Record<string, T>,
    set: async (ns, key, value) => void ((data[ns] ??= {})[key] = value),
    setMany: async (ns, entries) => void Object.assign((data[ns] ??= {}), entries),
  };
}

function memoryClips(): ClipStore {
  const m = new Map<string, Buffer>();
  return { get: async (k) => m.get(k), put: async (k, v) => void m.set(k, v) };
}

function memoryBriefs(): BriefAudioStore & { puts: number } {
  const m = new Map<string, BriefAudioMeta>();
  const b = {
    puts: 0,
    getMeta: async (k: string) => m.get(k),
    async put(k: string, _wav: Buffer, meta: Omit<BriefAudioMeta, "format">) {
      b.puts++;
      const full = { ...meta, format: "wav" as const };
      m.set(k, full);
      return full;
    },
    file: async () => undefined,
  };
  return b;
}

/** A tone as long as the text would take to say. */
const fakeVoice: Synthesize = async (text) => {
  const n = Math.round((text.length / 15) * SAMPLE_RATE);
  return toWav({ sampleRate: SAMPLE_RATE, samples: Int16Array.from({ length: n }, (_, i) => Math.round(3000 * Math.sin((2 * Math.PI * 220 * i) / SAMPLE_RATE))) });
};

const day = (c: Corpus) => ({ [CORPUS_NS]: { [c.date]: c } });

async function main() {
  const memory = profile("memory-supplier-manager");
  const off = { claudeOn: false, ttsOn: false };

  // No corpus yet: nothing to build from.
  const none = await assembleBrief(memory, { now, store: memoryStore(), clips: memoryClips(), briefs: memoryBriefs(), ...off });
  assert.equal(none.status, "no-corpus");
  assert.equal(none.date, "2026-11-05");
  assert.deepEqual(none.chapters, []);
  assert.equal(none.audio.status, "none");

  // A quiet day for memory: no chapters, nothing to read out.
  const quiet = await assembleBrief(memory, { now, store: memoryStore(day(FIXTURES.quiet)), clips: memoryClips(), briefs: memoryBriefs(), ...off });
  assert.equal(quiet.status, "quiet");
  assert.deepEqual(quiet.chapters, []);
  assert.equal(quiet.audio.status, "none");

  // Claude off, no summaries: the written brief still has every pick, with the source's snippet and link.
  const plan = planBrief(FIXTURES.normal, memory);
  const bare = await assembleBrief(memory, { now, store: memoryStore(day(FIXTURES.normal)), clips: memoryClips(), briefs: memoryBriefs(), ...off });
  assert.equal(bare.status, "ready");
  assert.equal(bare.claude, "off");
  assert.deepEqual(
    bare.chapters.map((c) => [c.id, c.stories.map((s) => s.id)]),
    plan.chapters.map((c) => [c.id, c.picks.map((p) => p.item.id)]),
    "chapters and stories follow the plan",
  );
  const first = bare.chapters[0].stories[0];
  assert.equal(first.summary, null);
  assert.equal(first.url, FIXTURES.normal.items.find((i) => i.id === first.id)!.url, "each story links its source");
  assert.equal(bare.unsummarized, plan.chapters.reduce((n, c) => n + c.picks.length, 0));
  assert.equal(bare.audio.status, "none", "no summaries, nothing to read out");
  assert.ok(bare.chapters.every((c) => c.startSeconds === undefined && c.stories.every((s) => !s.inAudio)));
  assert.deepEqual(
    bare.more.map((s) => s.id),
    plan.more.slice(0, MORE_MAX).map((s) => s.item.id),
    "the plan's leftovers are the more-in-the-written-brief list",
  );

  // Summaries stored, clips not voiced: the tier's summary shows; audio is off or pending.
  const summaries = fixtureSummaries();
  const stored = () => memoryStore({ ...day(FIXTURES.normal), [SUMMARY_NS]: summaries });
  const written = await assembleBrief(memory, { now, store: stored(), clips: memoryClips(), briefs: memoryBriefs(), ...off });
  const top = written.chapters[0].stories[0];
  assert.equal(top.summary, summaries[top.id].tiers.advanced.summary, "the user's tier is shown");
  assert.equal(written.audio.status, "off", "TTS off and no clips: audio off");
  const pending = await assembleBrief(memory, { now, store: stored(), clips: memoryClips(), briefs: memoryBriefs(), claudeOn: true, ttsOn: true });
  assert.equal(pending.audio.status, "pending");
  assert.ok(pending.audio.status === "pending" && pending.audio.missingClips > 1);

  // The morning job voiced the clips: the page stitches them, with chapter marks, and never calls Google.
  const clips = memoryClips();
  const script = buildScript(plan, memory, summaries as Record<string, StorySummary>);
  const voiced = await renderStitched(script, { synthesize: fakeVoice, clips });
  const briefs = memoryBriefs();
  const ready = await assembleBrief(memory, { now, store: stored(), clips, briefs, ...off });
  assert.equal(ready.audio.status, "ready", "stored clips play even with TTS off");
  if (ready.audio.status !== "ready") return;
  assert.equal(ready.audio.url, `/api/brief/audio/${briefKey(script)}`);
  assert.ok(isBriefKey(briefKey(script)));
  assert.deepEqual(ready.audio.chapters, voiced.chapters);
  assert.ok(Math.abs(ready.audio.seconds - voiced.seconds) < 0.01);
  for (const c of ready.chapters) assert.equal(c.startSeconds, voiced.chapters.find((m) => m.chapter === c.id)?.startSeconds, `${c.id} jumps to its mark`);
  const readIds = voiced.segments.filter((s) => s.kind === "story").map((s) => s.storyId);
  assert.deepEqual(
    ready.chapters.flatMap((c) => c.stories.filter((s) => s.inAudio).map((s) => s.id)),
    readIds,
    "stories read out are marked, in order",
  );
  // A second visit reuses the stitched file.
  await assembleBrief(memory, { now, store: stored(), clips, briefs, ...off });
  assert.equal(briefs.puts, 1);

  // One shared clip missing (a story rewritten after the job ran): pending, not a partial brief.
  const firstStory = script.segments.find((s) => s.kind === "story")!;
  const gappy: ClipStore = { get: async (k) => (k === clipId(script.voice, firstStory.text) ? undefined : clips.get(k)), put: async () => {} };
  const gap = await assembleBrief(memory, { now, store: stored(), clips: gappy, briefs: memoryBriefs(), claudeOn: true, ttsOn: true });
  assert.deepEqual(gap.audio, { status: "pending", missingClips: 1 });

  // A stored clip that won't parse: the written brief still shows, and the audio says it failed.
  const broken: ClipStore = { get: async (k) => (k === clipId(script.voice, firstStory.text) ? Buffer.from("not a wav") : clips.get(k)), put: async () => {} };
  const bad = await assembleBrief(memory, { now, store: stored(), clips: broken, briefs: memoryBriefs(), ...off });
  assert.equal(bad.status, "ready");
  assert.equal(bad.audio.status, "error");

  // The file store keeps the WAV, an MP3 when ffmpeg is installed, and the facts.
  const dir = mkdtempSync(path.join(tmpdir(), "brief-audio-"));
  try {
    const files = fileBriefs(dir);
    const key = briefKey(script);
    assert.equal(await files.file(key), undefined);
    const meta = await files.put(key, voiced.wav, { seconds: voiced.seconds, chapters: voiced.chapters, dropped: [], read: [] });
    assert.deepEqual((await files.getMeta(key))?.chapters, voiced.chapters);
    const f = await files.file(key);
    assert.ok(f && f.size > 0);
    assert.equal(f.type, meta.format === "mp3" ? "audio/mpeg" : "audio/wav");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  console.log("brief assembly: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
