import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseWav, seconds, stitch, toWav, trimScript, type ChapterMark, type Pcm } from "./audio";
import { CAP_SECONDS, QUICK_SECONDS } from "./rank";
import type { BriefScript, Segment } from "./script";

// Morning brief, phase B4: audio from Google Cloud Text-to-Speech. Shared clips
// (stories, chapter openings, the sign-off) are made once per voice and kept;
// a user's brief is those clips plus a personal opening line, stitched. The
// alternative, whole-brief audio, voices each chapter's script in one request
// (Google takes at most 5,000 bytes a request) so the voice flows across
// stories; it costs characters per user instead of per story. Server-only.
//
// GOOGLE_TTS_API_KEY: an API key restricted to the Text-to-Speech API.

export type Synthesize = (text: string, voice: string) => Promise<Buffer>;

const ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
export const SAMPLE_RATE = 24000;
/** Google's limit is 5,000 bytes of input a request; keep room. */
export const MAX_REQUEST_BYTES = 4800;
/** Spoken characters a second at about 150 words a minute, for text not yet voiced. */
const CHARS_PER_SECOND = 15;

/** Planning rates in dollars per million characters (docs/morning-brief-plan.md); confirm on Google's pricing page. */
export function pricePerMillion(voice: string): number {
  if (/Chirp3?-HD/i.test(voice)) return 30;
  if (/Studio/i.test(voice)) return 160;
  if (/Neural2|Wavenet/i.test(voice)) return 16;
  return 4;
}

export function ttsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TTS_API_KEY);
}

export function googleTts(apiKey = process.env.GOOGLE_TTS_API_KEY, fetchImpl: typeof fetch = fetch): Synthesize {
  if (!apiKey) throw new Error("Set GOOGLE_TTS_API_KEY to an API key restricted to the Cloud Text-to-Speech API.");
  return async (text, voice) => {
    if (Buffer.byteLength(text) > 5000) throw new Error(`Text-to-Speech takes at most 5,000 bytes a request; got ${Buffer.byteLength(text)}`);
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.split("-").slice(0, 2).join("-"), name: voice },
        audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`Text-to-Speech returned ${res.status}: ${body}`);
    }
    const { audioContent } = (await res.json()) as { audioContent?: string };
    if (!audioContent) throw new Error("Text-to-Speech returned no audio");
    return Buffer.from(audioContent, "base64");
  };
}

/** Where clips are kept: local files for now (.cache, not committed); object storage on the Avnet machine. */
export interface ClipStore {
  get(key: string): Promise<Buffer | undefined>;
  put(key: string, wav: Buffer): Promise<void>;
}

export function fileClips(root = path.join(process.cwd(), ".cache", "brief-audio", "clips")): ClipStore {
  const file = (key: string) => path.join(root, `${key}.wav`);
  return {
    get: (key) => fs.readFile(file(key)).catch(() => undefined),
    async put(key, wav) {
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(file(key), wav);
    },
  };
}

/** A clip's address: the voice and the exact text, so rewritten text gets new audio. */
export const clipId = (voice: string, text: string) => createHash("sha256").update(`${voice}\n${text}`).digest("hex").slice(0, 32);

export interface Characters {
  /** Characters voiced for clips any user can share (counted once, whoever asked first). */
  shared: number;
  /** Characters voiced for this brief alone. */
  personal: number;
  /** Characters served from stored clips: no charge. */
  reused: number;
}

export interface RenderedBrief {
  wav: Buffer;
  seconds: number;
  chapters: ChapterMark[];
  /** Stories cut to keep under the limit; the written brief keeps them. */
  dropped: string[];
  characters: Characters;
  dollars: number;
  segments: Segment[];
}

const limitFor = (s: BriefScript) => (s.length === "quick" ? QUICK_SECONDS : CAP_SECONDS);

/** Stitched: one shared clip per story, chapter opening and sign-off, plus a personal opening line. */
export async function renderStitched(script: BriefScript, deps: { synthesize: Synthesize; clips: ClipStore }): Promise<RenderedBrief> {
  const chars: Characters = { shared: 0, personal: 0, reused: 0 };
  const audio = new Map<string, Pcm>();
  const get = async (seg: Segment): Promise<Pcm> => {
    const id = clipId(script.voice, seg.text);
    const known = audio.get(id);
    if (known) return known;
    let wav = await deps.clips.get(id);
    if (wav) chars.reused += seg.text.length;
    else {
      wav = await deps.synthesize(seg.text, script.voice);
      if (seg.clipKey) chars.shared += seg.text.length;
      else chars.personal += seg.text.length;
      // Personal lines are kept too: a rerun the same morning shouldn't pay twice.
      await deps.clips.put(id, wav);
    }
    const pcm = parseWav(wav);
    audio.set(id, pcm);
    return pcm;
  };

  // Voice everything shared first, then cut to the limit by real lengths, then voice the opening line that matches.
  for (const seg of script.segments) if (seg.kind !== "intro") await get(seg);
  const durationOf = (seg: Segment) => {
    const known = audio.get(clipId(script.voice, seg.text));
    return known ? seconds(known) : seg.text.length / CHARS_PER_SECOND;
  };
  const { script: trimmed, dropped } = trimScript(script, durationOf, limitFor(script));
  const clips = [];
  for (const seg of trimmed.segments) clips.push(await get(seg));
  const { audio: out, chapters } = stitch(trimmed.segments, clips);
  return {
    wav: toWav(out),
    seconds: seconds(out),
    chapters,
    dropped,
    characters: chars,
    dollars: ((chars.shared + chars.personal) * pricePerMillion(script.voice)) / 1e6,
    segments: trimmed.segments,
  };
}

/** Each chapter's text as one request (split at story boundaries when over the byte limit), so the voice runs on. Pure. */
export function wholeChunks(segments: Segment[]): Segment[][] {
  const chunks: Segment[][] = [];
  let cur: Segment[] = [];
  const bytes = (segs: Segment[]) => Buffer.byteLength(segs.map((s) => s.text).join("\n\n"));
  for (const seg of segments) {
    // The opening line is its own request, so each chapter's chunk starts on its opening and gets a chapter mark.
    const starts = seg.kind === "outro" || (seg.kind === "chapter" && seg.clipKey !== "worth-knowing");
    if (cur.length && (starts || bytes([...cur, seg]) > MAX_REQUEST_BYTES)) {
      chunks.push(cur);
      cur = [];
    }
    cur.push(seg);
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/** Whole-brief: the same script, voiced a chapter at a time for this user alone. Cut to the limit by estimate first. */
export async function renderWhole(script: BriefScript, deps: { synthesize: Synthesize }): Promise<RenderedBrief> {
  const { script: trimmed, dropped } = trimScript(script, (s) => s.text.length / CHARS_PER_SECOND, limitFor(script));
  const chunks = wholeChunks(trimmed.segments);
  const clips: Pcm[] = [];
  let personal = 0;
  for (const chunk of chunks) {
    const text = chunk.map((s) => s.text).join("\n\n");
    personal += text.length;
    clips.push(parseWav(await deps.synthesize(text, script.voice)));
  }
  // Each chunk stands in for its first segment when placing pauses and chapter marks.
  const heads = chunks.map((c) => c[0]);
  const { audio: out, chapters } = stitch(heads, clips);
  return {
    wav: toWav(out),
    seconds: seconds(out),
    chapters,
    dropped,
    characters: { shared: 0, personal, reused: 0 },
    dollars: (personal * pricePerMillion(script.voice)) / 1e6,
    segments: trimmed.segments,
  };
}

