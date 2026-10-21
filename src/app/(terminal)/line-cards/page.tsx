import { Suspense } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { getLineCards } from "@/lib/line-cards/analysis";
import { HOME_DISTRIBUTOR } from "@/lib/line-cards/model";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { longDate } from "@/components/earnings/format";
import { CollectButton } from "@/components/line-cards/collect-button";
import { ImportForm } from "@/components/line-cards/import-form";
import { FranchiseMoves, InsightFallback, MovesKpis, MovesKpisFallback, SupplierMomentum } from "@/components/line-cards/insights";
import { SupplierTable } from "@/components/line-cards/supplier-table";
import { cn } from "@/lib/utils";

// Reads the snapshot files on every request, so a new snapshot shows at once.
export const dynamic = "force-dynamic";

const LIST_LIMIT = 40;

function NameList({ names }: { names: string[] }) {
  if (!names.length) return <span className="text-ink-muted">None</span>;
  return (
    <span className="text-ink">
      {names.slice(0, LIST_LIMIT).join(", ")}
      {names.length > LIST_LIMIT && <span className="text-ink-muted"> and {names.length - LIST_LIMIT} more</span>}
    </span>
  );
}

/** A panel that starts folded: reference data people open when they need it. */
function Fold({ id, title, summary, open, children }: { id?: string; title: string; summary: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} open={open} className="group scroll-mt-16 rounded-sm border border-hairline bg-surface">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-90" strokeWidth={1.5} aria-hidden />
        <span className="font-display text-card-title text-ink">{title}</span>
        <span className="ml-auto truncate pl-3 text-caption text-ink-muted">{summary}</span>
      </summary>
      <div className="border-t border-hairline">{children}</div>
    </details>
  );
}

const th = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

export default async function LineCardsPage() {
  const { distributors, missing, overlap, suppliers, hasHome } = await getLineCards();
  const today = new Date().toISOString().slice(0, 10);
  const shared = (a: string, b: string) => overlap.find((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a))?.shared;
  const withHistory = distributors.filter((d) => d.added !== null);
  const whitespace = hasHome ? suppliers.filter((s) => !s.carriedBy.includes(HOME_DISTRIBUTOR)).length : null;
  const latest = distributors.map((d) => d.date).sort().at(-1);

  return (
    <PageBody>
      <PageTitle title="Line Cards" subtitle="Who is signing which suppliers, which suppliers are growing, and where Avnet is missing" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Suspense fallback={<MovesKpisFallback />}>
          <MovesKpis />
        </Suspense>
        <KpiTile
          label="Suppliers tracked"
          value={suppliers.length.toLocaleString("en-US")}
          note={`across ${distributors.length} line cards`}
          source={{ status: "live", label: "Snapshots" }}
        />
        <KpiTile
          label="Carried elsewhere, not by Avnet"
          value={whitespace === null ? "n/a" : whitespace.toLocaleString("en-US")}
          note={whitespace === null ? "needs Avnet's line card" : "supplier families"}
          source={{ status: whitespace === null ? "planned" : "live", label: whitespace === null ? "Import" : "Snapshots" }}
        />
      </div>

      {!hasHome && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-hairline bg-surface px-4 py-3">
          <p className="text-body-sm text-ink">
            <span className="font-semibold">Avnet&apos;s line card is not imported yet,</span> so this page cannot show which suppliers Avnet is
            missing. Avnet&apos;s site blocks automated reading; paste its manufacturer list once to switch the gap views on.
          </p>
          <a href="#import" className="whitespace-nowrap text-body-sm font-semibold text-ink underline underline-offset-2 hover:text-ink-muted">
            Import Avnet&apos;s line card
          </a>
        </div>
      )}

      <Suspense fallback={<InsightFallback title="Franchise moves" lines={8} />}>
        <FranchiseMoves />
      </Suspense>

      <Suspense fallback={<InsightFallback title="Supplier momentum" lines={8} />}>
        <SupplierMomentum />
      </Suspense>

      <section aria-labelledby="line-card-data" className="space-y-4">
        <h2 id="line-card-data" className="pt-2 font-display text-section-title text-ink">
          Line card data
        </h2>

        <Panel
          title="Coverage"
          subtitle={`Latest snapshot for each distributor. "Only here" means no other tracked distributor carries it`}
          actions={<CollectButton />}
          bodyClassName="px-0 pb-0"
          footer={<SourceLine source="Distributor manufacturer pages and imported lists" asOf={latest ? longDate(latest) : undefined} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse font-body text-table">
              <caption className="sr-only">Line card coverage by distributor</caption>
              <thead className="bg-surface-sunken">
                <tr className="border-b border-hairline">
                  <th scope="col" className={cn(th, "text-left")}>Distributor</th>
                  <th scope="col" className={cn(th, "text-right")}>Suppliers</th>
                  <th scope="col" className={cn(th, "text-right")}>Listings</th>
                  <th scope="col" className={cn(th, "text-right")}>Only here</th>
                  <th scope="col" className={cn(th, "text-left")}>As of</th>
                  <th scope="col" className={cn(th, "text-left")}>How</th>
                  <th scope="col" className={cn(th, "text-right")}>Snapshots</th>
                  <th scope="col" className={cn(th, "text-right")}>Since previous</th>
                </tr>
              </thead>
              <tbody>
                {distributors.map((d) => (
                  <tr key={d.slug} className={cn("border-b border-hairline", d.slug === HOME_DISTRIBUTOR ? "bg-surface-selected" : "hover:bg-surface-sunken")}>
                    <th scope="row" className="h-control px-3 text-left font-medium text-ink">
                      {d.name}
                    </th>
                    <td className="px-3 text-right tabular-nums text-ink">{d.count.toLocaleString("en-US")}</td>
                    <td className="px-3 text-right tabular-nums text-ink-muted">{d.listings.toLocaleString("en-US")}</td>
                    <td className="px-3 text-right tabular-nums text-ink">
                      {d.only.toLocaleString("en-US")}
                      <span className="ml-1.5 text-ink-muted">{d.count ? Math.round((d.only / d.count) * 100) : 0}%</span>
                    </td>
                    <td className="whitespace-nowrap px-3 text-ink-muted">{longDate(d.date)}</td>
                    <td className="px-3 text-ink-muted">
                      {d.method === "collected" ? (
                        <a href={d.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-hairline underline-offset-2 hover:text-ink">
                          Read from its site
                          <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                        </a>
                      ) : (
                        `Imported, ${d.source}`
                      )}
                    </td>
                    <td className="px-3 text-right tabular-nums text-ink-muted">{d.snapshots}</td>
                    <td className="whitespace-nowrap px-3 text-right tabular-nums text-ink-muted">
                      {d.added === null ? "First snapshot" : `+${d.added.length} / −${d.removed!.length}`}
                    </td>
                  </tr>
                ))}
                {missing.map((d) => (
                  <tr key={d.slug} className="border-b border-hairline last:border-b-0">
                    <th scope="row" className="h-control px-3 text-left font-normal text-ink-muted">
                      {d.name}
                    </th>
                    <td colSpan={7} className="px-3 text-ink-muted">
                      {d.collectable ? "No snapshot yet. Use Collect to read it." : "No list yet. Its site blocks automated reading, so import a list below."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Fold title="Who carries whom" summary={`${suppliers.length.toLocaleString("en-US")} supplier families, searchable`}>
          <SupplierTable suppliers={suppliers} distributors={distributors.map((d) => ({ slug: d.slug, name: d.name }))} home={hasHome ? HOME_DISTRIBUTOR : null} />
        </Fold>

        {distributors.length >= 2 && (
          <Fold title="Overlap between line cards" summary="Suppliers each pair of distributors has in common">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-body text-table">
                <caption className="sr-only">Suppliers in common between each pair of distributors</caption>
                <thead className="bg-surface-sunken">
                  <tr className="border-b border-hairline">
                    <th scope="col" className={cn(th, "text-left")}>Distributor</th>
                    {distributors.map((d) => (
                      <th key={d.slug} scope="col" className={cn(th, "text-right")}>
                        {d.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {distributors.map((row) => (
                    <tr key={row.slug} className="border-b border-hairline last:border-b-0">
                      <th scope="row" className="h-control px-3 text-left font-medium text-ink">
                        {row.name}
                      </th>
                      {distributors.map((col) => {
                        const n = row.slug === col.slug ? row.count : shared(row.slug, col.slug);
                        const smaller = Math.min(row.count, col.count);
                        return (
                          <td key={col.slug} className={cn("px-3 text-right tabular-nums", row.slug === col.slug ? "bg-surface-sunken text-ink-muted" : "text-ink")}>
                            {n?.toLocaleString("en-US") ?? "n/a"}
                            {row.slug !== col.slug && n !== undefined && smaller > 0 && <span className="ml-1.5 text-ink-muted">{Math.round((n / smaller) * 100)}%</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-hairline px-4 py-2 text-caption text-ink-muted">
              The percentage is the shared count as a share of the smaller line card. The diagonal is each distributor&apos;s own total.
            </p>
          </Fold>
        )}

        <Fold
          title="Additions and removals"
          summary={withHistory.length ? `${withHistory.length} distributors changed since their previous snapshot` : "Needs two snapshots on different days"}
        >
          <div className="px-4 py-3">
            {withHistory.length === 0 ? (
              <p className="text-body-sm text-ink-muted">Changes appear once a distributor has two snapshots on different days.</p>
            ) : (
              <dl className="space-y-3 text-body-sm">
                {withHistory.map((d) => (
                  <div key={d.slug}>
                    <dt className="font-semibold text-ink">
                      {d.name} <span className="font-normal text-ink-muted">as of {longDate(d.date)}</span>
                    </dt>
                    <dd className="mt-1">
                      <span className="font-display text-label uppercase text-ink-muted">Added </span>
                      <NameList names={d.added!} />
                    </dd>
                    <dd className="mt-0.5">
                      <span className="font-display text-label uppercase text-ink-muted">Removed </span>
                      <NameList names={d.removed!} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Fold>

        <Fold id="import" title="Import a line card" summary="For distributors whose sites cannot be read automatically" open={!hasHome}>
          <div className="px-4 py-3">
            <ImportForm today={today} suggested={hasHome ? (missing.find((d) => !d.collectable)?.slug ?? "other") : HOME_DISTRIBUTOR} />
          </div>
        </Fold>
      </section>

      <p className="max-w-prose text-caption text-ink-muted">
        TTI, Future Electronics and Newark are read from their public manufacturer pages. Avnet, Arrow, Mouser and DigiKey block automated
        reading and are imported by hand. Names are matched after removing punctuation and company suffixes, and sub-brands roll up under a
        listed parent, so one supplier listed very differently may still count twice. Newark lists many tool and test brands that are not
        component suppliers. A listing is not proof of a franchise agreement. Franchise moves come from news headlines, so they reflect how
        much each distributor publicises as well as how much it signs.
      </p>
    </PageBody>
  );
}
