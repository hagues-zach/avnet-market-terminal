import type { BriefProfile } from "./profile";
import type { BriefPlan, ChapterId } from "./rank";
import type { StorySummary } from "./synthesis";

// Morning brief, phase B4: the spoken script for one user, as segments. Story
// segments are the shared summaries (one clip per story, tier and voice, made
// once). Chapter openings and the sign-off are the same for everyone, so they are
// shared clips too. Only the opening line, with the day and what's ahead, is
// written for this brief, and it is short. Pure.

export type SegmentKind = "intro" | "chapter" | "story" | "outro";

export interface Segment {
  kind: SegmentKind;
  chapter?: ChapterId;
  storyId?: string;
  text: string;
  /** Identifies a shared clip: the same key and text give the same audio for every user. Absent for personal lines. */
  clipKey?: string;
}

export interface BriefScript {
  profileId: string;
  date: string;
  length: BriefPlan["length"];
  voice: string;
  segments: Segment[];
  /** Picked stories with no summary yet; the written brief still lists them. */
  missing: string[];
}

const OPENINGS: Record<ChapterId, string> = {
  top: "First, the top of the morning.",
  suppliers: "Now, your suppliers.",
  customers: "Next, your customers.",
  technologies: "Now, your technologies.",
  market: "Finally, the market and filings.",
};
const SPOKEN: Record<ChapterId, string> = {
  top: "the top stories",
  suppliers: "your suppliers",
  customers: "your customers",
  technologies: "your technologies",
  market: "filings",
};
export const WORTH_KNOWING = "Worth knowing, from customers you don't serve yet.";
export const OUTRO = "That's your brief. The written version has the sources and the rest of today's stories.";
export const QUIET = "It's a quiet morning for your suppliers, customers and technologies, so there's nothing new to read out. The written brief has the wider news.";

/** "Thursday, November 5" for a YYYY-MM-DD briefing day. */
export function spokenDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The opening line: the day and the chapters that follow. Rebuilt when trimming drops a chapter. */
export function introText(date: string, quick: boolean, chapters: ChapterId[]): string {
  const day = spokenDay(date);
  return chapters.length
    ? `Good morning. Here's your ${quick ? "quick " : ""}brief for ${day}, with ${list(chapters.map((c) => SPOKEN[c]))}.`
    : `Good morning. Here's your brief for ${day}. ${QUIET}`;
}

export function buildScript(plan: BriefPlan, profile: BriefProfile, summaries: Record<string, StorySummary>): BriefScript {
  const tier = profile.techTier;
  const quick = plan.length === "quick";
  const missing: string[] = [];
  const body: Segment[] = [];
  const chaptersRead: ChapterId[] = [];

  for (const chapter of plan.chapters) {
    const stories: Segment[] = [];
    let worthOpened = false;
    for (const pick of chapter.picks) {
      const s = summaries[pick.item.id];
      if (!s) {
        missing.push(pick.item.id);
        continue;
      }
      // Quick reads the top stories in full and one line for everything else.
      const form = quick && chapter.id !== "top" ? "line" : "summary";
      if (pick.worthKnowing && !worthOpened) {
        stories.push({ kind: "chapter", chapter: chapter.id, text: WORTH_KNOWING, clipKey: "worth-knowing" });
        worthOpened = true;
      }
      stories.push({ kind: "story", chapter: chapter.id, storyId: s.id, text: s.tiers[tier][form], clipKey: `story:${s.id}:${tier}:${form}` });
    }
    if (!stories.some((x) => x.kind === "story")) continue;
    chaptersRead.push(chapter.id);
    body.push({ kind: "chapter", chapter: chapter.id, text: OPENINGS[chapter.id], clipKey: `chapter:${chapter.id}` }, ...stories);
  }

  const segments: Segment[] = [{ kind: "intro", text: introText(plan.date, quick, chaptersRead) }, ...body];
  if (chaptersRead.length) segments.push({ kind: "outro", text: OUTRO, clipKey: "outro" });
  return { profileId: plan.profileId, date: plan.date, length: plan.length, voice: profile.voice, segments, missing };
}
