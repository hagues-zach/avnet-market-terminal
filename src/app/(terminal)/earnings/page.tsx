import { getEarnings } from "@/lib/data/live/earnings";
import { COMPANIES, DEFAULT_COMPANY } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { EarningsDashboard } from "@/components/earnings/earnings-dashboard";

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const [{ company }, data] = await Promise.all([searchParams, getEarnings()]);
  const initial = COMPANIES.some((c) => c.slug === company) ? company! : DEFAULT_COMPANY;

  return (
    <div className="space-y-5 p-5">
      <PageHeader
        title="Quarterly Earnings"
        subtitle="One reporting framework across distributors, manufacturers and large semiconductor players, from SEC filings"
      />
      <EarningsDashboard data={data} initialCompany={initial} />
    </div>
  );
}
