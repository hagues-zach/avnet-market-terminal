import { Suspense } from "react";
import Link from "next/link";
import { getAvnet } from "@/lib/avnet";
import { dataProvider } from "@/lib/data/provider";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { LoadingBlock } from "@/components/ui/states";
import { ForecastCard, Lead, MarketYears, RegionsCard, SupplyFigure, WhatCarried } from "@/components/overview/sections";

// Market Overview: the chip market's size, direction and what drives it. WSTS
// figures as published (with their vintage), live reads from SEC filings, and
// the split of the devices AI spending lands on as mock until WSTS detail and
// the Gartner forecast are hooked up. This quarter's filings, the economic
// backdrop and the news are on the Market hub's other tabs and on News.

export const dynamic = "force-dynamic";

const link = "text-ink underline underline-offset-2 hover:text-ink-muted";

export default async function OverviewPage() {
  const { value: tam, vintage = "WSTS" } = dataProvider.getTam((await getAvnet()).semiBillings);
  const marketPrior = tam.trend.find((p) => p.year === tam.latestYear - 1)?.tamUsdM ?? tam.tamUsdM / (1 + tam.yoyGrowth);
  const vintages = dataProvider.getForecast().value.vintages.map((v) => ({ vintage: v.vintage, value: v.proj2026 }));

  return (
    <PageBody>
      <PageTitle title="Market Overview" subtitle="The chip market's size, direction and what is driving it, from WSTS and the latest filings" />
      <Suspense fallback={<LoadingBlock label="Reading the latest filings…" lines={2} />}>
        <Lead tam={tam} marketPrior={marketPrior} />
      </Suspense>

      <MarketYears
        tam={tam}
        vintage={vintage}
        supply={
          <Suspense fallback={<LoadingBlock label="Loading supply-chain revenue…" lines={2} />}>
            <SupplyFigure />
          </Suspense>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <div className="xl:col-span-7">
          <WhatCarried tam={tam} marketPrior={marketPrior} vintage={vintage} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <ForecastCard vintages={vintages} year={tam.latestYear + 1} />
          <RegionsCard tam={tam} vintage={vintage} />
        </div>
      </div>

      <p className="text-body-sm text-ink-muted">
        This quarter&apos;s filings are on{" "}
        <Link href="/cycle" className={link}>
          Market Cycle
        </Link>
        , the economy on{" "}
        <Link href="/signals" className={link}>
          Economic Signals
        </Link>{" "}
        and the stories on{" "}
        <Link href="/news" className={link}>
          Market News
        </Link>
        . Avnet&apos;s part of this market is on{" "}
        <Link href="/tam" className={link}>
          TAM, SAM and SOM
        </Link>{" "}
        and{" "}
        <Link href="/market-share" className={link}>
          Market Share
        </Link>
        ; its own business is on{" "}
        <Link href="/performance" className={link}>
          Performance Tracker
        </Link>
        .
      </p>
    </PageBody>
  );
}
