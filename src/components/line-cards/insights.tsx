import Link from "next/link";
import { Check } from "lucide-react";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { COHORT_LABELS, COMPANIES, roleOf } from "@/lib/data/live/earnings-model";
import { getRevenueMix } from "@/lib/data/live/revenue-mix";
import { getCarrierIndex } from "@/lib/line-cards/analysis";
import { HOME_DISTRIBUTOR, supplierKey } from "@/lib/line-cards/model";
import { getMoves } from "@/lib/line-cards/moves";
import { Card } from "@/components/ui/card";
import { DASH, format } from "@/components/earnings/format";
import { cn } from "@/lib/utils";
import { MovesList } from "./moves-list";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

export function InsightFallback({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-2" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}

/** Server component: announced distribution agreements, from news headlines. */
export async function FranchiseMoves() {
  const { moves, byDistributor, error } = await getMoves();
  const byKey = new Map(COMPANIES.map((c) => [supplierKey(c.name), c.slug]));
  const profiles: Record<string, string> = {};
  for (const m of moves) {
    const moveKey = m.supplier ? supplierKey(m.supplier) : "";
    const slug = m.supplier ? (byKey.get(moveKey) ?? COMPANIES.find((c) => moveKey.startsWith(`${supplierKey(c.name)} `))?.slug) : undefined;
    if (slug) profiles[m.supplier!] = slug;
  }
  return (
    <Card title="Franchise moves" subtitle="Distribution agreements announced in the last 12 months, read from news headlines · select a distributor to filter">
      {moves.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{error ?? "No distribution agreement announcements were found."}</p>
      ) : (
        <MovesList moves={moves} byDistributor={byDistributor} profiles={profiles} />
      )}
      <p className="mt-4 border-t border-line pt-3 text-2xs text-muted">
        Found by searching news for agreement wording next to a distributor&apos;s name, so it shows what was announced, not every
        line a distributor holds. The supplier is read out of the headline and can be wrong or missing. Arrow&apos;s results include
        its enterprise computing business. Counts reflect how much each distributor publicises, as well as how much it signs.
      </p>
    </Card>
  );
}

/** Server component: tracked suppliers ranked by growth, with who carries them. */
export async function SupplierMomentum() {
  const suppliers = COMPANIES.filter((c) => roleOf(c) === "supplier");
  const [index, { moves }] = await Promise.all([getCarrierIndex(), getMoves()]);
  const rows = [];
  // Filing documents are large; read a few at a time.
  for (let i = 0; i < suppliers.length; i += 4) {
    rows.push(
      ...(await Promise.all(
        suppliers.slice(i, i + 4).map(async (company) => {
          const [earnings, mix] = await Promise.all([getCompanyEarnings(company.slug), getRevenueMix(company.slug)]);
          const q = earnings.quarters[earnings.quarters.length - 1];
          const channel = mix.breakdowns.find((b) => /sales channel/i.test(b.title))?.items.find((it) => /distribut|reseller|intermediar/i.test(it.label));
          const key = supplierKey(company.name);
          return {
            company,
            growth: q?.values.revenueYoY,
            channelShare: channel?.share,
            channelYoY: channel?.yoy,
            carriedBy: index.carriedBy(company.name),
            // "Amphenol CDI" counts as a move for Amphenol.
            move: moves.find((m) => m.supplier && (supplierKey(m.supplier) === key || supplierKey(m.supplier).startsWith(`${key} `))),
          };
        }),
      )),
    );
  }
  rows.sort((a, b) => (b.growth ?? -Infinity) - (a.growth ?? -Infinity));
  const maxGrowth = Math.min(1, Math.max(0.01, ...rows.map((r) => Math.abs(r.growth ?? 0))));
  const others = index.tracked.filter((d) => d.slug !== HOME_DISTRIBUTOR);
  const withChannel = rows.filter((r) => r.channelShare !== undefined).length;

  return (
    <Card
      title="Supplier momentum"
      subtitle={`${rows.length} publicly reporting suppliers, fastest growing first · who carries them and how much they sell through distribution`}
      bodyClassName="p-0"
    >
      <div className="max-h-[30rem] overflow-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-line font-display text-2xs uppercase tracking-wider text-muted">
              <th scope="col" className="px-4 py-2 text-left font-normal">
                Supplier
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Growth YoY
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Via distribution
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Channel YoY
              </th>
              <th scope="col" className="px-2 py-2 text-center font-normal">
                Avnet
              </th>
              {others.map((d) => (
                <th key={d.slug} scope="col" className="px-2 py-2 text-center font-normal">
                  {d.name}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Latest announced agreement
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.company.slug} className="border-b border-line last:border-b-0 hover:bg-canvas">
                <th scope="row" className="px-4 py-1.5 text-left font-normal">
                  <Link href={`/network/${r.company.slug}`} className="font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline">
                    {r.company.name}
                  </Link>
                  <span className="ml-2 text-2xs text-muted">{COHORT_LABELS[r.company.cohort]}</span>
                </th>
                <td className="px-3 py-1">
                  <div className="relative flex h-6 items-center justify-end">
                    {r.growth !== undefined && (
                      <span
                        aria-hidden
                        className={cn("absolute inset-y-0.5 left-0 rounded-sm", r.growth < 0 ? "bg-danger/15" : "bg-blue-dark/20")}
                        style={{ width: `${Math.min(1, Math.abs(r.growth) / maxGrowth) * 100}%` }}
                      />
                    )}
                    <span className="relative tabular text-ink">{format("growth", r.growth)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right tabular text-ink">{r.channelShare === undefined ? DASH : `${Math.round(r.channelShare * 100)}%`}</td>
                <td className="px-3 py-1.5 text-right tabular text-ink">{format("growth", r.channelYoY)}</td>
                <td className="px-2 py-1.5 text-center">
                  {!index.hasHome ? (
                    <span className="text-muted" title="Avnet's line card has not been imported yet">
                      ?
                    </span>
                  ) : r.carriedBy.includes(HOME_DISTRIBUTOR) ? (
                    <Check className="mx-auto h-3.5 w-3.5 text-avnet-greenDark" aria-label="On Avnet's line card" />
                  ) : (
                    <span className="font-medium text-danger" aria-label="Not on Avnet's line card">
                      ✕
                    </span>
                  )}
                </td>
                {others.map((d) => (
                  <td key={d.slug} className="px-2 py-1.5 text-center">
                    {r.carriedBy.includes(d.slug) ? (
                      <Check className="mx-auto h-3.5 w-3.5 text-ink" aria-label={`On ${d.name}'s line card`} />
                    ) : (
                      <span className="text-gray-light" aria-label={`Not on ${d.name}'s line card`}>
                        ·
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-left text-muted">
                  {r.move ? (
                    <a href={r.move.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2 hover:text-ink" title={r.move.title}>
                      {r.move.ended ? "Ended: " : ""}
                      {r.move.distributor.name} · {shortDay(r.move.date)}
                    </a>
                  ) : (
                    DASH
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2 text-2xs text-muted">
        Growth is the latest reported quarter against a year earlier. &quot;Via distribution&quot; is the share of revenue the
        supplier itself reports selling through distributors; only {withChannel} of {rows.length} tag it in their filings. Growth
        bars stop at +100%. Large foreign suppliers that do not file with the SEC are not listed.
        {!index.hasHome && " The Avnet column shows ? until Avnet's line card is imported."}
      </p>
    </Card>
  );
}
