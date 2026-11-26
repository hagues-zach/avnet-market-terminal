"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { tabHasData, type ChartData } from "@/lib/chart-view/model";
import { cn } from "@/lib/utils";
import { AddChartToDeck } from "@/components/deck/add-chart-to-deck";
import { StackedPanes, tabCsv, ValuesTable } from "./panes";
import { TabList } from "./tab-list";

// The full-size chart view: a modal with top tabs, a one-line takeaway, the panes
// (hover for every value at a period) and the exact figures below them. It is the default container for a table's chart view. A
// native <dialog> opened with showModal() gives the focus trap, Esc to close and
// an inert page behind it for free.
//
// A table with several sections passes them all: a switch in the header moves
// between sections (each with its own views) without closing the modal.

const PLOT_HEIGHT = 300;

/** One section of a table, as the modal's section switch shows it. */
export interface ChartSection {
  id: string;
  data: ChartData;
}

function Dialog({ sections, initialSection, onClose }: { sections: ChartSection[]; initialSection?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [sectionId, setSectionId] = useState(initialSection ?? sections[0]?.id);
  const data = (sections.find((s) => s.id === sectionId) ?? sections[0]).data;
  const [tabId, setTabId] = useState(data.tabs[0]?.id);
  const tab = data.tabs.find((t) => t.id === tabId) ?? data.tabs[0];
  const has = tab ? tabHasData(data, tab) : false;

  // Open on mount. Unmounting removes the dialog without close(), which would fire
  // onClose again (and does, under React's development double mount), so focus is
  // handed back to whatever opened it by hand.
  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (d && !d.open) d.showModal();
    d?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
    return () => opener?.focus();
  }, []);

  const download = () => {
    if (!tab) return;
    const url = URL.createObjectURL(new Blob([tabCsv(data, tab)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.eyebrow.split(" · ")[0]} ${data.title} ${tab.label}.csv`.replace(/[^\w .-]+/g, "").replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      // A click on the dialog element itself, not its content, is a click on the backdrop.
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(1080px,calc(100vw-2rem))] overflow-hidden rounded-sm border border-hairline bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start gap-3 border-b border-hairline px-5 pb-0 pt-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-label uppercase text-ink-muted">{data.eyebrow}</p>
            <h2 id={`${id}-title`} className={cn("font-display text-section-title text-ink", sections.length > 1 && "sr-only")}>
              {data.title}
            </h2>
            {sections.length > 1 && (
              <div role="group" aria-label="Section" className="mt-1.5 inline-flex border border-hairline">
                {sections.map((s, i) => {
                  const current = s.id === sectionId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={current}
                      onClick={() => {
                        if (current) return;
                        setSectionId(s.id);
                        setTabId(s.data.tabs[0]?.id);
                      }}
                      className={cn(
                        "h-control cursor-pointer whitespace-nowrap px-3 font-display text-card-title transition-colors",
                        i > 0 && "border-l border-hairline",
                        current ? "bg-surface-sunken text-ink" : "bg-surface text-ink-muted hover:text-ink",
                      )}
                    >
                      {s.data.title}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-2 overflow-x-auto overflow-y-hidden">
              <TabList
                tabs={data.tabs.map((t) => ({ id: t.id, label: t.label, disabled: !tabHasData(data, t) }))}
                value={tab?.id ?? ""}
                onChange={(t) => {
                  setTabId(t);
                }}
                label={`${data.title} views`}
                idPrefix={id}
              />
            </div>
          </div>
          {tab && has && <AddChartToDeck data={data} tab={tab} />}
          <button
            type="button"
            onClick={download}
            disabled={!has}
            className="inline-flex h-control cursor-pointer items-center gap-1.5 border border-hairline px-2.5 font-body text-button text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-subtle"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Download CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink hover:bg-surface-sunken"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div id={`${id}-panel`} role="tabpanel" aria-labelledby={tab ? `${id}-tab-${tab.id}` : undefined} className="flex min-h-0 flex-1 overflow-y-auto">
          {!tab || !has ? (
            <p className="flex flex-1 items-center justify-center p-10 text-body-sm text-ink-muted">Not reported in a comparable form for these quarters.</p>
          ) : (
            <div className="min-w-0 flex-1 space-y-4 px-5 py-4">
              {data.takeaways[tab.id] && (
                <section aria-label="Takeaway" className="border-l-2 border-ink bg-surface-sunken px-3 py-2">
                  <p className="font-display text-label uppercase text-ink-muted">Takeaway</p>
                  <p className="mt-0.5 text-body-sm text-ink">{data.takeaways[tab.id]}</p>
                </section>
              )}
              <StackedPanes data={data} tab={tab} height={PLOT_HEIGHT} syncId={`${id}-sync`} />
              <ValuesTable data={data} tab={tab} />
            </div>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-hairline bg-surface-sunken px-5 py-2 text-caption text-ink-muted">
          <span className="min-w-0 flex-1 truncate">
            Source: {data.source}
            {data.asOf && ` · Latest ${data.asOf}`}
          </span>
          <span className="hidden shrink-0 sm:inline">← → views · Esc close</span>
        </footer>
      </div>
    </dialog>
  );
}

/**
 * The chart view in a modal, opened on `initialSection`. With more than one section
 * a switch in the header moves between them. Mounted only while open, into
 * document.body so it can sit outside a table.
 */
export function ChartModal({
  sections,
  initialSection,
  open,
  onClose,
}: {
  sections: ChartSection[];
  initialSection?: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || sections.length === 0 || typeof document === "undefined") return null;
  return createPortal(<Dialog sections={sections} initialSection={initialSection} onClose={onClose} />, document.body);
}
