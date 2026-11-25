import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getStoredAngle } from "@/lib/ai/news-angles";
import { getArticleBrief, getStoredArticle } from "@/lib/ai/news-brief";
import { getAuthorProfile } from "@/lib/news/authors";
import { getArticleWithText } from "@/lib/data/live/news";
import { articleSlug, type LiveArticle } from "@/lib/data/live/shared";
import { ago, profiledCompanies, RELEVANCE_WORD, stamp } from "@/lib/news/briefing";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { CompanyLinks, QbrAction } from "@/components/news/story-parts";
import { BriefSections, BriefSectionsFallback, Takeaway, TakeawayFallback } from "@/components/news/article/article-brief";
import { AuthorPanel, AuthorPanelFallback, MoreStoriesPanel, StoryPager, TopicsPanel } from "@/components/news/article/article-rail";

// One Market News story inside the terminal: our own brief of it (written once by
// Claude and stored), who wrote it, and where to go next. The outlet's page is a
// secondary link. The story comes from the live feed, or from the store once it
// has dropped out of the feed. The header renders at once; the brief and the
// author's details stream in.
export const dynamic = "force-dynamic";

const MORE_STORIES = 5;

async function load(slug: string) {
  const [{ article: live, news }, stored] = await Promise.all([getArticleWithText(slug), getStoredArticle(slug)]);
  const article: LiveArticle | undefined = live ?? stored?.article;
  return { article, news };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const stored = await getStoredArticle(slug);
  return { title: stored ? `${stored.article.title} | Market News` : "Market News" };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { article, news } = await load(slug);
  if (!article) notFound();

  const fetchedAt = news.fetchedAt;
  // Feed order is newest first; filings stay out of the reading path.
  const readable = news.articles.filter((a) => a.kind !== "filing");
  const at = readable.findIndex((a) => articleSlug(a) === slug);
  const newer = at > 0 ? readable[at - 1] : undefined;
  const older = at >= 0 ? readable[at + 1] : readable[0];
  const byAuthor = article.author
    ? readable.filter((a) => a.author === article.author && a.outlet === article.outlet && a.id !== article.id).slice(0, 3)
    : [];
  const more = readable.filter((a) => a.id !== article.id && a.id !== newer?.id && a.id !== older?.id).slice(0, MORE_STORIES);

  const brief = getArticleBrief(article);
  const angle = await getStoredAngle(article.id);
  const companies = profiledCompanies(article);
  const { body: _body, ...forBrowser } = article;

  return (
    <PageBody>
      <div className="grid gap-4 lg:grid-cols-12">
        <article className="min-w-0 space-y-6 rounded-sm border border-hairline bg-surface p-4 sm:p-6 lg:col-span-8">
          <div className="max-w-[68ch] space-y-4">
            <PageTitle title={article.title} breadcrumb={[{ label: "Market News", href: "/news" }, { label: article.outlet }]} />
            <Suspense fallback={<TakeawayFallback />}>
              <Takeaway brief={brief} />
            </Suspense>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3">
            <p className="text-body-sm text-ink">
              {article.author ? (
                <>
                  By <span className="font-semibold">{article.author}</span>, {article.outlet}
                </>
              ) : (
                <span className="font-semibold">{article.outlet}</span>
              )}
            </p>
            <p className="text-body-sm text-ink-muted">
              Published <time dateTime={article.publishedAt}>{stamp(article.publishedAt)}</time> ({ago(article.publishedAt, fetchedAt)})
            </p>
            {angle && <Chip>{RELEVANCE_WORD[angle.relevance]} relevance</Chip>}
            <ButtonLink href={article.url} external className="sm:ml-auto">
              Read on {article.outlet}
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </ButtonLink>
          </div>

          <Suspense fallback={<BriefSectionsFallback />}>
            <BriefSections brief={brief} article={forBrowser} />
          </Suspense>

          <StoryPager newer={newer} older={older} fetchedAt={fetchedAt} />
        </article>

        <aside className="min-w-0 space-y-4 lg:col-span-4">
          {article.author && (
            <Suspense fallback={<AuthorPanelFallback />}>
              <AuthorPanel name={article.author} outlet={article.outlet} profile={getAuthorProfile(article)} others={byAuthor} fetchedAt={fetchedAt} />
            </Suspense>
          )}
          {companies.length > 0 && (
            <Panel title="Companies mentioned" deck={null}>
              <CompanyLinks companies={companies} />
            </Panel>
          )}
          <TopicsPanel article={forBrowser} />
          <MoreStoriesPanel stories={more} fetchedAt={fetchedAt} />
          <QbrAction article={forBrowser} companies={companies} />
        </aside>
      </div>
    </PageBody>
  );
}
