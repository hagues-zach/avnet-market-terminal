"use client";

import { useState } from "react";
import type { Topic, TopicFacet } from "@/lib/news/briefing";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const LIMIT = 6;

/**
 * What the news is about in the last 7 days, by segment or end market. Selecting
 * a topic filters the feed below. Avnet's billings by end market are on Customers.
 */
export function Topics({
  byFacet,
  selected,
  onSelect,
}: {
  byFacet: Record<TopicFacet, Topic[]>;
  selected: Record<TopicFacet, string[]>;
  onSelect: (facet: TopicFacet, name: string) => void;
}) {
  const [facet, setFacet] = useState<TopicFacet>("segments");
  const list = byFacet[facet].slice(0, LIMIT);
  const max = Math.max(1, ...list.map((t) => t.count));

  return (
    <Panel
      title="Topics this week"
      subtitle="Stories in the last 7 days. Select one to filter the feed"
      className="xl:col-span-4"
      actions={
        <Segmented
          label="Group topics by"
          value={facet}
          onChange={setFacet}
          options={[
            { value: "segments", label: "Segment" },
            { value: "endMarkets", label: "End market" },
          ]}
        />
      }
    >
      {list.length === 0 ? (
        <EmptyState title="No tagged stories this week" />
      ) : (
        <ul className="space-y-1">
          {list.map((t) => {
            const active = selected[facet].includes(t.name);
            return (
              <li key={t.name}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(facet, t.name)}
                  className={cn(
                    "w-full cursor-pointer px-2 py-1.5 text-left transition-colors",
                    active ? "bg-surface-selected" : "hover:bg-surface-sunken",
                  )}
                >
                  <span className="flex items-baseline gap-2 text-body-sm text-ink">
                    <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>{t.name}</span>
                    <span className="tabular-nums">
                      {t.count}
                      <span className="sr-only"> stories</span>
                    </span>
                  </span>
                  <span className="mt-1 block h-2" aria-hidden>
                    <span className="block h-full bg-viz-benchmark" style={{ width: `${(t.count / max) * 100}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
