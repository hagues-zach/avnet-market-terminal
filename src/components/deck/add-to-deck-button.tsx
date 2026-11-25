"use client";

import { useState } from "react";
import { Check, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTray, type NewTrayItem } from "./tray-provider";

// Add to deck (docs/design/deck-tray, mockup 1): puts a chart, table or view in
// the deck tray, and reads "In deck" once it's there; a second click takes it
// out. `make` builds the item on click, so a page's view can be fetched only
// when someone asks for it. Until the page has hydrated the button is disabled:
// the server renders it before its click handler exists, and a click then does
// nothing (seen on the Overview, whose sections stream in).

export function AddToDeckButton({
  itemId,
  label,
  make,
  size = "compact",
  className,
}: {
  /** The tray id of what this adds (chartItemId or viewItemId), to show "In deck". */
  itemId: string;
  /** What is added, for the accessible name, e.g. "Gross margin chart". */
  label: string;
  make: () => NewTrayItem | Promise<NewTrayItem>;
  /** compact: the 24px header controls of the chart modal and drawer; regular: a page's action row. */
  size?: "compact" | "regular";
  className?: string;
}) {
  const { has, add, remove, notify, ready } = useTray();
  const [busy, setBusy] = useState(false);
  const inDeck = has(itemId);

  const onClick = async () => {
    if (inDeck) return remove(itemId);
    setBusy(true);
    try {
      add(await make());
    } catch (e) {
      notify(e instanceof Error && e.message ? e.message : "Couldn't add that to the deck just now.");
    } finally {
      setBusy(false);
    }
  };

  const Icon = inDeck ? Check : Presentation;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || !ready}
      aria-pressed={inDeck}
      aria-busy={busy || !ready}
      aria-label={inDeck ? `${label} is in your deck. Remove it` : `Add ${label} to your deck`}
      title={inDeck ? "In your deck. Click to remove" : undefined}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap font-body text-button text-ink transition-colors disabled:cursor-wait disabled:opacity-60",
        size === "compact" ? "h-control px-2.5" : "h-control px-3",
        inDeck ? "border border-ink bg-surface hover:bg-surface-sunken" : "border border-hairline bg-surface hover:bg-surface-sunken",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      {busy ? "Adding…" : inDeck ? "In deck" : "Add to deck"}
    </button>
  );
}
