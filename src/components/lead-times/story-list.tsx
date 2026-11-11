"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

// The lead-time stories, filtered by segment. Plain data in, so the server view
// can pass it straight through.

export interface StoryRow {
  id: string;
  title: string;
  url: string;
  outlet: string;
  /** "Nov 4" */
  date: string;
  segments: string[];
  way: "longer" | "easing" | null;
  weeks: string | null;
}

const SHOWN = 12;

export function StoryList({ stories, segments }: { stories: StoryRow[]; segments: string[] }) {
  // The segment filter lives in the URL (?segment=Memory), so a filtered list can be shared.
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [all, setAll] = useState(false);
  const counts = new Map(segments.map((s) => [s, stories.filter((r) => r.segments.includes(s)).length]));
  const filters = segments.filter((s) => counts.get(s));
  const asked = params.get("segment");
  const segment = asked && filters.includes(asked) ? asked : null;
  const setSegment = (s: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (s) next.set("segment", s);
    else next.delete("segment");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const rows = segment ? stories.filter((r) => r.segments.includes(segment)) : stories;
  const shown = all ? rows : rows.slice(0, SHOWN);

  return (
    <div>
      {filters.length > 0 && (
        <div role="group" aria-label="Filter stories by segment" className="flex flex-wrap gap-2 border-b border-hairline px-4 py-3">
          {[null, ...filters].map((s) => {
            const on = segment === s;
            return (
              <button
                key={s ?? "all"}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setSegment(s);
                  setAll(false);
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 border px-3 text-body-sm transition-colors",
                  on ? "border-ink bg-surface-selected text-ink" : "border-hairline bg-surface text-ink-muted hover:bg-surface-sunken hover:text-ink",
                )}
              >
                {s ?? "All segments"}
                <span className="tabular-nums text-ink-muted">{s ? counts.get(s) : stories.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="px-4 py-6 text-body text-ink-muted">No lead-time stories in the last 30 days. The feeds are checked every 15 minutes.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {shown.map((r) => (
            <li key={r.id} className="grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
              <span className="text-caption tabular-nums text-ink-muted">{r.date}</span>
              <div className="min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline text-body text-ink underline-offset-2 hover:underline"
                >
                  {r.title}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-ink-muted" strokeWidth={1.5} aria-hidden />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-muted">
                  <span>{r.outlet}</span>
                  {r.segments.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </p>
              </div>
              <div className="flex items-start gap-3 text-body-sm md:justify-end">
                {r.weeks && <span className="whitespace-nowrap tabular-nums text-ink">{r.weeks}</span>}
                {r.way && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-ink">
                    {r.way === "longer" ? <ArrowUp className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : <ArrowDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
                    {r.way === "longer" ? "Longer" : "Easing"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows.length > SHOWN && (
        <div className="border-t border-hairline px-4 py-2">
          <button type="button" onClick={() => setAll((v) => !v)} className="h-8 text-button text-ink underline-offset-2 hover:underline">
            {all ? "Show fewer" : `Show all ${rows.length} stories`}
          </button>
        </div>
      )}
    </div>
  );
}
