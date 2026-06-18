"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Wordmark />
      </div>
      <div className="px-4 pb-2 pt-4">
        <p className="font-display text-2xs uppercase tracking-widest text-muted">
          Market Intelligence
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          if (!item.built) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between rounded px-3 py-2 text-sm text-gray-medium"
                title="Coming in a later phase"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className="font-display text-2xs uppercase tracking-wider text-gray-light">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors duration-200 cursor-pointer",
                active
                  ? "bg-avnet-green/10 font-medium text-ink accent-bar border-l-[3px] border-avnet-green"
                  : "text-ink/80 hover:bg-canvas",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active && "text-avnet-greenDark")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line px-4 py-3">
        <p className="text-2xs text-muted">WSTS Autumn 2025 · Internal demo</p>
        <p className="text-2xs text-gray-medium">Mock data — not production</p>
      </div>
    </aside>
  );
}
