"use client";

import { useState, type MouseEvent } from "react";
import { BarChart3 } from "lucide-react";
import { ChartModal, type ChartSection } from "./chart-modal";

// One "Chart" button for a whole table. `sections` is every chartable section of
// the table; the modal opens on the first (or `initialSection`) and its switch
// moves between them without closing. The modal mounts into document.body, so the
// button can sit anywhere, including inside a <summary>: the click is stopped so
// it opens the chart without folding or unfolding the <details>.

export function ChartButton({
  label,
  sections,
  initialSection,
}: {
  /** What is charted, for the accessible name, e.g. "quarterly detail". */
  label: string;
  sections: ChartSection[];
  initialSection?: string;
}) {
  const [open, setOpen] = useState(false);
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={`Chart ${label}`}
        className="inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 border border-hairline px-1.5 font-body text-micro text-ink hover:bg-surface-sunken"
      >
        <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        Chart
      </button>
      <ChartModal sections={sections} initialSection={initialSection} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
