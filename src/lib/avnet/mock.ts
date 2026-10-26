import type { AccountFigures, AccountKey, AvnetInputs, FiscalQuarter } from "./contracts";
import type { AvnetData } from "./source";
import {
  APPROVAL_RATE,
  APPROVED_PIPELINE_YEAR_AGO,
  CONCENTRATION,
  DESIGN_APPROVED_SHARE,
  MAPPED_SHARE,
  MONTHS_TO_BILLING,
  NEW_REGISTRATIONS,
  PERFORMANCE,
  PIPELINE,
  PIPELINE_BY_QUARTER,
  PIPELINE_BY_SEGMENT,
  PIPELINE_BY_SUPPLIER,
  PIPELINE_BY_VERTICAL,
  QUARTERS,
  RECENT_APPROVALS,
  REGION_PERFORMANCE,
  SEGMENT_BILLINGS,
  STALLED_REGISTRATIONS,
  SUPPLIERS,
  TOP_CUSTOMERS,
  VERTICALS,
} from "@/lib/shells/mock-avnet";
import {
  AI_DEVICES,
  FORECAST_SPREAD,
  LEAD_TIMES,
  PURCHASING,
  REGION_MARKET,
  REGION_MARKET_GROWTH,
  SEGMENT_FORECAST,
  SUPPLIER_REVENUE_GROWTH,
} from "@/lib/shells/mock-market";
import { MAPPINGS } from "@/lib/shells/mock-mapping";

// The mock adapter: the synthetic model in src/lib/shells, cut into the
// contracts. None of these numbers are real. The default until AVNET_DATA says
// otherwise.

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** "FY27 Q1" to calendar dates. Mock: calendar quarters from July; Avnet's own calendar ends quarters on a Saturday. */
export function mockQuarter(label: string): FiscalQuarter {
  const [, fy, q] = /^FY(\d\d) Q([1-4])$/.exec(label) ?? [];
  if (!fy) throw new Error(`Not a fiscal quarter label: ${label}`);
  const startMonth = 7 + 3 * (Number(q) - 1); // July, October, January, April
  const year = 2000 + Number(fy) - 1 + (startMonth > 12 ? 1 : 0);
  const m = ((startMonth - 1) % 12) + 1;
  const end = new Date(Date.UTC(year, m - 1 + 3, 0));
  return { label, start: iso(year, m, 1), end: end.toISOString().slice(0, 10) };
}

/** Every dataset at once, synchronously, for tests and scripts. */
export function mockInputs(): AvnetInputs {
  return {
    fiscalCalendar: QUARTERS.map(mockQuarter),
    performance: { quarters: PERFORMANCE, designApprovedShare: DESIGN_APPROVED_SHARE },
    segments: {
      mappedShare: MAPPED_SHARE,
      rows: SEGMENT_BILLINGS.map(({ segment, semi, billings, growth, confidence }) => ({
        segment,
        semi,
        billings,
        growth,
        confidence: confidence as "High" | "Medium" | "Low",
      })),
    },
    regions: REGION_PERFORMANCE,
    suppliers: SUPPLIERS,
    verticals: VERTICALS,
    pipeline: {
      funnel: PIPELINE,
      approvedPipelineYearAgo: APPROVED_PIPELINE_YEAR_AGO,
      newRegistrations: NEW_REGISTRATIONS,
      approvalRateYearAgo: APPROVAL_RATE.yearAgo,
      monthsToBilling: MONTHS_TO_BILLING,
      byQuarter: PIPELINE_BY_QUARTER,
      bySupplier: PIPELINE_BY_SUPPLIER,
      bySegment: PIPELINE_BY_SEGMENT,
      byVertical: PIPELINE_BY_VERTICAL,
      stalled: STALLED_REGISTRATIONS,
      recent: RECENT_APPROVALS,
    },
    customers: { concentration: CONCENTRATION, top: TOP_CUSTOMERS },
    codeMap: MAPPINGS,
    supply: { leadTimes: LEAD_TIMES, purchasing: PURCHASING },
    markets: {
      segments: SEGMENT_BILLINGS.map(({ segment, market, marketGrowth }) => ({ segment, market, marketGrowth })),
      regions: Object.keys(REGION_MARKET).map((region) => ({
        region: region as "Americas" | "EMEA" | "Asia",
        market: REGION_MARKET[region],
        growth: REGION_MARKET_GROWTH[region],
      })),
      supplierRevenueGrowth: SUPPLIER_REVENUE_GROWTH,
      forecast: SEGMENT_FORECAST,
      spread: FORECAST_SPREAD,
      aiDevices: AI_DEVICES,
    },
  };
}

/** Deterministic mock figures per company, so a profile doesn't change between visits. */
function seeded(slug: string, salt: number, min: number, max: number): number {
  let h = 2166136261 ^ salt;
  for (const ch of slug) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return min + ((h >>> 0) % 1000) / 1000 * (max - min);
}

export function mockAccount({ slug, supplier }: AccountKey): AccountFigures {
  const billings = seeded(slug, 1, 40, 900);
  return {
    billings,
    backlog: billings * seeded(slug, 2, 0.3, 0.8),
    ...(supplier ? { openRegistrations: Math.round(seeded(slug, 3, 40, 1400)) } : { openQuotes: Math.round(seeded(slug, 4, 20, 600)) }),
  };
}

export function mockSource(): AvnetData {
  const d = mockInputs();
  return {
    name: "mock",
    fiscalCalendar: async () => d.fiscalCalendar,
    performance: async () => d.performance,
    segments: async () => d.segments,
    regions: async () => d.regions,
    suppliers: async () => d.suppliers,
    verticals: async () => d.verticals,
    pipeline: async () => d.pipeline,
    customers: async () => d.customers,
    codeMap: async () => d.codeMap,
    supply: async () => d.supply,
    markets: async () => d.markets,
    account: async (company) => mockAccount(company),
  };
}
