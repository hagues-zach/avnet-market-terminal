"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { COHORTS, COHORT_LABELS, COMPANIES, type Cohort } from "@/lib/data/live/earnings-model";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { earningsHref } from "./format";

const chip =
  "inline-flex items-center rounded px-2 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40";

export function EarningsControls({ company, group }: { company: string; group: Cohort | "all" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const cohorts = group === "all" ? COHORTS : [group];
  // The open company stays selectable even when the group filter excludes it.
  const current = COMPANIES.find((c) => c.slug === company);
  const outside = current && group !== "all" && current.cohort !== group ? current : undefined;

  return (
    <Card bodyClassName="space-y-3">
      <div className="flex items-start gap-2">
        <p className="w-20 shrink-0 pt-1 font-display text-2xs uppercase tracking-widest text-muted">Group</p>
        <div className="flex flex-wrap gap-1">
          {(["all", ...COHORTS] as const).map((g) => (
            <Link
              key={g}
              href={earningsHref(company, g)}
              scroll={false}
              aria-current={group === g ? "true" : undefined}
              className={cn(chip, group === g ? "bg-ink text-white" : "text-muted hover:bg-canvas")}
            >
              {g === "all" ? `All ${COMPANIES.length}` : COHORT_LABELS[g]}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="earnings-company" className="w-20 shrink-0 font-display text-2xs uppercase tracking-widest text-muted">
          Company
        </label>
        <select
          id="earnings-company"
          value={company}
          onChange={(e) => startTransition(() => router.push(earningsHref(e.target.value, group)))}
          className="min-w-[16rem] rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink cursor-pointer focus:border-avnet-green focus:outline-none focus:ring-2 focus:ring-avnet-green/30"
        >
          {outside && <option value={outside.slug}>{outside.name}</option>}
          {cohorts.map((c) => (
            <optgroup key={c} label={COHORT_LABELS[c]}>
              {COMPANIES.filter((co) => co.cohort === c).map((co) => (
                <option key={co.slug} value={co.slug}>
                  {co.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {pending && (
          <span className="inline-flex items-center gap-1 text-xs text-muted" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading filings
          </span>
        )}
      </div>
    </Card>
  );
}
