import { Suspense } from "react";
import Link from "next/link";
import { Presentation } from "lucide-react";
import { COMPANIES, ROLE_LABELS, roleOf } from "@/lib/data/live/earnings-model";
import { readSetup } from "@/lib/qbr/setup";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/states";
import { SetupBar } from "@/components/qbr/setup-bar";
import { PrintButton } from "@/components/qbr/print-button";
import { QbrBrief, QbrBriefFallback } from "@/components/qbr/brief";

export const dynamic = "force-dynamic";

// Suppliers and customers first: they are the companies Avnet holds QBRs with.
const GROUP_ORDER = ["supplier", "customer", "competitor", "ecosystem"] as const;
const OPTIONS = GROUP_ORDER.flatMap((role) =>
  COMPANIES.filter((c) => roleOf(c) === role)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ slug: c.slug, name: c.name, group: ROLE_LABELS[role] })),
);

export default async function QbrPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const setup = readSetup(await searchParams);
  const { company } = setup;

  return (
    <PageBody>
      <PageTitle
        title="QBR Prep"
        subtitle="A briefing for a supplier line review or a customer account review"
        actions={
          company ? (
            <>
              <PrintButton />
              <ButtonLink
                href={`/tools/deck?company=${company.slug}&from=qbr&meeting=${setup.meeting}${setup.focus ? `&focus=${encodeURIComponent(setup.focus)}` : ""}`}
                variant="primary"
              >
                <Presentation className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Export to deck
              </ButtonLink>
            </>
          ) : undefined
        }
      />
      <SetupBar
        key={`${company?.slug}-${setup.meeting}-${setup.date}-${setup.focus}`}
        companies={OPTIONS}
        initial={{ company: company?.slug ?? "", meeting: setup.meeting, date: setup.date ?? "", focus: setup.focus }}
      />
      {company ? (
        <Suspense key={company.slug} fallback={<QbrBriefFallback />}>
          <QbrBrief setup={{ ...setup, company }} />
        </Suspense>
      ) : (
        <Panel>
          <EmptyState
            title="Choose a company to build a brief"
            body="The brief pulls the company's latest quarter, what management said, its distribution position and news into one page, with Avnet's own numbers alongside. You can also start from a Company Profile with “Add to QBR brief”."
            action={
              <Link href="/network" className="text-body-sm text-ink underline underline-offset-2">
                Browse Company Profiles
              </Link>
            }
          />
        </Panel>
      )}
    </PageBody>
  );
}
