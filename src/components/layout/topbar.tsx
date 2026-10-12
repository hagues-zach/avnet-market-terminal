import { Database } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-5">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-xs text-muted">
          <Database className="h-3.5 w-3.5 text-avnet-greenDark" />
          <span className="font-display uppercase tracking-wide">Open data</span>
        </span>
        <span className="hidden font-display text-2xs uppercase tracking-widest text-muted md:inline">
          Public feeds · SEC EDGAR · Federal Register
        </span>
      </div>

      <span className="font-display text-2xs uppercase tracking-widest text-muted">
        Refreshed every 15 min
      </span>
    </header>
  );
}
