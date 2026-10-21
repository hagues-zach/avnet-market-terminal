"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_STORAGE_KEY, type RoleId } from "@/lib/start/roles";

/**
 * The role switch: square tabs that set ?role=…, and remember the choice in the
 * browser. Opening /start with no role restores the remembered one.
 */
export function RoleTabs({ current, fromUrl }: { current: RoleId; fromUrl: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (fromUrl) {
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, current);
      } catch {}
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(ROLE_STORAGE_KEY);
    } catch {}
    if (saved && saved !== current && ROLES.some((r) => r.id === saved)) {
      router.replace(`/start?role=${saved}`, { scroll: false });
    }
  }, [current, fromUrl, router]);

  return (
    <nav aria-label="View as role" className="border-b border-hairline">
      <ul className="-mb-px flex flex-wrap gap-x-6">
        {ROLES.map((r) => {
          const active = r.id === current;
          return (
            <li key={r.id}>
              <Link
                href={`/start?role=${r.id}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-tab items-center border-b-2 font-body text-body-sm transition-colors",
                  active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {r.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
