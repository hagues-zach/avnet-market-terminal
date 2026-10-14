import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { COHORT_LABELS, COMPANIES, ROLE_SINGULAR, roleOf } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { RevenueMix, RevenueMixFallback } from "@/components/earnings/revenue-mix";
import { ProfileComingNext, ProfileFallback, ProfileNews, ProfileSummary } from "@/components/network/company-profile";

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = COMPANIES.find((c) => c.slug === slug);
  if (!company) notFound();
  const role = roleOf(company);

  return (
    <div className="space-y-5 p-5">
      <Link href={role === "avnet" ? "/network" : `/network?role=${role}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft className="h-3 w-3" />
        Company Profiles
      </Link>
      <PageHeader title={company.name} subtitle={`${ROLE_SINGULAR[role]} · ${COHORT_LABELS[company.cohort]}`} />
      <Suspense fallback={<ProfileFallback title="At a glance" subtitle="Reading the company's filings from SEC EDGAR." />}>
        <ProfileSummary company={company} />
      </Suspense>
      <Suspense fallback={<RevenueMixFallback />}>
        <RevenueMix company={company.slug} />
      </Suspense>
      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<ProfileFallback title="In the news" subtitle="Searching the Market News feed." />}>
          <ProfileNews company={company} />
        </Suspense>
        <ProfileComingNext company={company} />
      </div>
    </div>
  );
}
