import { Suspense } from "react";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { RoleTabs } from "@/components/start/role-tabs";
import { AvnetCard, CycleBanner, CycleBannerFallback, FeedCard, GrowthCard, NextSteps, PanelFallback, ReportingCard } from "@/components/start/sections";
import { roleOf } from "@/lib/start/roles";

// Live sections stream in behind their own loading states; the slow SEC data is cached for hours.
export const dynamic = "force-dynamic";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ role?: string | string[] }> }) {
  const params = await searchParams;
  const role = roleOf(params.role);

  return (
    <PageBody>
      <PageTitle title="Start Here" subtitle="How Avnet and the market stand this week, and where to go next" />
      <RoleTabs current={role.id} fromUrl={params.role !== undefined} />

      <Suspense fallback={<CycleBannerFallback />}>
        <CycleBanner />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          {/* Everyone sees the sidebar instead of a numbered list; each role gets its own next steps. */}
          {role.id !== "everyone" && <NextSteps role={role} />}
          <Suspense key={role.id} fallback={<PanelFallback title="What changed this week" lines={8} />}>
            <FeedCard role={role} />
          </Suspense>
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Suspense fallback={<PanelFallback title="Supply-chain revenue growth" />}>
            <GrowthCard />
          </Suspense>
          <AvnetCard />
          <Suspense fallback={<PanelFallback title="Reporting this week" lines={5} />}>
            <ReportingCard />
          </Suspense>
        </div>
      </div>
    </PageBody>
  );
}
