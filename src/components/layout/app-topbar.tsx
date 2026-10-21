import { Database } from "lucide-react";

/**
 * Top bar from DESIGN.md: 48px, white, hairline bottom. Left and right slots;
 * search, the persona switch and data freshness go here as they get built.
 * Replaces Topbar in step 1.6.
 */
export function AppTopbar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface px-6">
      <div className="flex min-w-0 items-center gap-3">
        {left ?? (
          <span className="inline-flex items-center gap-1.5 text-body-sm text-ink-muted">
            <Database className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Open data: SEC EDGAR, Federal Register, public feeds
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-body-sm text-ink-muted">{right ?? <span>Refreshes automatically</span>}</div>
    </header>
  );
}
