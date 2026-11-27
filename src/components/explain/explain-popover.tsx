"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { cn } from "@/lib/utils";

// A "what does this mean?" mark beside a KPI label that opens a small explainer
// anchored under it. Non-modal: the page stays usable, a click elsewhere or Esc
// closes it, and Esc or the close button return focus to the mark. It sits in the
// page's own flow (no portal), so Tab moves from the mark into the explainer and
// on to the rest of the page. No entrance animation (DESIGN.md, motion 2 of 10).

const GAP = 8;
const EDGE = 8;

export function ExplainPopover({
  label,
  title,
  className,
  children,
}: {
  /** The mark's accessible name, e.g. "Explain book-to-bill". */
  label: string;
  /** The explainer's heading, in sentence case. */
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ shift: number; above: boolean }>({ shift: 0, above: false });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  // Keep the panel inside the viewport: shift it left or right, and open it
  // above the mark when there is no room below.
  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const p = panel.current.getBoundingClientRect();
    const t = trigger.current.getBoundingClientRect();
    const left = t.left;
    const right = left + p.width;
    const shift = right > window.innerWidth - EDGE ? window.innerWidth - EDGE - right : left < EDGE ? EDGE - left : 0;
    const below = t.bottom + GAP + p.height;
    const above = below > window.innerHeight - EDGE && t.top - GAP - p.height > EDGE;
    setPlace({ shift, above });
    // Focus the body when it asks for it (it owns the arrow keys), else the panel.
    (panel.current.querySelector<HTMLElement>("[data-explain-focus]") ?? panel.current).focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // A modal on top owns Esc.
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) close(true);
    };
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div
      ref={root}
      className={cn("relative inline-flex", className)}
      // Tabbing past the explainer closes it, so it never covers what has focus next.
      onBlur={(e) => {
        if (open && e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) close(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={cn(
          // A 16px mark with a 32px hit area, so it is easy to click in a dense row.
          "relative ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center text-ink-muted transition-colors duration-150 after:absolute after:-inset-2 after:content-[''] hover:text-ink",
          open && "text-ink",
        )}
      >
        <CircleHelp className="h-3 w-3" strokeWidth={1.5} aria-hidden />
      </button>
      {open && (
        <div
          ref={panel}
          id={`${id}-panel`}
          role="dialog"
          aria-labelledby={`${id}-title`}
          tabIndex={-1}
          style={{ transform: place.shift ? `translateX(${place.shift}px)` : undefined }}
          className={cn(
            "absolute left-0 z-30 w-[340px] max-w-[calc(100vw-16px)] rounded-sm border border-hairline bg-surface text-left font-body text-body font-normal normal-case tracking-normal text-ink focus-visible:outline-none",
            place.above ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline py-1 pl-4 pr-1">
            <h2 id={`${id}-title`} className="font-display text-card-title text-ink">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => close(true)}
              className="inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
