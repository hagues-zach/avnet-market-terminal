"use client";

import { useEffect, useId } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { tabHasData, type ChartData } from "@/lib/chart-view/model";
import { StackedPanes, ValuesTable } from "./panes";

// The chart view in a right-hand drawer, for tables people read one row after
// another. It overlays the right edge of the page without blocking it, so the
// table stays usable: picking another row recharts the drawer, and the previous
// and next buttons (or ↑ ↓ on the table) step through the rows. Esc closes it.
// One view per row, so there are no tabs.

const PLOT_HEIGHT = 230;
/** Narrow label column, so eight quarters fit the drawer. */
const LABEL_COL = 64;

export function ChartDrawer({
  data,
  position,
  onClose,
  onPrev,
  onNext,
}: {
  data: ChartData | null;
  /** "5 of 13", read out beside the row buttons. */
  position?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const id = useId();
  const open = data !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // A modal on top owns Esc.
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!data) return null;
  const tab = data.tabs[0];
  const has = tab ? tabHasData(data, tab) : false;
  const button = "inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-subtle";

  return (
    <aside
      aria-labelledby={`${id}-title`}
      className="fixed bottom-0 right-0 top-12 z-30 flex w-[min(560px,100vw)] flex-col border-l border-hairline bg-surface shadow-overlay"
    >
      <header className="flex items-start gap-1 border-b border-hairline px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-label uppercase text-ink-muted">
            {data.eyebrow}
            {position && <span className="normal-case tracking-normal"> · {position}</span>}
          </p>
          <h2 id={`${id}-title`} className="font-display text-section-title text-ink">
            {data.title}
          </h2>
        </div>
        <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous measure" title="Previous measure" className={button}>
          <ChevronUp className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next measure" title="Next measure" className={button}>
          <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
        <button type="button" onClick={onClose} aria-label="Close chart" className={button}>
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {tab && data.takeaways[tab.id] && (
          <section aria-label="Takeaway" className="border-l-2 border-ink bg-surface-sunken px-3 py-2">
            <p className="font-display text-label uppercase text-ink-muted">Takeaway</p>
            <p className="mt-0.5 text-body-sm text-ink">{data.takeaways[tab.id]}</p>
          </section>
        )}
        {!tab || !has ? (
          <p className="py-10 text-center text-body-sm text-ink-muted">Not reported by both companies for these quarters.</p>
        ) : (
          <>
            <StackedPanes data={data} tab={tab} height={PLOT_HEIGHT} syncId={`${id}-sync`} labelCol={LABEL_COL} />
            <ValuesTable data={data} tab={tab} labelCol={LABEL_COL} compact />
          </>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-hairline bg-surface-sunken px-5 py-2 text-caption text-ink-muted">
        <span className="min-w-0 flex-1 truncate">
          Source: {data.source}
          {data.asOf && ` · Latest ${data.asOf}`}
        </span>
        <span className="hidden shrink-0 sm:inline">↑ ↓ measures · Esc close</span>
      </footer>
    </aside>
  );
}
