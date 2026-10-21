"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { COHORTS, COHORT_LABELS, COMPANIES, type Cohort } from "@/lib/data/live/earnings-model";
import { earningsHref } from "./format";

const select =
  "h-control cursor-pointer appearance-none border border-hairline bg-surface pl-2.5 pr-8 text-body-sm font-medium text-ink disabled:cursor-wait";

/**
 * One company select (grouped by group, type to jump) and the group it is
 * compared with. Both live in the URL, so a view can be bookmarked or shared.
 */
export function CompanyPicker({ company, group }: { company: string; group: Cohort | "all" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (slug: string, g: Cohort | "all") => startTransition(() => router.push(earningsHref(slug, g), { scroll: false }));
  const current = COMPANIES.find((c) => c.slug === company)!;

  return (
    <div
      role="group"
      aria-label="Choose a company"
      className="flex min-h-filter-bar flex-wrap items-center gap-3 rounded-sm border border-hairline bg-surface px-3 py-1.5"
    >
      <label className="relative inline-flex items-center gap-2">
        <span className="font-display text-label uppercase text-ink-muted">Company</span>
        <span className="relative">
          <select
            value={company}
            disabled={pending}
            // Picking a company outside the group compares it with its own group.
            onChange={(e) => {
              const next = COMPANIES.find((c) => c.slug === e.target.value)!;
              go(next.slug, group === "all" ? "all" : next.cohort);
            }}
            className={`${select} min-w-[15rem]`}
          >
            {COHORTS.map((c) => (
              <optgroup key={c} label={COHORT_LABELS[c]}>
                {COMPANIES.filter((co) => co.cohort === c).map((co) => (
                  <option key={co.slug} value={co.slug}>
                    {co.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </label>
      <label className="relative inline-flex items-center gap-2">
        <span className="font-display text-label uppercase text-ink-muted">Compared with</span>
        <span className="relative">
          <select value={group} disabled={pending} onChange={(e) => go(company, e.target.value as Cohort | "all")} className={select}>
            <option value={current.cohort}>{COHORT_LABELS[current.cohort]}</option>
            {/* Market Cycle links open a group that may not be the company's own. */}
            {group !== "all" && group !== current.cohort && <option value={group}>{COHORT_LABELS[group]}</option>}
            <option value="all">All {COMPANIES.length} companies</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </label>
      {pending && (
        <span className="text-caption text-ink-muted" role="status">
          Loading filings…
        </span>
      )}
      <Link href={`/network/${company}`} className="ml-auto text-body-sm text-ink underline-offset-2 hover:underline">
        Company profile
      </Link>
    </div>
  );
}
