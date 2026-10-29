"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HUBS, hubPages, pageFor } from "./nav";

/**
 * The pages of the current hub as tabs, in a white band pinned to the top of
 * the canvas. Hidden for hubs with one page. Styled like Tabs (square, 2px
 * green underline), but the underline sits inside the band so the list can
 * scroll sideways on narrow screens without clipping it.
 */
export function HubTabs() {
  const pathname = usePathname();
  const page = pageFor(pathname);
  if (!page) return null;
  const pages = hubPages(page.hub);
  if (pages.length < 2) return null;
  const hub = HUBS.find((h) => h.id === page.hub)!;

  return (
    <div className="sticky top-0 z-10 border-b border-hairline bg-surface print:hidden">
      {/* Positioned, so the screen-reader text in each tab is clipped by the list's scroll instead of widening the canvas. */}
      <nav aria-label={`${hub.label} pages`} className="relative mx-auto max-w-content overflow-x-auto px-4 xl:px-6">
        <ul className="flex gap-6">
          {pages.map((p) => {
            const active = p.href === page.href;
            return (
              <li key={p.href} className="shrink-0">
                <Link
                  href={p.href}
                  aria-current={active ? (pathname === p.href ? "page" : "true") : undefined}
                  className={cn(
                    "inline-flex h-tab items-center gap-1.5 whitespace-nowrap border-b-2 font-body text-body-sm transition-colors",
                    active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {p.tab}
                  {p.mock && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-warning" title="Shows mock data until its data is hooked up">
                      <span className="sr-only">, mock data</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
