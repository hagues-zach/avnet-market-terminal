"use client";

import { usePathname } from "next/navigation";
import { Database, Menu, Sparkles } from "lucide-react";

/**
 * Top bar from DESIGN.md: 48px, white, hairline bottom. The left slot holds
 * the Ask the Terminal box, which opens /copilot with the question (that page
 * has its own box, so it shows the data line instead). Below 1024px it
 * carries the menu button that opens the sidebar drawer.
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
  const pathname = usePathname();
  return (
    <header className="flex h-topbar shrink-0 print:hidden items-center justify-between gap-4 border-b border-hairline bg-surface px-4 xl:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
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
        {left ?? (pathname === "/copilot" ? <DataLine /> : <AskBox />)}
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-body-sm text-ink-muted sm:flex">{right ?? <span>Refreshes automatically</span>}</div>
    </header>
  );
}

function AskBox() {
  return (
    <form action="/copilot" method="get" role="search" className="flex w-full max-w-md items-center">
      <label htmlFor="topbar-ask" className="sr-only">
        Ask the Terminal
      </label>
      <span className="relative min-w-0 flex-1">
        <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} aria-hidden />
        <input
          id="topbar-ask"
          name="q"
          type="search"
          autoComplete="off"
          maxLength={200}
          placeholder="Ask the Terminal, e.g. how is Arrow doing?…"
          className="h-control w-full border-0 border-b border-hairline bg-surface-sunken pl-8 pr-3 font-body text-body-sm text-ink placeholder:text-ink-muted focus:border-ink"
        />
      </span>
    </form>
  );
}

function DataLine() {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-body-sm text-ink-muted">
      <Database className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="truncate">Open data: SEC EDGAR, Federal Register, public feeds</span>
    </span>
  );
}
