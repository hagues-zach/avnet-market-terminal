"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { COHORT_LABELS, US_FILERS, type Cohort } from "@/lib/data/live/earnings-model";

/** Which group the profile's peer table compares the company with. Kept in the URL (?group=), jumping back to the table. */
export function GroupPicker({ own, group }: { own: Cohort; group: Cohort | "all" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const go = (g: Cohort | "all") =>
    startTransition(() => router.push(g === own ? `${pathname}#peers` : `${pathname}?group=${g}#peers`, { scroll: false }));

  return (
    <label className="inline-flex items-center gap-2">
      <span className="font-display text-label uppercase text-ink-muted">Compared with</span>
      <span className="relative">
        <select
          value={group}
          disabled={pending}
          onChange={(e) => go(e.target.value as Cohort | "all")}
          className="h-control cursor-pointer appearance-none border border-hairline bg-surface pl-2.5 pr-8 text-body-sm font-medium text-ink disabled:cursor-wait"
        >
          <option value={own}>{COHORT_LABELS[own]}</option>
          {group !== "all" && group !== own && <option value={group}>{COHORT_LABELS[group]}</option>}
          <option value="all">All {US_FILERS.length} companies</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} aria-hidden />
      </span>
      {pending && (
        <span className="text-caption text-ink-muted" role="status">
          Loading…
        </span>
      )}
    </label>
  );
}
