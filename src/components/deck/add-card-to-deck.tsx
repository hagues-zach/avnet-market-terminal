"use client";

import type { CardSlide } from "@/lib/deck/slides";
import { AddToDeckButton } from "./add-to-deck-button";

// Add to deck for any card (Panel and ChartCard): the slide the card makes,
// from the page it is on. The card builds the slide from its own data
// (src/lib/deck/slides.ts); this adds the page and the time.

/** The page's own title, as the tray names where a slide came from. */
function pageName(): string {
  const h1 = document.querySelector("main h1")?.textContent?.trim();
  return (h1 || document.title || "Terminal").slice(0, 80);
}

export function AddCardToDeck({ title, deck }: { title: string; deck: CardSlide }) {
  return (
    <AddToDeckButton
      itemId={deck.id}
      label={`the ${title} card`}
      make={() => ({
        id: deck.id,
        kind: "chart",
        title: (deck.title ?? title).slice(0, 200),
        from: { page: pageName(), href: `${window.location.pathname}${window.location.search}`.slice(0, 300) },
        preview: deck.preview,
      })}
    />
  );
}
