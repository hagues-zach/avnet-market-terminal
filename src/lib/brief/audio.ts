import { introText, type BriefScript, type Segment } from "./script";
import type { ChapterId } from "./rank";

// Morning brief, phase B4: stitching. Clips arrive as 16-bit mono WAV (Google's
// LINEAR16). Each is brought to the same loudness and given short fades so joins
// don't click, then laid end to end with set pauses: shorter between stories,
// longer before a chapter. The result is one WAV with chapter start times, cut
// to the length limit by dropping the last stories (the written brief keeps
// them). Pure, apart from Buffer.
//
// Order per clip: trim the edge silence, level, fade.

export interface Pcm {
  sampleRate: number;
  samples: Int16Array;
}

/** Pauses, in milliseconds, before a segment of each kind. */
export const PAUSE_MS = { afterIntro: 500, beforeChapter: 900, afterChapterOpening: 350, betweenStories: 650, beforeOutro: 900 };
const FADE_MS = 8;
/** Target loudness for every clip, as RMS of full scale (about -20 dBFS). */
const TARGET_RMS = 0.1;

export function parseWav(buf: Buffer): Pcm {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file");
  let off = 12;
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (bits !== 16 || channels !== 1) throw new Error(`Expected 16-bit mono WAV, got ${bits}-bit, ${channels} channels`);
      // Some encoders leave the size unset when streaming; read to the end then.
      if (size === 0 || size === 0xffffffff || body + size > buf.length) size = buf.length - body;
      const samples = new Int16Array(size >> 1);
      for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(body + 2 * i);
      return { sampleRate, samples };
    }
    off = body + size + (size & 1);
  }
  throw new Error("WAV file has no data chunk");
}

export function toWav({ sampleRate, samples }: Pcm): Buffer {
  const data = samples.length * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + data, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(data, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + 2 * i);
  return buf;
}

export const seconds = (p: Pcm) => p.samples.length / p.sampleRate;

export function rms(samples: Int16Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (const s of samples) sum += (s / 32768) ** 2;
  return Math.sqrt(sum / samples.length);
}

/** Silence kept at each end of a clip, in milliseconds, so the set pauses are the only gaps. */
export const EDGE_MS = { lead: 20, tail: 80 };
/** Below this level (about -40 dBFS) a sample counts as silence. */
const SILENCE = 0.01 * 32768;

/**
 * Cut a clip's leading and trailing silence down to EDGE_MS. Google ends clips
 * with anywhere from about 0.2 to 0.7 seconds of silence, which made the gaps
 * between stories uneven (measured 2026-11-05).
 */
export function trimSilence(p: Pcm): Pcm {
  const { samples, sampleRate } = p;
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]) <= SILENCE) start++;
  if (start === samples.length) return p;
  let end = samples.length;
  while (end > start && Math.abs(samples[end - 1]) <= SILENCE) end--;
  const from = Math.max(0, start - Math.round((EDGE_MS.lead / 1000) * sampleRate));
  const to = Math.min(samples.length, end + Math.round((EDGE_MS.tail / 1000) * sampleRate));
  return { sampleRate, samples: samples.slice(from, to) };
}

/** Same loudness as every other clip, edges trimmed, short fades in and out, peaks kept below clipping. */
export function level(clip: Pcm): Pcm {
  const p = trimSilence(clip);
  const now = rms(p.samples);
  let peak = 0;
  for (const s of p.samples) peak = Math.max(peak, Math.abs(s));
  const gain = now > 0 ? Math.min(TARGET_RMS / now, (0.95 * 32767) / Math.max(peak, 1)) : 1;
  const out = new Int16Array(p.samples.length);
  const fade = Math.min(Math.round((FADE_MS / 1000) * p.sampleRate), out.length >> 1);
  for (let i = 0; i < out.length; i++) {
    const edge = Math.min(i, out.length - 1 - i);
    const f = edge < fade ? edge / fade : 1;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(p.samples[i] * gain * f)));
  }
  return { sampleRate: p.sampleRate, samples: out };
}

/** The pause before this segment, given the one before it. */
export function pauseBefore(seg: Segment, prev: Segment | undefined): number {
  if (!prev) return 0;
  if (prev.kind === "intro") return PAUSE_MS.afterIntro;
  if (seg.kind === "outro") return PAUSE_MS.beforeOutro;
  if (seg.kind === "chapter" && seg.clipKey !== "worth-knowing") return PAUSE_MS.beforeChapter;
  if (prev.kind === "chapter") return PAUSE_MS.afterChapterOpening;
  return PAUSE_MS.betweenStories;
}

/** Spoken length of a script from each segment's clip length, pauses included. */
export function scriptSeconds(segments: Segment[], durationOf: (s: Segment) => number): number {
  return segments.reduce((t, s, i) => t + durationOf(s) + pauseBefore(s, segments[i - 1]) / 1000, 0);
}

/**
 * Drop the last stories until the script fits the limit, then drop chapters left
 * without a story and rebuild the opening line to match. `durationOf` must know
 * the rebuilt intro's length too, so pass an estimate for unrendered text.
 */
export function trimScript(script: BriefScript, durationOf: (s: Segment) => number, limitSeconds: number): { script: BriefScript; dropped: string[] } {
  let segments = [...script.segments];
  const dropped: string[] = [];
  const tidy = (segs: Segment[]) => {
    // A chapter opening (or "worth knowing") with no story after it before the next opening goes.
    const out = segs.filter((s, i) => s.kind !== "chapter" || segs[i + 1]?.kind === "story" || (segs[i + 1]?.kind === "chapter" && segs[i + 1].chapter === s.chapter && segs[i + 2]?.kind === "story"));
    const chapters = [...new Set(out.filter((s) => s.kind === "story").map((s) => s.chapter as ChapterId))];
    out[0] = { kind: "intro", text: introText(script.date, script.length === "quick", chapters) };
    return chapters.length ? out : out.filter((s) => s.kind === "intro");
  };
  while (scriptSeconds(segments, durationOf) > limitSeconds) {
    const last = segments.map((s) => s.kind).lastIndexOf("story");
    if (last < 0) break;
    dropped.push(segments[last].storyId!);
    segments.splice(last, 1);
    segments = tidy(segments);
  }
  return { script: { ...script, segments }, dropped };
}

export interface ChapterMark {
  chapter: ChapterId;
  startSeconds: number;
}

/** Lay the clips end to end with the pauses; chapter marks fall where each chapter opening starts. */
export function stitch(segments: Segment[], clips: Pcm[]): { audio: Pcm; chapters: ChapterMark[] } {
  if (segments.length !== clips.length) throw new Error("One clip per segment");
  const rate = clips[0]?.sampleRate ?? 24000;
  for (const c of clips) if (c.sampleRate !== rate) throw new Error(`Clips mix sample rates: ${c.sampleRate} and ${rate}`);
  const parts: Int16Array[] = [];
  const chapters: ChapterMark[] = [];
  let at = 0;
  segments.forEach((seg, i) => {
    const pause = Math.round((pauseBefore(seg, segments[i - 1]) / 1000) * rate);
    parts.push(new Int16Array(pause));
    at += pause;
    if (seg.kind === "chapter" && seg.clipKey !== "worth-knowing" && seg.chapter && !chapters.some((c) => c.chapter === seg.chapter))
      chapters.push({ chapter: seg.chapter, startSeconds: at / rate });
    const clip = level(clips[i]);
    parts.push(clip.samples);
    at += clip.samples.length;
  });
  const samples = new Int16Array(at);
  let o = 0;
  for (const p of parts) {
    samples.set(p, o);
    o += p.length;
  }
  return { audio: { sampleRate: rate, samples }, chapters };
}
