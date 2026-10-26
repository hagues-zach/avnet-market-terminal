import type { AvnetInputs, Mapping, RegionRow, SegmentRow, SupplierRow } from "./contracts";
import { STATUS_LABEL, segmentShort } from "./format";

// The figures pages show, derived from the source data the same way whichever
// adapter supplied it. Pure: no fetching. buildModel is what getAvnet() returns.

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** A segment's billings against its market: Avnet's share and its change on a year ago. */
export interface SegmentBillings extends SegmentRow {
  /** Market size, $M, latest four quarters. */
  market: number;
  marketGrowth: number;
  share: number;
  /** Change in share on a year ago, in fractions (0.002 is 0.2 points). */
  shareChange: number;
}

export interface ShareRow {
  name: string;
  /** Market size, US$ billions. */
  tam: number;
  share: number;
  shareChange: number;
  confidence: string;
}

/** Trailing 12 months of billings, $M, now and a year earlier. */
export function trailing(quarters: { billings: number }[]) {
  const billings = quarters.map((q) => q.billings);
  return { now: sum(billings.slice(-4)), yearAgo: sum(billings.slice(-8, -4)) };
}

/** Each segment's billings joined to its market size. A segment without a market is left out. */
export function segmentBillings(rows: SegmentRow[], markets: AvnetInputs["markets"]["segments"]): SegmentBillings[] {
  return rows.flatMap((row) => {
    const m = markets.find((x) => x.segment === row.segment);
    if (!m) return [];
    const share = row.billings / m.market;
    const shareYearAgo = row.billings / (1 + row.growth) / (m.market / (1 + m.marketGrowth));
    return [{ ...row, market: m.market, marketGrowth: m.marketGrowth, share, shareChange: share - shareYearAgo }];
  });
}

/**
 * Share of the mapped market by quarter. The latest point is the trailing
 * 12-month share; earlier points follow quarterly billings against a market
 * growing at the mapped segments' blended rate.
 */
export function shareTrend(byQuarter: { quarter: string; billings: number }[], segments: SegmentBillings[]) {
  const mappedMarket = segments.reduce((a, s) => a + s.market, 0);
  const mappedBillings = segments.reduce((a, s) => a + s.billings, 0);
  const marketGrowth = segments.reduce((a, s) => a + s.market * s.marketGrowth, 0) / mappedMarket;
  const shareNow = mappedBillings / mappedMarket;
  const last = byQuarter[byQuarter.length - 1].billings;
  return byQuarter.map(({ quarter, billings }, i) => {
    const quartersBack = byQuarter.length - 1 - i;
    return { label: quarter, "Avnet share of mapped TAM": shareNow * (billings / last) * (1 + marketGrowth) ** (quartersBack / 4) };
  });
}

/** Avnet billings of each supplier's parts ÷ that supplier's reported revenue. "Market size" is the supplier's revenue, $B. */
export function shareBySupplier(suppliers: SupplierRow[], revenueGrowth: number): ShareRow[] {
  return suppliers
    .filter((s) => s.revenue > 0)
    .map((s) => {
      const share = s.billings / (s.revenue * 1000);
      return { name: s.name, tam: s.revenue, share, shareChange: share - (share / (1 + s.growth)) * (1 + revenueGrowth), confidence: s.confidence };
    });
}

/** Avnet semiconductor billings in a region ÷ that region's market. Billings in a region are taken at the semiconductor share of all billings. */
export function shareByRegion(regions: RegionRow[], markets: AvnetInputs["markets"]["regions"], semiShare: number): ShareRow[] {
  return regions.flatMap((r) => {
    const m = markets.find((x) => x.region === r.region);
    if (!m) return [];
    const share = (r.ttm * semiShare) / (m.market * 1000);
    return [{ name: r.region, tam: m.market, share, shareChange: share - (share / (1 + r.growth)) * (1 + m.growth), confidence: "High" }];
  });
}

/** Validated categories a month ago, for the KPI's change. */
export const validatedMonthAgo = (mappings: Mapping[]) =>
  mappings.filter((m) => m.status === "validated" && (m.history.at(-1)?.daysAgo ?? 0) > 30).length;

/**
 * Every figure the pages read. `source` names the adapter; `mocked` lists datasets
 * an adapter took from the mock (AVNET_MOCK_DATASETS).
 */
export function buildModel(d: AvnetInputs, source = "mock", mocked: readonly string[] = []) {
  const performance = d.performance.quarters;
  const quarters = performance.map((q) => q.quarter);
  const billingsByQuarter = performance.map(({ quarter, billings }) => ({ quarter, billings }));
  const ttm = trailing(performance);
  const mappedBillings = ttm.now * d.segments.mappedShare;
  const segments = segmentBillings(d.segments.rows, d.markets.segments);
  const semiBillings = sum(segments.filter((s) => s.semi).map((s) => s.billings));
  const { funnel } = d.pipeline;
  const approvedPipeline = funnel.approved.value - funnel.billing.value;

  return {
    source,
    /** Datasets taken from the mock, if any. */
    mocked: [...mocked],
    /** For data chips: live only when every figure comes from Avnet's tables, so a mock number is never labelled live. */
    status: (source === "mock" || mocked.length ? "mock" : "live") as "mock" | "live",
    fiscalCalendar: d.fiscalCalendar,
    quarters,
    performance,
    billingsByQuarter,
    ttmBillings: ttm.now,
    ttmBillingsYearAgo: ttm.yearAgo,
    mappedShare: d.segments.mappedShare,
    mappedBillings,
    designApprovedShare: d.performance.designApprovedShare,

    segments: d.segments.rows.map((s) => s.segment),
    semiSegments: d.segments.rows.filter((s) => s.semi).map((s) => s.segment),
    segmentBillings: segments,
    semiBillings,
    regionPerformance: d.regions,
    suppliers: d.suppliers,
    verticals: d.verticals,

    pipeline: funnel,
    approvedPipeline,
    approvedPipelineYearAgo: d.pipeline.approvedPipelineYearAgo,
    newRegistrations: d.pipeline.newRegistrations,
    approvalRate: { now: funnel.approved.count / funnel.submitted.count, yearAgo: d.pipeline.approvalRateYearAgo },
    monthsToBilling: d.pipeline.monthsToBilling,
    pipelineByQuarter: d.pipeline.byQuarter,
    pipelineBySupplier: d.pipeline.bySupplier,
    pipelineBySegment: d.pipeline.bySegment,
    pipelineByVertical: d.pipeline.byVertical,
    stalledRegistrations: d.pipeline.stalled,
    recentApprovals: d.pipeline.recent,

    concentration: d.customers.concentration,
    topCustomers: d.customers.top,

    mappings: d.codeMap,
    validatedMonthAgo: validatedMonthAgo(d.codeMap),
    /** The shell spec's example rows. */
    mappingRows: d.codeMap
      .filter((_, i) => i % 23 === 0)
      .map((m) => ({
        external: `${m.source} › ${segmentShort(m.segment)} › ${m.name}`,
        avnet: m.codes.join(", ") || "Not mapped",
        pcc: m.pcc ?? "Not mapped",
        confidence: m.confidence ?? "Not mapped",
        status: STATUS_LABEL[m.status],
      })),

    shareBySegment: segments.map((s) => ({
      segment: s.segment,
      tam: Math.round(s.market / 100) / 10,
      share: s.share,
      shareChange: s.shareChange,
      confidence: s.confidence,
    })),
    shareTrend: shareTrend(billingsByQuarter, segments),
    shareBySupplier: shareBySupplier(d.suppliers, d.markets.supplierRevenueGrowth),
    shareByRegion: shareByRegion(d.regions, d.markets.regions, semiBillings / ttm.now),

    leadTimes: d.supply.leadTimes,
    purchasing: d.supply.purchasing,
    segmentForecast: d.markets.forecast,
    forecastSpread: d.markets.spread,
    aiDevices: d.markets.aiDevices,
  };
}

export type AvnetModel = ReturnType<typeof buildModel>;
