"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

// Tabs for a chart view, as an ARIA tablist with a roving tab stop: left and
// right move between tabs, Home and End jump to the ends, and the selected tab
// is the only one in the tab order.

export function TabList({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: { id: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (e: KeyboardEvent, i: number) => {
    const n = tabs.length;
    let j: number | null = null;
    if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "ArrowRight") j = (i + 1) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j === null) return;
    e.preventDefault();
    onChange(tabs[j].id);
    refs.current[j]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="flex gap-5">
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => move(e, i)}
            className={cn(
              "cursor-pointer font-body text-body-sm transition-colors",
              "-mb-px inline-flex h-tab items-center whitespace-nowrap border-b-2",
              selected ? "border-ink font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              t.disabled && !selected && "text-ink-subtle",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
