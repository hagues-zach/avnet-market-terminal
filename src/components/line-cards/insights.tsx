import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { COHORT_LABELS, COMPANIES, roleOf } from "@/lib/data/live/earnings-model";
import { getRevenueMix } from "@/lib/data/live/revenue-mix";
import { getCarrierIndex } from "@/lib/line-cards/analysis";
import { HOME_DISTRIBUTOR, supplierKey } from "@/lib/line-cards/model";
import { getMoves } from "@/lib/line-cards/moves";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { DataChip } from "@/components/ui/chip";
import { EmptyState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { MovesList } from "./moves-list";
import { MomentumTable, type MomentumRow } from "./momentum-table";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDay = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;

export function InsightFallback({ title, lines = 6 }: { title: string; lines?: number }) {
  return (
    <Panel title={title}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={lines} />
    </Panel>
  );
}

/* ---------- Headline (moves part) ---------- */

/** Two KPI tiles from the news-based moves: all agreements, and Avnet against Arrow. */
export async function MovesKpis() {
  const { moves, byDistributor } = await getMoves();
  const count = (slug: string) => byDistributor.filter((d) => d.distributor.slug === slug || (slug === "avnet" && d.distributor.avnet)).reduce((s, d) => s + d.count, 0);
  const avnet = count("avnet");
  const arrow = count("arrow");
  return (
    <>
      <KpiTile label="Agreements announced, 12 months" value={String(moves.length)} note={`by ${byDistributor.length} distributors`} source={{ status: "live", label: "News" }} />
      <KpiTile label="Avnet against Arrow" value={`${avnet} to ${arrow}`} note="agreements announced" source={{ status: "live", label: "News" }} />
    </>
  );
}

export function MovesKpisFallback() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="rounded-sm border border-hairline bg-surface px-4 py-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="mt-3 h-6 w-16" />
        </div>
      ))}
    </>
  );
}

/* ---------- Franchise moves ---------- */

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
  if (!moves.length) {
    return (
      <Panel title="Franchise moves">
        <EmptyState title="No distribution agreements found" body={error ?? "No announcements matched in the last 12 months."} />
      </Panel>
    );
  }
  return <MovesList moves={moves} byDistributor={byDistributor} profiles={profiles} />;
}

/* ---------- Supplier momentum ---------- */

/** Server component: tracked suppliers ranked by growth, with who carries them. */
export async function SupplierMomentum() {
  const suppliers = COMPANIES.filter((c) => roleOf(c) === "supplier");
  const [index, { moves }] = await Promise.all([getCarrierIndex(), getMoves()]);
  const names = new Map(index.tracked.map((d) => [d.slug, d.name]));
  const rows: MomentumRow[] = [];
  // Filing documents are large; read a few at a time.
  for (let i = 0; i < suppliers.length; i += 4) {
    rows.push(
      ...(await Promise.all(
        suppliers.slice(i, i + 4).map(async (company) => {
          const [earnings, mix] = await Promise.all([getCompanyEarnings(company.slug), getRevenueMix(company.slug)]);
          const q = earnings.quarters[earnings.quarters.length - 1];
          const channel = mix.breakdowns.find((b) => /sales channel/i.test(b.title))?.items.find((it) => /distribut|reseller|intermediar/i.test(it.label));
          const key = supplierKey(company.name);
          const carriedBy = index.carriedBy(company.name);
          // "Amphenol CDI" counts as a move for Amphenol.
          const move = moves.find((m) => m.supplier && (supplierKey(m.supplier) === key || supplierKey(m.supplier).startsWith(`${key} `)));
          return {
            slug: company.slug,
            name: company.name,
            group: COHORT_LABELS[company.cohort],
            growth: q?.values.revenueYoY,
            channelShare: channel?.share,
            channelYoY: channel?.yoy,
            onAvnet: index.hasHome ? carriedBy.includes(HOME_DISTRIBUTOR) : null,
            carriers: carriedBy.filter((s) => s !== HOME_DISTRIBUTOR).map((s) => names.get(s) ?? s),
            move: move ? { label: `${move.ended ? "Ended: " : ""}${move.distributor.name}, ${shortDay(move.date)}`, url: move.url, title: move.title } : undefined,
          };
        }),
      )),
    );
  }
  const withChannel = rows.filter((r) => r.channelShare !== undefined).length;
  const fastest = [...rows].filter((r) => r.growth !== undefined).sort((a, b) => b.growth! - a.growth!)[0];

  return (
    <Panel
      title="Supplier momentum"
      subtitle={fastest ? `${fastest.name} is growing fastest, ${Math.round(fastest.growth! * 100)}% on a year ago` : undefined}
      actions={<DataChip status="live" label="SEC EDGAR" />}
      bodyClassName="px-0 pb-0"
      footer={
        <SourceLine source="Latest reported quarter against a year earlier, from SEC filings; carriers from line-card snapshots">
          <span>
            {withChannel} of {rows.length} suppliers report their distribution share
          </span>
        </SourceLine>
      }
    >
      <MomentumTable rows={rows} hasHome={index.hasHome} />
    </Panel>
  );
}
