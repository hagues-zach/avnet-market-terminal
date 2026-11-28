"use client";

import { useState } from "react";
import { VIZ } from "@/lib/colors";
import { count } from "@/lib/explain/diagrams";
import { INVENTORY_REFERENCE, inventoryScale } from "@/lib/explain/financials";
import {
  growthScale,
  readCapex,
  readCompaniesGrowing,
  readDistributorInventory,
  readMedianGrowth,
  readStageInventory,
  readSupplyRevenue,
  shortQuarter,
  type CapexQuarter,
  type CompanyGrowth,
  type DaysQuarter,
  type GrowthQuarter,
  type StageDays,
} from "@/lib/explain/cycle";
import { explainer, type Explainer } from "@/lib/explain/registry";
import { DataChip } from "@/components/ui/chip";
import { ExplainPopover } from "./explain-popover";
import { ExplainFrame } from "./frame";
import { Single } from "./operations";
import { DotStrip } from "./diagrams/dot-strip";
import { PairBars } from "./diagrams/pair-bars";
import { RatioScale } from "./diagrams/ratio-scale";

// Explainers for the cycle KPIs: Market Cycle and Earnings Season. Live SEC
// figures for groups of companies, so greys, with Avnet green and Arrow dark
// blue wherever the two appear among them.

const SEC = <DataChip status="live" label="SEC" />;
const signed = (v: number) => {
  const p = Math.round(v * 1000) / 10;
  return p === 0 ? "0%" : `${p > 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}%`;
};
/** Outliers (a company doubling) would squash everyone else, so the strip stops at 100% either way. */
const CAP = 1;
const stripScale = (vs: number[]) => growthScale(vs.map((v) => Math.max(-CAP, Math.min(CAP, v))));
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** A popover with a quarter stepper; the body renders the frame for quarter i. */
function Stepped({
  e,
  title,
  periods,
  body,
  label,
}: {
  e: Explainer;
  title: string;
  /** The mark's accessible name, when several of the same KPI share a page. */
  label?: string;
  periods: string[];
  body: (i: number, setI: (i: number) => void) => Omit<Parameters<typeof ExplainFrame>[0], "explainer" | "periods" | "index" | "onIndex">;
}) {
  if (!periods.length) return null;
  return (
    <ExplainPopover label={label ?? `Explain ${lower(e.name)}`} title={title}>
      <SteppedBody e={e} periods={periods} body={body} />
    </ExplainPopover>
  );
}

function SteppedBody({ e, periods, body }: { e: Explainer; periods: string[]; body: Parameters<typeof Stepped>[0]["body"] }) {
  const [i, setI] = useState(periods.length - 1);
  return <ExplainFrame explainer={e} periods={periods} index={i} onIndex={setI} {...body(i, setI)} />;
}

const lastN = (e: Explainer, n: number) => (n === 1 ? e.name : `${e.name}, last ${count(n)} quarters`);

/* ---------- Supply-chain revenue ---------- */

export function ExplainSupplyRevenue({ quarters }: { quarters: GrowthQuarter[] }) {
  const e = explainer("Supply-chain revenue");
  const points = quarters.map((q) => ({ label: shortQuarter(q.label), value: q.growth }));
  return (
    <Stepped
      e={e}
      title={lastN(e, quarters.length)}
      periods={points.map((p) => p.label)}
      body={(i, setI) => {
        const r = readSupplyRevenue(quarters, i);
        return {
          lead: r.lead,
          figure: (
            <RatioScale
              points={points}
              selected={i}
              onSelect={setI}
              scale={growthScale(points.map((p) => p.value))}
              reference={0}
              format={signed}
              words={["Contraction", "", "Expansion"]}
              caption="Supply-chain revenue growth on a year ago, by quarter"
            />
          ),
          sentence: r.sentence,
          note: r.note,
          source: SEC,
        };
      }}
    />
  );
}

/* ---------- Companies growing ---------- */

export interface BreadthQuarter {
  label: string;
  companies: CompanyGrowth[];
  combined?: number;
}

export function ExplainCompaniesGrowing({ quarters }: { quarters: BreadthQuarter[] }) {
  const e = explainer("Companies growing");
  // One scale for every quarter, so stepping shows the crowd moving.
  const scale = stripScale(quarters.flatMap((q) => q.companies.map((c) => c.growth)));
  return (
    <Stepped
      e={e}
      title={lastN(e, quarters.length)}
      periods={quarters.map((q) => shortQuarter(q.label))}
      body={(i) => {
        const q = quarters[i];
        const r = readCompaniesGrowing(q.companies, q.label, q.combined);
        return {
          lead: r.lead,
          figure: (
            <DotStrip
              dots={q.companies.map((c) => ({ slug: c.slug, name: c.name, value: c.growth }))}
              scale={scale}
              format={signed}
              words={["Shrinking", "Growing"]}
              caption={`Supply-chain companies by revenue growth on a year ago, ${shortQuarter(q.label)}`}
            />
          ),
          sentence: r.sentence,
          note: r.note,
          source: SEC,
        };
      }}
    />
  );
}

/* ---------- Median revenue growth (Earnings Season) ---------- */

export function ExplainMedianGrowth({ companies, quarter, total }: { companies: CompanyGrowth[]; quarter: string; total: number }) {
  if (!companies.length) return null;
  const r = readMedianGrowth(companies, quarter, total);
  return (
    <Single
      e={explainer("Median revenue growth")}
      lead={r.lead}
      figure={
        <DotStrip
          dots={companies.map((c) => ({ slug: c.slug, name: c.name, value: c.growth }))}
          scale={stripScale(companies.map((c) => c.growth))}
          format={signed}
          words={["Shrinking", "Growing"]}
          caption={`Companies that have filed ${shortQuarter(quarter)}, by revenue growth on a year ago`}
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={SEC}
    />
  );
}

/* ---------- Distributor inventory ---------- */

export function ExplainDistributorInventory({ quarters, distributors }: { quarters: DaysQuarter[]; distributors: number }) {
  const e = explainer("Distributor inventory");
  const points = quarters.map((q) => ({ label: shortQuarter(q.label), value: q.days }));
  return (
    <Stepped
      e={e}
      title={lastN(e, quarters.length)}
      periods={points.map((p) => p.label)}
      body={(i, setI) => {
        const r = readDistributorInventory(quarters, i, distributors);
        return {
          lead: r.lead,
          figure: (
            <RatioScale
              points={points}
              selected={i}
              onSelect={setI}
              scale={inventoryScale(points.map((p) => p.value))}
              reference={INVENTORY_REFERENCE}
              format={(v) => `${Math.round(v)} days`}
              words={["Leaner", "Three months", "Heavier"]}
              color={VIZ.benchmark}
              caption="Median distributor inventory days, by quarter"
            />
          ),
          sentence: r.sentence,
          note: r.note,
          source: SEC,
        };
      }}
    />
  );
}

/* ---------- Inventory days by stage ---------- */

export function ExplainStageInventory({ quarters, stage }: { quarters: StageDays[]; stage: { id: string; name: string; companies: number } }) {
  const e = explainer("Inventory days");
  const points = quarters.map((q) => ({ label: shortQuarter(q.label), value: q.days }));
  return (
    <Stepped
      e={e}
      label={`Explain inventory days for ${lower(stage.name)}`}
      title={`${stage.name}: inventory days, last ${count(quarters.length)} quarters`}
      periods={points.map((p) => p.label)}
      body={(i, setI) => {
        const r = readStageInventory(quarters, i, stage);
        return {
          lead: r.lead,
          figure: (
            <RatioScale
              points={points}
              selected={i}
              onSelect={setI}
              scale={inventoryScale(points.map((p) => p.value))}
              reference={INVENTORY_REFERENCE}
              format={(v) => `${Math.round(v)} days`}
              words={["Leaner", "Three months", "Heavier"]}
              color={VIZ.benchmark}
              caption={`Median inventory days in ${lower(stage.name)}, by quarter`}
            />
          ),
          sentence: r.sentence,
          note: r.note,
          source: SEC,
        };
      }}
    />
  );
}

/* ---------- Hyperscaler capex ---------- */

export function ExplainCapex({ quarters, hyperscalers }: { quarters: CapexQuarter[]; hyperscalers: number }) {
  const e = explainer("Hyperscaler capex");
  const usd = (v: number) => `$${(v / 1e9).toFixed(1)}B`;
  return (
    <Stepped
      e={e}
      title={lastN(e, quarters.length)}
      periods={quarters.map((q) => shortQuarter(q.label))}
      body={(i) => {
        const q = quarters[i];
        const r = readCapex(q, hyperscalers, usd);
        const gap = q.total - q.yearAgo;
        return {
          lead: r.lead,
          figure: (
            <PairBars
              rows={[
                { label: shortQuarter(q.label), value: q.total, fill: VIZ.benchmark },
                { label: "A year earlier", value: q.yearAgo, fill: VIZ.other },
              ]}
              format={usd}
              gapText={`${usd(Math.abs(gap))} ${gap >= 0 ? "more" : "less"} than a year earlier`}
              caption={`Combined hyperscaler capex, ${shortQuarter(q.label)} and a year earlier`}
            />
          ),
          sentence: r.sentence,
          note: r.note,
          source: SEC,
        };
      }}
    />
  );
}
