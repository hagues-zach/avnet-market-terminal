import { fmtM } from "@/lib/avnet/format";
import { count, funnel, weakestStep, type FunnelStage, type WaterfallStep } from "./diagrams";
import type { FinReading } from "./financials";

// What Avnet's operating KPIs say (Performance hub, Design Pipeline, Customers),
// in words and diagram steps. Pure. Amounts are $M, as the Avnet model keeps them.

const pct = (v: number) => `${Math.round(v * 100)}%`;
const upDown = (v: number) => (Math.abs(v) < 0.005 ? "level with" : `${v > 0 ? "up" : "down"} ${pct(Math.abs(v))} on`);

// Backlog -------------------------------------------------------------------

export interface BacklogQuarter {
  quarter: string;
  bookings: number;
  billings: number;
  /** At quarter end. */
  backlog: number;
}

/** Changes smaller than this share of backlog don't get their own row. */
const OTHER_MIN = 0.005;

/**
 * The quarter's backlog rolled forward: the opening backlog, plus bookings, less
 * billings, plus or minus whatever else moved it (cancellations, currency), to the
 * reported closing backlog. The closing total is always the reported figure.
 */
export function backlogSteps(prev: BacklogQuarter, q: BacklogQuarter): WaterfallStep[] {
  const other = q.backlog - (prev.backlog + q.bookings - q.billings);
  return [
    { label: `Backlog at end of ${prev.quarter}`, kind: "total", value: prev.backlog },
    { label: "Bookings", kind: "step", value: q.bookings },
    { label: "Billings", kind: "step", value: -q.billings },
    ...(Math.abs(other) >= OTHER_MIN * q.backlog ? [{ label: "Cancellations and other changes", kind: "step" as const, value: other }] : []),
    { label: `Backlog at end of ${q.quarter}`, kind: "total", value: q.backlog },
  ];
}

/** Backlog over one quarter of billings: quarters of shipments already on order. */
export const coverage = (q: BacklogQuarter) => (q.billings > 0 ? q.backlog / q.billings : 0);

export function readBacklog(prev: BacklogQuarter, q: BacklogQuarter): FinReading {
  const c = coverage(q);
  const move = q.backlog - prev.backlog;
  const dir = Math.round(move) === 0 ? "held level" : move > 0 ? `grew ${fmtM(move)}` : `fell ${fmtM(-move)}`;
  return {
    lead: `Avnet has ${c.toFixed(1)} quarters of shipments already on order.`,
    sentence: `In ${q.quarter}, Avnet booked ${fmtM(q.bookings)} and billed ${fmtM(q.billings)}, so backlog ${dir} to ${fmtM(q.backlog)}.`,
    note: `Backlog of ${fmtM(q.backlog)} against ${fmtM(q.billings)} of billings a quarter is ${c.toFixed(1)} quarters of cover. Bookings above billings, a book-to-bill above 1, is what makes it grow.`,
  };
}

// Billings, last 12 months --------------------------------------------------

export function readTtmBillings(quarters: { quarter: string; billings: number }[], ttm: number, ttmYearAgo: number): FinReading {
  const last = quarters.slice(-4);
  const g = ttmYearAgo > 0 ? ttm / ttmYearAgo - 1 : 0;
  const range = last.length ? `${last[0].quarter} to ${last[last.length - 1].quarter}` : "the last four quarters";
  return {
    lead: `Avnet billed ${fmtM(ttm)} over the last four quarters, ${upDown(g)} the four before.`,
    sentence: `${range}: ${last.map((q) => `${q.quarter} ${fmtM(q.billings)}`).join(", ")}.`,
    note: "A single quarter swings with the seasons and with large orders. Four quarters added together show the trend.",
  };
}

// Design-approved billings --------------------------------------------------

export function readDesignApproved(share: number, ttm: number): FinReading & { approved: number } {
  const approved = ttm * share;
  return {
    approved,
    lead: `${pct(share)} of Avnet's billings come from parts it helped design in.`,
    sentence: `Of ${fmtM(ttm)} billed in the last 12 months, ${fmtM(approved)} was on parts with an approved design registration.`,
    note: "That is demand Avnet created by working with the customer's engineers, rather than orders it took. It is harder for a competitor to win away.",
  };
}

// Design pipeline -----------------------------------------------------------

export type PipelineFocus = "approvedPipeline" | "approvalRate" | "newRegistrations";

export interface PipelineFigures {
  /** The trailing 12-month funnel, stage by stage: count and estimated annual billings, $M. */
  stages: (FunnelStage & { count: number })[];
  approvedPipeline: number;
  approvedPipelineYearAgo: number;
  approvalRate: { now: number; yearAgo: number };
  newRegistrations: { thisQuarter: number; yearAgo: number };
  monthsToBilling: number;
}

/** The funnel by count or by value, and which stage the tile is about. */
export function pipelineView(f: PipelineFigures, focus: PipelineFocus): { stages: FunnelStage[]; highlight: number; byValue: boolean } {
  const byValue = focus === "approvedPipeline";
  return {
    stages: f.stages.map((s) => ({ label: s.label, value: byValue ? s.value : s.count })),
    highlight: focus === "newRegistrations" ? 0 : 1,
    byValue,
  };
}

export function readPipeline(f: PipelineFigures, focus: PipelineFocus): FinReading {
  const months = `${count(Math.round(f.monthsToBilling))} months`;
  const rows = funnel(f.stages.map((s) => ({ label: s.label, value: s.count })));
  const weak = weakestStep(rows);
  const stall = weak === null ? undefined : `Most registrations drop out between ${rows[weak - 1].label.toLowerCase()} and ${rows[weak].label.toLowerCase()}.`;
  if (focus === "approvedPipeline") {
    const approved = f.stages[1]?.value ?? 0;
    const billing = f.stages.at(-1)?.value ?? 0;
    return {
      lead: `${fmtM(f.approvedPipeline)} of approved designs are not billing yet, ${upDown(f.approvedPipeline / f.approvedPipelineYearAgo - 1)} a year ago.`,
      sentence: `Approved registrations are worth ${fmtM(approved)} a year in billings. ${fmtM(billing)} of that already bills, which leaves ${fmtM(f.approvedPipeline)} to come.`,
      note: `An approved design usually takes about ${months} to start billing, so the pipeline shows billings still to come.`,
    };
  }
  if (focus === "approvalRate") {
    const [sub, app] = f.stages;
    const change = Math.round((f.approvalRate.now - f.approvalRate.yearAgo) * 100);
    const vs = change === 0 ? "level with a year ago" : `${change > 0 ? "up" : "down"} ${count(Math.abs(change))} ${Math.abs(change) === 1 ? "point" : "points"} on a year ago`;
    return {
      lead: `Suppliers approved ${pct(f.approvalRate.now)} of the designs Avnet registered, ${vs}.`,
      sentence: `In the last 12 months Avnet submitted ${sub.count.toLocaleString("en-US")} registrations and ${app.count.toLocaleString("en-US")} were approved.`,
      note: stall,
    };
  }
  const n = f.newRegistrations;
  return {
    lead: `Avnet registered ${n.thisQuarter.toLocaleString("en-US")} new designs this quarter, ${upDown(n.thisQuarter / n.yearAgo - 1)} a year ago.`,
    sentence: `Across the last 12 months, ${f.stages[0].count.toLocaleString("en-US")} registrations went in and ${f.stages.at(-1)!.count.toLocaleString("en-US")} have reached billing.`,
    note: stall,
  };
}

// Customer concentration ----------------------------------------------------

export interface ShareSegment {
  label: string;
  share: number;
}

/** Top 10, the next 90 and everyone else, as shares of billings that add to one. */
export function concentrationSegments(top10: number, top100: number): ShareSegment[] {
  return [
    { label: "Top 10", share: top10 },
    { label: "Next 90", share: Math.max(0, top100 - top10) },
    { label: "Everyone else", share: Math.max(0, 1 - top100) },
  ];
}

export function readConcentration(c: { top10: { now: number; yearAgo: number }; top100: { now: number; yearAgo: number } }, focus: "top10" | "top100"): FinReading {
  const a = c[focus];
  const who = focus === "top10" ? "ten largest customers" : "hundred largest customers";
  const change = Math.round((a.now - a.yearAgo) * 1000) / 10;
  const vs = change === 0 ? "level with a year ago" : `${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} points on a year ago`;
  return {
    lead: `Avnet's ${who} bring in ${pct(a.now)} of its billings.`,
    sentence: `The top 10 take ${pct(c.top10.now)}, the next 90 ${pct(c.top100.now - c.top10.now)}, and everyone else ${pct(1 - c.top100.now)}. The ${focus === "top10" ? "top 10" : "top 100"} share is ${vs}.`,
    note:
      focus === "top10"
        ? `On average, each of the ten is ${(a.now * 10).toFixed(1)}% of billings, so losing one account would move the total by about that much.`
        : "A long tail of smaller customers spreads the risk, and is where distribution earns its higher margins.",
  };
}

// Active customers ----------------------------------------------------------

export function readActiveCustomers(active: number, newCustomerGrowth: number): FinReading {
  const m = active / 1e6;
  return {
    lead: `Avnet billed about ${m.toFixed(1)} million companies in the last 12 months.`,
    sentence: `Customers billed for the first time are ${upDown(newCustomerGrowth)} a year ago.`,
    note: "Counted at the parent company, so a group with many sites counts once.",
  };
}
