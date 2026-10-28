"use client";

import { useState } from "react";
import { avnetExposure, type ExposureBillings, type Topic, type TopicFacet } from "@/lib/news/briefing";
import { fmtM, fmtPct } from "@/lib/avnet/format";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

const LIMIT = 6;

/**
 * What the news is about in the last 7 days, by segment or end market, with Avnet's
 * (mock) billings in the same topics underneath. Selecting a topic filters the
 * feed below.
 */
export function Topics({
  byFacet,
  avnet,
  selected,
  onSelect,
}: {
  byFacet: Record<TopicFacet, Topic[]>;
  avnet: ExposureBillings;
  selected: Record<TopicFacet, string[]>;
  onSelect: (facet: TopicFacet, name: string) => void;
}) {
  const [facet, setFacet] = useState<TopicFacet>("segments");
  const list = byFacet[facet].slice(0, LIMIT);
  const max = Math.max(1, ...list.map((t) => t.count));
  const exposure = list.map((t) => ({
    name: t.name,
    value: avnetExposure(t.name, facet, avnet),
  }));

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

      <div className="mt-4 space-y-2 border-t border-hairline pt-3">
        <h3 className="font-display text-card-title text-ink">Avnet billings in these topics</h3>
        {/* Segments come from the code map; end markets from the customer master's verticals. */}
        <HookupMarker ids={facet === "segments" ? ["billings", "code-map"] : ["billings", "customer-master"]} />
        <table className="w-full font-body text-table">
          <caption className="sr-only">Avnet billings, trailing 12 months, in this week&apos;s topics (mock data)</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="py-1 font-display text-label font-normal uppercase text-ink-muted">
                Topic
              </th>
              <th scope="col" className="py-1 text-right font-display text-label font-normal uppercase text-ink-muted">
                Last 12 months
              </th>
              <th scope="col" className="w-16 py-1 text-right font-display text-label font-normal uppercase text-ink-muted">
                YoY
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {exposure.map(({ name, value }) => (
              <tr key={name}>
                <td className="py-1.5 text-ink">{name}</td>
                {value ? (
                  <>
                    <td className="py-1.5 text-right tabular-nums text-ink">{fmtM(value.billings)}</td>
                    <td className="py-1.5 text-right tabular-nums text-ink-muted">{fmtPct(value.growth, true)}</td>
                  </>
                ) : (
                  <td colSpan={2} className="py-1.5 text-right text-ink-muted">
                    Not a billing segment
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
