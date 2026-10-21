"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

/**
 * Sidebar, top bar and the scrolling canvas. From 1024px the sidebar is fixed;
 * below that it opens as a drawer from the top bar's menu button.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  // Close the drawer after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // Move focus into the drawer; give it back to the menu button on close.
    menuRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      menuRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:text-body-sm focus:text-ink focus:shadow-overlay"
      >
        Skip to content
      </a>
      <div className="hidden lg:flex">
        <AppSidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 cursor-default bg-ink/40" onClick={() => setOpen(false)} />
          <div className="relative h-full w-sidebar overscroll-contain shadow-overlay">
            <AppSidebar />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-2.5 inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink hover:bg-surface-sunken"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col" inert={open || undefined}>
        <AppTopbar onMenu={() => setOpen(true)} menuOpen={open} />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto bg-canvas focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
