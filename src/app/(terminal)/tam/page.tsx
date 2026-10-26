import { Suspense } from "react";
import { getAvnet } from "@/lib/avnet";
import { dataProvider } from "@/lib/data/provider";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import {
  CategoryCard,
  EndMarketCard,
  ForecastCard,
  ForecastFallback,
  FunnelCard,
  MethodCard,
  RegionCard,
  TrendRow,
} from "@/components/tam/sections";

// TAM and its splits are published WSTS / SIA figures; SAM and SOM are mock
// until billings and the code map are hooked up (src/lib/hookups.ts). The
// forecast check reads live SEC filings.
export const dynamic = "force-dynamic";

export default async function TamPage() {
  const { value: t, vintage = "WSTS" } = dataProvider.getTam((await getAvnet()).semiBillings);

  return (
    <PageBody>
      <PageTitle title="TAM / SAM / SOM" subtitle="How big the market is, how much flows through distribution, and how much Avnet wins" />

      <FunnelCard t={t} vintage={vintage} />
      <TrendRow t={t} vintage={vintage} />

      <CategoryCard t={t} vintage={vintage} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        <Suspense fallback={<ForecastFallback />}>
          <ForecastCard t={t} />
        </Suspense>
        <RegionCard t={t} vintage={vintage} />
        <EndMarketCard t={t} />
      </div>

      <MethodCard vintage={vintage} />
    </PageBody>
  );
}
