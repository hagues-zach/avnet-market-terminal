"use client";

import { Fragment, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DataPillar, Hookup, HookupStatus } from "@/lib/hookups";
import { matches } from "@/lib/data-hookups/read";
import { Chip, DataChip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

// The Data Hookups workbench: the phase 5 steps as a strip that filters, the
// register with a status switch and rows that open in place, and the pages
// with how close each is to live. Every status comes from src/lib/hookups.ts.

export interface StepCell {
  step: string;
  name: string;
  status: string;
  live: number;
  total: number;
  ids: string[];
  /** Hrefs of the pages it reaches. */
  reach: string[];
  /** Titles of the pages it makes fully live. */
  completes: string[];
}

export interface PageRow {
  href: string;
  title: string;
  ids: string[];
  live: number;
}

type View = "all" | HookupStatus;
const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mock", label: "Mock" },
  { value: "planned", label: "Planned" },
  { value: "live", label: "Live" },
];

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const CONTROL = "h-control border-0 border-b border-hairline bg-surface-sunken px-2 font-body text-body-sm text-ink focus:border-ink";
const link = "text-ink underline-offset-2 hover:underline";
const pages = (n: number) => (n === 1 ? "1 page" : `${n} pages`);

function Detail({ h, step, usedOn }: { h: Hookup; step?: string; usedOn: { href: string; title: string }[] }) {
  return (
    <div className="grid divide-y divide-hairline border-t border-hairline bg-surface-sunken md:grid-cols-3 md:divide-x md:divide-y-0">
      <div className="min-w-0 px-4 py-3">
        <h3 className={LABEL}>Tables and views</h3>
        <ul translate="no" className="mt-1 space-y-0.5 break-all font-mono text-micro text-ink">
          {h.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-2 text-body-sm text-ink-muted">{h.description}</p>
      </div>
      <div className="min-w-0 space-y-3 px-4 py-3">
        <div>
          <h3 className={LABEL}>Fields</h3>
          {h.fields?.length ? (
            <p translate="no" className="mt-1 break-words font-mono text-micro text-ink">
              {h.fields.join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-ink-muted">n/a: to confirm with the data team</p>
          )}
        </div>
        <div>
          <h3 className={LABEL}>Refresh</h3>
          <p className="mt-1 text-body-sm text-ink">{h.refresh}</p>
        </div>
        <div>
          <h3 className={LABEL}>Mock to replace</h3>
          {h.replaceIn ? (
            <p translate="no" className="mt-1 break-all font-mono text-micro text-ink">
              {h.replaceIn}
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-ink-muted">{h.status === "live" ? "n/a: already live" : "n/a: no page has a mock for it yet"}</p>
          )}
        </div>
        {h.notes && (
          <div>
            <h3 className={LABEL}>Notes</h3>
            <p className="mt-1 text-body-sm text-ink">{h.notes}</p>
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-3 px-4 py-3">
        <div>
          <h3 className={LABEL}>Connection order</h3>
          <p className="mt-1 text-body-sm text-ink">{h.status === "live" ? "Connected" : step ? `Step ${step}` : "Not scheduled in phase 5"}</p>
        </div>
        <div>
          <h3 className={LABEL}>Used on</h3>
          {usedOn.length ? (
            <ul className="mt-1 space-y-0.5 text-body-sm">
              {usedOn.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={link}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-body-sm text-ink-muted">
              {h.status === "live" ? "Feeds live pages directly, so no page carries a marker for it." : "No page shows it yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HookupsWorkbench({
  hookups,
  pillars,
  steps,
  next,
  unscheduled,
  pageRows,
}: {
  hookups: Hookup[];
  pillars: Record<DataPillar, string>;
  steps: StepCell[];
  /** The first step not yet connected. */
  next?: string;
  /** Names of sources outside phase 5. */
  unscheduled: string[];
  /** Pages with a marker, closest to fully live first. */
  pageRows: PageRow[];
}) {
  const [step, setStep] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [pillar, setPillar] = useState<DataPillar | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const uid = useId();

  // A link to /data-hookups#<id> opens that row.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!hookups.some((h) => h.id === id)) return;
      setStep(null);
      setView("all");
      setPillar("all");
      setQuery("");
      setOpen(id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [hookups]);

  const byId = new Map(hookups.map((h) => [h.id, h]));
  const selected = steps.find((s) => s.step === step);
  const stepOf = new Map(steps.flatMap((s) => s.ids.map((id) => [id, s.step] as const)));
  const usedOn = (id: string) => pageRows.filter((p) => p.ids.includes(id));

  // Every filter except the status switch, so the switch counts what each view would show.
  const filtered = hookups.filter(
    (h) => (!selected || selected.ids.includes(h.id)) && (pillar === "all" || h.pillar === pillar) && matches(h, query),
  );
  const rows = filtered.filter((h) => view === "all" || h.status === view);
  const dirty = step || pillar !== "all" || query || view !== "all";
  const reset = () => {
    setStep(null);
    setView("all");
    setPillar("all");
    setQuery("");
    setOpen(null);
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${uid}-order`} className="rounded-sm border border-hairline bg-surface">
        <header className="px-4 pt-3">
          <h2 id={`${uid}-order`} className="font-display text-card-title text-ink">
            Connection order
          </h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            Phase 5 of the build plan, in the order the data team connects it. Select a step to filter the register
          </p>
        </header>
        <div role="group" aria-label="Filter by phase 5 step" className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 xl:grid-cols-8">
          {steps.map((s) => {
            const active = step === s.step;
            return (
              <button
                key={s.step}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStep(active ? null : s.step);
                  setOpen(null);
                }}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col border px-3 py-2 text-left transition-colors",
                  active ? "border-ink bg-surface-selected" : "border-hairline hover:bg-surface-sunken",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-section-title tabular-nums text-ink">{s.step}</span>
                  {s.step === next && <Chip>Next</Chip>}
                </span>
                <span className="mt-0.5 text-body-sm text-ink">{s.name}</span>
                <span className="mt-1.5 text-caption tabular-nums text-ink">
                  {s.live} of {s.total} live
                </span>
                <span className="mt-1 block h-1" aria-hidden>
                  <span className="block h-full bg-viz-avnet" style={{ width: `${(s.live / s.total) * 100}%` }} />
                </span>
                <span className="mt-1 text-caption text-ink-muted">Reaches {pages(s.reach.length)}</span>
                <span className="sr-only">, {s.status}</span>
              </button>
            );
          })}
        </div>
        <p className="border-t border-hairline px-4 py-2 text-caption text-ink-muted">
          Not scheduled in phase 5: {unscheduled.length ? unscheduled.join(", ") : "none"}.
        </p>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <section aria-labelledby={`${uid}-reg`} className="rounded-sm border border-hairline bg-surface xl:col-span-8">
          <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <h2 id={`${uid}-reg`} className="font-display text-card-title text-ink">
                Register
              </h2>
              <p className="mt-0.5 text-caption text-ink-muted" aria-live="polite">
                {selected
                  ? `Step ${selected.step}: ${rows.length} of ${hookups.length} sources, reaching ${pages(selected.reach.length)}${
                      selected.completes.length
                        ? `; ${selected.completes.join(", ")} ${selected.completes.length === 1 ? "goes" : "go"} fully live`
                        : ""
                    }`
                  : `${rows.length} of ${hookups.length} sources. Select a row for its tables, fields and the pages that use it`}
              </p>
            </div>
            <div role="group" aria-label="Show sources that are" className="inline-flex border border-hairline">
              {VIEWS.map((v, i) => {
                const active = v.value === view;
                const n = filtered.filter((h) => v.value === "all" || h.status === v.value).length;
                return (
                  <button
                    key={v.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setView(v.value);
                      setOpen(null);
                    }}
                    className={cn(
                      "h-control cursor-pointer whitespace-nowrap px-3 font-body text-body-sm transition-colors",
                      i > 0 && "border-l border-hairline",
                      active ? "bg-surface-sunken font-semibold text-ink" : "bg-surface text-ink-muted hover:text-ink",
                    )}
                  >
                    {v.label} <span className="tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-hairline px-4 py-2">
            <label className="flex flex-col gap-0.5">
              <span className={LABEL}>Pillar</span>
              <select value={pillar} onChange={(e) => setPillar(e.target.value as DataPillar | "all")} className={CONTROL}>
                <option value="all">All pillars</option>
                {(Object.keys(pillars) as DataPillar[]).map((p) => (
                  <option key={p} value={p}>
                    {pillars[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-0.5">
              <span className={LABEL}>Search</span>
              <input
                type="search"
                name="hookup-search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Source, table or field…"
                className={CONTROL}
              />
            </label>
            {selected && <Chip>Step {selected.step}</Chip>}
            <button
              type="button"
              onClick={reset}
              disabled={!dirty}
              className="h-control px-2 font-body text-button text-ink underline-offset-2 hover:underline disabled:cursor-default disabled:text-ink-muted disabled:no-underline"
            >
              Reset
            </button>
          </div>

          <div role="region" aria-label="Register of data sources" tabIndex={0} className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-body text-table">
              <caption className="sr-only">Data sources: name, pillar, status, refresh and the number of pages that show it.</caption>
              <thead className="bg-surface-sunken">
                <tr className="border-y border-hairline">
                  <th scope="col" className={cn(TH, "text-left")}>
                    Source
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Pillar
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Status
                  </th>
                  <th scope="col" className={cn(TH, "text-left")}>
                    Refresh
                  </th>
                  <th scope="col" className={cn(TH, "text-right")}>
                    Pages
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-body-sm text-ink-muted">
                      No sources match these filters.{" "}
                      <button type="button" onClick={reset} className="text-ink underline underline-offset-2">
                        Reset the filters
                      </button>
                    </td>
                  </tr>
                )}
                {rows.map((h) => {
                  const expanded = open === h.id;
                  const used = usedOn(h.id);
                  return (
                    <Fragment key={h.id}>
                      <tr
                        id={h.id}
                        className={cn("scroll-mt-16 border-b border-hairline", expanded ? "bg-surface-sunken" : "hover:bg-surface-sunken")}
                      >
                        <th scope="row" className="px-3 py-1.5 text-left font-normal">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setOpen(expanded ? null : h.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-left text-ink underline-offset-2 hover:underline"
                          >
                            <ChevronRight
                              className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", expanded && "rotate-90")}
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className={cn(expanded && "font-semibold")}>{h.name}</span>
                            <span className="sr-only">{expanded ? ", hide details" : ", show details"}</span>
                          </button>
                        </th>
                        <td className="whitespace-nowrap px-3 py-1.5 text-ink-muted">{pillars[h.pillar]}</td>
                        <td className="px-3 py-1.5">
                          <DataChip status={h.status} />
                        </td>
                        <td className="px-3 py-1.5 text-ink-muted">{h.refresh}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                          {h.status === "live" ? <span className="text-ink-muted">n/a</span> : used.length}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-hairline">
                          <td colSpan={5} className="p-0">
                            <Detail h={h} step={stepOf.get(h.id)} usedOn={used} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby={`${uid}-pages`} className="rounded-sm border border-hairline bg-surface xl:col-span-4">
          <header className="px-4 pt-3">
            <h2 id={`${uid}-pages`} className="font-display text-card-title text-ink">
              Pages and their sources
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">A page goes fully live when every source on it is live. Closest first</p>
          </header>
          <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
            {pageRows.map((p) => {
              const inStep = selected?.reach.includes(p.href);
              return (
                <li key={p.href} className={cn("px-4 py-2", inStep && "bg-surface-selected")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={p.href} className={cn(link, "min-w-0 text-body-sm")}>
                      {p.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      {inStep && <Chip>Step {selected!.step}</Chip>}
                      <span className="whitespace-nowrap text-caption tabular-nums text-ink-muted">
                        {p.live} of {p.ids.length} live
                      </span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-caption text-ink-muted">{p.ids.map((id) => byId.get(id)?.name ?? id).join(", ")}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
