"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, FileText, ListOrdered, Presentation, Trash2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/states";
import { AUDIENCES, audienceLabel, type Audience } from "@/lib/deck/outline";
import { isMock, slidePreview, trayDeckSlides, type TrayItem } from "@/lib/deck/tray";
import { isHidden } from "@/lib/visibility";
import { cn } from "@/lib/utils";
import { SlideFrame } from "./slide-preview";
import { useTray } from "./tray-provider";

// The review page (docs/design/deck-tray, mockup 3): the slides on the left in
// the order they ship, with the reader's point under the selected one; that
// slide's preview in the middle; the order summary on the right, where the
// deck is named, its audience chosen and the deck shipped as PowerPoint (built
// on the server, the Avnet template) or PDF (printed from this page, one slide
// to a page).

const LABEL = "font-display text-label uppercase text-ink-muted";
const field = "h-control w-full border border-hairline bg-surface px-2.5 text-body-sm text-ink";
type Format = "pptx" | "pdf";

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const longDay = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const slides = (n: number) => `${n} ${n === 1 ? "slide" : "slides"}`;

export function TrayReview() {
  const { items, ready } = useTray();
  if (!ready) return <LoadingBlock label="Reading your deck…" lines={6} />;
  if (!items.length) return <EmptyTray />;
  return <Review items={items} />;
}

function Review({ items }: { items: TrayItem[] }) {
  const { move, update, remove } = useTray();
  const uid = useId();
  const [selectedId, setSelectedId] = useState(items[0].id);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<Audience>("internal");
  const [format, setFormat] = useState<Format>("pptx");
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [printing, setPrinting] = useState(false);

  const selected = items.find((x) => x.id === selectedId) ?? items[0];
  const shipped = items.filter((x) => x.included);
  const mock = shipped.filter((x) => isMock(x)).length;
  const oldest = shipped.reduce<string | undefined>((a, x) => (!a || x.addedAt < a ? x.addedAt : a), undefined);
  const number = selected.included ? shipped.indexOf(selected) + 1 : 0;
  const deckTitle = title.trim() || "Avnet market review";

  const ship = async () => {
    if (format === "pdf") return setPrinting(true);
    setState({ busy: true });
    try {
      const res = await fetch("/api/deck/tray/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: deckTitle, audience, items }),
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
                <li key={x.id} className={cn("relative", active && "bg-surface-selected")}>
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
                        onClick={() => move(x.id, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${x.title} up`}
                        className="cursor-pointer text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(x.id, 1)}
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
                        id={`${uid}-note`}
                        value={x.note ?? ""}
                        onChange={(e) => update(x.id, { note: e.target.value })}
                        maxLength={300}
                        rows={2}
                        placeholder={x.preview.headline}
                        className="mt-1 block w-full resize-y border border-hairline bg-surface px-2.5 py-1.5 text-body-sm text-ink placeholder:text-ink-muted focus:border-ink"
                      />
                      <p className="mt-1 text-caption text-ink-muted">Becomes the slide&apos;s title. Leave it empty to keep the app&apos;s.</p>
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
          <figure className="mt-3" aria-label={`Slide preview: ${slidePreview(selected).headline}`}>
            <SlideFrame p={slidePreview(selected)} mock={isMock(selected)} number={number} />
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

          <ul className="mt-4 divide-y divide-hairline border-y border-hairline text-body-sm text-ink">
            <li className="py-2">{slides(shipped.length)}, with a cover and the sources</li>
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
          {!shipped.length && <p className="mt-1.5 text-caption text-ink-muted">Include at least one slide to ship.</p>}
        </section>
      </div>

      {printing && (
        <PrintDeck items={items} title={deckTitle} audience={audienceLabel(audience)} onDone={() => setPrinting(false)} />
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
function PrintDeck({ items, title, audience, onDone }: { items: TrayItem[]; title: string; audience: string; onDone: () => void }) {
  const deck = trayDeckSlides(items, { title, audience, date: longDay() });
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
