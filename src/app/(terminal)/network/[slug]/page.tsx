import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { COHORTS, COMPANIES, ROLE_SINGULAR, isUsFiler, roleOf, sourceOf, type Cohort } from "@/lib/data/live/earnings-model";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { CompanyResults, QuarterlyDetail, TrendPanel } from "@/components/earnings/company-view";
import { PeerSection } from "@/components/earnings/peer-section";
import { SectionNav } from "@/components/network/section-nav";
import { Skeleton } from "@/components/ui/states";
import { PRIVATE_COMPANIES, type PrivateCompany } from "@/lib/data/live/private-companies";
import { isHidden } from "@/lib/visibility";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { AddViewToDeck } from "@/components/deck/add-view-to-deck";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { RevenueMix, RevenueMixFallback } from "@/components/earnings/revenue-mix";
import {
  ProfileAvnetBusiness,
  ProfileChips,
  ProfileCommentary,
  ProfileDistribution,
  ProfileFallback,
  ProfileInBrief,
  ProfileKeyFacts,
  ProfileNews,
  ProfileOverview,
} from "@/components/network/company-profile";
import { PrivateKeyFacts, PrivateLineCard, PrivateOverview } from "@/components/network/private-profile";

import { peerSeries } from "@/lib/explain/financials-data";

/** Server components: the earnings sections, each loading the company's filings (cached, shared). */
async function Results({ slug }: { slug: string }) {
  const earnings = await getCompanyEarnings(slug);
  return <CompanyResults earnings={earnings} peers={await peerSeries(earnings.company)} />;
}
async function Trend({ slug }: { slug: string }) {
  const earnings = await getCompanyEarnings(slug);
  return earnings.quarters.length ? <TrendPanel earnings={earnings} /> : null;
}
async function Financials({ slug }: { slug: string }) {
  return <QuarterlyDetail earnings={await getCompanyEarnings(slug)} open />;
}

function ResultsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "peers", label: "Peers" },
  { id: "commentary", label: "Management commentary" },
  { id: "news", label: "News" },
];
/** Room for the sticky section bar when a section link scrolls to it (measured: the bar's bottom sits 36px below <main>'s scroll edge). */
const SECTION = "scroll-mt-12 space-y-4";

// A dossier: analysis in the main column, quick facts in the rail. US filers get
// the full earnings view in sections (overview, financials, peers, commentary,
// news) under a sticky section bar; other companies keep the simpler page.
export default async function CompanyProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { slug } = await params;
  const { group: groupParam } = await searchParams;
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
  const us = isUsFiler(company);
  // The peer table's group: the URL's, or the company's own. "all" shows every company.
  const group: Cohort | "all" = groupParam === "all" ? "all" : COHORTS.includes(groupParam as Cohort) ? (groupParam as Cohort) : company.cohort;

  const rail = (
    <>
      <Suspense fallback={<ProfileFallback title="Key facts" />}>
        <ProfileKeyFacts company={company} />
      </Suspense>
      {business && <ProfileAvnetBusiness company={company} />}
      {role === "supplier" && !isHidden("/line-cards") && (
        <Suspense fallback={<ProfileFallback title="Distribution" />}>
          <ProfileDistribution company={company} />
        </Suspense>
      )}
    </>
  );
  const news = (
    <Suspense fallback={<ProfileFallback title="In the news" />}>
      <ProfileNews company={company} />
    </Suspense>
  );
  const commentary = (
    <>
      <Suspense fallback={<ProfileFallback title="Management commentary" />}>
        <ProfileCommentary company={company} />
      </Suspense>
      <Suspense fallback={<RevenueMixFallback />}>
        <RevenueMix company={company.slug} />
      </Suspense>
    </>
  );

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
            <AddViewToDeck slide="company" company={company.slug} label={`${company.name} at a glance`} />
            {role !== "avnet" && <ButtonLink href={`/tools/deck?company=${company.slug}&from=profile`}>Build a pitch</ButtonLink>}
            {role !== "avnet" && !isHidden("/tools/qbr") && (
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

      {us ? (
        <>
          <SectionNav sections={SECTIONS} />

          <section id="overview" aria-label="Overview" className={SECTION}>
            <Suspense fallback={<ResultsFallback />}>
              <Results slug={company.slug} />
            </Suspense>
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="min-w-0 space-y-4 lg:col-span-8">
                <Suspense fallback={<ProfileFallback title="Trend" />}>
                  <Trend slug={company.slug} />
                </Suspense>
                <Suspense fallback={<ProfileFallback title="In brief" />}>
                  <ProfileInBrief company={company} />
                </Suspense>
              </div>
              <aside className="min-w-0 space-y-4 lg:col-span-4" aria-label={`${company.name} at a glance`}>
                {rail}
              </aside>
            </div>
          </section>

          <section id="financials" aria-label="Financials" className={SECTION}>
            <Suspense fallback={<ProfileFallback title="Quarterly detail" />}>
              <Financials slug={company.slug} />
            </Suspense>
          </section>

          <section id="peers" aria-label="Peers" className={SECTION}>
            <Suspense fallback={<ProfileFallback title="Peers" />}>
              <PeerSection company={company.slug} own={company.cohort} group={group} />
            </Suspense>
          </section>

          <div className="grid gap-4 lg:grid-cols-12">
            <section id="commentary" aria-label="Management commentary" className={`${SECTION} min-w-0 lg:col-span-8`}>
              {commentary}
            </section>
            <section id="news" aria-label="News" className={`${SECTION} min-w-0 lg:col-span-4`}>
              {news}
            </section>
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 lg:col-span-8">
            <Suspense fallback={<ProfileFallback title="Overview" />}>
              <ProfileOverview company={company} />
            </Suspense>
            {commentary}
          </div>
          <aside className="min-w-0 space-y-4 lg:col-span-4" aria-label={`${company.name} at a glance`}>
            {rail}
            {news}
          </aside>
        </div>
      )}
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
