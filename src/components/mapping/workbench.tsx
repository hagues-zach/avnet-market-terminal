"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { categoryPath as path, matches, needsReview, reviewOrder, type SegmentCoverage } from "@/lib/mapping/read";
import type { Confidence, Mapping } from "@/lib/avnet/contracts";
import { STATUS_LABEL, segmentShort } from "@/lib/avnet/format";
import { Chip, DataChip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

// The mapping workbench: a segment strip that filters, a filter bar, and one
// table switched between mappings that need review, validated and not mapped.
// Each row opens in place. All mock until the code map is hooked up.

type View = "review" | "validated" | "unmapped";
const VIEWS: { value: View; label: string }[] = [
  { value: "review", label: "Needs review" },
  { value: "validated", label: "Validated" },
  { value: "unmapped", label: "Not mapped" },
];
const inView = (m: Mapping, v: View) => (v === "review" ? needsReview(m) : m.status === v);

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const ago = (d: number) => (d === 1 ? "1 day ago" : `${d} days ago`);
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const CONTROL = "h-control border-0 border-b border-hairline bg-surface-sunken px-2 font-body text-body-sm text-ink focus:border-ink";

function Detail({ m, semi }: { m: Mapping; semi: boolean }) {
  return (
    <div className="grid gap-0 divide-y divide-hairline border-t border-hairline bg-surface-sunken md:grid-cols-3 md:divide-x md:divide-y-0">
      <div className="space-y-3 px-4 py-3">
        <div>
          <h4 className={LABEL}>External definition</h4>
          <p className="mt-1 text-body-sm text-ink">{m.definition}</p>
        </div>
        <div>
          <h4 className={LABEL}>Avnet codes</h4>
          {m.codes.length ? (
            <p className="mt-1 text-body-sm text-ink">
              {m.codes.join(", ")}, {m.pcc}
              <span className="block text-caption text-ink-muted">
                {semi ? "Semiconductors" : "IP&E"} › {m.segment} › {m.name}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-ink-muted">Not mapped: no Avnet code matches this category yet.</p>
          )}
        </div>
        <div>
          <h4 className={LABEL}>Example part families</h4>
          <p className="mt-1 text-body-sm text-ink">{m.parts.join(", ")}</p>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div>
          <h4 className={cn(LABEL, "flex items-center gap-2")}>
            Why it was suggested <DataChip status="mock" />
          </h4>
          <p className="mt-1 text-body-sm text-ink">{m.reason ?? "Nothing has been suggested: the code map found no Avnet code for it."}</p>
        </div>
        <div>
          <h4 className={LABEL}>Waits on</h4>
          <p className="mt-1 text-body-sm text-ink">{m.waitsOn ?? (m.status === "unmapped" ? "No owner yet" : "Nobody: validated")}</p>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div>
          <h4 className={LABEL}>History</h4>
          <ol className="mt-1 space-y-1 text-body-sm">
            {m.history.map((h, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-ink">
                  {h.event} <span className="text-ink-muted">by {h.by.toLowerCase().startsWith("code map") ? "the code map" : h.by}</span>
                </span>
                <span className="whitespace-nowrap tabular-nums text-ink-muted">{ago(h.daysAgo)}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="flex items-center gap-2 text-caption text-ink-muted">
          <DataChip status="planned" />
          Accept, edit and reject arrive in step 3.5
        </p>
      </div>
    </div>
  );
}

export function MappingWorkbench({
  mappings,
  coverage,
  confidence,
  semi,
}: {
  mappings: Mapping[];
  coverage: SegmentCoverage[];
  /** The shared model's confidence rating per segment. */
  confidence: Record<string, string>;
  /** Segments that are semiconductors (the rest are IP&E). */
  semi: string[];
}) {
  const [segment, setSegment] = useState<string | null>(null);
  const [view, setView] = useState<View>("review");
  const [conf, setConf] = useState<Confidence | "all">("all");
  const [owner, setOwner] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const ids = useId();

  const owners = useMemo(() => [...new Set(mappings.map((m) => m.waitsOn).filter((w): w is string => Boolean(w)))].sort(), [mappings]);
  // Every filter except the status switch, so the switch counts what each view would show.
  const filtered = mappings.filter(
    (m) =>
      (!segment || m.segment === segment) &&
      (conf === "all" || m.confidence === conf) &&
      (owner === "all" || m.waitsOn === owner) &&
      matches(m, query),
  );
  const rows = filtered.filter((m) => inView(m, view)).sort(reviewOrder);
  const total = rows.reduce((n, m) => n + m.billings, 0);
  const reset = () => {
    setSegment(null);
    setConf("all");
    setOwner("all");
    setQuery("");
    setOpen(null);
  };
  const dirty = segment || conf !== "all" || owner !== "all" || query;

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${ids}-cov`} className="rounded-sm border border-hairline bg-surface">
        <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3">
          <div>
            <h2 id={`${ids}-cov`} className="font-display text-card-title text-ink">
              Coverage by segment
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              Share of each segment&apos;s billings on validated mappings, and its confidence. Select one to filter the mappings
            </p>
          </div>
          <DataChip status="mock" />
        </header>
        <div role="group" aria-label="Filter by segment" className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-5 2xl:grid-cols-10">
          {coverage.map((c) => {
            const active = segment === c.segment;
            return (
              <button
                key={c.segment}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSegment(active ? null : c.segment);
                  setOpen(null);
                }}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col border px-3 py-2 text-left transition-colors",
                  active ? "border-ink bg-surface-selected" : "border-hairline hover:bg-surface-sunken",
                )}
              >
                <span className="truncate text-body-sm text-ink">{segmentShort(c.segment)}</span>
                <span className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="font-display text-card-title tabular-nums text-ink">{pct(c.validatedShare)}</span>
                  <span className="text-caption text-ink-muted">{confidence[c.segment]}</span>
                </span>
                <span className="mt-1.5 block h-1.5" aria-hidden>
                  <span className="block h-full bg-viz-avnet" style={{ width: `${c.validatedShare * 100}%` }} />
                </span>
                <span className="sr-only">
                  {pct(c.validatedShare)} of billings on validated mappings, {confidence[c.segment]} confidence
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-sm border border-hairline bg-surface px-4 py-2">
        <label className="flex flex-col gap-0.5">
          <span className={LABEL}>Confidence</span>
          <select value={conf} onChange={(e) => setConf(e.target.value as Confidence | "all")} className={CONTROL}>
            <option value="all">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={LABEL}>Waits on</span>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className={CONTROL}>
            <option value="all">Anyone</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-0.5">
          <span className={LABEL}>Search</span>
          <input
            type="search"
            name="mapping-search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Category, code or PCC level…"
            className={CONTROL}
          />
        </label>
        {segment && <Chip>Segment: {segment}</Chip>}
        <button
          type="button"
          onClick={reset}
          disabled={!dirty}
          className="h-control px-2 font-body text-button text-ink underline-offset-2 hover:underline disabled:cursor-default disabled:text-ink-muted disabled:no-underline"
        >
          Reset
        </button>
      </div>

      <section aria-labelledby={`${ids}-map`} className="rounded-sm border border-hairline bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <div>
            <h2 id={`${ids}-map`} className="font-display text-card-title text-ink">
              Mappings
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              {rows.length} {rows.length === 1 ? "category" : "categories"}
              {segment ? ` in ${segment}` : ""}, {money(total)} of billings. Most billings at stake first. Select a row to open it
            </p>
          </div>
          <div role="group" aria-label="Show mappings that are" className="inline-flex border border-hairline">
            {VIEWS.map((v, i) => {
              const active = v.value === view;
              const n = filtered.filter((m) => inView(m, v.value)).length;
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
                    "h-control cursor-pointer px-3 font-body text-body-sm transition-colors",
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
        <div role="region" aria-label="Mappings" tabIndex={0} className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse font-body text-table">
            <caption className="sr-only">
              Code mappings: external category, source, Avnet codes, PCC level, billings, confidence, status and last change. Mock data.
            </caption>
            <thead className="bg-surface-sunken">
              <tr className="border-y border-hairline">
                <th scope="col" className={cn(TH, "text-left")}>
                  External category
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Source
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Avnet codes
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  PCC level
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Billings
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Confidence
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Status
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Last change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-body-sm text-ink-muted">
                    No mappings match these filters.{" "}
                    <button type="button" onClick={reset} className="text-ink underline underline-offset-2">
                      Reset the filters
                    </button>
                  </td>
                </tr>
              )}
              {rows.map((m) => {
                const expanded = open === m.id;
                const last = m.history.at(-1)?.daysAgo;
                return (
                  <Fragment key={m.id}>
                    <tr className={cn("border-b border-hairline", expanded ? "bg-surface-sunken" : "hover:bg-surface-sunken")}>
                      <th scope="row" className="px-3 py-1.5 text-left font-normal">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : m.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 text-left text-ink underline-offset-2 hover:underline"
                        >
                          <ChevronRight
                            className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", expanded && "rotate-90")}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          <span className={cn(expanded && "font-semibold")}>{path(m)}</span>
                          <span className="sr-only">{expanded ? ", hide details" : ", show details"}</span>
                        </button>
                      </th>
                      <td className="whitespace-nowrap px-3 py-1.5 text-ink-muted">{m.source}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink">
                        {m.codes.join(", ") || <span className="text-ink-muted">Not mapped</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-muted">{m.pcc ?? "n/a"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-ink">{m.billings ? money(m.billings) : "n/a"}</td>
                      <td className="px-3 py-1.5 text-ink">{m.confidence ?? <span className="text-ink-muted">n/a</span>}</td>
                      <td className="px-3 py-1.5">
                        <Chip>{STATUS_LABEL[m.status]}</Chip>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-ink-muted">
                        {last !== undefined ? ago(last) : "n/a"}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-hairline">
                        <td colSpan={8} className="p-0">
                          <Detail m={m} semi={semi.includes(m.segment)} />
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
    </div>
  );
}
