"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCircle2, FileDown, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  description: string;
  sourcePage: string;
  slides: number;
}

// Canonical executive TAM deck, assembled from the live terminal pages.
const SECTIONS: Section[] = [
  { id: "title", title: "Title & Executive Summary", description: "Cover, period, headline takeaways", sourcePage: "Overview", slides: 2 },
  { id: "snapshot", title: "Market Snapshot", description: "TAM / SAM / SOM, YoY, book-to-bill", sourcePage: "Overview", slides: 2 },
  { id: "tam", title: "TAM / SAM / SOM", description: "Total, served & Avnet share with drill-downs", sourcePage: "TAM / SAM / SOM", slides: 3 },
  { id: "segments", title: "Product & Segment Breakdown", description: "WSTS product categories & treemap", sourcePage: "TAM / SAM / SOM", slides: 2 },
  { id: "regions", title: "Regional & End-Market View", description: "Region and end-market mix", sourcePage: "TAM / SAM / SOM", slides: 2 },
  { id: "forecast", title: "Forecast & Scenarios", description: "Fan chart, scenarios, revision history", sourcePage: "Forecast & Scenario", slides: 3 },
  { id: "signals", title: "Economic Signals", description: "FRED indicators, rates & Polymarket odds", sourcePage: "Economic Signals", slides: 2 },
  { id: "competitive", title: "Competitive & Channel", description: "Channel size, distributor & supplier ranks", sourcePage: "Competitive & Channel", slides: 2 },
  { id: "news", title: "Market News & Catalysts", description: "Curated headlines by segment", sourcePage: "Market News", slides: 1 },
  { id: "appendix", title: "Appendix & Methodology", description: "Sources, vintages, definitions", sourcePage: "Methodology", slides: 1 },
];

type ExportState = "idle" | "generating" | "ready";

export default function ExportPage() {
  const [order, setOrder] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [included, setIncluded] = useState<Record<string, boolean>>(Object.fromEntries(SECTIONS.map((s) => [s.id, true])));
  const [exportState, setExportState] = useState<ExportState>("idle");

  const byId = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [s.id, s])), []);
  const orderedSections = order.map((id) => byId[id]);
  const activeSections = orderedSections.filter((s) => included[s.id]);
  const slideCount = activeSections.reduce((n, s) => n + s.slides, 0);

  function toggle(id: string) {
    setIncluded((p) => ({ ...p, [id]: !p[id] }));
    setExportState("idle");
  }
  function move(id: string, dir: -1 | 1) {
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setExportState("idle");
  }
  function generate() {
    setExportState("generating");
    window.setTimeout(() => setExportState("ready"), 1400);
  }

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Export Center" subtitle="Assemble the branded executive TAM deck from the live terminal" />

      {/* summary / export bar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Stat label="Sections" value={`${activeSections.length} / ${SECTIONS.length}`} />
            <Stat label="Slides" value={`${slideCount}`} />
            <Stat label="Template" value="Avnet 34-layout" />
            <Stat label="Period" value="FY26 Q2" />
          </div>
          <div className="flex items-center gap-3">
            {exportState === "ready" && (
              <span className="flex items-center gap-1.5 text-sm text-avnet-greenDark">
                <CheckCircle2 className="h-4 w-4" /> Avnet-Market-Intelligence-FY26Q2.pptx
              </span>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={exportState === "generating" || activeSections.length === 0}
              className={cn(
                "flex items-center gap-2 rounded px-4 py-2 font-display text-sm uppercase tracking-wide text-white transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-avnet-green/40",
                exportState === "generating" ? "bg-gray-medium" : "bg-avnet-green hover:bg-avnet-greenDark",
                activeSections.length === 0 && "cursor-not-allowed opacity-50",
              )}
            >
              {exportState === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Assembling…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" /> {exportState === "ready" ? "Regenerate" : "Generate Deck"}
                </>
              )}
            </button>
          </div>
        </div>
        <p className="mt-3 text-2xs text-muted">
          Export stubs to the Avnet branded-deck pipeline (34-layout template) — also exports PDF brief & XLSX workbook.
          Live PPTX generation wires in a later phase.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* section picker */}
        <Card title="Sections" subtitle="Toggle and reorder what goes in the deck">
          <ul className="space-y-2">
            {orderedSections.map((s, idx) => {
              const on = included[s.id];
              return (
                <li key={s.id} className={cn("flex items-center gap-3 rounded border px-3 py-2.5 transition-colors duration-200", on ? "border-line bg-surface" : "border-dashed border-line bg-canvas/50 opacity-60")}>
                  <button type="button" onClick={() => toggle(s.id)} aria-label={on ? `Exclude ${s.title}` : `Include ${s.title}`} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border cursor-pointer", on ? "border-avnet-green bg-avnet-green text-white" : "border-gray-medium text-transparent")}>
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-2xs text-muted">{s.description} · <span className="text-gray-medium">{s.sourcePage}</span> · {s.slides} slides</p>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <button type="button" onClick={() => move(s.id, -1)} disabled={idx === 0} aria-label="Move up" className="text-muted hover:text-ink disabled:opacity-30 cursor-pointer">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(s.id, 1)} disabled={idx === orderedSections.length - 1} aria-label="Move down" className="text-muted hover:text-ink disabled:opacity-30 cursor-pointer">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* live outline */}
        <Card title="Deck Outline" subtitle="Live preview of the assembled deck">
          {activeSections.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Select at least one section to build the deck.</p>
          ) : (
            <ol className="space-y-2">
              {(() => {
                let slide = 0;
                return activeSections.map((s) => {
                  const start = slide + 1;
                  slide += s.slides;
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded border border-line bg-surface px-3 py-2.5">
                      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line bg-canvas font-display text-2xs tabular text-muted">
                        {start === slide ? start : `${start}–${slide}`}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                        <p className="text-2xs text-muted">from {s.sourcePage}</p>
                      </div>
                    </li>
                  );
                });
              })()}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl tabular text-ink">{value}</div>
      <div className="text-2xs uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
