"use client";

import { Download, Database } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-5">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-xs text-muted">
          <Database className="h-3.5 w-3.5 text-avnet-greenDark" />
          <span className="font-display uppercase tracking-wide">WSTS Autumn 2025</span>
        </span>
        <span className="hidden font-display text-2xs uppercase tracking-widest text-muted md:inline">
          Vintage · CY2025 actuals · CY2026 forecast
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-display text-2xs uppercase tracking-widest text-muted">
          Updated quarterly
        </span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded bg-avnet-green px-3 py-1.5 font-display text-sm uppercase tracking-wide text-white transition-colors duration-200 hover:bg-avnet-greenDark cursor-pointer focus:outline-none focus:ring-2 focus:ring-avnet-green/40"
          title="Export to branded exec deck — wired in a later phase"
        >
          <Download className="h-4 w-4" />
          Export Deck
        </button>
      </div>
    </header>
  );
}
