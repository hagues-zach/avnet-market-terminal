"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Angle } from "@/lib/ai/news-angles";
import type { LiveArticle } from "@/lib/data/live/shared";
import type { Company } from "@/lib/data/live/earnings-model";
import { ago, entityOf, qbrHref, RELEVANCE_WORD, stamp } from "@/lib/news/briefing";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

/** Avnet Green rule for stories naming Avnet, Dark Blue for Arrow, nothing for everyone else. */
export function entityRule(article: LiveArticle): string {
  const e = entityOf(article);
  return e === "avnet" ? "border-l-2 border-l-viz-avnet pl-3" : e === "arrow" ? "border-l-2 border-l-viz-arrow pl-3" : "";
}

export function RelevanceChip({ angle }: { angle?: Angle }) {
  if (!angle) return null;
  return (
    <Chip>
      <span className="sr-only">Relevance: </span>
      {RELEVANCE_WORD[angle.relevance]}
    </Chip>
  );
}

/** The headline, linked to the source in a new tab. */
export function Headline({ article, className }: { article: LiveArticle; className?: string }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group inline text-ink underline-offset-2 hover:underline", className)}
    >
      {article.title}
      <ExternalLink className="ml-1 inline h-3 w-3 -translate-y-px text-ink-muted" strokeWidth={1.5} aria-hidden />
      <span className="sr-only"> (opens {article.outlet} in a new tab)</span>
    </a>
  );
}

/** Outlet and relative time, with the exact time on hover and for machines. */
export function Byline({ article, fetchedAt, className }: { article: LiveArticle; fetchedAt: string; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap text-caption text-ink-muted", className)}>
      {article.outlet},{" "}
      <time dateTime={article.publishedAt} title={stamp(article.publishedAt)}>
        {ago(article.publishedAt, fetchedAt)}
      </time>
    </span>
  );
}

/** Company names that have a profile, as links. */
export function CompanyLinks({ companies }: { companies: Company[] }) {
  if (!companies.length) return null;
  return (
    <span className="text-body-sm">
      {companies.map((c, i) => (
        <span key={c.slug}>
          {i > 0 && ", "}
          <Link href={`/network/${c.slug}`} className="text-ink underline underline-offset-2 hover:text-ink-muted">
            {c.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

const BTN =
  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border border-ink bg-surface px-2.5 font-body text-button text-ink transition-colors hover:bg-surface-sunken";

/**
 * "Add to QBR brief": straight to QBR Prep for one company, a small menu to pick
 * one when the story names several. Hidden when no company has a profile.
 */
export function QbrAction({ article, companies }: { article: LiveArticle; companies: Company[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  // Close the menu on a click outside it or on Escape.
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

  if (!companies.length) return null;
  if (companies.length === 1) {
    return (
      <Link href={qbrHref(companies[0], article)} className={BTN} aria-label={`Add to QBR brief for ${companies[0].name}`}>
        Add to QBR brief
      </Link>
    );
  }
  return (
    <details ref={ref} className="relative">
      <summary className={cn(BTN, "list-none [&::-webkit-details-marker]:hidden")}>
        Add to QBR brief
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      </summary>
      <ul className="absolute left-0 z-10 mt-1 min-w-[12rem] rounded-sm border border-hairline bg-surface py-1 shadow-overlay">
        {companies.map((c) => (
          <li key={c.slug}>
            <Link href={qbrHref(c, article)} className="block px-3 py-1.5 text-body-sm text-ink hover:bg-surface-sunken">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
