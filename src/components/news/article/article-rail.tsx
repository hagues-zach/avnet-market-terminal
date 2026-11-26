import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AuthorProfile } from "@/lib/news/authors";
import { articleSlug, type LiveArticle } from "@/lib/data/live/shared";
import { ago } from "@/lib/news/briefing";
import { Panel } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { LoadingBlock } from "@/components/ui/states";

// The article page's rail and story navigation. Every story link stays inside
// the terminal; only the outlet's own author page links out. Story links never
// prefetch: rendering an article page writes its brief, a paid Claude call.

export const articleHref = (a: Pick<LiveArticle, "url">) => `/news/${articleSlug(a)}`;

function StoryLink({ article, fetchedAt }: { article: LiveArticle; fetchedAt: string }) {
  return (
    <li>
      <Link href={articleHref(article)} prefetch={false} className="text-body-sm text-ink underline-offset-2 hover:underline">
        {article.title}
      </Link>
      <p className="mt-0.5 text-caption text-ink-muted">
        {article.outlet}, {ago(article.publishedAt, fetchedAt)}
      </p>
    </li>
  );
}

export async function AuthorPanel({
  name,
  outlet,
  profile,
  others,
  fetchedAt,
}: {
  name: string;
  outlet: string;
  profile: Promise<AuthorProfile | null>;
  others: LiveArticle[];
  fetchedAt: string;
}) {
  const p = await profile;
  return (
    <Panel title="About the author" deck={null}>
      <p className="text-body font-semibold text-ink">{name}</p>
      <p className="text-caption text-ink-muted">{p?.title ? `${p.title}, ${outlet}` : outlet}</p>
      {p?.bio && <p className="mt-2 text-body-sm leading-relaxed text-ink">{p.bio}</p>}
      {p?.profileUrl && (
        <a
          href={p.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-caption text-ink underline underline-offset-2 hover:text-ink-muted"
        >
          Author page<span className="sr-only"> on {outlet} (opens in a new tab)</span>
        </a>
      )}
      {others.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <h3 className="text-caption text-ink-muted">More by {name} in the feed</h3>
          <ul className="mt-2 space-y-3">
            {others.map((a) => (
              <StoryLink key={a.id} article={a} fetchedAt={fetchedAt} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function AuthorPanelFallback() {
  return (
    <Panel title="About the author" deck={null}>
      <LoadingBlock label="Looking up the author…" lines={3} />
    </Panel>
  );
}

export function TopicsPanel({ article }: { article: LiveArticle }) {
  const topics = [...new Set([...article.segments, ...article.endMarkets, ...article.regions])];
  if (!topics.length) return null;
  return (
    <Panel title="Topics" deck={null}>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
    </Panel>
  );
}

export function MoreStoriesPanel({ stories, fetchedAt }: { stories: LiveArticle[]; fetchedAt: string }) {
  if (!stories.length) return null;
  return (
    <Panel
      title="More stories"
      deck={null}
    >
      <ul className="space-y-3">
        {stories.map((a) => (
          <StoryLink key={a.id} article={a} fetchedAt={fetchedAt} />
        ))}
      </ul>
    </Panel>
  );
}

/** Newer and older stories by publish time, so a reader can page through the feed. */
export function StoryPager({ newer, older, fetchedAt }: { newer?: LiveArticle; older?: LiveArticle; fetchedAt: string }) {
  if (!newer && !older) return null;
  const cell = "block rounded-sm border border-hairline bg-surface p-4 hover:bg-surface-sunken";
  return (
    <nav aria-label="More stories" className="grid gap-4 sm:grid-cols-2">
      {newer ? (
        <Link href={articleHref(newer)} prefetch={false} className={cell}>
          <span className="flex items-center gap-1 text-caption text-ink-muted">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden /> Newer story
          </span>
          <span className="mt-1 line-clamp-2 block text-body-sm text-ink">{newer.title}</span>
          <span className="mt-1 block text-caption text-ink-muted">
            {newer.outlet}, {ago(newer.publishedAt, fetchedAt)}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {older && (
        <Link href={articleHref(older)} prefetch={false} className={`${cell} sm:text-right`}>
          <span className="flex items-center gap-1 text-caption text-ink-muted sm:justify-end">
            Older story <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="mt-1 line-clamp-2 block text-body-sm text-ink">{older.title}</span>
          <span className="mt-1 block text-caption text-ink-muted">
            {older.outlet}, {ago(older.publishedAt, fetchedAt)}
          </span>
        </Link>
      )}
    </nav>
  );
}
