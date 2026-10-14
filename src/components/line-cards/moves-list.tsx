"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Move, MoveDistributor } from "@/lib/line-cards/moves";
import { cn } from "@/lib/utils";

const PAGE = 15;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

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

  return (
    <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div>
        <h3 className="mb-1.5 font-display text-2xs uppercase tracking-widest text-muted">Agreements announced, last 12 months</h3>
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              aria-pressed={slug === "all"}
              onClick={() => {
                setSlug("all");
                setShown(PAGE);
              }}
              className={cn("flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs cursor-pointer", slug === "all" ? "bg-ink text-white" : "text-ink hover:bg-canvas")}
            >
              <span>All distributors</span>
              <span className="tabular">{moves.length}</span>
            </button>
          </li>
          {byDistributor.map(({ distributor: d, count }) => (
            <li key={d.slug}>
              <button
                type="button"
                aria-pressed={slug === d.slug}
                onClick={() => {
                  setSlug(d.slug);
                  setShown(PAGE);
                }}
                className={cn("relative flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs cursor-pointer", slug === d.slug ? "bg-ink text-white" : "text-ink hover:bg-canvas")}
              >
                {/* Avnet Green only ever represents Avnet and the businesses it owns. */}
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0.5 left-0 rounded-sm", slug === d.slug ? "bg-white/15" : d.avnet ? "bg-avnet-green/30" : "bg-blue-dark/15")}
                  style={{ width: `${(count / max) * 100}%` }}
                />
                <span className="relative">{d.name}</span>
                <span className="relative tabular">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1.5 font-display text-2xs uppercase tracking-widest text-muted">Most recent</h3>
        <ul className="divide-y divide-line">
          {rows.slice(0, shown).map((m) => {
            const profile = m.supplier ? profiles[m.supplier] : undefined;
            return (
              <li key={m.id} className="py-2 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs">
                  <time dateTime={m.date} className="tabular text-muted">
                    {day(m.date)}
                  </time>
                  <span className={cn("rounded border px-1.5 py-0.5 font-display uppercase tracking-wider", m.distributor.avnet ? "border-avnet-green text-ink" : "border-line text-muted")}>
                    {m.distributor.name}
                  </span>
                  {m.ended && <span className="rounded border border-danger px-1.5 py-0.5 font-display uppercase tracking-wider text-danger">Ended</span>}
                  {m.supplier && (
                    <>
                      <span className="text-muted">{m.ended ? "and" : "with"}</span>
                      {profile ? (
                        <Link href={`/network/${profile}`} className="font-medium text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
                          {m.supplier}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{m.supplier}</span>
                      )}
                    </>
                  )}
                </div>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-0.5 inline-flex items-start gap-1.5 text-sm text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                >
                  <span>{m.title}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-gray-medium group-hover:text-avnet-greenDark" />
                </a>
                {m.outlet && <p className="text-2xs text-gray-medium">{m.outlet}</p>}
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="py-4 text-sm text-muted">No announcements found.</p>}
        {rows.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-2 text-xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark cursor-pointer">
            Show {Math.min(PAGE, rows.length - shown)} more
          </button>
        )}
      </div>
    </div>
  );
}
