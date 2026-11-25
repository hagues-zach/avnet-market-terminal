"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReleaseEvent, Timing } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, ROLE_SINGULAR, roleOf, type Quarter } from "@/lib/data/live/earnings-model";
import { cn } from "@/lib/utils";
import { NA, format } from "./format";

// The "Reporting soon" rows of the earnings calendar. A company's name opens
// "What to watch" in a full-width row under it: its last filed quarter and the
// guidance it gave, from the cached release summary.

/** What to watch for a company about to report. */
export interface Watch {
  latest: Quarter | null;
  guidance?: string;
  filed?: string;
}

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dayLabel = (d: string) => utc(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const shortDate = (d: string) => utc(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const pct = (v: number | undefined) => (v === undefined ? NA : `${(v * 100).toFixed(1)}%`);
const clip = (s: string, n = 320) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);
const SHORT_TIMING: Record<Timing, string> = { before: "Before open", during: "Market hours", after: "After close" };

function WatchPanel({ event, watch }: { event: ReleaseEvent; watch?: Watch }) {
  const v = watch?.latest?.values;
  return (
    <div className="space-y-1 border-l-2 border-hairline pl-3 text-caption text-ink">
      <p className="font-display text-label uppercase text-ink-muted">What to watch</p>
      {watch?.latest && v ? (
        <p>
          Last quarter ({watch.latest.fiscalLabel}): revenue growth {format("growth", v.revenueYoY)}, operating margin {pct(v.operatingMargin)}
          {v.inventoryDays !== undefined && <>, inventory {format("days", v.inventoryDays)} days</>}.
        </p>
      ) : (
        <p className="text-ink-muted">No filed quarter yet.</p>
      )}
      {watch?.guidance ? (
        <p>
          <span className="text-ink-muted">Guidance it gave{watch.filed ? ` (release of ${shortDate(watch.filed)})` : ""}: </span>
          {clip(watch.guidance)}
        </p>
      ) : (
        <p className="text-ink-muted">No guidance summary on file yet. It appears once the release has been read on the company&apos;s profile.</p>
      )}
      <Link href={`/network/${event.company.slug}`} className="inline-flex text-ink underline underline-offset-2 hover:text-ink-muted">
        Open {event.company.name}&apos;s profile
      </Link>
    </div>
  );
}

export function SoonRows({ title, events, watch }: { title: string; events: ReleaseEvent[]; watch: Record<string, Watch> }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!events.length) return null;
  return (
    <tbody>
      <tr className="border-b border-hairline">
        <th scope="colgroup" colSpan={5} className="px-2 pb-1 pt-3 text-left font-display text-card-title font-normal text-ink">
          {title} <span className="text-ink-muted">{events.length}</span>
        </th>
      </tr>
      {events.map((e) => {
        const key = `${e.company.slug}-${e.date}`;
        const isOpen = open === key;
        const c = e.company;
        return (
          <Fragment key={key}>
            <tr className={cn("border-b border-hairline", isOpen && "border-b-0 bg-surface-sunken")}>
              <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-ink">
                <time dateTime={e.date}>{dayLabel(e.date)}</time>
              </td>
              <th scope="row" className="px-2 py-1.5 text-left font-normal">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`watch-${key}`}
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="group inline-flex cursor-pointer items-center gap-1.5 text-left text-ink"
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform", isOpen && "rotate-90")} strokeWidth={1.5} aria-hidden />
                  {c.slug === "avnet" && <span className="h-2.5 w-2.5 shrink-0 bg-viz-avnet" aria-hidden />}
                  <span className="underline-offset-2 group-hover:underline">{c.name}</span>
                  <span className="sr-only">: what to watch</span>
                </button>
              </th>
              <td className="px-2 py-1.5 text-ink-muted">
                {COHORT_LABELS[c.cohort]}
                <span className="block text-caption">{ROLE_SINGULAR[roleOf(c)]}</span>
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-ink-muted">{e.timing ? SHORT_TIMING[e.timing] : ""}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right text-ink-muted" title={e.basis ? `Based on ${e.basis}` : undefined}>
                {e.status === "due" ? "due, not filed" : "estimated"}
              </td>
            </tr>
            {isOpen && (
              <tr id={`watch-${key}`} className="border-b border-hairline bg-surface-sunken">
                <td colSpan={5} className="px-2 pb-3 pt-0">
                  <WatchPanel event={e} watch={watch[c.slug]} />
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </tbody>
  );
}
