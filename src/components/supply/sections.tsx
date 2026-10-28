import { cache } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, ExternalLink } from "lucide-react";
import { getCommentary, type Commentary } from "@/lib/ai/commentary";
import { getNewsAngles } from "@/lib/ai/news-angles";
import { getCycle, type StageSeries } from "@/lib/data/live/cycle";
import { getLiveNews } from "@/lib/data/live/news";
import { getSignals, yearChange, type Signal } from "@/lib/data/live/signals";
import { getAvnet } from "@/lib/avnet";
import {
  CATEGORY_LINKS,
  firstSentence,
  METAL_KEYS,
  readOf,
  scoreSignals,
  sentence,
  SIGNAL_KEYS,
  spoken,
  supplyStories,
  type Direction,
} from "@/lib/supply/read";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { Panel, SourceLine } from "@/components/ui/panel";
import { EmptyState, LoadingBlock, Skeleton } from "@/components/ui/states";
import { BookToBill, InventoryLines } from "@/components/cycle/charts";
import { BacklogBars, PricesChart, type PriceSeries } from "./charts";
import { cn } from "@/lib/utils";

const link = "text-ink underline-offset-2 hover:underline";
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`;
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

/* ---------- Shared loaders (deduplicated per request) ---------- */

const loadSignals = cache(async () => {
  const { signals, failed } = await getSignals().catch(() => ({ signals: [] as Signal[], failed: ["all sources"] }));
  const by = (key: string) => signals.find((s) => s.key === key);
  return { by, failed };
});

/** The chain's inventory: the mean of the manufacturer and distributor stages' median days. */
const loadChain = cache(async () => {
  const cycle = await getCycle().catch(() => null);
  if (!cycle?.latest) return null;
  const stage = (id: StageSeries["id"]) => cycle.stages.find((s) => s.id === id)!;
  const yearAgo = cycle.labels[cycle.labels.length - 5];
  const days = (label: string) => {
    const v = [stage("manufacturers"), stage("distributors")].map((s) => s.points.find((p) => p.label === label)?.inventoryDays);
    return v.every((x) => x !== undefined) ? (v[0]! + v[1]!) / 2 : undefined;
  };
  return { cycle, now: days(cycle.latest), yearAgo: days(yearAgo) };
});

const SUPPLIERS = Array.from(new Set(Object.values(CATEGORY_LINKS).map((l) => l.supplier)));
const loadCommentary = cache(async () => {
  const all = await Promise.all(SUPPLIERS.map((slug) => getCommentary(slug).catch(() => null)));
  return new Map(all.filter((c): c is Commentary => Boolean(c)).map((c) => [c.company.slug, c]));
});

/* ---------- The read and its signals ---------- */

const WORD: Record<Direction, string> = { tighter: "Tighter", looser: "Looser", flat: "Steady" };

/** A signal tile: figure, its change on a year ago and the direction as a word. Neutral ink: tight supply is not good or bad for everyone. */
function SignalTile({
  label,
  value,
  change,
  direction,
  source,
}: {
  label: string;
  value: string;
  change?: string;
  direction: Direction | null;
  source: string;
}) {
  const Arrow = direction === "tighter" ? ArrowUp : direction === "looser" ? ArrowDown : ArrowRight;
  return (
    <div className="flex min-w-0 flex-col rounded-sm border border-hairline bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-label uppercase text-ink-muted">{label}</span>
        <DataChip status="live" label={source} />
      </div>
      <span className="mt-1.5 font-display text-figure tabular-nums text-ink">{value}</span>
      <span className="mt-1 flex items-center justify-between gap-2 text-caption text-ink">
        <span className="tabular-nums text-ink-muted">{change ?? "No year-ago figure"}</span>
        {direction && (
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <Arrow className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            {WORD[direction]}
          </span>
        )}
      </span>
    </div>
  );
}

/** Server component: utilisation and prices from the signals feeds, inventory from SEC filings. */
export async function SupplyRead() {
  const [{ by }, chain] = await Promise.all([loadSignals(), loadChain()]);
  const util = by(SIGNAL_KEYS.utilisation);
  const prices = by(SIGNAL_KEYS.semiPrices);
  const utilChange = util ? yearChange(util) : undefined;
  const priceChange = prices ? yearChange(prices) : undefined;
  const invChange = chain?.now !== undefined && chain.yearAgo !== undefined ? chain.now - chain.yearAgo : undefined;
  const scored = scoreSignals({ utilisationChange: utilChange?.value, priceChange: priceChange?.value, inventoryChange: invChange });
  const dir = (k: string) => scored.find((s) => s.key === k)?.direction ?? null;

  return (
    <section aria-labelledby="supply-read" className="space-y-4">
      <div className="space-y-1">
        <h2 id="supply-read" className="text-pretty text-xl leading-snug text-ink">
          {sentence(scored)}
        </h2>
        <p className="text-caption text-ink-muted">
          {readOf(scored)} is a rule over these three live signals, each on a year ago. Lead times are mock, so they are not counted yet.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SignalTile
          label="Capacity utilisation, chips"
          value={util?.points.at(-1) ? `${util.points.at(-1)!.value.toFixed(1)}%` : "n/a"}
          change={utilChange ? `${utilChange.value >= 0 ? "+" : "−"}${Math.abs(utilChange.value).toFixed(1)} pts on a year ago` : undefined}
          direction={dir("utilisation")}
          source="Fed G.17"
        />
        <SignalTile
          label="Semiconductor producer prices"
          value={priceChange ? `${pct(priceChange.value)} YoY` : "n/a"}
          change={prices ? "Producer price index" : undefined}
          direction={dir("prices")}
          source="BLS"
        />
        <SignalTile
          label="Inventory in the chain"
          value={chain?.now !== undefined ? `${Math.round(chain.now)} days` : "n/a"}
          change={
            invChange !== undefined
              ? `${invChange >= 0 ? "+" : "−"}${Math.round(Math.abs(invChange))} ${Math.round(Math.abs(invChange)) === 1 ? "day" : "days"} on a year ago`
              : undefined
          }
          direction={dir("inventory")}
          source="SEC"
        />
      </div>
    </section>
  );
}

export function SupplyReadFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

/* ---------- By category ---------- */

function ColHead({
  children,
  mock,
  align = "right",
  title,
}: {
  children: React.ReactNode;
  mock?: boolean;
  align?: "left" | "right";
  title?: string;
}) {
  return (
    <th scope="col" className={cn(TH, align === "right" ? "text-right" : "text-left")} title={title}>
      <span className={cn("inline-flex items-center gap-1.5", align === "right" && "justify-end")}>
        {children}
        {mock && <DataChip status="mock" />}
      </span>
    </th>
  );
}

/** Server component: mock lead times and purchasing beside live prices and what each category's supplier said. */
export async function ByCategory() {
  const [{ by }, commentary] = await Promise.all([loadSignals(), loadCommentary()]);
  const { leadTimes, purchasing, status } = await getAvnet();
  const max = Math.max(...leadTimes.map((l) => l.weeks));
  return (
    <Panel
      title="By category"
      subtitle="Lead times and Avnet's buying are mock; producer prices and what suppliers said are live. Each column is marked"
      bodyClassName="space-y-3 p-0"
      footer={<SourceLine source="Mock lead times and purchasing; BLS producer prices; suppliers' latest earnings releases, summarised by Claude" />}
    >
      <div className="px-4 pt-3">
        <HookupMarker ids={["lead-times", "procurement"]} />
      </div>
      <div role="region" aria-label="By category table" tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse font-body text-table">
          <caption className="sr-only">Lead times, prices, Avnet purchasing and what suppliers said, by component category</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-y border-hairline">
              <ColHead align="left">Category</ColHead>
              <ColHead align="left" mock={status === "mock"}>
                Lead time
              </ColHead>
              <ColHead mock={status === "mock"} title="Change on a quarter ago">
                Change
              </ColHead>
              <ColHead title="Producer price index, change on a year ago">Prices YoY</ColHead>
              <ColHead mock={status === "mock"}>Avnet POs</ColHead>
              <ColHead mock={status === "mock"} title="Change on a quarter ago">
                PO change
              </ColHead>
              <ColHead align="left">What the supplier said</ColHead>
            </tr>
          </thead>
          <tbody>
            {leadTimes.map((l) => {
              const links = CATEGORY_LINKS[l.category];
              const ppi = links.prices ? by(SIGNAL_KEYS[links.prices]) : undefined;
              const ppiChange = ppi ? yearChange(ppi) : undefined;
              const po = purchasing.find((p) => p.category === l.category);
              const c = commentary.get(links.supplier);
              const said = firstSentence(spoken(c?.digest?.leadTimes)) ?? firstSentence(spoken(c?.digest?.inventory));
              return (
                <tr key={l.category} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                    {l.category}
                  </th>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="w-12 tabular-nums text-ink">{l.weeks} wks</span>
                      <span className="block h-2 w-14" aria-hidden>
                        <span className="block h-full bg-viz-benchmark" style={{ width: `${(l.weeks / max) * 100}%` }} />
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">
                    {l.change > 0 ? "+" : l.change < 0 ? "−" : ""}
                    {Math.abs(l.change)} wks
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink" title={ppi?.label}>
                    {ppiChange ? (
                      pct(ppiChange.value)
                    ) : (
                      <span className="text-ink-muted" title="No producer price series for this category">
                        n/a
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{po ? `$${po.poValue}M` : "n/a"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{po ? pct(po.change) : "n/a"}</td>
                  <td className="min-w-[14rem] max-w-[24rem] px-3 py-2 text-ink">
                    <span className="line-clamp-2" title={said ?? undefined}>
                      <Link href={`/network/${links.supplier}`} className={cn(link, "font-medium")}>
                        {c?.company.name ?? links.supplier}
                      </Link>
                      {": "}
                      {said ? (
                        said
                      ) : (
                        <span className="text-ink-muted">
                          {c?.status === "ok" ? "Its latest release is silent on lead times and inventory." : "No summary of its latest release yet."}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function SectionFallback({ title, className }: { title: string; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} lines={6} />
    </Panel>
  );
}

/* ---------- Inventory, prices ---------- */

export async function ChainInventory() {
  const chain = await loadChain();
  if (!chain) return <SectionFallback title="Inventory in the chain" className="xl:col-span-7" />;
  const { cycle } = chain;
  const group = (c: string) => cycle.groups.find((g) => g.cohort === c)!;
  return (
    <Panel
      className="xl:col-span-7"
      title="Inventory in the chain"
      subtitle="Median days of inventory, by calendar quarter"
      footer={
        <>
          <SourceLine source="SEC filings" asOf={cycle.latest} />
          <Link href="/cycle" className={cn(link, "ml-auto")}>
            Market Cycle
          </Link>
        </>
      }
      bodyClassName="flex flex-col"
    >
      <InventoryLines
        fill
        series={["Manufacturers", "Distributors", "Contract manufacturers"]}
        short={{ "Contract manufacturers": "Contract mfrs" }}
        rows={cycle.labels.map((label) => ({
          label,
          Manufacturers: group("manufacturer").points.find((p) => p.label === label)?.inventoryDays,
          Distributors: group("distributor").points.find((p) => p.label === label)?.inventoryDays,
          "Contract manufacturers": group("ems").points.find((p) => p.label === label)?.inventoryDays,
        }))}
      />
    </Panel>
  );
}

const toSeries = (s: Signal | undefined, label?: string): PriceSeries[] =>
  s ? [{ key: s.key, label: label ?? s.label, yoy: yearChange(s)?.value, points: s.points }] : [];

export async function Prices() {
  const { by, failed } = await loadSignals();
  const producer = [
    ...toSeries(by(SIGNAL_KEYS.semiPrices), "Semiconductors"),
    ...toSeries(by(SIGNAL_KEYS.connectorPrices), "Connectors"),
    ...toSeries(by(SIGNAL_KEYS.boardPrices), "Circuit boards"),
  ];
  const metals = METAL_KEYS.flatMap((k) => toSeries(by(k)));
  return (
    <Panel
      className="xl:col-span-5"
      title="Prices and inputs"
      subtitle="Producer prices for components, and the metals that go into them"
      footer={
        <>
          <SourceLine source="BLS producer prices, IMF commodity prices" />
          {failed.length > 0 && <span>Not responding: {failed.join(", ")}</span>}
          <Link href="/signals" className={cn(link, "ml-auto")}>
            Economic Signals
          </Link>
        </>
      }
    >
      <PricesChart producer={producer} metals={metals} />
    </Panel>
  );
}

/* ---------- What suppliers and the news are saying ---------- */

export async function SuppliersSaying() {
  const commentary = await loadCommentary();
  const rows = SUPPLIERS.map((s) => commentary.get(s)).filter((c): c is Commentary => Boolean(c));
  const summarised = rows.filter((c) => c.status === "ok" && c.digest);
  const read = summarised.filter((c) => spoken(c.digest!.leadTimes) || spoken(c.digest!.inventory));
  const silent = summarised.filter((c) => !read.includes(c));
  const missing = rows.filter((c) => !summarised.includes(c));
  return (
    <Panel
      className="xl:col-span-7"
      title="What suppliers are saying"
      subtitle="Lead times and inventory from each supplier's latest earnings release. Written by Claude; check the release before quoting it"
    >
      {read.length === 0 ? (
        <EmptyState
          title={summarised.length ? "None of these releases mention lead times or inventory" : "No release summaries yet"}
          body={summarised.length ? undefined : (rows[0]?.message ?? "Claude has not summarised these suppliers' releases yet.")}
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {read.map((c) => (
            <li key={c.company.slug} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/network/${c.company.slug}`} className={cn(link, "text-body-sm font-semibold")}>
                  {c.company.name}
                </Link>
                {c.releaseUrl && (
                  <a
                    href={c.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(link, "inline-flex items-center gap-1 text-caption text-ink-muted")}
                  >
                    {c.filed ? `Release, ${c.filed}` : "Release"}
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                    <span className="sr-only"> for {c.company.name} (opens SEC EDGAR)</span>
                  </a>
                )}
              </div>
              <p className="mt-0.5 text-body-sm text-ink">
                <span className="font-semibold">Lead times: </span>
                {firstSentence(spoken(c.digest!.leadTimes), 220) ?? <span className="text-ink-muted">Not covered in the release.</span>}
              </p>
              <p className="text-body-sm text-ink">
                <span className="font-semibold">Inventory: </span>
                {firstSentence(spoken(c.digest!.inventory), 220) ?? <span className="text-ink-muted">Not covered in the release.</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {(silent.length > 0 || missing.length > 0) && (
        <p className="mt-3 text-caption text-ink-muted">
          {silent.length > 0 && `Silent on lead times and inventory: ${silent.map((c) => c.company.name).join(", ")}. `}
          {missing.length > 0 && `No summary yet: ${missing.map((c) => c.company.name).join(", ")}.`}
        </p>
      )}
    </Panel>
  );
}

export async function SupplyNews() {
  const news = await getLiveNews().catch(() => null);
  const stories = supplyStories(news?.articles ?? []);
  const angles = stories.length ? await getNewsAngles(stories).catch(() => null) : null;
  return (
    <Panel
      className="xl:col-span-5"
      title="Supply news"
      subtitle="Stories on lead times, shortages, allocation, capacity and prices"
      footer={
        <Link href="/news" className={cn(link, "ml-auto")}>
          Market News
        </Link>
      }
    >
      {stories.length === 0 ? (
        <EmptyState title="No supply stories in the last two weeks" />
      ) : (
        <ul className="divide-y divide-hairline">
          {stories.map((a) => (
            <li key={a.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className={cn(link, "min-w-0 flex-1 text-body-sm font-medium")}>
                  {a.title}
                  <span className="sr-only"> (opens {a.outlet})</span>
                </a>
                <span className="whitespace-nowrap text-caption text-ink-muted">{a.outlet}</span>
              </div>
              {angles?.byId[a.id] && <p className="mt-0.5 text-caption text-ink-muted">{angles.byId[a.id].angle}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Avnet's order book (mock) ---------- */

export async function OrderBook() {
  const { performance } = await getAvnet();
  const latest = performance[performance.length - 1];
  return (
    <section aria-labelledby="order-book" className="space-y-3">
      <h2 id="order-book" className="font-display text-section-title text-ink">
        Avnet&apos;s order book
      </h2>
      <HookupMarker ids={["backlog", "bookings"]} />
      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <Panel
          title="Backlog"
          subtitle={`Open orders at quarter end. ${latest.quarter}: $${(latest.backlog / 1000).toFixed(1)}B`}
          footer={
            <Link href="/performance" className={cn(link, "ml-auto")}>
              Performance Tracker
            </Link>
          }
        >
          <BacklogBars rows={performance} />
        </Panel>
        <Panel title="Book-to-bill" subtitle={`Orders against shipments. ${latest.quarter}: ${latest.bookToBill.toFixed(2)}`}>
          <BookToBill rows={performance} height={180} />
        </Panel>
      </div>
    </section>
  );
}
