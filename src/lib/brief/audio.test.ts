// Morning brief audio (phase B4) against a fake voice: script, leveling,
// stitching, chapter marks, the 15- and 5-minute limits, shared clips and the
// Google request. Nothing calls Google. Run with: npx tsx src/lib/brief/audio.test.ts
import assert from "node:assert/strict";
import { level, parseWav, trimSilence, rms, seconds, stitch, toWav, trimScript, type Pcm } from "./audio";
import { FIXTURES } from "./fixtures";
import { TEST_PROFILES, type BriefProfile } from "./profile";
import { CAP_SECONDS, planBrief, QUICK_SECONDS } from "./rank";
import { buildScript, OUTRO, WORTH_KNOWING } from "./script";
import { filingSummary, type StorySummary } from "./synthesis";
import { RECORDED } from "./synthesis-eval";
import { toSummary } from "./synthesis";
import { googleTts, MAX_REQUEST_BYTES, renderStitched, renderWhole, SAMPLE_RATE, wholeChunks, type ClipStore, type Synthesize } from "./tts";

const profile = (id: string, over: Partial<BriefProfile> = {}): BriefProfile => ({ ...TEST_PROFILES.find((p) => p.id === id)!, ...over });

/** A tone as long as the text would take to say (15 characters a second), louder or softer each call. */
function fakeVoice(): Synthesize & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (text: string) => {
    calls.push(text);
    const n = Math.round((text.length / 15) * SAMPLE_RATE);
    const amp = 2000 + ((calls.length * 7919) % 12000);
    const samples = new Int16Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.round(amp * Math.sin((2 * Math.PI * 220 * i) / SAMPLE_RATE));
    return toWav({ sampleRate: SAMPLE_RATE, samples });
  }) as unknown as Synthesize & { calls: string[] };
  fn.calls = calls;
  return fn;
}

function memoryClips(): ClipStore & { size: () => number } {
  const m = new Map<string, Buffer>();
  return { get: async (k) => m.get(k), put: async (k, v) => void m.set(k, v), size: () => m.size };
}

/** Summaries for every fixture story: the recorded ones where there are, otherwise one built from the headline. */
function summaries(): Record<string, StorySummary> {
  const out: Record<string, StorySummary> = {};
  for (const c of Object.values(FIXTURES))
    for (const item of c.items) {
      const rec = RECORDED.find((r) => r.id === item.id);
      if (item.kind === "filing") out[item.id] = filingSummary(item, "2026-11-05");
      else if (rec) out[item.id] = toSummary(item, rec.answer, "2026-11-05", [])!;
      else {
        const t = { summary: `${item.title}, ${item.outlet} reports. It matters for supply and pricing this quarter, and for how buyers plan their next orders.`, line: `${item.title}.` };
        out[item.id] = { id: item.id, title: item.title, sources: [{ outlet: item.outlet, url: item.url, publishedAt: item.publishedAt }], tiers: { beginner: t, intermediate: t, advanced: t }, writtenAt: "2026-11-05", model: "test" };
      }
    }
  return out;
}

async function main() {
  // WAV in and out.
  const tone: Pcm = { sampleRate: SAMPLE_RATE, samples: Int16Array.from({ length: 2400 }, (_, i) => (i % 100) * 50) };
  assert.deepEqual(parseWav(toWav(tone)), tone);
  const stereo = toWav(tone);
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => parseWav(stereo), /16-bit mono/);

  // Leveling: loud and soft clips come out equally loud, and start and end at silence.
  const loud = parseWav(await fakeVoice()("x".repeat(60), "v"));
  const soft: Pcm = { sampleRate: SAMPLE_RATE, samples: loud.samples.map((s) => Math.round(s / 6)) };
  const [a, b] = [level(loud), level(soft)];
  assert.ok(Math.abs(rms(a.samples) - rms(b.samples)) / rms(a.samples) < 0.02, "same loudness after leveling");
  assert.equal(a.samples[0], 0);
  assert.equal(a.samples[a.samples.length - 1], 0);

  // Edge silence is cut to a fixed amount, so the set pauses are the only gaps.
  const padded: Pcm = { sampleRate: SAMPLE_RATE, samples: new Int16Array(SAMPLE_RATE) };
  padded.samples.fill(8000, 6000, 12000); // 0.25 s silence, 0.25 s sound, 0.5 s silence
  const cut = trimSilence(padded);
  assert.equal(cut.samples.length, 6000 + Math.round(0.02 * SAMPLE_RATE) + Math.round(0.08 * SAMPLE_RATE));
  assert.equal(trimSilence({ sampleRate: SAMPLE_RATE, samples: new Int16Array(100) }).samples.length, 100, "an all-silent clip is left alone");

  // Script: chapters in order, worth knowing opened once, every story from the user's tier, sign-off last.
  const all = summaries();
  const compute = profile("compute-strategy");
  const plan = planBrief(FIXTURES.normal, compute);
  const script = buildScript(plan, compute, all);
  assert.match(script.segments[0].text, /^Good morning\. Here's your brief for Thursday, November 5, with the top stories, your suppliers, your customers, your technologies and filings\.$/);
  assert.equal(script.segments.at(-1)!.text, OUTRO);
  assert.equal(script.segments.filter((s) => s.text === WORTH_KNOWING).length, 1, "compute's customers chapter has a worth-knowing story");
  assert.ok(script.segments.filter((s) => s.kind === "story").every((s) => s.clipKey === `story:${s.storyId}:advanced:summary`));
  assert.ok(script.segments.every((s) => s.kind === "intro" || s.clipKey), "everything but the opening line is a shared clip");

  // Quick: the top stories in full, one line for the rest.
  const quick = profile("embedded-industrial-quick");
  const qs = buildScript(planBrief(FIXTURES.normal, quick), quick, all);
  assert.match(qs.segments[0].text, /your quick brief/);
  for (const s of qs.segments.filter((x) => x.kind === "story")) assert.ok(s.clipKey!.endsWith(s.chapter === "top" ? ":summary" : ":line"));

  // Missing summaries are listed, not read; a quiet day says so without a sign-off.
  const partial = buildScript(plan, compute, Object.fromEntries(Object.entries(all).filter(([id]) => id !== "amd-mi-series")));
  assert.deepEqual(partial.missing, ["amd-mi-series"]);
  const quiet = buildScript(planBrief(FIXTURES.quiet, compute), compute, all);
  assert.equal(quiet.segments.length, 1);
  assert.match(quiet.segments[0].text, /quiet morning/);

  // Trimming drops the last stories, then an emptied chapter, and rewrites the opening to match.
  const tight = trimScript(script, (s) => s.text.length / 15, 60);
  assert.ok(tight.dropped.length > 0);
  assert.ok(!tight.script.segments.some((s) => s.chapter === "market"), "the last chapter goes first");
  assert.doesNotMatch(tight.script.segments[0].text, /filings/);
  assert.ok(tight.script.segments.every((s, i, xs) => s.kind !== "chapter" || xs[i + 1]?.kind === "story" || xs[i + 1]?.kind === "chapter"));

  // Stitched: chapter marks in order and inside the audio; under the cap; shared clips reused by the next user.
  const voice = fakeVoice();
  const clips = memoryClips();
  const r1 = await renderStitched(script, { synthesize: voice, clips });
  assert.deepEqual(r1.chapters.map((c) => c.chapter), ["top", "suppliers", "customers", "technologies", "market"]);
  assert.ok(r1.chapters.every((c, i, xs) => c.startSeconds > (xs[i - 1]?.startSeconds ?? 0) && c.startSeconds < r1.seconds));
  assert.ok(r1.seconds <= CAP_SECONDS);
  assert.equal(seconds(parseWav(r1.wav)), r1.seconds);
  assert.ok(r1.characters.personal > 0 && r1.characters.personal < 200, "only the opening line is personal");
  assert.ok(r1.dollars > 0);

  const sameStories = { ...script, profileId: "another-user" };
  const before = voice.calls.length;
  const r2 = await renderStitched(sameStories, { synthesize: voice, clips });
  assert.equal(voice.calls.length, before, "a second user with the same stories, voice and day costs nothing new");
  assert.equal(r2.characters.shared + r2.characters.personal, 0);
  assert.ok(r2.characters.reused > 0);

  // The real limit holds on a heavy day, standard and Quick.
  const heavy = buildScript(planBrief(FIXTURES.heavy, compute), compute, all);
  const long = await renderStitched(heavy, { synthesize: fakeVoice(), clips: memoryClips() });
  assert.ok(long.seconds <= CAP_SECONDS, `${long.seconds}s`);
  const heavyQuick = profile("compute-strategy", { length: "quick" });
  const hq = await renderStitched(buildScript(planBrief(FIXTURES.heavy, heavyQuick), heavyQuick, all), { synthesize: fakeVoice(), clips: memoryClips() });
  assert.ok(hq.seconds <= QUICK_SECONDS, `${hq.seconds}s`);

  // Whole-brief: one request per chapter (more when a chapter is long), all characters personal, same chapters.
  const chunks = wholeChunks(script.segments);
  assert.ok(chunks.every((c) => Buffer.byteLength(c.map((s) => s.text).join("\n\n")) <= MAX_REQUEST_BYTES));
  assert.equal(chunks[0].length, 1, "the opening line is its own request");
  const whole = await renderWhole(script, { synthesize: fakeVoice() });
  assert.deepEqual(whole.chapters.map((c) => c.chapter), r1.chapters.map((c) => c.chapter));
  assert.equal(whole.characters.shared, 0);
  assert.ok(whole.characters.personal >= script.segments.reduce((t, s) => t + s.text.length, 0));

  // The Google request: key in a header, the voice's language, LINEAR16 at 24 kHz; errors and the byte limit surface.
  let sent: { url: string; init: RequestInit } | undefined;
  const ok = (async (url: string, init: RequestInit) => {
    sent = { url, init };
    return new Response(JSON.stringify({ audioContent: toWav(tone).toString("base64") }));
  }) as unknown as typeof fetch;
  const wav = await googleTts("test-key", ok)("Hello.", "en-US-Neural2-F");
  assert.deepEqual(parseWav(wav), tone);
  assert.equal((sent!.init.headers as Record<string, string>)["x-goog-api-key"], "test-key");
  assert.doesNotMatch(sent!.url, /key=/, "the key never goes in the URL");
  const body = JSON.parse(String(sent!.init.body));
  assert.deepEqual(body.voice, { languageCode: "en-US", name: "en-US-Neural2-F" });
  assert.deepEqual(body.audioConfig, { audioEncoding: "LINEAR16", sampleRateHertz: 24000 });
  const bad = (async () => new Response('{"error":{"message":"API key not valid"}}', { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(googleTts("k", bad)("Hi.", "en-US-Neural2-F"), /400: .*API key not valid/);
  await assert.rejects(googleTts("k", ok)("x".repeat(5001), "en-US-Neural2-F"), /5,000 bytes/);
  assert.throws(() => googleTts(""), /GOOGLE_TTS_API_KEY/);

  // Stitching guards.
  assert.throws(() => stitch(script.segments.slice(0, 2), [tone]), /One clip per segment/);

  console.log("brief audio: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
