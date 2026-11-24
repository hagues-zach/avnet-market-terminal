"use client";

import { useState, type ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { ChartModal, type ChartSection } from "./chart-modal";

// A table section whose header carries a "Chart" button that opens the chart
// modal on this section. `sections` is every chartable section of the table, so
// the modal can switch between them without closing. Render it in place of the
// section's <tbody>; the section's rows go in children. The modal mounts into
// document.body, so it can live inside the table.

export function ChartableSection({
  title,
  sectionId,
  sections,
  colSpan,
  children,
}: {
  title: string;
  sectionId: string;
  sections: ChartSection[];
  colSpan: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <tbody>
      <tr className="border-b border-hairline">
        <th scope="colgroup" colSpan={colSpan} className="px-3 pb-1 pt-3 text-left font-normal">
          <span className="flex items-center gap-2">
            <span className="font-display text-card-title text-ink">{title}</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Chart ${title.toLowerCase()}`}
              className="ml-auto inline-flex h-6 cursor-pointer items-center gap-1 border border-hairline px-1.5 font-body text-micro text-ink hover:bg-surface-sunken"
            >
              <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Chart
            </button>
          </span>
        </th>
      </tr>
      {children}
      <ChartModal sections={sections} initialSection={sectionId} open={open} onClose={() => setOpen(false)} />
    </tbody>
  );
}
