import { Suspense } from "react";
import { PRIMERS } from "@/lib/learn/content";
import { getLeads } from "@/lib/leads/data";
import { parseLeadStart, type LeadStart } from "@/lib/leads/rank";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { LoadingBlock } from "@/components/ui/states";
import { LeadFinder } from "@/components/leads/finder";

// Lead Finder: the app's customer companies whose market uses a technology,
// ranked on live signals (growth, news, inventory) with Avnet's business with
// each as mock. The URL carries the list (?primer=sic-mosfets, ?supplier=wolfspeed,
// &group=auto, &news=1). Private companies and enrichment arrive in step 3.6.

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const start = parseLeadStart(await searchParams);
  return (
    <PageBody>
      <PageTitle title="Lead Finder" subtitle="Customer companies that build with a technology, ranked on live signals" />
      <Suspense key={start.primer.slug} fallback={<LoadingBlock label={`Ranking customer companies for ${start.primer.name}…`} lines={8} />}>
        <Leads start={start} />
      </Suspense>
    </PageBody>
  );
}

/** The ranked list, loaded on the server; the first load after a restart can take a minute while SEC data loads. */
async function Leads({ start }: { start: LeadStart }) {
  const leads = await getLeads(start.primer);
  return <LeadFinder start={start} primers={PRIMERS.map((p) => ({ slug: p.slug, name: p.name }))} leads={leads} />;
}
