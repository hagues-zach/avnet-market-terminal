"use client";

import { viewItemId, type ViewSlide } from "@/lib/deck/tray";
import { AddToDeckButton } from "./add-to-deck-button";
import type { NewTrayItem } from "./tray-provider";

// Add to deck for a page's own view: the Pitch Deck Builder's slide for it,
// built on the server when clicked (/api/deck/preview).

export function AddViewToDeck({ slide, company, label }: { slide: ViewSlide; company?: string; label: string }) {
  const make = async (): Promise<NewTrayItem> => {
    const q = new URLSearchParams({ slide });
    if (company) q.set("company", company);
    const res = await fetch(`/api/deck/preview?${q}`);
    if (!res.ok) throw new Error((await res.text()) || "Couldn't add that to the deck just now.");
    return res.json();
  };
  return <AddToDeckButton itemId={viewItemId(slide, company)} label={label} make={make} size="regular" />;
}
