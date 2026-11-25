"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The profile's section bar: one long page, with a sticky row of links that jump
// to its sections and mark the one being read. It sits under the hub tabs, which
// are sticky too (h-tab plus their 1px rule).

export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  // The link just clicked wins a tie (sections side by side) and the page's end, for a moment after the click.
  const clicked = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    // The page scrolls inside <main>, not the window.
    const scroller = document.getElementById("main") ?? window;
    const bar = document.getElementById("section-nav");
    let frame = 0;
    // The section being read is the lowest one whose top has reached the bar.
    // Sections side by side share a top; the clicked one, or else the first, wins.
    const update = () => {
      frame = 0;
      const line = (bar?.getBoundingClientRect().bottom ?? 0) + 32;
      const recent = clicked.current && Date.now() - clicked.current.at < 1500 ? clicked.current.id : null;
      let at = sections[0]?.id;
      let best = -Infinity;
      for (const s of sections) {
        const top = document.getElementById(s.id)?.getBoundingClientRect().top;
        if (top === undefined || top > line) continue;
        const tie = Math.abs(top - best) < 2;
        if ((!tie && top > best) || (tie && s.id === recent)) {
          at = s.id;
          best = top;
        }
      }
      // At the very bottom the last sections can't reach the bar: the clicked one, or else the last, is being read.
      const el = scroller instanceof HTMLElement ? scroller : document.documentElement;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) at = recent ?? sections[sections.length - 1]?.id;
      setCurrent(at);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  return (
    <nav
      id="section-nav"
      aria-label="Sections"
      className="sticky top-[calc(theme(height.tab)+1px)] z-[9] -mx-4 border-b border-hairline bg-canvas px-4 xl:-mx-6 xl:px-6 print:hidden"
    >
      <ul className="flex gap-6 overflow-x-auto">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={s.id === current ? "location" : undefined}
              onClick={() => {
                clicked.current = { id: s.id, at: Date.now() };
                setCurrent(s.id);
              }}
              className={cn(
                "inline-flex h-tab items-center whitespace-nowrap border-b-2 font-body text-body-sm transition-colors",
                s.id === current ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
