"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Play } from "lucide-react";
import type { AssembledBrief, BriefChapter, BriefStory } from "@/lib/brief/assemble";
import { stamp } from "@/lib/news/briefing";
import { Chip } from "@/components/ui/chip";
import { FilterSelect } from "@/components/ui/filter-bar";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const RATES = [1, 1.25, 1.5, 2];

/** 0:00 */
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const DAY = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

const TIER_WORD = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

/**
 * The user's morning brief at the top of Market News: the audio with chapter
 * jumps on the left, the written brief by chapter on the right. Everything comes
 * assembled from the server; the browser only plays it.
 */
export function MorningBrief({ brief, choices }: { brief: AssembledBrief | null; choices: { id: string; role: string }[] | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [now, setNow] = useState(0);
  const [rate, setRate] = useState(1);
  const audio = brief?.audio.status === "ready" ? brief.audio : null;

  const jump = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play().catch(() => {
      // Autoplay refused: the position is set, the user presses play.
    });
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  // The chapter playing now: the last mark at or before the playhead.
  const current = audio ? [...audio.chapters].reverse().find((c) => c.startSeconds <= now + 0.25)?.chapter : undefined;

  const subtitle = brief
    ? [DAY(brief.date), audio ? `${Math.max(1, Math.round(audio.seconds / 60))} min to listen` : null, `${TIER_WORD[brief.tier]} level`, brief.length === "quick" ? "Quick" : null]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <Panel
      title="Your morning brief"
      subtitle={subtitle}
      footer={brief && brief.status !== "no-corpus" ? <Provenance brief={brief} /> : undefined}
    >
      {choices && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline pb-3">
          <ProfilePicker choices={choices} value={brief?.profileId} />
          <span className="text-caption text-ink-muted">Development only, until sign-in gives each user their own brief.</span>
        </div>
      )}
      {!brief ? (
        <EmptyState
          title="Your brief starts with your profile"
          body="The morning brief is built for the suppliers, customers and technologies you cover. It switches on with sign-in and onboarding for the pilot."
        />
      ) : brief.status === "no-corpus" ? (
        <EmptyState
          title="Today's brief isn't ready yet"
          body="The morning job builds it from the day's news, ready by 6:00 am Eastern on weekdays. Today's stories are in the feed below."
        />
      ) : (
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-12 [&>*]:min-w-0">
          <div className="lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-16">
              {audio ? (
                <>
                  <audio
                    ref={audioRef}
                    controls
                    preload="metadata"
                    src={audio.url}
                    onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
                    onSeeked={(e) => setNow(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => (e.currentTarget.playbackRate = rate)}
                    className="w-full"
                    aria-label={`Morning brief audio, ${clock(audio.seconds)}`}
                  />
                  <div className="flex items-center gap-2">
                    <span id="brief-speed" className="text-caption text-ink-muted">
                      Speed
                    </span>
                    <div role="group" aria-labelledby="brief-speed" className="inline-flex border border-hairline">
                      {RATES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={rate === r}
                          onClick={() => setRate(r)}
                          className={cn(
                            "h-7 min-w-10 cursor-pointer px-2 text-micro tabular-nums transition-colors",
                            rate === r ? "bg-surface-selected font-semibold text-ink" : "bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink",
                          )}
                        >
                          {r}×
                        </button>
                      ))}
                    </div>
                  </div>
                  <nav aria-label="Brief chapters">
                    <h3 className="font-display text-label uppercase text-ink-muted">Chapters</h3>
                    <ol className="mt-1 divide-y divide-hairline border-y border-hairline">
                      {audio.chapters.map((c) => (
                        <li key={c.chapter}>
                          <button
                            type="button"
                            onClick={() => jump(c.startSeconds)}
                            aria-current={current === c.chapter ? "true" : undefined}
                            className={cn(
                              "flex min-h-9 w-full cursor-pointer items-center gap-3 px-2 text-left text-body-sm transition-colors hover:bg-surface-sunken",
                              current === c.chapter && "bg-surface-selected font-semibold",
                            )}
                          >
                            <span className="w-10 shrink-0 tabular-nums text-ink-muted">{clock(c.startSeconds)}</span>
                            <span className="min-w-0 text-ink">{brief.chapters.find((x) => x.id === c.chapter)?.title ?? c.chapter}</span>
                            <span className="sr-only">, play from here</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </>
              ) : (
                <AudioNote brief={brief} />
              )}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-8">
            {brief.status === "quiet" ? (
              <EmptyState
                title="A quiet morning for your suppliers, customers and technologies"
                body="Nothing new in your scope today, so there's no audio. The wider news is in the feed below."
              />
            ) : (
              brief.chapters.map((c) => <WrittenChapter key={c.id} chapter={c} audioOn={!!audio} onPlay={jump} />)
            )}
            {brief.more.length > 0 && (
              <details className="group border-t border-hairline pt-3">
                <summary className="cursor-pointer text-body-sm font-semibold text-ink marker:text-ink-muted">
                  More in the written brief: {brief.more.length} {brief.more.length === 1 ? "story" : "stories"} the audio left out
                </summary>
                <ul className="mt-2 divide-y divide-hairline">
                  {brief.more.map((s) => (
                    <WrittenStory key={s.id} story={s} compact />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function WrittenChapter({ chapter, audioOn, onPlay }: { chapter: BriefChapter; audioOn: boolean; onPlay: (s: number) => void }) {
  const start = chapter.startSeconds;
  return (
    <section aria-labelledby={`brief-${chapter.id}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-1">
        <h3 id={`brief-${chapter.id}`} className="font-display text-section-title text-ink">
          {chapter.title}
        </h3>
        {start !== undefined && (
          <button
            type="button"
            onClick={() => onPlay(start)}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 px-1.5 text-caption text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Play className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            Listen from <span className="tabular-nums">{clock(start)}</span>
            <span className="sr-only"> ({chapter.title})</span>
          </button>
        )}
      </div>
      <ol className="divide-y divide-hairline">
        {chapter.stories.map((s) => (
          <WrittenStory key={s.id} story={s} notInAudio={audioOn && !s.inAudio} />
        ))}
      </ol>
    </section>
  );
}

function WrittenStory({ story, compact, notInAudio }: { story: BriefStory; compact?: boolean; notInAudio?: boolean }) {
  const text = story.summary ?? story.angle ?? story.snippet;
  return (
    <li className="py-2.5">
      {(story.worthKnowing || notInAudio || (!story.summary && !compact)) && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {story.worthKnowing && <Chip>Worth knowing</Chip>}
          {notInAudio && <Chip>Not in the audio</Chip>}
          {!story.summary && !compact && <Chip>Not summarized yet</Chip>}
        </div>
      )}
      {!compact && text && <p className="max-w-prose text-body text-ink">{text}</p>}
      <p className={cn("text-body-sm", !compact && text && "mt-1")}>
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("underline-offset-2 hover:underline", compact ? "text-ink" : "text-ink-muted hover:text-ink")}
        >
          {story.title}
          <ExternalLink className="ml-1 inline h-3 w-3 -translate-y-px" strokeWidth={1.5} aria-hidden />
          <span className="sr-only"> (opens {story.outlet} in a new tab)</span>
        </a>{" "}
        <span className="whitespace-nowrap text-caption text-ink-muted">
          {story.outlet}, <time dateTime={story.publishedAt}>{stamp(story.publishedAt)}</time>
        </span>
      </p>
    </li>
  );
}

/** Why there's no audio, in one line. */
function AudioNote({ brief }: { brief: AssembledBrief }) {
  const a = brief.audio;
  const [title, body] =
    a.status === "off"
      ? ["Audio is off", "Text-to-Speech isn't set up on this server, and today's clips aren't stored. The written brief is complete."]
      : a.status === "pending"
        ? ["Audio isn't voiced yet", `${a.missingClips} ${a.missingClips === 1 ? "clip is" : "clips are"} still to be voiced for this brief. It plays here once the morning job has run.`]
        : a.status === "error"
          ? ["The audio couldn't be put together", "A stored clip couldn't be read. The written brief is complete."]
          : brief.status === "quiet"
            ? ["No audio today", "Nothing in your scope to read out."]
            : ["No audio yet", "No story is summarized yet, so there's nothing to read out. The written brief shows each source's snippet."];
  return (
    <div role="status" className="border-l-2 border-l-hairline pl-3">
      <p className="text-body-strong text-ink">{title}</p>
      <p className="mt-0.5 text-body-sm text-ink-muted">{body}</p>
    </div>
  );
}

function Provenance({ brief }: { brief: AssembledBrief }) {
  return (
    <>
      <span>
        Picked by rule from today&rsquo;s news for this profile. Summaries are written by Claude from each story&rsquo;s headline and snippet only, and can be
        wrong; every story links its source. Audio by Google Cloud Text-to-Speech.
      </span>
      {brief.builtAt && (
        <span>
          News as of <time dateTime={brief.builtAt}>{stamp(brief.builtAt)}</time>
        </span>
      )}
      {brief.unsummarized > 0 && (
        <span>
          {brief.claude === "off"
            ? "Claude is off, so stories show their source's snippet in place of a summary."
            : `${brief.unsummarized} ${brief.unsummarized === 1 ? "story isn't" : "stories aren't"} summarized yet and show the source's snippet.`}
        </span>
      )}
    </>
  );
}

/** Development only: whose brief to show, until SSO gives each user their own. */
function ProfilePicker({ choices, value }: { choices: { id: string; role: string }[]; value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <FilterSelect
      label="Profile"
      className="max-w-full"
      value={value ?? choices[0].id}
      options={choices.map((c) => ({ value: c.id, label: c.role }))}
      onChange={(id) => {
        const next = new URLSearchParams(params);
        next.set("brief", id);
        router.replace(`${pathname}?${next}`, { scroll: false });
      }}
    />
  );
}
