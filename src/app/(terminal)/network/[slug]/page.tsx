import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { COMPANIES, ROLE_SINGULAR, roleOf } from "@/lib/data/live/earnings-model";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { RevenueMix, RevenueMixFallback } from "@/components/earnings/revenue-mix";
import { earningsHref } from "@/components/earnings/format";
import {
  ProfileAvnetBusiness,
  ProfileChips,
  ProfileCommentary,
  ProfileDistribution,
  ProfileFallback,
  ProfileKeyFacts,
  ProfileNews,
  ProfileOverview,
} from "@/components/network/company-profile";

// A dossier: analysis in the main column, quick facts in the rail.
export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = COMPANIES.find((c) => c.slug === slug);
  if (!company) notFound();
  const role = roleOf(company);
  // Avnet does business with its suppliers and customers; not with itself or competitors.
  const business = role === "supplier" || role === "customer";

  return (
    <PageBody>
      <PageTitle
        title={company.name}
        subtitle="From SEC filings, the latest earnings release and the Market News feed"
        breadcrumb={[{ label: "Company Profiles", href: role === "avnet" ? "/network" : `/network?role=${role}` }, { label: company.name }]}
        actions={
          <>
            <ButtonLink href={earningsHref(company.slug, "all")}>Full earnings view</ButtonLink>
            {role !== "avnet" && (
              <ButtonLink href={`/tools/qbr?company=${company.slug}`} variant="primary">
                <BookOpenCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Add to QBR brief
              </ButtonLink>
            )}
          </>
        }
      >
        <Chip>{ROLE_SINGULAR[role]}</Chip>
        <Suspense fallback={<Chip>SEC filer</Chip>}>
          <ProfileChips company={company} />
        </Suspense>
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <Suspense fallback={<ProfileFallback title="Overview" />}>
            <ProfileOverview company={company} />
          </Suspense>
          <Suspense fallback={<ProfileFallback title="Management commentary" />}>
            <ProfileCommentary company={company} />
          </Suspense>
          <Suspense fallback={<RevenueMixFallback />}>
            <RevenueMix company={company.slug} />
          </Suspense>
        </div>
        <aside className="min-w-0 space-y-4 lg:col-span-4" aria-label={`${company.name} at a glance`}>
          <Suspense fallback={<ProfileFallback title="Key facts" />}>
            <ProfileKeyFacts company={company} />
          </Suspense>
          {business && <ProfileAvnetBusiness company={company} />}
          {role === "supplier" && (
            <Suspense fallback={<ProfileFallback title="Distribution" />}>
              <ProfileDistribution company={company} />
            </Suspense>
          )}
          <Suspense fallback={<ProfileFallback title="In the news" />}>
            <ProfileNews company={company} />
          </Suspense>
        </aside>
      </div>
    </PageBody>
  );
}
