"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, FileText, ListOrdered, Presentation, Trash2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { LoadingBlock, Skeleton } from "@/components/ui/states";
import { AUDIENCES, audienceLabel, type Audience } from "@/lib/deck/outline";
import type { DeckCommentary } from "@/lib/deck/commentary";
import type { Storyline } from "@/lib/deck/storyline";
import {
  applyOrder,
  applyStoryline,
  commentaryUpdate,
  deckEvidenceOf,
  isMock,
  sectionOk,
  setOrder,
  slidePreview,
  summaryMatches,
  summaryPreview,
  trayDeckSlides,
  updateItem,
  type Commentary,
  type DeckSummary,
  type TrayItem,
} from "@/lib/deck/tray";
import { isHidden } from "@/lib/visibility";
import { cn } from "@/lib/utils";
import { SlideFrame } from "./slide-preview";
import { useTray } from "./tray-provider";

// The review page (docs/design/deck-tray, mockup 3): the slides on the left in
// the order they ship, with the reader's point under the selected one; that
// slide's preview in the middle; the order summary on the right, where the
// deck is named, its audience chosen and the deck shipped as PowerPoint (built
// on the server, the Avnet template) or PDF (printed from this page, one slide
// to a page). Claude's commentary (Phase 2) is asked for here: written for the
// whole deck, or one slide again, shown in each slide's preview as Claude's, and
// saved with the tray so the PowerPoint and the PDF ship what the reader saw.

const LABEL = "font-display text-label uppercase text-ink-muted";
const field = "h-control w-full border border-hairline bg-surface px-2.5 text-body-sm text-ink";
type Format = "pptx" | "pdf";

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const longDay = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const slides = (n: number) => `${n} ${n === 1 ? "slide" : "slides"}`;
/** "Nov 25" from YYYY-MM-DD, the same in every time zone. */
const ymdDay = (ymd: string) => day(`${ymd.slice(0, 10)}T12:00:00Z`);

type AiState = {
  busy?: "deck" | string;
  message?: string;
  tone?: "error" | "info";
  /** The slide the message is about, when it's about one. */
  slide?: string;
  /** Claude is off on this server: the control says so and stays off. */
  off?: boolean;
  /** What Clear all removed, so it can be put back. */
  undo?: { byId: Record<string, Commentary | undefined>; sections?: Record<string, string | undefined>; summary?: DeckSummary };
};

/** Claude's suggested order (Phase 3): shown for the reader to apply or dismiss; nothing moves until they apply it. */
type OrderState = {
  busy?: boolean;
  suggestion?: Storyline & { order: string[] };
  /** Whether to apply Claude's section titles with the order. */
  withSections?: boolean;
  message?: string;
  tone?: "error" | "info";
  off?: boolean;
  /** The tray's order and section titles before an applied suggestion, so Undo can put them back. */
  undo?: { ids: string[]; sections: Record<string, string | undefined>; after: string[] };
};

const UNSAVED = "Saved for this tab only: the browser wouldn't store more, so it will be gone after a reload.";

/** Claude's commentary for the deck, or one slide of it, from the server (200 with a status, or an error status with one). Never throws. */
async function askClaude(body: { title: string; audience: Audience; items: TrayItem[]; rewrite?: string }): Promise<DeckCommentary> {
  try {
    const res = await fetch("/api/deck/tray/commentary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as Partial<DeckCommentary> | null;
    const known = json && (json.status === "ok" || json.status === "off" || json.status === "failed");
    if (known && json.slides && typeof json.slides === "object") return json as DeckCommentary;
    return { status: "failed", slides: {}, message: `Claude's commentary didn't come back from the server (error ${res.status}).` };
  } catch {
    return { status: "failed", slides: {}, message: "Couldn't reach the server to ask Claude. Check your connection." };
  }
}

/** Claude's suggested order for the deck, from the server. Never throws. */
async function askStoryline(body: { title: string; audience: Audience; items: TrayItem[] }): Promise<Storyline> {
  try {
    const res = await fetch("/api/deck/tray/storyline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as Partial<Storyline> | null;
    const known = json && (json.status === "ok" || json.status === "off" || json.status === "failed");
    if (known && json.reasons && typeof json.reasons === "object" && json.sections && typeof json.sections === "object") return json as Storyline;
    return { status: "failed", reasons: {}, sections: {}, message: `Claude's suggestion didn't come back from the server (error ${res.status}).` };
  } catch {
    return { status: "failed", reasons: {}, sections: {}, message: "Couldn't reach the server to ask Claude. Check your connection." };
  }
}

export function TrayReview() {
  const { items, ready } = useTray();
  if (!ready) return <LoadingBlock label="Reading your deck…" lines={6} />;
  if (!items.length) return <EmptyTray />;
  return <Review items={items} />;
}

function Review({ items }: { items: TrayItem[] }) {
  const { move, update, remove, setCommentary, setSections, arrange, summary } = useTray();
  const uid = useId();
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<Audience>("internal");
  const [format, setFormat] = useState<Format>("pptx");
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [printing, setPrinting] = useState(false);
  const [ai, setAi] = useState<AiState>({});
  const [order, setOrderState] = useState<OrderState>({});

  const selected = items.find((x) => x.id === selectedId) ?? items[0];
  const shipped = items.filter((x) => x.included);
  const mock = shipped.filter((x) => isMock(x)).length;
  const oldest = shipped.reduce<string | undefined>((a, x) => (!a || x.addedAt < a ? x.addedAt : a), undefined);
  const number = selected.included ? shipped.indexOf(selected) + 1 : 0;
  const deckTitle = title.trim() || "Avnet market review";
  const written = shipped.filter((x) => x.commentary).length;
  // What ships after the cover: the summary, checked against the slides as they are now.
  const shippedSummary = summaryMatches(summary, items) ? summaryPreview(summary, items) : undefined;

  const audienceName = audienceLabel(audience);
  const writeRef = useRef<HTMLButtonElement>(null);
  const suggestRef = useRef<HTMLButtonElement>(null);
  const proposalRef = useRef<HTMLHeadingElement>(null);
  // Section titles are checked against every slide that ships, since a title speaks for a run of them.
  const deckEv = deckEvidenceOf(items);
  const busyAny = Boolean(ai.busy) || Boolean(order.busy);
  // Either call finding Claude off means it's off for both.
  const aiOff = Boolean(ai.off || order.off);
  const askAgainRef = useRef<HTMLButtonElement>(null);
  const orderStatusRef = useRef<HTMLParagraphElement>(null);
  // A suggestion made for slides that have since changed can't be applied: said in the live region as it happens.
  const stale = order.suggestion ? applyOrder(items, order.suggestion.order) === null : false;
  const STALE = "The deck has changed since Claude suggested this order, so it can't be applied. Dismiss it and suggest an order again.";
  // Why Claude's buttons are off, when they are: one caption both buttons point at.
  const why = aiOff
    ? ""
    : busyAny
      ? order.busy
        ? "Available when Claude finishes suggesting an order."
        : "Available when Claude finishes writing commentary."
      : "";
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const failedWith = (r: DeckCommentary, fallback: string, slide?: string): AiState => ({
    ...(slide ? { slide } : {}),
    message: r.message ?? fallback,
    tone: r.status === "off" ? "info" : "error",
    off: r.status === "off",
  });

  const writeAll = async () => {
    // The slides as they are now: the answer is saved against these, whatever changes while it's written.
    const sent = shipped;
    setAi({ busy: "deck" });
    try {
      const r = await askClaude({ title: deckTitle, audience, items });
      if (r.status !== "ok") return setAi(failedWith(r, "Claude couldn't write commentary just now."));
      const plan = commentaryUpdate(sent, r);
      if (!plan) return setAi({ message: "Claude's commentary didn't fit the deck, so nothing was saved. Try again.", tone: "error" });
      const saved = setCommentary(plan.byId, plan.summary ?? null);
      if (saved === "refused") return setAi({ message: "Claude's commentary didn't fit the deck, so nothing was saved. Try again.", tone: "error" });
      const got = sent.filter((x) => r.slides[x.id]);
      const missing = sent.filter((x) => !r.slides[x.id]);
      const parts = [
        missing.length
          ? `Claude wrote commentary for ${got.length} of ${slides(sent.length)}. ${missing.map((x) => x.title).join(", ")} ${missing.length === 1 ? "keeps" : "keep"} the app's wording${plan.cleared.length ? ", and the earlier commentary there was cleared" : ""}.`
          : `Claude wrote commentary for ${slides(sent.length)}.`,
        plan.summary ? "The executive summary ships after the cover." : "No executive summary held up against the slides.",
        "Check it before you ship.",
        saved === "unsaved" ? UNSAVED : "",
      ];
      setAi({ message: parts.filter(Boolean).join(" "), tone: "info" });
    } finally {
      setAi((a) => (a.busy === "deck" ? { ...a, busy: undefined } : a));
    }
  };

  const rewrite = async (id: string) => {
    setAi({ busy: id, slide: id });
    try {
      const r = await askClaude({ title: deckTitle, audience, items, rewrite: id });
      const c = r.status === "ok" ? r.slides[id] : undefined;
      if (!c) return setAi(failedWith(r, "Claude couldn't write this slide again just now.", id));
      const saved = setCommentary({ [id]: c });
      if (saved === "refused") return setAi({ slide: id, message: "Claude's commentary didn't fit the slide, so the old one stays. Try again.", tone: "error" });
      setAi({ slide: id, message: `Written again. Check it before you ship.${saved === "unsaved" ? ` ${UNSAVED}` : ""}`, tone: "info" });
    } finally {
      setAi((a) => (a.busy === id ? { ...a, busy: undefined } : a));
    }
  };

  const clearOne = (id: string) => {
    setCommentary({ [id]: undefined });
    // A slide's section title goes with its commentary: Clear gives back the slide as the app made it.
    setSections({ [id]: undefined });
    setAi({ slide: id, message: "Cleared. This slide uses the app's wording.", tone: "info" });
    // The commentary block goes; focus stays on this slide's point.
    requestAnimationFrame(() => noteRef.current?.focus());
  };

  const clearAll = () => {
    const undo = {
      byId: Object.fromEntries(items.filter((x) => x.commentary).map((x) => [x.id, x.commentary])),
      sections: Object.fromEntries(items.filter((x) => x.section).map((x) => [x.id, x.section])),
      ...(summary ? { summary } : {}),
    };
    setCommentary(Object.fromEntries(items.map((x) => [x.id, undefined])), null);
    setSections(Object.fromEntries(items.map((x) => [x.id, undefined])));
    setAi({ message: `Commentary${undo && Object.keys(undo.sections).length ? " and section titles" : ""} cleared. The deck uses the app's wording.`, tone: "info", undo });
    requestAnimationFrame(() => writeRef.current?.focus());
  };

  const undoClear = () => {
    if (!ai.undo) return;
    setCommentary(ai.undo.byId, ai.undo.summary ?? null);
    if (ai.undo.sections) setSections(ai.undo.sections);
    setAi({ message: ai.undo.sections && Object.keys(ai.undo.sections).length ? "Commentary and section titles put back." : "Commentary put back.", tone: "info" });
  };

  const retry = () => (ai.slide ? rewrite(ai.slide) : writeAll());

  // A move by hand after applying Claude's order: Undo order would undo the hand moves too, so it goes.
  const moveByHand = (id: string, dir: -1 | 1) => {
    move(id, dir);
    setOrderState((o) => (o.undo ? { ...o, undo: undefined, message: undefined } : o));
  };

  /* ---------- Claude's suggested order ---------- */

  const suggest = async () => {
    setOrderState({ busy: true });
    const r = await askStoryline({ title: deckTitle, audience, items });
    if (r.status !== "ok" || !r.order) {
      const off = r.status === "off";
      setOrderState({ message: r.message ?? "Claude couldn't suggest an order just now.", tone: off ? "info" : "error", off });
      // The button that had focus is disabled while Claude works: focus goes to what can be done next.
      requestAnimationFrame(() => (off ? orderStatusRef.current?.focus() : askAgainRef.current?.focus()));
      return;
    }
    setOrderState({ suggestion: { ...r, order: r.order }, withSections: Object.keys(r.sections).length > 0 });
    // The proposal takes the focus, so a keyboard or screen reader user lands on it.
    requestAnimationFrame(() => proposalRef.current?.focus());
  };

  const dismissSuggestion = () => {
    setOrderState({ message: "Suggestion dismissed. The deck keeps your order.", tone: "info" });
    requestAnimationFrame(() => suggestRef.current?.focus());
  };

  const applySuggestion = () => {
    const sug = order.suggestion;
    if (!sug) return;
    const summaryWas = summaryMatches(summary, items);
    // Only titles that fit the tray's limits: one bad item would make the whole saved tray unreadable.
    const titles = Object.fromEntries(Object.entries(sug.sections).filter(([, t]) => typeof t === "string" && sectionOk(t)));
    const withSections = Boolean(order.withSections && Object.keys(titles).length);
    const hadSections = items.some((x) => x.included && x.section);
    // One write, through the tray's own reorder path. The included slides take Claude's order, and
    // any section titles they had go: they headed runs in the old order. With section titles, Claude's new ones go on.
    const r = arrange((now) => applyStoryline(now, sug.order, withSections ? titles : undefined));
    if (!r) {
      setOrderState({ message: "The deck changed since Claude suggested this order, so nothing moved. Suggest an order again.", tone: "error" });
      requestAnimationFrame(() => suggestRef.current?.focus());
      return;
    }
    const parts = [
      "Claude's order applied.",
      withSections ? "Section titles are on the slides." : hadSections ? "The earlier section titles were removed, since they headed the old order." : "",
      summaryWas ? "The executive summary followed the old order, so it won't ship until you write commentary again." : "",
      r.saved ? "" : UNSAVED,
    ];
    setOrderState({
      message: parts.filter(Boolean).join(" "),
      tone: "info",
      undo: { ids: r.before.map((x) => x.id), sections: Object.fromEntries(r.before.map((x) => [x.id, x.section])), after: sug.order },
    });
    requestAnimationFrame(() => suggestRef.current?.focus());
  };

  const undoOrder = () => {
    const u = order.undo;
    if (!u) return;
    const r = arrange((now) => {
      // Only while the deck is still in Claude's order: a change since (in this tab or another) isn't undone silently.
      const included = now.filter((x) => x.included).map((x) => x.id);
      if (included.length !== u.after.length || included.some((id, i) => id !== u.after[i])) return null;
      const back = setOrder(now, u.ids);
      return back && back.reduce((acc, x) => updateItem(acc, x.id, { section: u.sections[x.id] }), back);
    });
    setOrderState(r ? { message: "Your order is back.", tone: "info" } : { message: "The deck changed since, so the old order couldn't be put back. Move slides with the arrows.", tone: "error" });
    requestAnimationFrame(() => suggestRef.current?.focus());
  };

  const ship = async () => {
    if (format === "pdf") return setPrinting(true);
    setState({ busy: true });
    try {
      const res = await fetch("/api/deck/tray/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: deckTitle, audience, items, ...(shippedSummary && summary ? { summary } : {}) }),
      });
      if (!res.ok) throw new Error((await res.text()) || "The deck couldn't be built just now.");
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "Avnet deck.pptx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setState({ busy: false });
    } catch (e) {
      setState({ busy: false, error: e instanceof Error ? e.message : "The deck couldn't be built just now." });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section aria-labelledby={`${uid}-slides`} className="rounded-sm border border-hairline bg-surface xl:col-span-3">
          <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
            <h2 id={`${uid}-slides`} className="font-display text-card-title text-ink">
              Slides
            </h2>
            <span className="text-caption tabular-nums text-ink-muted">
              {shipped.length} of {items.length} in the deck
            </span>
          </header>
          <ol className="mt-2 divide-y divide-hairline border-t border-hairline">
            {items.map((x, i) => {
              const active = x.id === selected.id;
              const n = x.included ? shipped.indexOf(x) + 1 : 0;
              return (
                <li key={x.id} aria-busy={ai.busy === x.id || undefined} className={cn("relative", active && "bg-surface-selected")}>
                  {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
                  <div className="flex items-center gap-2 py-1.5 pl-3 pr-2">
                    <input
                      type="checkbox"
                      checked={x.included}
                      onChange={() => update(x.id, { included: !x.included })}
                      aria-label={`Include ${x.title}`}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-ink"
                    />
                    <span className="w-5 shrink-0 text-right text-caption tabular-nums text-ink-muted">{n || ""}</span>
                    <span className="flex shrink-0 flex-col">
                      <button
                        type="button"
                        onClick={() => moveByHand(x.id, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${x.title} up`}
                        className="cursor-pointer text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveByHand(x.id, 1)}
                        disabled={i === items.length - 1}
                        aria-label={`Move ${x.title} down`}
                        className="cursor-pointer text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedId(x.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn("min-w-0 flex-1 cursor-pointer py-0.5 text-left", !x.included && "opacity-50")}
                    >
                      <span className={cn("block text-body-sm text-ink underline-offset-2 hover:underline", active && "font-semibold")}>{x.title}</span>
                      <span className="block text-caption text-ink-muted">{x.from.page}</span>
                    </button>
                    {isMock(x) && <span className="shrink-0 bg-warning px-1 text-micro font-semibold text-ink">Mock</span>}
                    <button
                      type="button"
                      onClick={() => remove(x.id)}
                      aria-label={`Remove ${x.title}`}
                      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                  {active && (
                    <div className="px-4 pb-3 pl-[3.25rem]">
                      <label htmlFor={`${uid}-note`} className={LABEL}>
                        Your point for this slide
                      </label>
                      <textarea
                        ref={noteRef}
                        id={`${uid}-note`}
                        value={x.note ?? ""}
                        onChange={(e) => update(x.id, { note: e.target.value })}
                        maxLength={300}
                        rows={2}
                        placeholder={x.preview.headline}
                        className="mt-1 block w-full resize-y border border-hairline bg-surface px-2.5 py-1.5 text-body-sm text-ink placeholder:text-ink-muted focus:border-ink"
                      />
                      <p className="mt-1 text-caption text-ink-muted">
                        {x.commentary ? "Claude's brief for this slide's headline." : "Becomes the slide's title. Leave it empty to keep the app's."}
                      </p>
                      {x.section && (
                        <p className="mt-2 flex items-center gap-2 text-caption text-ink">
                          <span>
                            <span className="text-ink-muted">Section, from Claude&apos;s order: </span>
                            {x.section}
                            {!slidePreview(x, deckEv).section && <span className="text-ink"> (won&apos;t ship: a figure in it is no longer on an included slide)</span>}
                          </span>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              update(x.id, { section: undefined });
                              setAi({ slide: x.id, message: "Section title removed.", tone: "info" });
                              requestAnimationFrame(() => noteRef.current?.focus());
                            }}
                            aria-label={`Remove the section title from ${x.title}`}
                          >
                            Remove
                          </Button>
                        </p>
                      )}
                      {x.commentary && (
                        <SlideCommentary
                          item={x}
                          audience={audienceName}
                          busy={ai.busy === x.id}
                          waiting={ai.busy === "deck"}
                          onRewrite={() => rewrite(x.id)}
                          onClear={() => clearOne(x.id)}
                        />
                      )}
                      {/* Visible here; announced once, by the commentary section's status line. */}
                      {ai.slide === x.id && ai.message && (
                        <p className={cn("mt-1.5 text-caption", ai.tone === "error" ? "text-negative" : "text-ink-muted")}>{ai.message}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby={`${uid}-preview`} className="rounded-sm border border-hairline bg-surface px-4 py-3 xl:col-span-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={`${uid}-preview`} className="font-display text-card-title text-ink">
              {number ? `Slide ${number} of ${shipped.length}` : "Left out of the deck"}
            </h2>
            <span className="text-caption text-ink-muted">Figures as of {day(selected.addedAt)}</span>
          </div>
          <figure className="mt-3" aria-busy={ai.busy === selected.id || undefined} aria-label={`Slide preview: ${slidePreview(selected, deckEv).headline}`}>
            <SlideFrame p={slidePreview(selected, deckEv)} mock={isMock(selected)} number={number} />
          </figure>
          <p className="mt-2 text-body-sm">
            <Link href={selected.from.href} className="text-ink underline underline-offset-2 hover:text-ink-muted">
              Opens on {selected.from.page}
            </Link>
          </p>
        </section>

        <section aria-labelledby={`${uid}-summary`} className="rounded-sm border border-hairline bg-surface px-4 py-3 xl:col-span-3">
          <h2 id={`${uid}-summary`} className="font-display text-card-title text-ink">
            Order summary
          </h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className={LABEL}>Deck title</span>
              <input
                name="deck-title"
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Avnet market review"
                className={cn(field, "mt-0.5 placeholder:text-ink-muted")}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Audience</span>
              <select name="audience" value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className={cn(field, "mt-0.5")}>
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section aria-labelledby={`${uid}-claude`} aria-busy={ai.busy === "deck" || order.busy || undefined} className="mt-4 border-t border-hairline pt-3">
            <h3 id={`${uid}-claude`} className={LABEL}>
              Claude
            </h3>
            <p className="mt-1 text-caption text-ink-muted">
              Claude writes each slide&apos;s headline, a sentence, bullets and speaker notes, and an executive summary, using only the figures on the slides. It can also suggest an order.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                ref={writeRef}
                onClick={writeAll}
                disabled={!shipped.length || busyAny || aiOff}
                aria-describedby={`${uid}-claude-status${shipped.length ? "" : ` ${uid}-none`}${why ? ` ${uid}-why` : ""}`}
              >
                {ai.busy === "deck" ? "Writing commentary…" : written ? "Write commentary again" : "Write commentary"}
              </Button>
              <Button
                ref={suggestRef}
                onClick={suggest}
                disabled={shipped.length < 2 || busyAny || aiOff}
                aria-describedby={[shipped.length < 2 ? `${uid}-order-few` : "", why ? `${uid}-why` : "", aiOff ? `${uid}-off` : ""].filter(Boolean).join(" ") || undefined}
              >
                {order.busy ? "Suggesting an order…" : "Suggest an order"}
              </Button>
              {(written > 0 || summary) && (
                <Button variant="destructive" onClick={clearAll} disabled={busyAny}>
                  Clear all
                </Button>
              )}
            </div>
            {why && (
              <p id={`${uid}-why`} className="mt-1.5 text-caption text-ink-muted">
                {why}
              </p>
            )}
            {aiOff && (
              <p id={`${uid}-off`} className="sr-only">
                Claude is off on this server.
              </p>
            )}
            {/* The one live region for commentary: always mounted, so every message is announced once. */}
            <p id={`${uid}-claude-status`} role="status" aria-live="polite" className={cn("mt-1.5 min-h-4 text-caption", ai.tone === "error" ? "text-negative" : "text-ink-muted", ai.slide && !ai.busy && "sr-only")}>
              {ai.busy === "deck" ? "Claude is writing commentary for the deck…" : ai.busy ? "Claude is writing this slide again…" : ai.message}
            </p>
            {!busyAny && ai.tone === "error" && !ai.off && (
              <Button variant="ghost" onClick={retry} className="mt-1">
                Try again
              </Button>
            )}
            {!busyAny && ai.undo && (
              <Button variant="ghost" onClick={undoClear} className="mt-1">
                Undo clear
              </Button>
            )}
            {/* The storyline's own live region, always mounted, as commentary's is. */}
            <p
              id={`${uid}-order-status`}
              ref={orderStatusRef}
              tabIndex={-1}
              role="status"
              aria-live="polite"
              className={cn("mt-1.5 min-h-4 text-caption", order.tone === "error" || stale ? "text-negative" : "text-ink-muted")}
            >
              {order.busy ? "Claude is suggesting an order for the deck…" : order.suggestion ? (stale ? STALE : "") : order.message}
            </p>
            {shipped.length < 2 && (
              <p id={`${uid}-order-few`} className="mt-1 text-caption text-ink-muted">
                Include two or more slides for Claude to suggest an order.
              </p>
            )}
            {!busyAny && !order.suggestion && order.tone === "error" && !aiOff && (
              <Button ref={askAgainRef} variant="ghost" onClick={suggest} className="mt-1">
                Ask again
              </Button>
            )}
            {!busyAny && order.undo && (
              <Button variant="ghost" onClick={undoOrder} className="mt-1">
                Undo order
              </Button>
            )}
            {order.busy ? (
              <OrderSkeleton />
            ) : (
              order.suggestion && (
                <OrderProposal
                  headingRef={proposalRef}
                  suggestion={order.suggestion}
                  items={items}
                  stale={stale}
                  withSections={Boolean(order.withSections)}
                  onSections={(v) => setOrderState((o) => ({ ...o, withSections: v }))}
                  onApply={applySuggestion}
                  onDismiss={dismissSuggestion}
                  busy={busyAny}
                  whyId={`${uid}-why`}
                />
              )
            )}
            {ai.busy === "deck" ? (
              <SummarySkeleton />
            ) : (
              summary && <SummaryBlock summary={summary} lines={shippedSummary?.lines} audience={audienceName} />
            )}
          </section>

          <ul className="mt-4 divide-y divide-hairline border-y border-hairline text-body-sm text-ink">
            <li className="py-2">
              {slides(shipped.length)}, with a cover{shippedSummary ? ", Claude's executive summary" : ""} and the sources
            </li>
            {written > 0 && <li className="py-2">Claude&apos;s commentary on {written} of {slides(shipped.length)}</li>}
            <li className="flex items-center justify-between gap-2 py-2">
              <span>{mock ? `${slides(mock)} on mock data` : "Every slide on live data"}</span>
              {mock > 0 && <span className="bg-warning px-1 text-micro font-semibold text-ink">Mock data</span>}
            </li>
            {oldest && <li className="py-2 text-ink-muted">Figures as added, the oldest on {day(oldest)}</li>}
          </ul>

          <fieldset className="mt-4">
            <legend className={LABEL}>Ship as</legend>
            <div className="mt-1 space-y-2">
              {(
                [
                  ["pptx", "PowerPoint", "Avnet template, editable native charts"],
                  ["pdf", "PDF", "One slide to a page. Choose Save as PDF in the print dialog"],
                ] as const
              ).map(([value, name, about]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 border px-3 py-2",
                    format === value ? "border-ink bg-surface-sunken" : "border-hairline hover:bg-surface-sunken",
                  )}
                >
                  <input type="radio" name={`${uid}-format`} value={value} checked={format === value} onChange={() => setFormat(value)} className="mt-1 accent-ink" />
                  <span>
                    <span className="block text-body-sm font-semibold text-ink">{name}</span>
                    <span className="block text-caption text-ink-muted">{about}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button variant="primary" onClick={ship} disabled={!shipped.length || state.busy || printing} aria-busy={state.busy} className="mt-4 w-full">
            {state.busy ? "Building the deck…" : "Ship deck"}
          </Button>
          <p aria-live="polite" className="mt-1.5 text-caption text-negative empty:hidden">
            {state.error}
          </p>
          {!shipped.length && (
            <p id={`${uid}-none`} className="mt-1.5 text-caption text-ink-muted">
              Include at least one slide to write commentary or ship.
            </p>
          )}
        </section>
      </div>

      {printing && (
        <PrintDeck items={items} summary={shippedSummary ? summary : undefined} title={deckTitle} audience={audienceLabel(audience)} onDone={() => setPrinting(false)} />
      )}
    </>
  );
}

/**
 * The deck as the PDF prints it: every slide at 10 by 5.625 inches, one to a
 * page (src/app/print.css, data-print="deck"). It is drawn off screen first so
 * the charts are measured, then the print dialog opens, and it goes when the
 * dialog closes.
 */
function PrintDeck({ items, summary, title, audience, onDone }: { items: TrayItem[]; summary?: DeckSummary; title: string; audience: string; onDone: () => void }) {
  const deck = trayDeckSlides(items, { title, audience, date: longDay(), summary });
  // Print once per mount, whatever the page re-renders in the meantime.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDoneRef.current();
    };
    window.addEventListener("afterprint", finish);
    // Two frames for layout, then a moment for the charts to draw at their size.
    const t = setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      window.print();
      // Browsers whose print() returns before printing still send afterprint; others return after.
      setTimeout(finish, 500);
    })), 300);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", finish);
    };
  }, []);

  return (
    <div data-print="deck" aria-hidden className="fixed left-[-10000px] top-0 w-[960px]">
      {deck.map((d, i) => (
        <section key={i}>
          <SlideFrame p={d.preview} mock={d.mock} number={d.kind ? undefined : i} variant={d.kind === "cover" ? "cover" : "content"} className="h-[540px] w-[960px]" />
        </section>
      ))}
    </div>
  );
}

/** Claude's commentary on the selected slide: when and for whom it was written, and writing it again or clearing it. */
function SlideCommentary({
  item,
  audience,
  busy,
  waiting,
  onRewrite,
  onClear,
}: {
  item: TrayItem;
  audience: string;
  busy: boolean;
  /** Claude is writing the whole deck, so this slide's buttons wait. */
  waiting: boolean;
  onRewrite: () => void;
  onClear: () => void;
}) {
  const c = item.commentary!;
  const changed = (c.forNote ?? "") !== (item.note?.trim() ?? "");
  const otherAudience = c.audience && c.audience !== audience;
  return (
    <div className="mt-3 border-t border-hairline pt-2">
      <p className={LABEL}>Claude&apos;s commentary</p>
      <p className="mt-0.5 text-caption text-ink-muted">
        Written by Claude on {ymdDay(c.writtenAt)}
        {c.audience ? ` for ${c.audience.toLowerCase()} audiences` : ""} and shown on the slide. Check it before quoting.
      </p>
      {changed && <p className="mt-1 text-caption text-ink">Your point has changed since Claude wrote this. Choose Write again to use it.</p>}
      {otherAudience && <p className="mt-1 text-caption text-ink">The audience is now {audience.toLowerCase()}. Choose Write again to match it.</p>}
      <div className="mt-1.5 flex gap-2">
        <Button onClick={onRewrite} disabled={busy || waiting} aria-label={`Write Claude's commentary again for ${item.title}`}>
          {busy ? "Writing…" : "Write again"}
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={busy || waiting} aria-label={`Clear Claude's commentary for ${item.title}`}>
          Clear
        </Button>
      </div>
      {waiting && <p className="mt-1 text-caption text-ink-muted">Waiting for Claude to finish the deck.</p>}
    </div>
  );
}

/**
 * Claude's suggested order, before anything moves: each slide in the new order,
 * where it was, Claude's reason for each one that moved, and any section titles.
 * The reader applies it or dismisses it. When the deck has changed since Claude
 * was asked, it can only be dismissed.
 */
function OrderProposal({
  headingRef,
  suggestion,
  items,
  stale,
  withSections,
  onSections,
  onApply,
  onDismiss,
  busy,
  whyId,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  suggestion: Storyline & { order: string[] };
  items: TrayItem[];
  stale: boolean;
  withSections: boolean;
  onSections: (v: boolean) => void;
  onApply: () => void;
  onDismiss: () => void;
  busy: boolean;
  /** The caption saying why Apply is off while Claude is busy. */
  whyId: string;
}) {
  const uid = useId();
  const shipped = items.filter((x) => x.included);
  const byId = new Map(shipped.map((x) => [x.id, x]));
  const was = new Map(shipped.map((x, i) => [x.id, i + 1]));
  const moved = suggestion.order.filter((id, i) => was.get(id) !== i + 1).length;
  const sections = Object.keys(suggestion.sections).length;
  return (
    <div role="region" aria-labelledby={`${uid}-h`} className="mt-3 border border-hairline bg-surface-sunken px-3 py-2">
      <h4 id={`${uid}-h`} ref={headingRef} tabIndex={-1} aria-describedby={`${uid}-lead`} className={LABEL}>
        Claude&apos;s suggested order
      </h4>
      <p id={`${uid}-lead`} className="mt-0.5 text-caption text-ink">
        {stale
          ? "The deck has changed since Claude suggested this order, so it can't be applied. Dismiss it and suggest an order again."
          : moved
            ? `Moves ${slides(moved)}. Nothing changes until you apply it.`
            : "Claude suggests keeping your order."}
      </p>
      <ol className="mt-2 space-y-1.5 text-body-sm text-ink">
        {suggestion.order.map((id, i) => {
          const x = byId.get(id);
          const from = was.get(id);
          const reason = suggestion.reasons[id];
          return (
            <li key={id} className="flex gap-2">
              <span className="w-4 shrink-0 text-right text-caption tabular-nums text-ink-muted">{i + 1}</span>
              <span className="min-w-0">
                {withSections && suggestion.sections[id] && <span className={cn(LABEL, "block")}>{suggestion.sections[id]}</span>}
                <span className="block">{x?.title ?? "A slide no longer in the deck"}</span>
                {from !== undefined && from !== i + 1 && (
                  <span className="block text-caption text-ink-muted">
                    Was {from}
                    {reason ? `. ${reason}` : ""}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {sections > 0 && !stale && (
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-caption text-ink">
          <input type="checkbox" checked={withSections} onChange={(e) => onSections(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
          <span>Add Claude&apos;s {sections === 1 ? "section title" : `${sections} section titles`} above the slides&apos; headlines</span>
        </label>
      )}
      <p className="mt-2 text-caption text-ink-muted">Suggested by Claude from the slides&apos; titles and figures. Check it reads the way you&apos;ll tell it.</p>
      <div className="mt-2 flex gap-2">
        {!stale && moved + (withSections ? sections : 0) > 0 && (
          <Button onClick={onApply} disabled={busy} aria-describedby={busy ? whyId : undefined}>
            {moved ? (withSections && sections ? "Apply order and titles" : "Apply order") : "Add section titles"}
          </Button>
        )}
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/** While Claude suggests an order: a short numbered list's shape, for the status line to describe. */
function OrderSkeleton() {
  return (
    <div aria-hidden className="mt-3 space-y-2">
      <Skeleton className="h-3 w-1/2" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className={cn("ml-6 h-4", i === 1 ? "w-2/3" : "w-[calc(100%-1.5rem)]")} />
      ))}
    </div>
  );
}

/** The executive summary as it ships (lines checked against the slides), or why it won't. */
function SummaryBlock({ summary, lines, audience }: { summary: DeckSummary; lines?: string[]; audience: string }) {
  const otherAudience = summary.audience && summary.audience !== audience;
  return (
    <div className="mt-3">
      <p className={LABEL}>Executive summary</p>
      {lines ? (
        <>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-body-sm text-ink">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <p className="mt-1 text-caption text-ink-muted">
            Written by Claude on {ymdDay(summary.writtenAt)}
            {summary.audience ? ` for ${summary.audience.toLowerCase()} audiences` : ""}. Ships after the cover.
          </p>
          {otherAudience && <p className="mt-1 text-caption text-ink">The audience is now {audience.toLowerCase()}. Write commentary again to match it.</p>}
        </>
      ) : (
        <p className="mt-1 text-caption text-ink">The slides have changed since Claude wrote it, so it won&apos;t ship. Write commentary again to update it.</p>
      )}
    </div>
  );
}

/** While Claude writes: the summary's shape, a label and a few bullets, for the status line above to describe. */
function SummarySkeleton() {
  return (
    <div aria-hidden className="mt-3 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className={cn("ml-4 h-4", i === 2 ? "w-2/3" : "w-[calc(100%-1rem)]")} />
      ))}
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/** The empty tray (mockup 4): what the deck is for, and where to start. */
function EmptyTray() {
  const starts = [
    { href: "/network", label: "Company profiles", about: "Quarterly detail, each view a chart" },
    { href: "/competitive", label: "Avnet vs Arrow", about: "The scorecard, one measure at a time" },
    { href: "/market-share", label: "Market share", about: "Share by segment, supplier and region" },
    { href: "/cycle", label: "Market cycle", about: "Where the semiconductor cycle is" },
  ].filter((s) => !isHidden(s.href));
  const steps = [
    { icon: Presentation, text: "Use Add to deck on a chart or a page as you browse." },
    { icon: ListOrdered, text: "Put the slides in order and write the point each one makes." },
    { icon: FileText, text: "Ship the deck as an Avnet PowerPoint or a PDF." },
  ];
  return (
    <section aria-labelledby="empty-tray" className="max-w-3xl rounded-sm border border-hairline border-l-[3px] border-l-primary bg-surface px-5 py-4">
      <h2 id="empty-tray" className="font-display text-section-title text-ink">
        Your deck is empty
      </h2>
      <p className="mt-1 max-w-[62ch] text-body text-ink">
        Collect charts and views as you read, then come back here to order them and ship them as one deck.
      </p>
      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2 text-body-sm text-ink">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
            {text}
          </li>
        ))}
      </ol>
      <h3 className={cn(LABEL, "mt-5 border-b border-hairline pb-1.5")}>Good places to start</h3>
      <ul className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0">
        {starts.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="group flex items-start justify-between gap-2 py-2 pr-3">
              <span>
                <span className="block text-body-sm font-semibold text-ink group-hover:underline">{s.label}</span>
                <span className="block text-caption text-ink-muted">{s.about}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/tools/deck" className={buttonClass("secondary", "mt-4")}>
        Open Pitch Deck Builder
      </Link>
    </section>
  );
}
