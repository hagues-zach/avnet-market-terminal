"use client";

import type { Angles } from "@/lib/ai/news-angles";
import type { LiveArticle } from "@/lib/data/live/shared";
import { profiledCompanies, TOP_WINDOW_HOURS, type TopStories as Top } from "@/lib/news/briefing";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { Byline, CompanyLinks, entityRule, Headline, QbrAction, RelevanceChip } from "./story-parts";
import { cn } from "@/lib/utils";

/**
 * The page's answer: the high-relevance stories of the last two days. One lead
 * story with its angle in large type, the rest as a hairline list. The angle is
 * the main text; the headline is the link to the source.
 */
export function TopStories({ top, angles, fetchedAt }: { top: Top | null; angles: Angles | null; fetchedAt: string }) {
  const subtitle =
    top?.basis === "rated"
      ? `Rated high relevance by Claude, last ${TOP_WINDOW_HOURS} hours`
      : top
        ? angles?.status === "off"
          ? "Claude is off, so these are the latest stories, unrated"
          : `Nothing rated high relevance in the last ${TOP_WINDOW_HOURS} hours. The latest stories instead`
        : undefined;

  return (
    <Panel title="Top stories for Avnet" subtitle={subtitle} className="xl:col-span-8" bodyClassName="pt-3">
      {top === null ? (
        <LoadingBlock label="Claude is reading the stories…" lines={6} />
      ) : top.stories.length === 0 ? (
        <EmptyState title="No stories in the last two days" body="The open feeds returned nothing recent. The full feed below goes back two weeks." />
      ) : (
        <ol className="divide-y divide-hairline">
          {top.stories.map((a, i) => (
            <Story key={a.id} article={a} lead={i === 0} angle={angles?.byId[a.id]} fetchedAt={fetchedAt} />
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Story({ article, lead, angle, fetchedAt }: { article: LiveArticle; lead: boolean; angle?: Angles["byId"][string]; fetchedAt: string }) {
  const companies = profiledCompanies(article);
  return (
    <li className={cn("py-3 first:pt-0 last:pb-0", lead && "pb-4")}>
      <div className={entityRule(article)}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <RelevanceChip angle={angle} />
          {article.kind === "regulatory" && <Chip>Regulatory</Chip>}
          <CompanyLinks companies={companies} />
          <Byline article={article} fetchedAt={fetchedAt} className="ml-auto" />
        </div>
        {angle ? (
          <>
            <p className={cn("mt-1.5 text-ink", lead ? "text-lg leading-snug" : "text-body")}>{angle.angle}</p>
            <p className={cn("mt-1", lead ? "text-body" : "text-body-sm")}>
              <Headline article={article} className="text-ink-muted hover:text-ink" />
            </p>
          </>
        ) : (
          <p className={cn("mt-1.5", lead ? "text-lg leading-snug" : "text-body")}>
            <Headline article={article} />
          </p>
        )}
        {companies.length > 0 && (
          <div className="mt-2.5">
            <QbrAction article={article} companies={companies} />
          </div>
        )}
      </div>
    </li>
  );
}
