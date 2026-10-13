import { getLiveNews } from "@/lib/data/live/news";
import { PageHeader } from "@/components/ui/page-header";
import { NewsFeed } from "@/components/news/news-feed";

// Matches REVALIDATE_SECONDS in the news adapter (route config must be a literal).
export const revalidate = 900;

export default async function NewsPage() {
  const data = await getLiveNews();

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Market News" subtitle="Live, source-linked coverage of the semiconductor market from open feeds" />
      <NewsFeed data={data} />
    </div>
  );
}
