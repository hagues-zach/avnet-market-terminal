"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { hubHref, hubMock, pageFor, visibleHubs, type Hub, type HubId } from "./nav";

/**
 * Sidebar from DESIGN.md: 240px, one row per hub, 32px items, the active hub
 * on the selected surface with a 3px green rule. A hub's pages are tabs above
 * the page (HubTabs). Tools sit under their own heading and Setup at the foot.
 * A hub keeps the small yellow ring only when all its pages are mock.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const current = pageFor(pathname)?.hub;
  const tools = visibleHubs("tools");
  const footer = visibleHubs("footer");

  return (
    <aside className="flex h-screen w-sidebar shrink-0 flex-col border-r border-hairline bg-surface">
      <div className="flex h-topbar items-center border-b border-hairline px-4">
        <Link href="/start" aria-label="Avnet Market Intelligence, Start Here">
          <Wordmark className="h-6" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto overscroll-contain pb-3" aria-label="Main">
        <ul className="pt-3">
          {visibleHubs("main").map((hub) => (
            <HubLink key={hub.id} hub={hub} current={current} />
          ))}
        </ul>
        {tools.length > 0 && (
          <div className="pt-3">
            <p className="px-4 pb-1 font-display text-label uppercase text-ink-muted">Tools</p>
            <ul>
              {tools.map((hub) => (
                <HubLink key={hub.id} hub={hub} current={current} />
              ))}
            </ul>
          </div>
        )}
      </nav>
      <div className="border-t border-hairline">
        {footer.length > 0 && (
          <ul className="py-1">
            {footer.map((hub) => (
              <HubLink key={hub.id} hub={hub} current={current} />
            ))}
          </ul>
        )}
        <p className="border-t border-hairline px-4 py-2.5 text-micro text-ink-muted">Internal demo. Avnet figures are mock until hooked up.</p>
      </div>
    </aside>
  );
}

function HubLink({ hub, current }: { hub: Hub; current?: HubId }) {
  const pathname = usePathname();
  const active = hub.id === current;
  const href = hubHref(hub.id);
  const Icon = hub.icon;
  return (
    <li>
      <Link
        href={href}
        // "page" only on the hub's own first page; on its other tabs the hub is the current section.
        aria-current={active ? (pathname === href ? "page" : "true") : undefined}
        className={cn(
          "flex h-control items-center gap-2.5 border-l-[3px] pl-[13px] pr-4 text-body-sm transition-colors",
          active ? "border-primary bg-surface-selected font-semibold text-ink" : "border-transparent text-ink hover:bg-surface-sunken",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-ink" : "text-ink-muted")} strokeWidth={1.5} aria-hidden />
        <span className="flex-1 truncate">{hub.label}</span>
        {hubMock(hub.id) && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-warning" title="Shows mock data until its data is hooked up">
            <span className="sr-only">Mock data</span>
          </span>
        )}
      </Link>
    </li>
  );
}
