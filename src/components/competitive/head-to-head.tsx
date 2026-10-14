import Link from "next/link";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import type { Metric, Quarter } from "@/lib/data/live/earnings-model";
import { getSegmentHistory, type MemberSeries, type SeriesPoint } from "@/lib/data/live/segment-history";
import { AVNET } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { GroupLines, type ChartRow, type Unit } from "@/components/charts/cycle-charts";
import { DASH, earningsHref, format, longDate, type Kind } from "@/components/earnings/format";
import { cn } from "@/lib/utils";

// The two sides, and which of each company's segments is its components
// distribution business (the like-for-like comparison) versus the rest.
const A = { slug: "avnet", components: /ElectronicComponents/i };
const B = { slug: "arrow", components: /GlobalComponents/i };
// Avnet Green only ever represents Avnet.
const COLORS = [AVNET.green, AVNET.blueDark] as const;

const order = (label: string) => {
  const m = label.match(/^CY(\d+) Q(\d)$/);
  return m ? Number(m[1]) * 4 + Number(m[2]) : -1;
};
const byOrder = (a: string, b: string) => order(a) - order(b);
const shared = (a: string[], b: string[]) => a.filter((l) => b.includes(l)).sort(byOrder);

interface Row {
  label: string;
  metric: Metric;
  kind: Kind;
  /** Which direction counts as the stronger position; null when neither does. */
  higherIsBetter: boolean | null;
}

const SCORECARD: Row[] = [
  { label: "Revenue", metric: "revenue", kind: "usd", higherIsBetter: null },
  { label: "Revenue growth, year over year", metric: "revenueYoY", kind: "growth", higherIsBetter: true },
  { label: "Revenue growth, quarter over quarter", metric: "revenueQoQ", kind: "growth", higherIsBetter: true },
  { label: "Gross margin", metric: "grossMargin", kind: "pct", higherIsBetter: true },
  { label: "SG&A, % of revenue", metric: "sgaPct", kind: "pct", higherIsBetter: false },
  { label: "Operating margin", metric: "operatingMargin", kind: "pct", higherIsBetter: true },
  { label: "Net margin", metric: "netMargin", kind: "pct", higherIsBetter: true },
  { label: "Inventory days", metric: "inventoryDays", kind: "days", higherIsBetter: false },
  // Receivable, payable and cash-cycle days are not marked: see the note on Arrow below.
  { label: "Receivable days", metric: "receivableDays", kind: "days", higherIsBetter: null },
  { label: "Payable days", metric: "payableDays", kind: "days", higherIsBetter: null },
  { label: "Cash conversion cycle, days", metric: "cashCycleDays", kind: "days", higherIsBetter: null },
  { label: "Free cash flow margin", metric: "fcfMargin", kind: "pct", higherIsBetter: true },
  { label: "Long-term debt", metric: "longTermDebt", kind: "usd", higherIsBetter: null },
];

function gap(kind: Kind, a: number | undefined, b: number | undefined): string {
  if (a === undefined || b === undefined) return DASH;
  const d = a - b;
  const sign = d >= 0 ? "+" : "−";
  if (kind === "pct" || kind === "growth") return `${sign}${(Math.abs(d) * 100).toFixed(1)} pts`;
  if (kind === "days") return `${sign}${Math.round(Math.abs(d))}`;
  // For dollar amounts a ratio reads better than a difference.
  return b ? `${(a / b).toFixed(2)}×` : DASH;
}

/** The side with the stronger figure gets a marker; the numbers themselves stay in plain ink. */
function Lead({ show }: { show: boolean }) {
  return show ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink align-middle" aria-label="stronger" /> : <span className="ml-1.5 inline-block w-1.5" />;
}

const REGIONS = ["Americas", "EMEA", "Asia"] as const;
function regionOf(key: string): (typeof REGIONS)[number] | undefined {
  if (/Americas/.test(key)) return "Americas";
  if (/EMEA|Europe/.test(key)) return "EMEA";
  if (/Asia/.test(key)) return "Asia";
  return undefined;
}

const at = (s: MemberSeries | undefined, label: string): SeriesPoint | undefined => s?.points.find((p) => p.label === label);
const pct = (v: number | undefined) => (v === undefined ? DASH : `${(v * 100).toFixed(1)}%`);
const share = (v: number | undefined) => (v === undefined ? DASH : `${Math.round(v * 100)}%`);

function SegmentRows({ name, series, label, total }: { name: string; series: MemberSeries[]; label: string; total: number | undefined }) {
  return (
    <>
      {series.map((s) => {
        const p = at(s, label);
        return (
          <tr key={`${name}-${s.key}`} className="border-b border-line last:border-b-0">
            <th scope="row" className="px-4 py-1.5 text-left font-normal">
              <span className="text-muted">{name} · </span>
              <span className="font-medium text-ink">{s.label}</span>
            </th>
            <td className="px-3 py-1.5 text-right tabular text-ink">{format("usd", p?.revenue)}</td>
            <td className="px-3 py-1.5 text-right tabular text-muted">{share(p?.revenue !== undefined && total ? p.revenue / total : undefined)}</td>
            <td className="px-3 py-1.5 text-right tabular text-ink">{p?.yoy === undefined ? DASH : format("growth", p.yoy)}</td>
            <td className="px-3 py-1.5 text-right tabular text-ink">{pct(p?.grossMargin)}</td>
            <td className="px-3 py-1.5 text-right tabular text-ink">{pct(p?.operatingMargin)}</td>
          </tr>
        );
      })}
    </>
  );
}

/** Server component: reads both companies' filings, so the page streams it in. */
export async function HeadToHead() {
  const [ea, eb, sa, sb] = await Promise.all([getCompanyEarnings(A.slug), getCompanyEarnings(B.slug), getSegmentHistory(A.slug), getSegmentHistory(B.slug)]);
  const nameA = ea.company.name;
  const nameB = eb.company.name.replace(/ Electronics$/, "");
  const qa = new Map<string, Quarter>(ea.quarters.map((q) => [q.calendarLabel, q]));
  const qb = new Map<string, Quarter>(eb.quarters.map((q) => [q.calendarLabel, q]));
  const labels = shared(Array.from(qa.keys()), Array.from(qb.keys()));
  const latest = labels[labels.length - 1];

  if (!latest) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-muted">The two companies&apos; filings could not be loaded from SEC EDGAR right now.</p>
      </Card>
    );
  }
  const a = qa.get(latest)!;
  const b = qb.get(latest)!;

  const trend = (metric: Metric): ChartRow[] => labels.map((label) => ({ label, [nameA]: qa.get(label)?.values[metric], [nameB]: qb.get(label)?.values[metric] }));
  const charts: { title: string; subtitle: string; metric: Metric; unit: Unit }[] = [
    { title: "Revenue growth", subtitle: "Year over year", metric: "revenueYoY", unit: "pct" },
    { title: "Gross margin", subtitle: "Share of revenue", metric: "grossMargin", unit: "pctWhole" },
    { title: "Operating margin", subtitle: "Share of revenue", metric: "operatingMargin", unit: "pctWhole" },
    { title: "Inventory days", subtitle: "Quarter-end inventory against 91 days of cost", metric: "inventoryDays", unit: "days" },
  ];

  // Components against components.
  const compA = sa.segments.find((s) => A.components.test(s.key));
  const compB = sb.segments.find((s) => B.components.test(s.key));
  const segLabels = shared(compA?.points.map((p) => p.label) ?? [], compB?.points.map((p) => p.label) ?? []);
  const segLatest = segLabels[segLabels.length - 1];
  const nameCompA = `${nameA} ${compA?.label ?? "components"}`;
  const nameCompB = `${nameB} ${compB?.label ?? "components"}`;
  const compRevenue: ChartRow[] = segLabels.map((label) => ({ label, [nameCompA]: at(compA, label)?.revenue, [nameCompB]: at(compB, label)?.revenue }));
  const compMargin: ChartRow[] = segLabels.map((label) => ({
    label,
    [nameCompA]: at(compA, label)?.operatingMargin,
    [nameCompB]: at(compB, label)?.operatingMargin,
  }));
  const compShare: ChartRow[] = segLabels.map((label) => {
    const x = at(compA, label)?.revenue;
    const y = at(compB, label)?.revenue;
    return { label, [`${nameA} share`]: x !== undefined && y !== undefined && x + y > 0 ? x / (x + y) : undefined };
  });
  const totalAt = (segments: MemberSeries[], label: string) => segments.reduce((sum, s) => sum + (at(s, label)?.revenue ?? 0), 0) || undefined;

  // Regions, on the three both companies report.
  const regionLabels = shared(sa.regions[0]?.points.map((p) => p.label) ?? [], sb.regions[0]?.points.map((p) => p.label) ?? []);
  const regionLatest = regionLabels[regionLabels.length - 1];
  const region = (series: MemberSeries[], name: (typeof REGIONS)[number]) => series.find((s) => regionOf(s.key) === name);
  const regionTotal = (series: MemberSeries[]) => (regionLatest ? REGIONS.reduce((sum, r) => sum + (at(region(series, r), regionLatest)?.revenue ?? 0), 0) || undefined : undefined);
  const totalRegA = regionTotal(sa.regions);
  const totalRegB = regionTotal(sb.regions);
  const segmentError = sa.error ?? sb.error;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h2 className="font-display text-lg uppercase tracking-wide text-ink">
          {nameA} vs {nameB} <span className="text-muted">· {latest}</span>
        </h2>
        <p className="text-xs text-muted">
          {nameA} {a.fiscalLabel}, quarter ended {longDate(a.end)} · {nameB} {b.fiscalLabel}, quarter ended {longDate(b.end)}
        </p>
      </div>

      <Card title="Whole company" subtitle={`${latest} · a dot marks the stronger figure where one direction is clearly better`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-4 py-2 text-left font-normal">
                  Measure
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  <Link href={earningsHref(A.slug, "all")} className="inline-flex items-center gap-1.5 hover:text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />
                    {nameA}
                  </Link>
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  <Link href={earningsHref(B.slug, "all")} className="inline-flex items-center gap-1.5 hover:text-ink">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-dark" />
                    {nameB}
                  </Link>
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  {nameA} vs {nameB}
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORECARD.map((row) => {
                const x = a.values[row.metric];
                const y = b.values[row.metric];
                const comparable = row.higherIsBetter !== null && x !== undefined && y !== undefined && x !== y;
                const aLeads = comparable && x! > y! === row.higherIsBetter;
                return (
                  <tr key={row.metric} className="border-b border-line last:border-b-0 hover:bg-canvas">
                    <th scope="row" className="px-4 py-1.5 text-left font-normal text-ink">
                      {row.label}
                    </th>
                    <td className={cn("px-3 py-1.5 text-right tabular text-ink", aLeads && "font-medium")}>
                      {format(row.kind, x)}
                      <Lead show={aLeads} />
                    </td>
                    <td className={cn("px-3 py-1.5 text-right tabular text-ink", comparable && !aLeads && "font-medium")}>
                      {format(row.kind, y)}
                      <Lead show={comparable && !aLeads} />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular text-muted">{gap(row.kind, x, y)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {charts.map((c) => (
          <Card key={c.metric} title={c.title} subtitle={`${c.subtitle} · by calendar quarter`}>
            <GroupLines rows={trend(c.metric)} series={[nameA, nameB]} unit={c.unit} colors={COLORS} />
          </Card>
        ))}
      </div>

      {!segLatest ? (
        <Card title="Components against components">
          <p className="py-6 text-center text-sm text-muted">
            Segment detail could not be read from the filing documents{segmentError ? `: ${segmentError}` : "."}
          </p>
        </Card>
      ) : (
        <>
          <Card
            title="Segments"
            subtitle={`${segLatest} · ${compA?.label} and ${compB?.label} are the like-for-like components businesses; the others have no direct counterpart`}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                    <th scope="col" className="px-4 py-2 text-left font-normal">
                      Segment
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Revenue
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Of company
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Growth YoY
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Gross margin
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Op margin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <SegmentRows name={nameA} series={sa.segments} label={segLatest} total={totalAt(sa.segments, segLatest)} />
                  <SegmentRows name={nameB} series={sb.segments} label={segLatest} total={totalAt(sb.segments, segLatest)} />
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Components revenue" subtitle="By calendar quarter">
              <GroupLines rows={compRevenue} series={[nameCompA, nameCompB]} unit="usd" colors={COLORS} />
            </Card>
            <Card title="Components operating margin" subtitle="Segment operating income over segment revenue">
              <GroupLines rows={compMargin} series={[nameCompA, nameCompB]} unit="pctWhole" colors={COLORS} />
            </Card>
            <Card title="Relative share" subtitle={`${nameA}'s share of the two components businesses combined`}>
              <GroupLines rows={compShare} series={[`${nameA} share`]} unit="pctWhole" colors={COLORS} />
            </Card>
          </div>
        </>
      )}

      {regionLatest && (
        <Card title="Regional mix" subtitle={`${regionLatest} · whole-company revenue by where it is sold`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-2 text-left font-normal">
                    Region
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    {nameA} revenue
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Share
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Growth YoY
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    {nameB} revenue
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Share
                  </th>
                  <th scope="col" className="px-3 py-2 font-normal">
                    Growth YoY
                  </th>
                </tr>
              </thead>
              <tbody>
                {REGIONS.map((r) => {
                  const x = at(region(sa.regions, r), regionLatest);
                  const y = at(region(sb.regions, r), regionLatest);
                  return (
                    <tr key={r} className="border-b border-line last:border-b-0 hover:bg-canvas">
                      <th scope="row" className="px-4 py-1.5 text-left font-normal font-medium text-ink">
                        {r}
                      </th>
                      <td className="px-3 py-1.5 text-right tabular text-ink">{format("usd", x?.revenue)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-muted">{share(x?.revenue !== undefined && totalRegA ? x.revenue / totalRegA : undefined)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-ink">{x?.yoy === undefined ? DASH : format("growth", x.yoy)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-ink">{format("usd", y?.revenue)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-muted">{share(y?.revenue !== undefined && totalRegB ? y.revenue / totalRegB : undefined)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-ink">{y?.yoy === undefined ? DASH : format("growth", y.yoy)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="px-1 text-2xs text-muted">
        Both companies&apos; figures come from their SEC filings (GAAP, as reported) and are lined up on calendar quarters, because
        {` ${nameA}`}&apos;s fiscal year ends in June and {nameB}&apos;s in December. Whole-company measures use the structured
        financial data; segment and region figures are read from the last six 10-Q and 10-K documents, with fourth quarters
        backed out of the annual report. Segment margins use each company&apos;s own definition of segment operating income,
        which excludes corporate costs and, for {nameA}, restructuring charges, so they are not strictly like for like. {nameB}&apos;s
        receivable and payable days run far above {nameA}&apos;s; that is consistent with its enterprise computing business
        reporting some sales net while carrying the receivables and payables gross, so those rows and the cash conversion
        cycle are not a clean comparison. The &quot;vs&quot; column is a difference in points or days, or a ratio for dollar amounts. Line cards, customer counts,
        design wins and pricing are not in filings.
      </p>
    </>
  );
}

export function HeadToHeadFallback() {
  return (
    <Card title="Reading filings" subtitle="Reading both companies' recent 10-Q and 10-K documents from SEC EDGAR. The first load can take a minute.">
      <div className="space-y-2" role="status" aria-label="Loading the comparison">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
