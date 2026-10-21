import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { getLineCards } from "@/lib/line-cards/analysis";
import { HOME_DISTRIBUTOR, distributorName } from "@/lib/line-cards/model";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { longDate } from "@/components/earnings/format";
import { CollectButton } from "@/components/line-cards/collect-button";
import { ImportForm } from "@/components/line-cards/import-form";
import { FranchiseMoves, InsightFallback, SupplierMomentum } from "@/components/line-cards/insights";
import { SupplierTable } from "@/components/line-cards/supplier-table";
import { cn } from "@/lib/utils";

// Reads the snapshot files on every request, so a new snapshot shows at once.
export const dynamic = "force-dynamic";

const LIST_LIMIT = 40;

function NameList({ names }: { names: string[] }) {
  if (!names.length) return <span className="text-muted">None</span>;
  return (
    <span className="text-ink">
      {names.slice(0, LIST_LIMIT).join(", ")}
      {names.length > LIST_LIMIT && <span className="text-muted"> and {names.length - LIST_LIMIT} more</span>}
    </span>
  );
}

export default async function LineCardsPage() {
  const { distributors, missing, overlap, suppliers, hasHome } = await getLineCards();
  const today = new Date().toISOString().slice(0, 10);
  const shared = (a: string, b: string) => overlap.find((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a))?.shared;
  const withHistory = distributors.filter((d) => d.added !== null);
  const whitespace = hasHome ? suppliers.filter((s) => !s.carriedBy.includes(HOME_DISTRIBUTOR)).length : null;

  return (
    <div className="mx-auto max-w-content space-y-6 px-4 py-5 xl:px-6 xl:py-6">
      <PageHeader title="Line Cards" subtitle="Who is signing which suppliers, which suppliers have momentum, and who carries them" />

      {!hasHome && (
        <div className="rounded-card border border-dashed border-accent-yellow bg-surface px-4 py-3 text-sm text-ink">
          <span className="font-medium">Avnet&apos;s line card has not been imported yet.</span> Until it is, this page cannot show which
          suppliers Avnet is missing. Avnet&apos;s site blocks automated reading, so paste its list into the import form below.
        </div>
      )}

      <Suspense fallback={<InsightFallback title="Franchise moves" subtitle="Searching news for distribution agreement announcements." />}>
        <FranchiseMoves />
      </Suspense>

      <Suspense fallback={<InsightFallback title="Supplier momentum" subtitle="Reading each supplier's filings from SEC EDGAR. The first load can take a minute." />}>
        <SupplierMomentum />
      </Suspense>

      <h2 className="px-1 pt-2 font-display text-lg uppercase tracking-wide text-ink">Line card snapshots</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Distributors tracked", value: String(distributors.length), note: missing.length ? `${missing.length} more waiting for a list` : "All listed distributors have a snapshot" },
          { label: "Suppliers", value: suppliers.length.toLocaleString("en-US"), note: "Supplier families across all line cards" },
          { label: "On two or more", value: suppliers.filter((s) => s.carriedBy.length >= 2).length.toLocaleString("en-US"), note: "Carried by at least two distributors" },
          { label: "Not on Avnet", value: whitespace === null ? "—" : whitespace.toLocaleString("en-US"), note: whitespace === null ? "Needs Avnet's line card" : "Carried elsewhere but not by Avnet" },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
            <span className="font-display text-2xs uppercase tracking-wider text-muted">{t.label}</span>
            <div className="mt-1.5 font-display text-2xl tabular text-ink">{t.value}</div>
            <div className="mt-1 text-xs text-muted">{t.note}</div>
          </div>
        ))}
      </div>

      <Card title="Coverage" subtitle="Latest snapshot for each distributor · sub-brands are rolled up into one supplier · &quot;only here&quot; is carried by no other tracked distributor" actions={<CollectButton />} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Distributor
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Suppliers
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Listings
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Only here
                </th>
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  As of
                </th>
                <th scope="col" className="px-3 py-2 text-left font-normal">
                  How
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Snapshots
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Since previous
                </th>
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.slug} className={cn("border-b border-line", d.slug === HOME_DISTRIBUTOR ? "bg-avnet-green/10" : "hover:bg-canvas")}>
                  <th scope="row" className="px-4 py-1.5 text-left font-normal font-medium text-ink">
                    {d.name}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{d.count.toLocaleString("en-US")}</td>
                  <td className="px-3 py-1.5 text-right tabular text-muted">{d.listings.toLocaleString("en-US")}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">
                    {d.only.toLocaleString("en-US")}
                    <span className="ml-1.5 text-muted">{d.count ? Math.round((d.only / d.count) * 100) : 0}%</span>
                  </td>
                  <td className="px-3 py-1.5 text-left text-muted">{longDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-left text-muted">
                    {d.method === "collected" ? (
                      <a href={d.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-line underline-offset-2 hover:text-ink">
                        Read from its site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      `Imported · ${d.source}`
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular text-muted">{d.snapshots}</td>
                  <td className="px-3 py-1.5 text-right tabular text-muted">{d.added === null ? "First snapshot" : `+${d.added.length} / −${d.removed!.length}`}</td>
                </tr>
              ))}
              {missing.map((d) => (
                <tr key={d.slug} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-4 py-1.5 text-left font-normal text-muted">
                    {d.name}
                  </th>
                  <td colSpan={7} className="px-3 py-1.5 text-left text-muted">
                    {d.collectable ? "No snapshot yet. Use Collect to read it." : "No list yet. Its site blocks automated reading, so import a list below."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {distributors.length >= 2 && (
        <Card title="Overlap" subtitle="Suppliers two distributors have in common · the diagonal is each distributor's own total" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line font-display text-2xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-2 text-left font-normal">
                    Distributor
                  </th>
                  {distributors.map((d) => (
                    <th key={d.slug} scope="col" className="px-3 py-2 text-right font-normal">
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distributors.map((row) => (
                  <tr key={row.slug} className="border-b border-line last:border-b-0">
                    <th scope="row" className="px-4 py-1.5 text-left font-normal font-medium text-ink">
                      {row.name}
                    </th>
                    {distributors.map((col) => {
                      const n = row.slug === col.slug ? row.count : shared(row.slug, col.slug);
                      const smaller = Math.min(row.count, col.count);
                      return (
                        <td key={col.slug} className={cn("px-3 py-1.5 text-right tabular", row.slug === col.slug ? "bg-canvas text-muted" : "text-ink")}>
                          {n?.toLocaleString("en-US") ?? "—"}
                          {row.slug !== col.slug && n !== undefined && smaller > 0 && <span className="ml-1.5 text-muted">{Math.round((n / smaller) * 100)}%</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2 text-2xs text-muted">The percentage is the shared count as a share of the smaller of the two line cards.</p>
        </Card>
      )}

      <Card title="Additions and removals" subtitle="Each distributor's latest snapshot against the one before it">
        {withHistory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Changes appear once a distributor has two snapshots on different days.</p>
        ) : (
          <dl className="space-y-3 text-xs">
            {withHistory.map((d) => (
              <div key={d.slug}>
                <dt className="font-medium text-ink">
                  {d.name} <span className="font-normal text-muted">· as of {longDate(d.date)}</span>
                </dt>
                <dd className="mt-1">
                  <span className="font-display text-2xs uppercase tracking-wider text-muted">Added </span>
                  <NameList names={d.added!} />
                </dd>
                <dd className="mt-0.5">
                  <span className="font-display text-2xs uppercase tracking-wider text-muted">Removed </span>
                  <NameList names={d.removed!} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card title="Suppliers" subtitle="Who carries whom · suppliers with a company profile are linked" bodyClassName="p-0">
        <SupplierTable suppliers={suppliers} distributors={distributors.map((d) => ({ slug: d.slug, name: d.name }))} home={hasHome ? HOME_DISTRIBUTOR : null} />
      </Card>

      <Card title="Import a line card" subtitle="For distributors whose sites cannot be read automatically. Saving again for the same distributor and date replaces that snapshot.">
        <ImportForm today={today} suggested={hasHome ? (missing.find((d) => !d.collectable)?.slug ?? "other") : HOME_DISTRIBUTOR} />
      </Card>

      <p className="px-1 text-2xs text-muted">
        TTI, Future Electronics and Newark are read from their public manufacturer pages, one page each per snapshot. Avnet, Arrow,
        Mouser and DigiKey block automated reading and are imported by hand. Names are matched after removing punctuation and
        company suffixes, and sub-brands are rolled up under a parent when the parent is itself listed, so the same supplier listed
        very differently may still be counted twice.
        Newark is a broadline catalogue and lists many tool and test brands that are not component suppliers. Being listed on a
        site is not proof of a franchise agreement. {distributors.length ? `Snapshots are stored as files under data/line-cards in this project.` : ""}
        {` ${distributorName(HOME_DISTRIBUTOR)}`} rows are highlighted.
      </p>
    </div>
  );
}
