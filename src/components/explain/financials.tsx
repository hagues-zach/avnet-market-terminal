"use client";

import { useState } from "react";
import { count } from "@/lib/explain/diagrams";
import {
  INVENTORY_REFERENCE,
  epsSteps,
  freeCashFlowSteps,
  grossMarginSteps,
  inventoryScale,
  operatingMarginSteps,
  readEps,
  readFreeCashFlow,
  readGrossMargin,
  readInventoryDays,
  readOperatingMargin,
  readRevenueGrowth,
  usd,
  type FinQuarter,
  type FinReading,
  type Subject,
} from "@/lib/explain/financials";
import { explainer } from "@/lib/explain/registry";
import { VIZ, companyColor } from "@/lib/colors";
import { ExplainPopover } from "./explain-popover";
import { ExplainFrame } from "./frame";
import { PairBars } from "./diagrams/pair-bars";
import { RatioScale } from "./diagrams/ratio-scale";
import { Waterfall } from "./diagrams/waterfall";

// The financial KPI explainers on company profiles and the earnings view: gross
// margin, operating margin, free cash flow and diluted EPS as waterfalls,
// inventory days on a scale with a trail, revenue growth as pair bars. One
// component, a `kind` per tile. It renders nothing when the tile's own quarter
// can't be read, so a mark never opens onto a gap.

/** "Diluted EPS" to "diluted EPS": only the first letter drops to lower case. */
const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

export type FinKind = "grossMargin" | "operatingMargin" | "freeCashFlow" | "eps" | "inventoryDays" | "revenueGrowth";

const TERM: Record<FinKind, string> = {
  grossMargin: "Gross margin",
  operatingMargin: "Operating margin",
  freeCashFlow: "Free cash flow",
  eps: "Diluted EPS",
  inventoryDays: "Inventory days",
  revenueGrowth: "Revenue growth (year on year)",
};

const READ: Record<FinKind, (q: FinQuarter, s: Subject) => FinReading | null> = {
  grossMargin: readGrossMargin,
  operatingMargin: readOperatingMargin,
  freeCashFlow: readFreeCashFlow,
  eps: readEps,
  inventoryDays: readInventoryDays,
  revenueGrowth: readRevenueGrowth,
};

const STEPS = { grossMargin: grossMarginSteps, operatingMargin: operatingMarginSteps, freeCashFlow: freeCashFlowSteps, eps: epsSteps };
/** Which waterfall row each kind highlights: its last total. */
const HIGHLIGHT = { grossMargin: 2, operatingMargin: 4, freeCashFlow: 2, eps: 2 };

export function ExplainFinancial({
  kind,
  quarters,
  subject,
  source,
}: {
  kind: FinKind;
  /** Oldest first; the last is the quarter the tile shows. */
  quarters: FinQuarter[];
  subject: Subject;
  /** Where the figures come from, e.g. "SEC filings". */
  source: string;
}) {
  const read = READ[kind];
  const latest = quarters.at(-1);
  if (!latest || !read(latest, subject)) return null;
  // Step only through quarters that can be read in full.
  const usable = quarters.filter((q) => read(q, subject) !== null);
  const e = explainer(TERM[kind]);
  const n = usable.length;
  return (
    <ExplainPopover
      label={`Explain ${lower(e.name)}`}
      title={n === 1 ? e.name : `${e.name}, last ${count(n)} quarters`}
    >
      <Body kind={kind} quarters={usable} subject={subject} source={source} />
    </ExplainPopover>
  );
}

function Body({ kind, quarters, subject, source }: { kind: FinKind; quarters: FinQuarter[]; subject: Subject; source: string }) {
  const [i, setI] = useState(quarters.length - 1);
  const q = quarters[i];
  const r = READ[kind](q, subject)!;
  const e = explainer(TERM[kind]);
  const color = companyColor(subject.slug);

  let figure: React.ReactNode;
  if (kind === "inventoryDays") {
    const points = quarters.map((x) => ({ label: x.label, value: x.v.inventoryDays! }));
    figure = (
      <RatioScale
        points={points}
        selected={i}
        onSelect={setI}
        scale={inventoryScale(points.map((p) => p.value))}
        reference={INVENTORY_REFERENCE}
        format={(v) => `${Math.round(v)}`}
        color={color}
        caption={`${subject.name} inventory days by quarter, against a ${INVENTORY_REFERENCE} day reference`}
      />
    );
  } else if (kind === "revenueGrowth") {
    const g = r as ReturnType<typeof readRevenueGrowth> & object;
    figure = (
      <PairBars
        rows={[
          { label: q.label, value: q.v.revenue!, fill: color },
          { label: q.yearAgo!.label, value: q.yearAgo!.revenue!, fill: subject.slug === "avnet" ? VIZ.avnet2 : VIZ.other },
        ]}
        format={usd}
        gapText={g.gapText}
        caption={`${subject.name} revenue in ${q.label} and a year earlier`}
      />
    );
  } else {
    figure = (
      <Waterfall
        steps={STEPS[kind](q)!}
        highlight={HIGHLIGHT[kind]}
        format={usd}
        color={color}
        caption={`${subject.name} ${lower(e.name)} in ${q.label}`}
      />
    );
  }

  return (
    <ExplainFrame
      explainer={e}
      lead={r.lead}
      figure={figure}
      periods={quarters.map((x) => x.label)}
      index={i}
      onIndex={setI}
      sentence={r.sentence}
      note={r.note}
      source={<span className="text-caption text-ink-muted">{source}</span>}
    />
  );
}
