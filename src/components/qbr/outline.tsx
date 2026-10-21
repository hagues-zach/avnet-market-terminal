"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** "On this brief": jump links to the brief's sections, marking the one in view. */
export function Outline({ sections }: { sections: { id: string; label: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = sections.find((s) => seen.get(s.id));
        if (first) setCurrent(first.id);
      },
      { root: document.getElementById("main"), rootMargin: "0px 0px -60% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this brief">
      <ol>
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={() => setCurrent(s.id)}
              aria-current={current === s.id ? "location" : undefined}
              className={cn(
                "flex gap-2 border-l-[3px] py-1.5 pl-3 text-body-sm transition-colors",
                current === s.id ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              <span className="tabular-nums">{i + 1}.</span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
