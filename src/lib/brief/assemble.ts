import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { aiConfigured } from "@/lib/ai/claude";
import { store as defaultStore, type Store } from "@/lib/store";
import type { ChapterMark } from "./audio";
import { easternDate, getCorpus, type CorpusItem } from "./corpus";
import type { BriefProfile, TechTier } from "./profile";
import { CHAPTER_TITLES, planBrief, type ChapterId, type Scored } from "./rank";
import { buildScript, type BriefScript } from "./script";
import { SUMMARY_NS, type StorySummary } from "./synthesis";
import { clipId, fileClips, renderStitched, ttsConfigured, type ClipStore } from "./tts";

// Morning brief, the page side: one user's brief for today, put together from
// what the morning jobs stored. It reads the day's corpus, plans the brief, takes
// the stored story summaries and stitches the stored clips. It never calls Claude
// or Google: a summary not yet written shows the story's own snippet, and audio
// with any clip not yet voiced is left out until the clips exist. Server-only.

export const MORE_MAX = 12;

export interface BriefStory {
  id: string;
  kind: CorpusItem["kind"];
  title: string;
  /** The tier summary, or null when it hasn't been written yet. */
  summary: string | null;
  /** The source's own snippet, shown when there is no summary. */
  snippet: string;
  angle?: string;
  outlet: string;
  url: string;
  publishedAt: string;
  worthKnowing?: boolean;
  /** Read out in today's audio (false when audio is off, or the story was cut or had no summary). */
  inAudio: boolean;
}

export interface BriefChapter {
  id: ChapterId;
  title: string;
  stories: BriefStory[];
  /** Where the chapter starts in the audio, when it is in the audio. */
  startSeconds?: number;
}

export type AudioState =
  | { status: "ready"; url: string; seconds: number; chapters: ChapterMark[]; format: "mp3" | "wav" }
  /** Text-to-Speech isn't set up and the clips aren't stored. */
  | { status: "off" }
  /** Set up, but some clips haven't been voiced yet (the morning job hasn't run for this brief). */
  | { status: "pending"; missingClips: number }
  /** Nothing to read out: a quiet day, or no summaries. */
  | { status: "none" }
  /** The stored clips couldn't be stitched. */
  | { status: "error"; message: string };

export interface AssembledBrief {
  /** no-corpus: the corpus job hasn't run today. quiet: nothing in the user's scope. */
  status: "no-corpus" | "quiet" | "ready";
  date: string;
  profileId: string;
  tier: TechTier;
  length: BriefProfile["length"];
  builtAt?: string;
  chapters: BriefChapter[];
  /** In scope but not in the audio: the plan's leftovers. */
  more: BriefStory[];
  /** Picked stories without a written summary. */
  unsummarized: number;
  claude: "on" | "off";
  audio: AudioState;
}

/** Where stitched briefs are kept: local files for now (.cache, not committed); object storage on the Avnet machine. */
export interface BriefAudioStore {
  /** The stored brief's audio facts, if it has been stitched before. */
  getMeta(key: string): Promise<BriefAudioMeta | undefined>;
  /** Keeps the WAV, and an MP3 next to it when the server can make one. */
  put(key: string, wav: Buffer, meta: Omit<BriefAudioMeta, "format">): Promise<BriefAudioMeta>;
  /** The file to stream: its path, type and size. */
  file(key: string): Promise<{ path: string; type: string; size: number } | undefined>;
}

export interface BriefAudioMeta {
  seconds: number;
  chapters: ChapterMark[];
  /** Story ids cut to keep under the length limit. */
  dropped: string[];
  /** Story ids read out. */
  read: string[];
  format: "mp3" | "wav";
}

export interface AssembleDeps {
  now?: Date;
  store?: Store;
  clips?: ClipStore;
  briefs?: BriefAudioStore;
  claudeOn?: boolean;
  ttsOn?: boolean;
}

/** A stitched brief's address: its voice and every segment's text, so a change anywhere makes new audio. */
export const briefKey = (script: BriefScript) =>
  createHash("sha256")
    .update([script.voice, script.length, ...script.segments.map((s) => s.text)].join("\n"))
    .digest("hex")
    .slice(0, 32);

export const isBriefKey = (key: string) => /^[a-f0-9]{32}$/.test(key);

/** Thrown in place of a Text-to-Speech call: the page only uses clips already stored. */
class NotVoiced extends Error {}

function story(item: CorpusItem, s: StorySummary | undefined, tier: TechTier, extra: Partial<BriefStory> = {}): BriefStory {
  const src = s?.sources[0];
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    summary: s?.tiers[tier].summary ?? null,
    snippet: item.summary,
    ...(item.angle ? { angle: item.angle } : {}),
    outlet: src?.outlet ?? item.outlet,
    url: src?.url ?? item.url,
    publishedAt: src?.publishedAt ?? item.publishedAt,
    inAudio: false,
    ...extra,
  };
}

/** The audio, stitched from stored clips only. Counts the clips still missing instead of voicing them. */
async function audioFor(script: BriefScript, deps: Required<Pick<AssembleDeps, "clips" | "briefs">> & { ttsOn: boolean }): Promise<AudioState & { meta?: BriefAudioMeta }> {
  if (!script.segments.some((s) => s.kind === "story")) return { status: "none" };
  const key = briefKey(script);
  const url = `/api/brief/audio/${key}`;
  const known = await deps.briefs.getMeta(key);
  if (known) return { status: "ready", url, seconds: known.seconds, chapters: known.chapters, format: known.format, meta: known };

  // Shared clips first; the opening line is checked by the render itself, since trimming for length can rewrite it.
  let missingClips = 0;
  for (const seg of script.segments) if (seg.kind !== "intro" && !(await deps.clips.get(clipId(script.voice, seg.text)))) missingClips++;
  const rendered = missingClips
    ? null
    : await renderStitched(script, {
        clips: deps.clips,
        synthesize: async () => {
          throw new NotVoiced();
        },
      }).catch((e) => (e instanceof NotVoiced ? null : e instanceof Error ? e : new Error(String(e))));
  if (rendered instanceof Error) {
    console.error("Morning brief audio could not be stitched:", rendered.message);
    return { status: "error", message: rendered.message };
  }
  if (!rendered) return deps.ttsOn ? { status: "pending", missingClips: Math.max(1, missingClips) } : { status: "off" };
  const read = rendered.segments.filter((s) => s.kind === "story").map((s) => s.storyId!);
  const meta = await deps.briefs.put(key, rendered.wav, { seconds: rendered.seconds, chapters: rendered.chapters, dropped: rendered.dropped, read });
  return { status: "ready", url, seconds: meta.seconds, chapters: meta.chapters, format: meta.format, meta };
}

/** One user's brief for a briefing day (today in Eastern time by default), from stored pieces only. */
export async function assembleBrief(profile: BriefProfile, deps: AssembleDeps = {}): Promise<AssembledBrief> {
  const now = deps.now ?? new Date();
  const s = deps.store ?? defaultStore;
  const date = easternDate(now);
  const claude = (deps.claudeOn ?? aiConfigured()) ? "on" : "off";
  const base = { date, profileId: profile.id, tier: profile.techTier, length: profile.length, claude } as const;

  const corpus = await getCorpus(date, s);
  if (!corpus) return { ...base, status: "no-corpus", chapters: [], more: [], unsummarized: 0, audio: { status: "none" } };

  const plan = planBrief(corpus, profile);
  const summaries = await s.getAll<StorySummary>(SUMMARY_NS);
  const script = buildScript(plan, profile, summaries);
  const audio = await audioFor(script, {
    clips: deps.clips ?? fileClips(),
    briefs: deps.briefs ?? fileBriefs(),
    ttsOn: deps.ttsOn ?? ttsConfigured(),
  });
  const read = new Set(audio.status === "ready" ? audio.meta!.read : []);
  const starts = new Map(audio.status === "ready" ? audio.chapters.map((c) => [c.chapter, c.startSeconds]) : []);

  const chapters: BriefChapter[] = plan.chapters.map((c) => ({
    id: c.id,
    title: CHAPTER_TITLES[c.id],
    stories: c.picks.map((p) => story(p.item, summaries[p.item.id], profile.techTier, { inAudio: read.has(p.item.id), ...(p.worthKnowing ? { worthKnowing: true } : {}) })),
    ...(starts.has(c.id) ? { startSeconds: starts.get(c.id) } : {}),
  }));
  const more = plan.more.slice(0, MORE_MAX).map((x: Scored) => story(x.item, summaries[x.item.id], profile.techTier));
  const { meta: _meta, ...audioState } = audio as AudioState & { meta?: BriefAudioMeta };

  return {
    ...base,
    status: chapters.length ? "ready" : "quiet",
    builtAt: corpus.builtAt,
    chapters,
    more,
    unsummarized: script.missing.length,
    audio: audioState,
  };
}

const run = promisify(execFile);

/** Stitched briefs as files under .cache/brief-audio/briefs: <key>.wav, <key>.mp3 (when ffmpeg is installed) and <key>.json. */
export function fileBriefs(root = path.join(process.cwd(), ".cache", "brief-audio", "briefs")): BriefAudioStore {
  const at = (key: string, ext: string) => path.join(root, `${key}.${ext}`);
  return {
    async getMeta(key) {
      try {
        return JSON.parse(await fs.readFile(at(key, "json"), "utf8")) as BriefAudioMeta;
      } catch {
        return undefined;
      }
    },
    async put(key, wav, meta) {
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(at(key, "wav"), wav);
      let format: BriefAudioMeta["format"] = "wav";
      try {
        // A 10-minute WAV is about 29 MB; at 64 kbps the MP3 is about 5 MB.
        await run("ffmpeg", ["-y", "-loglevel", "error", "-i", at(key, "wav"), "-codec:a", "libmp3lame", "-b:a", "64k", at(key, "mp3")], { timeout: 60_000 });
        format = "mp3";
      } catch {
        // No ffmpeg on this server: serve the WAV.
      }
      const full = { ...meta, format };
      await fs.writeFile(at(key, "json"), JSON.stringify(full));
      return full;
    },
    async file(key) {
      const meta = await this.getMeta(key);
      if (!meta) return undefined;
      const p = at(key, meta.format);
      const stat = await fs.stat(p).catch(() => undefined);
      return stat ? { path: p, type: meta.format === "mp3" ? "audio/mpeg" : "audio/wav", size: stat.size } : undefined;
    },
  };
}
