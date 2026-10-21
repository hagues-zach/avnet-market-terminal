"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { NAV, PILLARS, PILLAR_LABELS } from "./nav";

/**
 * Sidebar from DESIGN.md: 240px, label-style group headings, 32px items, the
 * active item on the selected surface with a 3px green rule. Mock pages keep a
 * small yellow ring. Replaces Sidebar in step 1.6.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-sidebar shrink-0 flex-col border-r border-hairline bg-surface">
      <div className="flex h-topbar items-center border-b border-hairline px-4">
        <Link href="/start" aria-label="Avnet Market Intelligence, Start Here">
          <Wordmark className="h-6" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto pb-3" aria-label="Main">
        {PILLARS.map((pillar) => {
          const items = NAV.filter((item) => item.pillar === pillar);
          if (!items.length) return null;
          const heading = PILLAR_LABELS[pillar];
          return (
            <div key={pillar} className="pt-3">
              {heading && <p className="px-4 pb-1 font-display text-label uppercase text-ink-muted">{heading}</p>}
              <ul>
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  if (!item.built) {
                    return (
                      <li key={item.href}>
                        <span
                          className="flex h-control cursor-not-allowed items-center gap-2.5 border-l-[3px] border-transparent pl-[13px] pr-4 text-body-sm text-ink-subtle"
                          title="Planned"
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-micro">Soon</span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-control items-center gap-2.5 border-l-[3px] pl-[13px] pr-4 text-body-sm transition-colors",
                          active
                            ? "border-primary bg-surface-selected font-semibold text-ink"
                            : "border-transparent text-ink hover:bg-surface-sunken",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-ink" : "text-ink-muted")} strokeWidth={1.5} aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.mock && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-warning" title="Shows mock data until its data is hooked up">
                            <span className="sr-only">Mock data</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-hairline px-4 py-2.5">
        <p className="text-micro text-ink-muted">Internal demo. Avnet figures are mock until hooked up.</p>
      </div>
    </aside>
  );
}
