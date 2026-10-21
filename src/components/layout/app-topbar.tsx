import { Database, Menu } from "lucide-react";

/**
 * Top bar from DESIGN.md: 48px, white, hairline bottom. Left and right slots;
 * search, the persona switch and data freshness go here as they get built.
 * Below 1024px it carries the menu button that opens the sidebar drawer.
 */
export function AppTopbar({
  left,
  right,
  onMenu,
  menuOpen = false,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  onMenu?: () => void;
  menuOpen?: boolean;
}) {
  return (
    <header className="flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface px-4 xl:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            className="-ml-1 inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink hover:bg-surface-sunken lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
        )}
        {left ?? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-body-sm text-ink-muted">
            <Database className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span className="truncate">Open data: SEC EDGAR, Federal Register, public feeds</span>
          </span>
        )}
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-body-sm text-ink-muted sm:flex">{right ?? <span>Refreshes automatically</span>}</div>
    </header>
  );
}
