"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";

// Every indicator, one group at a time. Rows arrive formatted from the server.

export type Tone = "good" | "bad" | "neutral";

export interface Change {
  text: string;
  /** Sign of the change; 0 is flat. */
  sign: -1 | 0 | 1;
  tone: Tone;
}

export interface IndicatorRow {
  key: string;
  label: string;
  detail: string;
  latest: string;
  month?: Change;
  year?: Change;
  spark: number[];
  asOf: string;
  source: string;
}

export interface IndicatorGroup {
  id: string;
  label: string;
  rows: IndicatorRow[];
}

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

function ChangeCell({ c }: { c?: Change }) {
  if (!c) return <span className="text-ink-muted">n/a</span>;
  const Arrow = c.sign > 0 ? ArrowUp : c.sign < 0 ? ArrowDown : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 whitespace-nowrap tabular-nums",
        c.sign === 0 ? "text-ink-muted" : c.tone === "good" ? "text-positive" : c.tone === "bad" ? "text-negative" : "text-ink",
      )}
    >
      <Arrow className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      {c.text}
    </span>
  );
}

export function IndicatorTabs({ groups }: { groups: IndicatorGroup[] }) {
  const [current, setCurrent] = useState(groups[0]?.id);
  const group = groups.find((g) => g.id === current) ?? groups[0];
  if (!group) return null;
  return (
    <div>
      <div role="group" aria-label="Indicator group" className="flex flex-wrap gap-x-6 border-b border-hairline px-4">
        {groups.map((g) => {
          const active = g.id === group.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCurrent(g.id)}
              className={cn(
                "-mb-px inline-flex h-tab cursor-pointer items-center border-b-2 font-body text-body-sm transition-colors",
                active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      <div role="region" aria-label={`${group.label} indicators`} tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse font-body text-table">
          <caption className="sr-only">{group.label}: latest value, change on a month and a year ago, the trend, date and source.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "text-left")}>
                Indicator
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                Latest
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                1 month
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                1 year
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Trend
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                As of
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r) => (
              <tr key={r.key} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <span className="text-ink">{r.label}</span>
                  <span className="block text-caption text-ink-muted">{r.detail}</span>
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{r.latest}</td>
                <td className="px-3 py-1.5 text-right">
                  <ChangeCell c={r.month} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <ChangeCell c={r.year} />
                </td>
                <td className="px-3 py-1.5">
                  <Sparkline data={r.spark} color={VIZ.arrow} width={112} height={24} />
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-muted">{r.asOf}</td>
                <td className="px-3 py-1.5 text-ink-muted">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
