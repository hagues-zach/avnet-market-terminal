"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { isMock, trayLead } from "@/lib/deck/tray";
import { SlideThumb } from "./slide-preview";
import { useTray } from "./tray-provider";

// The mini tray (docs/design/deck-tray, mockup 2): what's in the deck, from the
// top bar's Deck button. It lists and removes; ordering, notes and shipping are
// on the review page. A native modal <dialog> on the right edge, so focus stays
// in it, Esc closes it and the page behind is inert.

const added = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function MiniTray({ onClose }: { onClose: () => void }) {
  const { items, remove, clear } = useTray();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (d && !d.open) d.showModal();
    return () => opener?.focus();
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 ml-auto h-dvh max-h-none w-[min(400px,100vw)] max-w-none border-l border-hairline bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start gap-2 border-b border-hairline px-5 py-3">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="font-display text-section-title text-ink">
              Your deck
            </h2>
            <p className="text-body-sm text-ink-muted">{trayLead(items)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink hover:bg-surface-sunken"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 px-5 py-6 text-body-sm text-ink">
            <p>Your deck is empty.</p>
            <p className="mt-1 text-ink-muted">Use Add to deck on a chart or a page, then order the slides and ship them as PowerPoint or PDF.</p>
          </div>
        ) : (
          <ol className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
            {items.map((x) => (
              <li key={x.id} className="flex items-start gap-3 px-5 py-3">
                <SlideThumb p={x.preview} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className={x.included ? "text-body-sm font-semibold text-ink" : "text-body-sm text-ink-muted line-through"}>{x.title}</p>
                  <p className="text-caption text-ink-muted">
                    {x.from.page}
                    {added(x.addedAt) && `, added ${added(x.addedAt)}`}
                  </p>
                  {isMock(x) && <span className="mt-1 inline-block bg-warning px-1 text-micro font-semibold text-ink">Mock data</span>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(x.id)}
                  aria-label={`Remove ${x.title}`}
                  className="inline-flex h-control w-8 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:bg-surface-sunken hover:text-ink"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}

        <footer className="space-y-2 border-t border-hairline px-5 py-4">
          <Link href="/tools/deck/tray" onClick={onClose} className={buttonClass("primary", "w-full")}>
            Review deck
          </Link>
          {items.length > 0 &&
            (confirming ? (
              <div className="flex items-center justify-between gap-2 text-body-sm">
                <span className="text-ink">Remove all {items.length} slides?</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost")}>
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setConfirming(false);
                    }}
                    className={buttonClass("destructive")}
                  >
                    Clear tray
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={buttonClass("ghost", "w-full")}>
                Clear tray
              </button>
            ))}
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
