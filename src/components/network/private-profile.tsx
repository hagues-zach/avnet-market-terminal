import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { HOME_DISTRIBUTOR } from "@/lib/line-cards/model";
import { getLineCards } from "@/lib/line-cards/analysis";
import { isHidden } from "@/lib/visibility";
import type { PrivateCompany } from "@/lib/data/live/private-companies";
import { Panel, SourceLine } from "@/components/ui/panel";
import { KpiTile } from "@/components/ui/kpi-tile";
import { EmptyState } from "@/components/ui/states";
import { format, longDate } from "@/components/earnings/format";

// A competitor with no public filings: what is known about it from published
// rankings and its line card, in place of the earnings-driven sections.

const linkClass = "text-body-sm text-ink underline underline-offset-2 hover:text-ink-muted";

/** Main column: what the company is, who owns it, and its sales where a ranking publishes them. */
export function PrivateOverview({ company }: { company: PrivateCompany }) {
  const { sales } = company;
  return (
    <Panel
      title="Overview"
      subtitle={company.summary}
      footer={sales ? <SourceLine source={sales.source} /> : <SourceLine source="No public filings" />}
    >
      {sales ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile label={`${sales.year} sales, worldwide`} value={format("usd", sales.value)} />
          <p className="self-center text-body-sm text-ink-muted">
            {sales.note ? `${sales.note}. ` : ""}A published estimate, not a filing; it isn&apos;t updated each quarter.{" "}
            <a href={sales.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${linkClass}`}>
              Report
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            </a>
          </p>
        </div>
      ) : (
        <EmptyState
          title={`${company.name} doesn't publish its sales`}
          body={company.ownerSlug ? "Its figures are reported inside its owner's, where they're reported at all." : undefined}
        />
      )}
    </Panel>
  );
}

/** Rail card: ownership and headquarters. */
export function PrivateKeyFacts({ company }: { company: PrivateCompany }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Owner",
      value: company.ownerSlug ? (
        <Link href={`/network/${company.ownerSlug}`} className={linkClass}>
          {company.owner}
        </Link>
      ) : (
        company.owner
      ),
    },
    { label: "Headquarters", value: company.hq },
    { label: "Filings", value: "None; private" },
    { label: "Role", value: "Competitor" },
  ];
  return (
    <Panel title="Key facts">
      <dl className="divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7rem_1fr] gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="text-body-sm text-ink-muted">{r.label}</dt>
            <dd className="text-body-sm text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Rail card: the competitor's line card against Avnet's, from the line-card tracker. */
export async function PrivateLineCard({ company }: { company: PrivateCompany }) {
  if (!company.lineCard || isHidden("/line-cards")) return null;
  const cards = await getLineCards();
  const card = cards.distributors.find((d) => d.slug === company.lineCard);
  const footer = (
    <Link href="/line-cards" className={`ml-auto ${linkClass}`}>
      Line cards
    </Link>
  );
  if (!card) {
    const missing = cards.missing.find((m) => m.slug === company.lineCard);
    return (
      <Panel title="Line card" footer={footer}>
        <EmptyState
          title={`${company.name}'s line card isn't in the tracker yet`}
          body={missing && !missing.collectable ? "Its site blocks automated collection, so it comes in through the import form." : undefined}
        />
      </Panel>
    );
  }
  const shared = cards.hasHome
    ? cards.overlap.find((o) => [o.a, o.b].includes(card.slug) && [o.a, o.b].includes(HOME_DISTRIBUTOR))?.shared
    : undefined;
  return (
    <Panel title="Line card" subtitle={`As of ${longDate(card.date)}, ${card.method === "collected" ? "from its public page" : "imported"}`} footer={footer}>
      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Suppliers" value={card.count.toLocaleString("en-US")} />
        <KpiTile label="Shared with Avnet" value={shared === undefined ? "Not known" : shared.toLocaleString("en-US")} />
      </div>
      {shared === undefined && <p className="mt-2 text-caption text-ink-muted">Avnet&apos;s own line card isn&apos;t imported, so the overlap can&apos;t be counted.</p>}
    </Panel>
  );
}
