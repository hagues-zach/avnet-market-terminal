"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Move, MoveDistributor } from "@/lib/line-cards/moves";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const PAGE = 8;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

/** Avnet Green for Avnet and the businesses it owns, Dark Blue for Arrow, grey for everyone else. */
const fill = (d: MoveDistributor) => (d.avnet ? "bg-viz-avnet" : d.slug === "arrow" ? "bg-viz-arrow" : "bg-viz-benchmark");
const rule = (d: MoveDistributor) => (d.avnet ? "border-l-viz-avnet" : d.slug === "arrow" ? "border-l-viz-arrow" : "border-l-hairline");

/**
 * "Who is signing" (agreements by distributor, selectable) beside the dated list
 * of moves it filters. Two panels, one piece of state.
 */
export function MovesList({
  moves,
  byDistributor,
  profiles,
}: {
  moves: Move[];
  byDistributor: { distributor: MoveDistributor; count: number }[];
  /** Supplier name as read from a headline → company profile slug. */
  profiles: Record<string, string>;
}) {
  const [slug, setSlug] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);
  const rows = useMemo(() => moves.filter((m) => slug === "all" || m.distributor.slug === slug), [moves, slug]);
  const max = Math.max(1, ...byDistributor.map((d) => d.count));
  const pick = (s: string) => {
    setSlug((cur) => (cur === s ? "all" : s));
    setShown(PAGE);
  };
  const selected = byDistributor.find((d) => d.distributor.slug === slug)?.distributor.name;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
      <Panel
        className="xl:col-span-4"
        title="Who is signing"
        subtitle="Agreements announced in the last 12 months. Select one to filter"
        footer={<SourceLine source="News headlines" />}
      >
        <ul className="space-y-1">
          {byDistributor.map(({ distributor: d, count }) => {
            const active = slug === d.slug;
            return (
              <li key={d.slug}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(d.slug)}
                  className={cn(
                    "w-full cursor-pointer px-2 py-1.5 text-left transition-colors",
                    active ? "bg-surface-selected" : "hover:bg-surface-sunken",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 text-body-sm text-ink">
                    <span className={cn(active && "font-semibold")}>{d.name}</span>
                    <span className="tabular-nums">{count}</span>
                  </span>
                  <span className="mt-1 block h-2" aria-hidden>
                    <span className={cn("block h-full", fill(d))} style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {slug !== "all" && (
          <button type="button" onClick={() => pick(slug)} className="mt-3 cursor-pointer text-caption text-ink underline underline-offset-2 hover:text-ink-muted">
            Show all distributors
          </button>
        )}
      </Panel>

      <Panel
        className="xl:col-span-8"
        title="Franchise moves"
        subtitle={selected ? `${rows.length} announced by ${selected}` : `${moves.length} announced, newest first`}
        footer={
          <SourceLine source="News headlines with agreement wording next to a distributor's name">
            <span className="ml-auto">
              Showing {Math.min(shown, rows.length)} of {rows.length}
            </span>
          </SourceLine>
        }
      >
        <ul className="space-y-2">
          {rows.slice(0, shown).map((m) => {
            const profile = m.supplier ? profiles[m.supplier] : undefined;
            return (
              <li key={m.id} className={cn("border-l-2 py-1 pl-3", rule(m.distributor))}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body-sm">
                    <span className="font-semibold text-ink">{m.distributor.name}</span>
                    {m.supplier && (
                      <>
                        <span className="text-ink-muted">{m.ended ? "and" : "with"}</span>
                        {profile ? (
                          <Link href={`/network/${profile}`} className="font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink">
                            {m.supplier}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{m.supplier}</span>
                        )}
                      </>
                    )}
                    {m.ended && <Chip>Ended</Chip>}
                  </p>
                  <time dateTime={m.date} className="whitespace-nowrap text-caption tabular-nums text-ink-muted">
                    {day(m.date)}
                  </time>
                </div>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-0.5 inline-flex items-start gap-1.5 text-body-sm text-ink-muted hover:text-ink focus:outline-none focus-visible:underline"
                >
                  <span>
                    {m.title}
                    {m.outlet && <span className="text-ink-muted">, {m.outlet}</span>}
                  </span>
                  <ExternalLink className="mt-1 h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="py-4 text-body-sm text-ink-muted">No announcements found.</p>}
        {rows.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 cursor-pointer text-caption text-ink underline underline-offset-2 hover:text-ink-muted">
            Show {Math.min(PAGE, rows.length - shown)} more
          </button>
        )}
      </Panel>
    </div>
  );
}
