import { Suspense } from "react";
import Link from "next/link";
import { dataProvider } from "@/lib/data/provider";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { LoadingBlock } from "@/components/ui/states";
import { Panel } from "@/components/ui/panel";
import {
  Backdrop,
  ForecastCard,
  Lead,
  MarketYears,
  RegionsCard,
  Stories,
  SupplyFigure,
  ThisQuarter,
  WhatCarried,
} from "@/components/overview/sections";

// Market Overview: the chip market's size, direction and what drives it. WSTS
// figures as published (with their vintage), live reads from SEC filings,
// economic signals and the news feed, and the split of the devices AI spending
// lands on as mock until WSTS detail and the Gartner forecast are hooked up.

export const dynamic = "force-dynamic";

const link = "text-ink underline underline-offset-2 hover:text-ink-muted";

function Loading({ title, lines = 5, className }: { title: string; lines?: number; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={lines} />
    </Panel>
  );
}

export default function OverviewPage() {
  const { value: tam, vintage = "WSTS" } = dataProvider.getTam();
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WhatCarried tam={tam} marketPrior={marketPrior} vintage={vintage} />
        <Suspense fallback={<Loading title="This quarter in the filings" lines={7} className="xl:col-span-5" />}>
          <ThisQuarter />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ForecastCard vintages={vintages} year={tam.latestYear + 1} />
        <RegionsCard tam={tam} vintage={vintage} />
        <Suspense fallback={<Loading title="The backdrop" />}>
          <Backdrop />
        </Suspense>
      </div>

      <Suspense fallback={<Loading title="What is being said" lines={4} />}>
        <Stories />
      </Suspense>

      <p className="text-body-sm text-ink-muted">
        Avnet&apos;s part of this market is on{" "}
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
