"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Angles } from "@/lib/ai/news-angles";
import type { LiveNews } from "@/lib/data/live/shared";
import { stamp, summarize, topics, topStories, type ExposureBillings, type TopicFacet } from "@/lib/news/briefing";
import { TopStories } from "./top-stories";
import { Topics } from "./topics";
import { AllNews, NO_FILTERS, type Filters } from "./news-feed";

const WATCHLIST_KEY = "terminal.news.supplierWatchlist";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Market News, variant A ("briefing"): the summary line, top stories beside
 * topics this week, then the full feed. The feed renders at once; Claude's
 * angles stream in behind it and fill the top stories and ratings.
 */
export function NewsPage({ data, anglesPromise, avnet }: { data: LiveNews; anglesPromise: Promise<Angles>; avnet: ExposureBillings }) {
  const { articles, sources, fetchedAt } = data;
  const [angles, setAngles] = useState<Angles | null>(null);
  const [filters, setFiltersState] = useState<Filters>(NO_FILTERS);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    anglesPromise.then(
      (a) => current && setAngles(a),
      () =>
        current &&
        setAngles({
          byId: {},
          status: "partial",
          message: "The analysis could not be loaded.",
        }),
    );
    return () => {
      current = false;
    };
  }, [anglesPromise]);

  // The watchlist survives reloads in this browser (it moves to the user's profile with accounts).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
      if (Array.isArray(saved)) setWatchlist(saved.filter((v): v is string => typeof v === "string"));
    } catch {
      // unreadable storage: start with an empty watchlist
    }
    setWatchlistLoaded(true);
  }, []);

  useEffect(() => {
    if (!watchlistLoaded) return;
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // storage unavailable: the watchlist lasts for this visit only
    }
  }, [watchlist, watchlistLoaded]);

  const setFilters = useCallback((update: (f: Filters) => Filters) => setFiltersState(update), []);
  const toggleWatch = useCallback((s: string) => setWatchlist((w) => (w.includes(s) ? w.filter((v) => v !== s) : [...w, s])), []);

  const summary = useMemo(() => summarize(articles, fetchedAt, angles?.byId ?? null), [articles, fetchedAt, angles]);
  const top = useMemo(() => (angles ? topStories(articles, fetchedAt, angles.byId) : null), [articles, fetchedAt, angles]);
  const byFacet = useMemo(
    () => ({
      segments: topics(articles, fetchedAt, "segments"),
      endMarkets: topics(articles, fetchedAt, "endMarkets"),
    }),
    [articles, fetchedAt],
  );

  // Selecting a topic filters the feed and brings it into view.
  const selectTopic = (facet: TopicFacet, name: string) => {
    const adding = !filters.facets[facet].includes(name);
    setFilters((f) => ({
      ...f,
      facets: {
        ...f.facets,
        [facet]: adding ? [...f.facets[facet], name] : f.facets[facet].filter((v) => v !== name),
      },
    }));
    if (adding)
      feedRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
  };

  const down = sources.filter((s) => !s.ok);

  return (
    <>
      <p className="text-body text-ink-muted" aria-live="polite">
        <span className="font-semibold text-ink">{plural(summary.stories, "story", "stories")}</span> in the last 24 hours.{" "}
        {summary.high !== null && angles?.status !== "off" && (
          <>
            <span className="font-semibold text-ink">{summary.high} high relevance</span>.{" "}
          </>
        )}
        <span className="font-semibold text-ink">{plural(summary.filings, "new filing")}</span>.{" "}
        <span className="font-semibold text-ink">{plural(summary.regulatory, "regulatory notice")}</span>.
      </p>

      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <TopStories top={top} angles={angles} fetchedAt={fetchedAt} />
        <Topics byFacet={byFacet} avnet={avnet} selected={filters.facets} onSelect={selectTopic} />
      </div>

      <div ref={feedRef} className="scroll-mt-16">
        <AllNews
          articles={articles}
          fetchedAt={fetchedAt}
          angles={angles}
          filters={filters}
          setFilters={setFilters}
          watchlist={watchlist}
          toggleWatch={toggleWatch}
        />
      </div>

      <p className="text-caption text-ink-muted">
        Headlines and snippets from trade-press RSS feeds and the GDELT open news index, with SEC EDGAR filings and Federal Register notices. Each
        story links to its source. Tags are rule-based. &ldquo;Why it matters&rdquo; and the relevance rating are written by Claude from the headline
        and snippet only, and can be wrong. Refreshed <time dateTime={fetchedAt}>{stamp(fetchedAt)}</time>, about every 15
        minutes.
        {angles?.status === "off" && " Claude is off, so stories show without ratings."}
        {angles?.status === "partial" && (
          <span title={angles.message}>
            {" "}
            Claude could not rate the newest stories this time, so they show without ratings until the next refresh.
          </span>
        )}
        {down.length > 0 && ` Not responding: ${down.map((s) => s.outlet).join(", ")}.`} Coming later: stories ranked for your role and accounts, and
        Gartner analyst articles.
      </p>
    </>
  );
}
