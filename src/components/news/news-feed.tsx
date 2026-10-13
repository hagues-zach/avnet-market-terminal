"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, Star, X } from "lucide-react";
import { KIND_LABELS, type ArticleKind, type LiveArticle, type LiveNews } from "@/lib/data/live/shared";
import { FACET_LABELS, type Facet } from "@/lib/data/live/tagging";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FACETS: Facet[] = ["segments", "endMarkets", "regions"];
const KINDS: ArticleKind[] = ["news", "filing", "regulatory"];
const WATCHLIST_KEY = "terminal.news.supplierWatchlist";
const EMPTY: Record<Facet, string[]> = { segments: [], suppliers: [], endMarkets: [], regions: [] };

function countBy(articles: LiveArticle[], facet: Facet): [string, number][] {
  const counts = new Map<string, number>();
  for (const a of articles) for (const v of a[facet]) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Relative to the server fetch time (not the browser clock) so SSR and hydration agree.
function ago(publishedAt: string, fetchedAt: string): string {
  const mins = Math.max(0, Math.round((Date.parse(fetchedAt) - Date.parse(publishedAt)) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

function Chip({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40",
        active ? "bg-ink text-white" : "text-muted hover:bg-canvas",
      )}
    >
      {icon}
      {label}
      {count !== undefined && <span className={cn("tabular-nums", active ? "text-white/70" : "text-gray-medium")}>{count}</span>}
    </button>
  );
}

export function NewsFeed({ data }: { data: LiveNews }) {
  const { articles, sources, fetchedAt } = data;
  const [selected, setSelected] = useState<Record<Facet, string[]>>(EMPTY);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ArticleKind | "all">("all");
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);

  // The supplier selection doubles as a watchlist and survives reloads.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
      if (Array.isArray(saved) && saved.length) {
        setSelected((s) => ({ ...s, suppliers: saved.filter((v): v is string => typeof v === "string") }));
      }
    } catch {
      // unreadable storage — start with an empty watchlist
    }
    setWatchlistLoaded(true);
  }, []);

  useEffect(() => {
    if (!watchlistLoaded) return;
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(selected.suppliers));
    } catch {
      // storage unavailable — watchlist lasts for this visit only
    }
  }, [selected.suppliers, watchlistLoaded]);

  const toggle = (facet: Facet, value: string) =>
    setSelected((s) => ({
      ...s,
      [facet]: s[facet].includes(value) ? s[facet].filter((v) => v !== value) : [...s[facet], value],
    }));

  const options = useMemo(
    () => ({
      segments: countBy(articles, "segments"),
      endMarkets: countBy(articles, "endMarkets"),
      regions: countBy(articles, "regions"),
      suppliers: countBy(articles, "suppliers"),
    }),
    [articles],
  );

  // Watched suppliers stay visible even on a day with no coverage.
  const supplierOptions = useMemo(() => {
    const listed = new Set(options.suppliers.map(([name]) => name));
    const quiet = selected.suppliers.filter((s) => !listed.has(s)).map((s): [string, number] => [s, 0]);
    return [...options.suppliers, ...quiet];
  }, [options.suppliers, selected.suppliers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false;
      for (const facet of Object.keys(selected) as Facet[]) {
        const want = selected[facet];
        if (want.length && !want.some((v) => a[facet].includes(v))) return false;
      }
      return !q || `${a.title} ${a.summary} ${a.outlet}`.toLowerCase().includes(q);
    });
  }, [articles, selected, query, kind]);

  const activeCount = Object.values(selected).reduce((n, v) => n + v.length, 0) + (query.trim() ? 1 : 0);
  const kindCounts = useMemo(() => {
    const c: Record<ArticleKind, number> = { news: 0, filing: 0, regulatory: 0 };
    for (const a of articles) c[a.kind] += 1;
    return c;
  }, [articles]);
  const live = sources.filter((s) => s.ok);
  const down = sources.filter((s) => !s.ok);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Lane">
        <Chip label="All" count={articles.length} active={kind === "all"} onClick={() => setKind("all")} />
        {KINDS.map((k) => (
          <Chip key={k} label={KIND_LABELS[k]} count={kindCounts[k]} active={kind === k} onClick={() => setKind(k)} />
        ))}
      </div>

      <Card bodyClassName="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search headlines</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-medium" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines"
              className="w-full rounded border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-gray-medium focus:border-avnet-green focus:outline-none focus:ring-2 focus:ring-avnet-green/30"
            />
          </label>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected(EMPTY);
                setQuery("");
              }}
              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1.5 font-display text-2xs uppercase tracking-wider text-muted transition-colors duration-200 hover:bg-canvas cursor-pointer"
            >
              <X className="h-3 w-3" />
              Clear {activeCount}
            </button>
          )}
        </div>

        {FACETS.map((facet) => (
          <div key={facet} className="flex items-start gap-2">
            <p className="w-20 shrink-0 pt-1 font-display text-2xs uppercase tracking-widest text-muted">{FACET_LABELS[facet]}</p>
            <div className="flex flex-wrap gap-1">
              {options[facet].map(([value, count]) => (
                <Chip key={value} label={value} count={count} active={selected[facet].includes(value)} onClick={() => toggle(facet, value)} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-start gap-2 border-t border-line pt-3">
          <p className="w-20 shrink-0 pt-1 font-display text-2xs uppercase tracking-widest text-muted">Watchlist</p>
          <div className="flex flex-wrap gap-1">
            {supplierOptions.length === 0 && <p className="pt-1 text-2xs text-muted">No suppliers named in the current feed.</p>}
            {supplierOptions.map(([value, count]) => {
              const active = selected.suppliers.includes(value);
              return (
                <Chip
                  key={value}
                  label={value}
                  count={count}
                  active={active}
                  onClick={() => toggle("suppliers", value)}
                  icon={<Star className={cn("h-3 w-3", active && "fill-accent-yellow text-accent-yellow")} />}
                />
              );
            })}
          </div>
        </div>
      </Card>

      <Card
        title="Latest"
        subtitle={`${visible.length} of ${articles.length} stories`}
        actions={
          <span
            className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-muted"
            title={`Open feeds: ${live.map((s) => s.outlet).join(", ")}`}
          >
            <span className="h-1 w-1 rounded-full bg-avnet-green" />
            Live · {live.length}/{sources.length} sources
          </span>
        }
      >
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {articles.length === 0 ? "No stories could be loaded from the open feeds right now." : "No stories match these filters."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((a) => (
              <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-1.5 text-sm font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                >
                  <span>{a.title}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-gray-medium group-hover:text-avnet-greenDark" />
                </a>
                {a.summary && <p className="mt-0.5 text-xs text-muted">{a.summary}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {a.kind !== "news" && (
                    <span className="rounded bg-canvas px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider text-ink">
                      {a.kind === "filing" ? "Filing" : "Regulatory"}
                    </span>
                  )}
                  <span className="text-2xs text-gray-medium">
                    {a.outlet} · <time dateTime={a.publishedAt}>{ago(a.publishedAt, fetchedAt)}</time>
                  </span>
                  {[...a.suppliers, ...a.segments, ...a.endMarkets, ...a.regions].map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider",
                        i < a.suppliers.length ? "border-ink/30 text-ink" : "border-line text-muted",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="px-1 text-2xs text-muted">
        Headlines and snippets from public RSS feeds and the GDELT open news index, filings from SEC EDGAR and notices from
        the Federal Register; each item links to its source. Tags are rule-based. Refreshed <time dateTime={fetchedAt}>{fetchedAt.slice(0, 16).replace("T", " ")} UTC</time>, about every 15 minutes.
        {down.length > 0 && ` Not responding: ${down.map((s) => s.outlet).join(", ")}.`}
      </p>
    </>
  );
}
