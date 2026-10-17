"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { NAV, PILLARS, PILLAR_LABELS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Wordmark />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Main">
        {PILLARS.map((pillar) => {
          const items = NAV.filter((item) => item.pillar === pillar);
          if (!items.length) return null;
          return (
            <div key={pillar}>
              {PILLAR_LABELS[pillar] ? (
                <p className="px-2 pb-1.5 pt-4 font-display text-2xs uppercase tracking-widest text-muted">{PILLAR_LABELS[pillar]}</p>
              ) : (
                <div className="pt-3" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  // A section stays highlighted on its sub-pages, e.g. /network/avnet.
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  if (!item.built) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-not-allowed items-center justify-between rounded px-3 py-2 text-sm text-gray-medium"
                        title="Planned: see docs/superapp-plan.md"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                        <span className="font-display text-2xs uppercase tracking-wider text-gray-light">Soon</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors duration-200 cursor-pointer",
                        active ? "bg-avnet-green/10 font-medium text-ink accent-bar border-l-[3px] border-avnet-green" : "text-ink/80 hover:bg-canvas",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className={cn("h-4 w-4", active && "text-avnet-greenDark")} />
                      <span className="flex-1">{item.label}</span>
                      {item.mock && (
                        <span className="h-1.5 w-1.5 rounded-full border border-accent-yellow" title="Shows mock data until its data is hooked up" aria-label="mock data" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line px-4 py-3">
        <p className="text-2xs text-muted">Open data · Internal demo</p>
        <p className="text-2xs text-gray-medium">Live public sources — not production</p>
      </div>
    </aside>
  );
}
