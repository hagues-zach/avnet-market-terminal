import { getNewsAngles } from "@/lib/ai/news-angles";
import { getLiveNews } from "@/lib/data/live/news";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { DataChip } from "@/components/ui/chip";
import { NewsPage } from "@/components/news/news-page";

// Rendered per request. The feeds themselves are held for 15 minutes in the fetch
// cache (REVALIDATE_SECONDS in the news adapter), so this doesn't refetch them.
export const dynamic = "force-dynamic";

export default async function MarketNewsPage() {
  const data = await getLiveNews();
  const live = data.sources.filter((s) => s.ok).length;

  return (
    <PageBody>
      <PageTitle
        title="Market News"
        subtitle="What matters to Avnet in semiconductor and components news today"
        actions={
          <DataChip
            status="live"
            label={`${live} of ${data.sources.length} sources`}
            title={`Responding: ${data.sources
              .filter((s) => s.ok)
              .map((s) => s.outlet)
              .join(", ")}`}
          />
        }
      />
      {/* Not awaited: the feed shows straight away and Claude's angles stream in behind it. */}
      <NewsPage data={data} anglesPromise={getNewsAngles(data.articles)} />
    </PageBody>
  );
}
