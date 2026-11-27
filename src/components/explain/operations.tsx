"use client";

import { useState } from "react";
import { fmtM } from "@/lib/avnet/format";
import { VIZ } from "@/lib/colors";
import { count } from "@/lib/explain/diagrams";
import {
  backlogSteps,
  concentrationSegments,
  pipelineView,
  readActiveCustomers,
  readBacklog,
  readConcentration,
  readDesignApproved,
  readPipeline,
  readTtmBillings,
  type BacklogQuarter,
  type PipelineFigures,
  type PipelineFocus,
} from "@/lib/explain/operations";
import { explainer, type Explainer } from "@/lib/explain/registry";
import { DataChip, type DataStatus } from "@/components/ui/chip";
import { ExplainPopover } from "./explain-popover";
import { ExplainFrame } from "./frame";
import { Funnel } from "./diagrams/funnel";
import { PairBars } from "./diagrams/pair-bars";
import { ShareBar } from "./diagrams/share-bar";
import { Waterfall } from "./diagrams/waterfall";

// Explainers for Avnet's operating KPIs: the Performance hub, Design Pipeline and
// Customers & End Markets. Avnet's own figures, so Avnet's two greens throughout.

const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);
const NONE = () => {};

/** A popover around a single-period explainer (no stepper). */
export function Single({ e, label, ...body }: { e: Explainer; label?: string } & Omit<Parameters<typeof ExplainFrame>[0], "explainer" | "periods" | "index" | "onIndex">) {
  return (
    <ExplainPopover label={`Explain ${lower(label ?? e.name)}`} title={label ?? e.name}>
      <ExplainFrame explainer={e} periods={[]} index={0} onIndex={NONE} {...body} />
    </ExplainPopover>
  );
}

/* ---------- Backlog ---------- */

export function ExplainBacklog({ quarters, status }: { quarters: BacklogQuarter[]; status: DataStatus }) {
  // Each quarter needs the one before it for its opening backlog.
  if (quarters.length < 2) return null;
  const n = quarters.length - 1;
  return (
    <ExplainPopover label="Explain backlog" title={n === 1 ? "Backlog" : `Backlog, last ${count(n)} quarters`}>
      <BacklogBody quarters={quarters} status={status} />
    </ExplainPopover>
  );
}

function BacklogBody({ quarters, status }: { quarters: BacklogQuarter[]; status: DataStatus }) {
  const periods = quarters.slice(1);
  const [i, setI] = useState(periods.length - 1);
  const prev = quarters[i];
  const q = quarters[i + 1];
  const r = readBacklog(prev, q);
  return (
    <ExplainFrame
      explainer={explainer("Backlog")}
      lead={r.lead}
      figure={<Waterfall steps={backlogSteps(prev, q)} highlight={backlogSteps(prev, q).length - 1} format={fmtM} caption={`Avnet backlog through ${q.quarter}`} />}
      periods={periods.map((p) => p.quarter)}
      index={i}
      onIndex={setI}
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Billings, last 12 months ---------- */

export function ExplainTtmBillings({
  quarters,
  ttm,
  ttmYearAgo,
  status,
}: {
  quarters: { quarter: string; billings: number }[];
  ttm: number;
  ttmYearAgo: number;
  status: DataStatus;
}) {
  const e = explainer("Billings (last 12 months)");
  const r = readTtmBillings(quarters, ttm, ttmYearAgo);
  return (
    <Single
      e={e}
      lead={r.lead}
      figure={
        <PairBars
          rows={quarters.slice(-4).map((q) => ({ label: q.quarter, value: q.billings, fill: VIZ.avnet }))}
          format={fmtM}
          caption="Avnet billings in each of the last four quarters"
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Design-approved billings ---------- */

export function ExplainDesignApproved({ share, ttm, status, label }: { share: number; ttm: number; status: DataStatus; label?: string }) {
  const e = explainer("Design-approved billings");
  const r = readDesignApproved(share, ttm);
  return (
    <Single
      e={e}
      label={label}
      lead={r.lead}
      figure={
        <PairBars
          rows={[
            { label: "All billings, last 12 months", value: ttm, fill: VIZ.avnet },
            { label: "On design-approved parts", value: r.approved, fill: VIZ.avnet2 },
          ]}
          format={fmtM}
          gapText={`${fmtM(ttm - r.approved)} on other parts`}
          caption="Avnet billings, all and on design-approved parts"
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Design pipeline: one funnel, three tiles ---------- */

const PIPELINE_TERM: Record<PipelineFocus, string> = {
  approvedPipeline: "Approved pipeline",
  approvalRate: "Approval rate",
  newRegistrations: "Design registration (DRMS)",
};

export function ExplainPipeline({ figures, focus, status }: { figures: PipelineFigures; focus: PipelineFocus; status: DataStatus }) {
  const e = explainer(PIPELINE_TERM[focus]);
  const r = readPipeline(figures, focus);
  const v = pipelineView(figures, focus);
  return (
    <Single
      e={e}
      lead={r.lead}
      figure={
        <Funnel
          stages={v.stages}
          highlight={v.highlight}
          format={v.byValue ? fmtM : (x) => x.toLocaleString("en-US")}
          caption={`Design registrations in the last 12 months by stage, ${v.byValue ? "estimated annual billings" : "count"}`}
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Customers ---------- */

type Concentration = { top10: { now: number; yearAgo: number }; top100: { now: number; yearAgo: number } };

export function ExplainConcentration({ concentration: c, focus, status }: { concentration: Concentration; focus: "top10" | "top100"; status: DataStatus }) {
  const e = explainer("Customer concentration");
  const r = readConcentration(c, focus);
  const now = concentrationSegments(c.top10.now, c.top100.now);
  const ago = concentrationSegments(c.top10.yearAgo, c.top100.yearAgo);
  return (
    <Single
      e={e}
      label={focus === "top10" ? "Top 10 customers" : "Top 100 customers"}
      lead={r.lead}
      figure={
        <ShareBar
          segments={now.map((s) => s.label)}
          rows={[
            { label: "Last 12 months", shares: now.map((s) => s.share) },
            { label: "A year earlier", shares: ago.map((s) => s.share) },
          ]}
          colors={[VIZ.avnet, VIZ.avnet2, VIZ.other]}
          highlight={focus === "top10" ? [0] : [0, 1]}
          caption="Share of Avnet billings by customer size"
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

export function ExplainActiveCustomers({ active, newCustomerGrowth, status }: { active: number; newCustomerGrowth: number; status: DataStatus }) {
  const r = readActiveCustomers(active, newCustomerGrowth);
  return <Single e={explainer("Active customers")} lead={r.lead} sentence={r.sentence} note={r.note} source={<DataChip status={status} />} />;
}
