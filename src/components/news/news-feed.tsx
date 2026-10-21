"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import type { Angles } from "@/lib/ai/news-angles";
import { KIND_LABELS, type ArticleKind, type LiveArticle } from "@/lib/data/live/shared";
import { FACET_LABELS } from "@/lib/data/live/tagging";
import { DAY_GROUPS, dayGroup, profiledCompanies, type DayGroup } from "@/lib/news/briefing";
import { Chip } from "@/components/ui/chip";
import { FilterChip, FilterSelect } from "@/components/ui/filter-bar";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { Byline, CompanyLinks, entityRule, Headline, QbrAction, RelevanceChip } from "./story-parts";
import { cn } from "@/lib/utils";

export type FeedFacet = "segments" | "endMarkets" | "regions";
export const FEED_FACETS: FeedFacet[] = ["segments", "endMarkets", "regions"];
export type RelevanceFilter = "all" | "useful" | "high";

export interface Filters {
  query: string;
  kind: ArticleKind | "all";
  relevance: RelevanceFilter;
  facets: Record<FeedFacet, string[]>;
  watchOnly: boolean;
}

export const NO_FILTERS: Filters = {
  query: "",
  kind: "all",
  relevance: "all",
  facets: { segments: [], endMarkets: [], regions: [] },
  watchOnly: false,
};

const PAGE = 25;
const KINDS: ArticleKind[] = ["news", "filing", "regulatory"];
const RELEVANCE_LABEL: Record<RelevanceFilter, string> = {
  all: "All",
  useful: "High and useful",
  high: "High only",
};

function countBy(articles: LiveArticle[], facet: FeedFacet | "suppliers"): [string, number][] {
  const counts = new Map<string, number>();
  for (const a of articles) for (const v of a[facet]) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function matches(a: LiveArticle, f: Filters, angles: Angles | null, watchlist: string[]): boolean {
  if (f.kind !== "all" && a.kind !== f.kind) return false;
  if (f.relevance !== "all") {
    const r = angles?.byId[a.id]?.relevance;
    if (r !== "high" && !(f.relevance === "useful" && r === "medium")) return false;
  }
  for (const facet of FEED_FACETS) {
    const want = f.facets[facet];
    if (want.length && !want.some((v) => a[facet].includes(v))) return false;
  }
  if (f.watchOnly && !watchlist.some((s) => a.suppliers.includes(s))) return false;
  const q = f.query.trim().toLowerCase();
  return !q || `${a.title} ${a.summary} ${a.outlet}`.toLowerCase().includes(q);
}

/** The full feed: one filter bar, removable filter chips, stories grouped by day. */
export function AllNews({
  articles,
  fetchedAt,
  angles,
  filters,
  setFilters,
  watchlist,
  toggleWatch,
}: {
  articles: LiveArticle[];
  fetchedAt: string;
  angles: Angles | null;
  filters: Filters;
  setFilters: (update: (f: Filters) => Filters) => void;
  watchlist: string[];
  toggleWatch: (supplier: string) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  // A new filter starts the list from the top again.
  useEffect(() => setShown(PAGE), [filters]);

  const visible = useMemo(() => articles.filter((a) => matches(a, filters, angles, watchlist)), [articles, filters, angles, watchlist]);
  const groups = useMemo(() => {
    const by = new Map<DayGroup, LiveArticle[]>();
    for (const a of visible.slice(0, shown)) {
      const g = dayGroup(a.publishedAt, fetchedAt);
      by.set(g, [...(by.get(g) ?? []), a]);
    }
    return DAY_GROUPS.filter((g) => by.has(g)).map((g) => ({
      group: g,
      items: by.get(g)!,
    }));
  }, [visible, shown, fetchedAt]);

  const kindCounts = useMemo(() => {
    const c: Record<ArticleKind, number> = {
      news: 0,
      filing: 0,
      regulatory: 0,
    };
    for (const a of articles) c[a.kind] += 1;
    return c;
  }, [articles]);

  const toggleFacet = (facet: FeedFacet, value: string) =>
    setFilters((f) => ({
      ...f,
      facets: {
        ...f.facets,
        [facet]: f.facets[facet].includes(value) ? f.facets[facet].filter((v) => v !== value) : [...f.facets[facet], value],
      },
    }));

  const rated = angles !== null && Object.keys(angles.byId).length > 0;
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(filters.query.trim()
      ? [
          {
            key: "q",
            label: `Search: ${filters.query.trim()}`,
            remove: () => setFilters((f) => ({ ...f, query: "" })),
          },
        ]
      : []),
    ...(filters.relevance !== "all"
      ? [
          {
            key: "rel",
            label: `Relevance: ${RELEVANCE_LABEL[filters.relevance]}`,
            remove: () => setFilters((f) => ({ ...f, relevance: "all" as const })),
          },
        ]
      : []),
    ...FEED_FACETS.flatMap((facet) =>
      filters.facets[facet].map((v) => ({
        key: `${facet}-${v}`,
        label: `${FACET_LABELS[facet]}: ${v}`,
        remove: () => toggleFacet(facet, v),
      })),
    ),
    ...(filters.watchOnly
      ? [
          {
            key: "watch",
            label: "Watchlist only",
            remove: () => setFilters((f) => ({ ...f, watchOnly: false })),
          },
        ]
      : []),
  ];

  return (
    <Panel title="All news" subtitle={`${visible.length} of ${articles.length} stories from the last two weeks`} bodyClassName="space-y-3">
      <div role="group" aria-label="Filter the feed" className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[10rem] flex-1">
          <span className="sr-only">Search headlines</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            name="q"
            autoComplete="off"
            placeholder="Search headlines…"
            className="h-control w-full border border-hairline bg-surface-sunken pl-8 pr-2 text-body-sm text-ink placeholder:text-ink-muted"
          />
        </label>

        <div role="group" aria-label="Story type" className="inline-flex border border-hairline">
          {(["all", ...KINDS] as const).map((k, i) => {
            const active = filters.kind === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters((f) => ({ ...f, kind: k }))}
                className={cn(
                  "h-control cursor-pointer whitespace-nowrap px-2.5 text-body-sm transition-colors",
                  i > 0 && "border-l border-hairline",
                  active ? "bg-surface-sunken font-semibold text-ink" : "bg-surface text-ink-muted hover:text-ink",
                )}
              >
                {k === "all" ? "All" : KIND_LABELS[k]} <span className="tabular-nums">{k === "all" ? articles.length : kindCounts[k]}</span>
              </button>
            );
          })}
        </div>

        <span title={rated ? undefined : "No ratings from Claude yet"}>
          <FilterSelect
            label="Relevance"
            value={filters.relevance}
            onChange={(v) => setFilters((f) => ({ ...f, relevance: v as RelevanceFilter }))}
            disabled={!rated}
            options={(Object.keys(RELEVANCE_LABEL) as RelevanceFilter[]).map((value) => ({ value, label: RELEVANCE_LABEL[value] }))}
          />
        </span>

        <FiltersMenu articles={articles} filters={filters} toggleFacet={toggleFacet} watchlist={watchlist} toggleWatch={toggleWatch} />

        <button
          type="button"
          aria-pressed={filters.watchOnly}
          disabled={!watchlist.length}
          title={watchlist.length ? `Only stories naming ${watchlist.join(", ")}` : "Star suppliers under Filters to build a watchlist"}
          onClick={() => setFilters((f) => ({ ...f, watchOnly: !f.watchOnly }))}
          className={cn(
            "inline-flex h-control cursor-pointer items-center gap-1.5 border px-3 text-body-sm transition-colors disabled:cursor-not-allowed disabled:text-ink-muted",
            filters.watchOnly ? "border-ink bg-surface-sunken font-semibold text-ink" : "border-hairline bg-surface text-ink hover:bg-surface-sunken",
          )}
        >
          <Star className={cn("h-4 w-4", filters.watchOnly && "fill-ink")} strokeWidth={1.5} aria-hidden />
          Watchlist
          {watchlist.length > 0 && <span className="tabular-nums text-ink-muted">{watchlist.length}</span>}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={c.remove} />
          ))}
          <button
            type="button"
            onClick={() => setFilters(() => NO_FILTERS)}
            className="cursor-pointer text-caption text-ink underline underline-offset-2 hover:text-ink-muted"
          >
            Clear all
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={articles.length ? "No stories match these filters" : "No stories could be loaded from the open feeds right now"}
          action={
            articles.length ? (
              <button type="button" onClick={() => setFilters(() => NO_FILTERS)} className="text-body-sm text-ink underline underline-offset-2">
                Clear all filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map(({ group, items }) => (
            <section key={group} aria-label={group}>
              <h3 className="border-b border-hairline pb-1 font-display text-card-title text-ink-muted">{group}</h3>
              <ul className="divide-y divide-hairline">
                {items.map((a) => (
                  <FeedRow key={a.id} article={a} angles={angles} fetchedAt={fetchedAt} />
                ))}
              </ul>
            </section>
          ))}
          {visible.length > shown && (
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE)}
              className="h-control w-full cursor-pointer border border-hairline text-body-sm text-ink transition-colors hover:bg-surface-sunken"
            >
              Show {Math.min(PAGE, visible.length - shown)} more of {visible.length - shown}
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}

function FeedRow({ article: a, angles, fetchedAt }: { article: LiveArticle; angles: Angles | null; fetchedAt: string }) {
  const angle = angles?.byId[a.id];
  const companies = profiledCompanies(a);
  return (
    <li className="group py-3">
      <div className={entityRule(a)}>
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-body-sm font-medium">
            <Headline article={a} />
          </p>
          <Byline article={a} fetchedAt={fetchedAt} className="pt-px" />
        </div>
        {a.summary && <p className="mt-0.5 line-clamp-1 text-caption text-ink-muted">{a.summary}</p>}
        {angle && <p className="mt-1.5 border-l border-ink pl-2 text-caption text-ink">{angle.angle}</p>}
        {(angle || a.kind !== "news" || a.segments.length > 0 || companies.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <RelevanceChip angle={angle} />
            {a.kind !== "news" && <Chip>{a.kind === "filing" ? "Filing" : "Regulatory"}</Chip>}
            {a.segments[0] && <span className="text-caption text-ink-muted">{a.segments[0]}</span>}
            <CompanyLinks companies={companies} />
            {/* Shown on hover and keyboard focus; always on touch screens. */}
            <span className="ml-auto opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              <QbrAction article={a} companies={companies} />
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

/** Segment, end market and region filters, and the supplier watchlist, folded into one menu. */
function FiltersMenu({
  articles,
  filters,
  toggleFacet,
  watchlist,
  toggleWatch,
}: {
  articles: LiveArticle[];
  filters: Filters;
  toggleFacet: (facet: FeedFacet, value: string) => void;
  watchlist: string[];
  toggleWatch: (supplier: string) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const options = useMemo(
    () => ({
      segments: countBy(articles, "segments"),
      endMarkets: countBy(articles, "endMarkets"),
      regions: countBy(articles, "regions"),
    }),
    [articles],
  );
  // Watched suppliers stay listed on a day with no coverage.
  const suppliers = useMemo(() => {
    const listed = countBy(articles, "suppliers");
    const names = new Set(listed.map(([s]) => s));
    return [...listed, ...watchlist.filter((s) => !names.has(s)).map((s): [string, number] => [s, 0])];
  }, [articles, watchlist]);
  const active = FEED_FACETS.reduce((n, f) => n + filters.facets[f].length, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const close = (e: Event) => {
      if (!el.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className="inline-flex h-control cursor-pointer list-none items-center gap-1.5 border border-hairline bg-surface px-3 text-body-sm text-ink hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        Filters
        {active > 0 && <span className="tabular-nums text-ink-muted">{active}</span>}
      </summary>
      <div className="absolute right-0 z-20 mt-1 max-h-[70vh] w-[min(36rem,90vw)] overflow-y-auto overscroll-contain rounded-sm border border-hairline bg-surface p-4 shadow-overlay">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEED_FACETS.map((facet) => (
            <fieldset key={facet}>
              <legend className="mb-1 font-display text-card-title text-ink">{FACET_LABELS[facet]}</legend>
              <ul className="space-y-0.5">
                {options[facet].map(([value, count]) => (
                  <li key={value}>
                    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-body-sm text-ink">
                      <input
                        type="checkbox"
                        checked={filters.facets[facet].includes(value)}
                        onChange={() => toggleFacet(facet, value)}
                        className="h-3.5 w-3.5 accent-ink"
                      />
                      <span className="min-w-0 flex-1 truncate">{value}</span>
                      <span className="tabular-nums text-caption text-ink-muted">{count}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
        <fieldset className="mt-4 border-t border-hairline pt-3">
          <legend className="sr-only">Watchlist</legend>
          <p className="font-display text-card-title text-ink">Watchlist</p>
          <p className="mb-2 text-caption text-ink-muted">Star the suppliers you follow. Kept in this browser.</p>
          {suppliers.length === 0 ? (
            <p className="text-caption text-ink-muted">No suppliers named in the current feed.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {suppliers.map(([s, count]) => {
                const on = watchlist.includes(s);
                return (
                  <li key={s}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleWatch(s)}
                      className={cn(
                        "inline-flex h-6 cursor-pointer items-center gap-1 border px-2 text-micro transition-colors",
                        on ? "border-ink bg-surface-sunken text-ink" : "border-hairline text-ink hover:bg-surface-sunken",
                      )}
                    >
                      <Star className={cn("h-3 w-3", on && "fill-ink")} strokeWidth={1.5} aria-hidden />
                      {s}
                      <span className="tabular-nums text-ink-muted">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </div>
    </details>
  );
}
