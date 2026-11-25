"use client";

import { Presentation } from "lucide-react";
import { useTray } from "./tray-provider";

// The top bar's Deck button (docs/design/deck-tray, mockup 1): how many slides
// are in the tray, and the way into the mini tray.

export function DeckButton() {
  const { items, openTray } = useTray();
  const n = items.length;
  return (
    <button
      type="button"
      onClick={openTray}
      aria-haspopup="dialog"
      aria-label={n ? `Deck, ${n} ${n === 1 ? "slide" : "slides"}` : "Deck, empty"}
      className="inline-flex h-control shrink-0 cursor-pointer items-center gap-1.5 border border-hairline px-2.5 font-body text-button text-ink hover:bg-surface-sunken"
    >
      <Presentation className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      Deck
      {n > 0 && <span className="min-w-[1.25rem] bg-primary px-1 text-center text-micro font-semibold tabular-nums text-primary-fg">{n}</span>}
    </button>
  );
}
