import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { COMPANIES, ROLE_SINGULAR, roleOf, sourceOf } from "@/lib/data/live/earnings-model";
import { PRIVATE_COMPANIES, type PrivateCompany } from "@/lib/data/live/private-companies";
import { isHidden } from "@/lib/visibility";
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
import { PrivateKeyFacts, PrivateLineCard, PrivateOverview } from "@/components/network/private-profile";

// A dossier: analysis in the main column, quick facts in the rail.
export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = COMPANIES.find((c) => c.slug === slug);
  if (!company) {
    const unlisted = PRIVATE_COMPANIES.find((c) => c.slug === slug);
    if (!unlisted) notFound();
    return <PrivateProfile company={unlisted} />;
  }
  const role = roleOf(company);
  // Avnet does business with its suppliers and customers; not with itself or competitors.
  const business = role === "supplier" || role === "customer";
  const owns = PRIVATE_COMPANIES.filter((c) => c.ownerSlug === company.slug);

  return (
    <PageBody>
      <PageTitle
        title={company.name}
        subtitle={
          company.foreign && company.foreign.source !== "sec-20f"
            ? `From ${sourceOf(company).short} and the Market News feed, converted to US dollars`
            : "From SEC filings, the latest earnings release and the Market News feed"
        }
        breadcrumb={[{ label: "Companies", href: role === "avnet" ? "/network" : `/network?role=${role}` }, { label: company.name }]}
        actions={
          <>
            <ButtonLink href={earningsHref(company.slug, "all")}>Full earnings view</ButtonLink>
            {role !== "avnet" && <ButtonLink href={`/tools/deck?company=${company.slug}&from=profile`}>Build a pitch</ButtonLink>}
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
      {owns.length > 0 && <OwnsNote owner={company.name} owned={owns} />}

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
          {role === "supplier" && !isHidden("/line-cards") && (
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

/** Which unlisted companies this one owns: their results are inside its own. */
function OwnsNote({ owner, owned }: { owner: string; owned: PrivateCompany[] }) {
  return (
    <p className="text-body-sm text-ink-muted">
      {owner} owns{" "}
      {owned.map((c, i) => (
        <span key={c.slug}>
          {i > 0 && (i === owned.length - 1 ? " and " : ", ")}
          <Link href={`/network/${c.slug}`} className="text-ink underline underline-offset-2 hover:text-ink-muted">
            {c.name}
          </Link>
        </span>
      ))}
      , so {owned.length > 1 ? "their" : "its"} results are included in the figures below.
    </p>
  );
}

/** A competitor with no filings: overview, ownership, line card and news, without the earnings sections. */
function PrivateProfile({ company }: { company: PrivateCompany }) {
  const owns = PRIVATE_COMPANIES.filter((c) => c.ownerSlug === company.slug);
  return (
    <PageBody>
      <PageTitle
        title={company.name}
        subtitle={`Private: from published rankings${isHidden("/line-cards") ? "" : ", the line-card tracker"} and the Market News feed`}
        breadcrumb={[{ label: "Companies", href: "/network?role=competitor" }, { label: company.name }]}
      >
        <Chip>Competitor</Chip>
        <Chip>Private, no filings</Chip>
      </PageTitle>
      {owns.length > 0 && <OwnsNote owner={company.name} owned={owns} />}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <PrivateOverview company={company} />
          <Suspense fallback={<ProfileFallback title="In the news" />}>
            <ProfileNews company={{ slug: company.slug, name: company.name, cohort: "distributor" }} />
          </Suspense>
        </div>
        <aside className="min-w-0 space-y-4 lg:col-span-4" aria-label={`${company.name} at a glance`}>
          <PrivateKeyFacts company={company} />
          <Suspense fallback={<ProfileFallback title="Line card" />}>
            <PrivateLineCard company={company} />
          </Suspense>
        </aside>
      </div>
    </PageBody>
  );
}
