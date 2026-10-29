import Link from "next/link";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getSegmentHistory } from "@/lib/data/live/segment-history";
import { VIZ } from "@/lib/colors";
import { getAvnet } from "@/lib/avnet";
import { fmtM } from "@/lib/avnet/format";
import { fullQuarter } from "@/lib/share/peers";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Panel, SourceLine } from "@/components/ui/panel";
import { DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/states";
import { BillingsBookingsChart, BookToBillChart, Key, SegmentRevenueChart } from "./charts";
import { RegionTable } from "./region-table";

// Avnet's own numbers come from src/lib/avnet (mock until AVNET_DATA points at
// Avnet's tables). "What Avnet reports" is live SEC data, kept in its own section.

/** The latest quarter, the same quarter a year ago, and the run of book-to-bill above 1. */
async function figures() {
  const m = await getAvnet();
  const p = m.performance;
  let aboveOne = 0;
  for (let i = p.length - 1; i >= 0 && p[i].bookToBill > 1; i--) aboveOne++;
  return { m, latest: p[p.length - 1], yearAgo: p[p.length - 5], quarter: m.quarters[m.quarters.length - 1], quartersAboveOne: aboveOne };
}

/* ---------- Headline ---------- */

export async function PerformanceKpis() {
  const { m, latest, yearAgo, quartersAboveOne } = await figures();
  const ttmGrowth = m.ttmBillings / m.ttmBillingsYearAgo - 1;
  const backlogGrowth = latest.backlog / yearAgo.backlog - 1;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile label="Billings, last 12 months" value={fmtM(m.ttmBillings)} delta={{ value: ttmGrowth, period: "YoY" }} source={{ status: m.status }} />
        <KpiTile
          label="Book-to-bill"
          value={latest.bookToBill.toFixed(2)}
          note={quartersAboveOne ? `above 1 for ${quartersAboveOne} quarters` : "below 1"}
          source={{ status: m.status }}
        />
        <KpiTile label="Backlog" value={fmtM(latest.backlog)} delta={{ value: backlogGrowth, period: "YoY" }} source={{ status: m.status }} />
        <KpiTile label="Design-approved billings" value={`${Math.round(m.designApprovedShare * 100)}%`} note="share of billings" source={{ status: m.status }} />
      </div>
      <HookupMarker ids={["billings", "bookings", "backlog", "drms"]} />
    </div>
  );
}

/* ---------- Billings, bookings, book-to-bill ---------- */

export async function DemandRow() {
  const { m, latest, yearAgo, quarter, quartersAboveOne } = await figures();
  const bookingsGrowth = latest.bookings / yearAgo.bookings - 1;
  return (
    <div className="space-y-2">
      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-8"
          title="Billings and bookings"
          subtitle={`${quarter}: billings ${fmtM(latest.billings)}, bookings ${fmtM(latest.bookings)}, up ${Math.round(bookingsGrowth * 100)}% on a year ago`}
          actions={<Key items={[{ label: "Billings", color: VIZ.avnet }, { label: "Bookings", color: VIZ.avnet2 }]} />}
          footer={<SourceLine source="Avnet billings and bookings by fiscal quarter" asOf={quarter} />}
        >
          <div className="h-64">
            <BillingsBookingsChart data={m.performance.map((p) => ({ quarter: p.quarter, billings: p.billings, bookings: p.bookings }))} />
          </div>
        </Panel>
        <Panel
          className="xl:col-span-4"
          title="Book-to-bill"
          subtitle={quartersAboveOne ? `Orders have run ahead of billings for ${quartersAboveOne} quarters` : "Orders are running behind billings"}
          footer={<SourceLine source="Bookings ÷ billings" asOf={quarter} />}
        >
          <div className="h-64">
            <BookToBillChart data={m.performance.map((p) => ({ quarter: p.quarter, bookToBill: p.bookToBill }))} />
          </div>
        </Panel>
      </div>
      <HookupMarker ids={["billings", "bookings", "fiscal-calendar"]} />
    </div>
  );
}

/* ---------- By region ---------- */

export async function RegionCard() {
  const { m, quarter } = await figures();
  const total = m.regionPerformance.reduce((s, r) => s + r.billings, 0);
  const rows = m.regionPerformance.map((r) => ({ ...r, share: r.billings / total }));
  const fastest = [...rows].sort((a, b) => b.growth - a.growth)[0];
  return (
    <div className="space-y-2">
      <Panel
        title="By region"
        subtitle={`${fastest.region} is growing fastest, ${Math.round(fastest.growth * 100)}% on a year ago`}
        bodyClassName="px-0 pb-0"
        footer={<SourceLine source="Avnet billings, bookings and backlog by region, in US dollars at constant rates" asOf={quarter} />}
      >
        <RegionTable rows={rows} />
      </Panel>
      <HookupMarker ids={["billings", "bookings", "backlog", "fx-rates"]} />
    </div>
  );
}

/* ---------- Suppliers and end markets ---------- */

function BarRows({ items }: { items: { label: string; value: number; display: string; growth?: number; grey?: boolean }[] }) {
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-body-sm">
            <span className="truncate text-ink" title={i.label}>
              {i.label}
            </span>
            <span className="flex items-baseline gap-3 whitespace-nowrap tabular-nums text-ink">
              {i.display}
              {i.growth !== undefined && <Delta value={i.growth} period="YoY" />}
            </span>
          </div>
          <div className="mt-1 h-2" aria-hidden>
            <div className={`h-full ${i.grey ? "bg-viz-other" : "bg-viz-avnet"}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function SupplierCard() {
  const { m } = await figures();
  const named = m.suppliers.filter((s) => s.revenue > 0);
  const topShare = named.reduce((s, x) => s + x.share, 0);
  return (
    <Panel
      title="Supplier concentration"
      subtitle={`The top ${named.length} suppliers make up ${Math.round(topShare * 100)}% of billings. Names withheld in mock`}
      actions={<DataChip status={m.status} />}
      footer={<SourceLine source="Avnet billings by manufacturer, last 12 months" />}
      className="h-full"
    >
      <BarRows items={m.suppliers.map((s) => ({ label: s.name, value: s.billings, display: fmtM(s.billings), growth: s.growth, grey: s.revenue === 0 }))} />
    </Panel>
  );
}

export async function EndMarketCard() {
  const { m } = await figures();
  const fastest = [...m.verticals].sort((a, b) => b.growth - a.growth)[0];
  return (
    <Panel
      title="End markets"
      subtitle={`${fastest.name} is growing fastest, ${Math.round(fastest.growth * 100)}% on a year ago`}
      actions={<DataChip status={m.status} />}
      footer={<SourceLine source="Avnet billings by customer vertical, last 12 months" />}
      className="h-full"
    >
      <BarRows items={m.verticals.map((v) => ({ label: v.name, value: v.billings, display: fmtM(v.billings), growth: v.growth }))} />
    </Panel>
  );
}

/* ---------- What Avnet reports (live) ---------- */

export async function ReportedCard() {
  const { latest } = await figures();
  const [history, earnings] = await Promise.all([getSegmentHistory("avnet"), getCompanyEarnings("avnet")]);
  const total = earnings.quarters.filter((q) => q.values.revenue !== undefined).slice(-8);
  if (!total.length) {
    return (
      <Panel title="What Avnet reports">
        <ErrorState title="Couldn't load Avnet's filings" source="SEC EDGAR" detail={earnings.error ?? "Try again in a few minutes."} />
      </Panel>
    );
  }

  // Segments when the filing documents could be read; otherwise total revenue only.
  const segments = history.segments.filter((s) => s.points.some((p) => p.revenue !== undefined)).slice(0, 2);
  const labels = total.map((q) => q.calendarLabel);
  const colors = [VIZ.avnet, VIZ.avnet2];
  const series = segments.length
    ? segments.map((s, i) => ({ key: `s${i}`, name: s.label.replace(/ segment$/i, ""), color: colors[i] }))
    : [{ key: "total", name: "Revenue", color: VIZ.avnet }];
  const data = labels.map((label) => {
    const row: Record<string, number | string | undefined> = { label };
    const toM = (v?: number) => (v === undefined ? undefined : v / 1e6); // filings report whole dollars
    if (segments.length) segments.forEach((s, i) => (row[`s${i}`] = toM(s.points.find((p) => p.label === label)?.revenue)));
    else row.total = toM(total.find((q) => q.calendarLabel === label)?.values.revenue);
    return row;
  });

  const last = total[total.length - 1];
  const reported = last.values.revenue! / 1e6; // $M
  const gap = reported / latest.billings - 1;

  return (
    <Panel
      title="What Avnet reports"
      subtitle={`Reported revenue was ${fmtM(reported)} in ${last.fiscalLabel}. Mock billings above are ${Math.abs(Math.round(gap * 100))}% ${gap >= 0 ? "lower" : "higher"}`}
      actions={<DataChip status="live" label="SEC EDGAR" />}
      footer={
        <SourceLine source={segments.length ? "Segment revenue, 10-Q and 10-K" : "Revenue, 10-Q and 10-K"} asOf={fullQuarter(last.calendarLabel)}>
          <Link href="/network/avnet" className="ml-auto text-ink underline-offset-2 hover:underline">
            Avnet&apos;s profile
          </Link>
        </SourceLine>
      }
    >
      {data.length > 1 ? (
        <div className="h-56">
          <SegmentRevenueChart data={data} series={series} />
        </div>
      ) : (
        <EmptyState title="Not enough reported quarters yet" />
      )}
      <p className="mt-3 max-w-prose text-caption text-ink-muted">
        Reported revenue and internal billings measure different things: revenue is recognised under accounting rules and includes items billings
        leave out. Once billings are hooked up, the gap here becomes a reconciliation check.
      </p>
    </Panel>
  );
}

export function ReportedFallback() {
  return (
    <Panel title="What Avnet reports">
      <LoadingBlock label="Loading Avnet's filings…" lines={6} />
    </Panel>
  );
}
