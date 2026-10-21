import { getNewsAngles } from "@/lib/ai/news-angles";
import { getLiveNews } from "@/lib/data/live/news";
import { PageHeader } from "@/components/ui/page-header";
import { NewsFeed } from "@/components/news/news-feed";

// Matches REVALIDATE_SECONDS in the news adapter (route config must be a literal).
export const revalidate = 900;

export default async function NewsPage() {
  const data = await getLiveNews();

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title="Market News" subtitle="Live, source-linked coverage of the semiconductor market from open feeds" />
      {/* Not awaited: the feed shows straight away and the angles stream in behind it. */}
      <NewsFeed data={data} anglesPromise={getNewsAngles(data.articles)} />
    </div>
  );
}
