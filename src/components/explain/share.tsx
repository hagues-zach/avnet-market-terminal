"use client";

import { useState } from "react";
import { VIZ } from "@/lib/colors";
import { count } from "@/lib/explain/diagrams";
import { explainer } from "@/lib/explain/registry";
import {
  MAPPING_SEGMENTS,
  categoryShares,
  confidenceShares,
  gapScale,
  mappingShares,
  money,
  readAgainstHold,
  readGrowthGap,
  readMappedBillings,
  readMappedShare,
  readPeerShare,
  readScenarioGrowth,
  readScenarioShare,
  readValidated,
  type CategoryFigures,
  type GrowthGap,
  type MappingFigures,
  type PeerQuarter,
  type ScenarioFigures,
  type SegmentShare,
} from "@/lib/explain/share";
import { DataChip, type DataStatus } from "@/components/ui/chip";
import { ExplainPopover } from "./explain-popover";
import { ExplainFrame } from "./frame";
import { Single } from "./operations";
import { NestedBoxes } from "./diagrams/nested-boxes";
import { PairBars } from "./diagrams/pair-bars";
import { RatioScale } from "./diagrams/ratio-scale";
import { ShareBar } from "./diagrams/share-bar";
import { Waterfall } from "./diagrams/waterfall";

// Explainers for the market share KPIs: Market Share, Code Mapping and the
// Scenario Modeler. Avnet's own figures use its two greens; Arrow is dark blue;
// the makers and the rest of the market are greys.

const STATUS_COLORS = [VIZ.avnet, VIZ.avnet2, VIZ.other];
const pct1 = (v: number) => `${v.toFixed(1)}%`;
/** "Q3 '26" style labels for the stepper, from "CY26 Q3". */
const short = (label: string) => label.replace(/^CY(?:20)?(\d{2}) (Q\d)$/, "$2 '$1");

/* ---------- Share of mapped market (Market Share) ---------- */

export function ExplainMappedShare({
  share,
  shareYearAgo,
  mappedShare,
  segments,
  status,
}: {
  share: number;
  shareYearAgo: number;
  mappedShare: number;
  segments: SegmentShare[];
  status: DataStatus;
}) {
  const r = readMappedShare({ share, shareYearAgo, mappedShare, segments });
  const market = segments.reduce((a, s) => a + s.tam, 0);
  const mapped = segments.reduce((a, s) => a + s.tam * s.share, 0);
  const conf = confidenceShares(segments);
  return (
    <Single
      e={explainer("Market share")}
      lead={r.lead}
      figure={
        <>
          <NestedBoxes
            levels={[
              { label: "Mapped market", value: market },
              { label: "Avnet's mapped billings", value: mapped },
            ]}
            format={(v) => `$${v.toFixed(1)}B`}
            caption="Avnet's mapped billings inside the market they map to, last 12 months"
          />
          <ShareBar
            segments={["High confidence", "Medium", "Low"]}
            rows={[{ label: "Mapped billings by mapping confidence", shares: conf }]}
            colors={STATUS_COLORS}
            highlight={[]}
            caption="Avnet's mapped billings by the confidence of the segment's mapping"
          />
        </>
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Mapped billings (Market Share) and Billings mapped (Code Mapping) ---------- */

export function ExplainMappedBillings({ figures, focus, status }: { figures: MappingFigures; focus: "amount" | "share"; status: DataStatus }) {
  const r = readMappedBillings(figures, focus);
  return (
    <Single
      e={explainer("Mapped billings")}
      label={focus === "share" ? "Billings mapped" : undefined}
      lead={r.lead}
      figure={
        <ShareBar
          segments={MAPPING_SEGMENTS}
          rows={[{ label: "Avnet billings, last 12 months", shares: mappingShares(figures) }]}
          colors={STATUS_COLORS}
          highlight={[0, 1]}
          caption="Avnet billings by code map status, last 12 months"
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Validated categories (Code Mapping) ---------- */

export function ExplainValidated({
  categories,
  billings,
  weakest,
  status,
}: {
  categories: CategoryFigures;
  billings: MappingFigures;
  weakest?: { segment: string; validatedShare: number };
  status: DataStatus;
}) {
  const r = readValidated(categories, billings, weakest);
  return (
    <Single
      e={explainer("Validated categories")}
      lead={r.lead}
      figure={
        <ShareBar
          segments={MAPPING_SEGMENTS}
          rows={[
            { label: "Market categories", shares: categoryShares(categories) },
            { label: "Avnet billings", shares: mappingShares(billings) },
          ]}
          colors={STATUS_COLORS}
          highlight={[0]}
          caption="Market categories and Avnet billings by code map status"
        />
      }
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status={status} />}
    />
  );
}

/* ---------- Share of Avnet + Arrow (Market Share, live) ---------- */

export function ExplainPeerShare({ points }: { points: PeerQuarter[] }) {
  if (!points.length) return null;
  return (
    <ExplainPopover label="Explain share of Avnet + Arrow" title={`Share of Avnet + Arrow, last ${count(points.length)} quarters`}>
      <PeerShareBody points={points} />
    </ExplainPopover>
  );
}

function PeerShareBody({ points }: { points: PeerQuarter[] }) {
  const [i, setI] = useState(points.length - 1);
  const q = points[i];
  const r = readPeerShare({ ...q, label: short(q.label) }, i >= 4 ? points[i - 4] : undefined);
  const gap = q.avnetRevenue - q.arrowRevenue;
  return (
    <ExplainFrame
      explainer={explainer("Share of Avnet and Arrow")}
      lead={r.lead}
      figure={
        <PairBars
          rows={[
            { label: "Avnet revenue", value: q.avnetRevenue, fill: VIZ.avnet },
            { label: "Arrow revenue", value: q.arrowRevenue, fill: VIZ.arrow },
          ]}
          format={money}
          gapText={Math.abs(gap) < 0.5 ? undefined : `${money(Math.abs(gap))} ${gap > 0 ? "more for Avnet" : "more for Arrow"}`}
          caption={`Avnet and Arrow revenue, ${short(q.label)}`}
        />
      }
      periods={points.map((p) => short(p.label))}
      index={i}
      onIndex={setI}
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status="live" label="SEC" />}
    />
  );
}

/* ---------- Growth over makers (Market Share, live) ---------- */

export function ExplainGrowthGap({ points, makers }: { points: GrowthGap[]; makers: number }) {
  if (!points.length) return null;
  return (
    <ExplainPopover label="Explain growth over makers" title={`Growth over makers, last ${count(points.length)} quarters`}>
      <GrowthGapBody points={points} makers={makers} />
    </ExplainPopover>
  );
}

const signedPts = (v: number) => {
  const p = Math.round(v * 1000) / 10;
  return p === 0 ? "0 pts" : `${p > 0 ? "+" : "−"}${Math.abs(p).toFixed(1)} pts`;
};

function GrowthGapBody({ points, makers }: { points: GrowthGap[]; makers: number }) {
  const [i, setI] = useState(points.length - 1);
  const g = points[i];
  const r = readGrowthGap({ ...g, label: short(g.label) }, makers);
  const gaps = points.map((p) => ({ label: short(p.label), value: p.avnet - p.makers }));
  return (
    <ExplainFrame
      explainer={explainer("Growth over makers")}
      lead={r.lead}
      figure={
        <RatioScale
          points={gaps}
          selected={i}
          onSelect={setI}
          scale={gapScale(gaps.map((p) => p.value))}
          reference={0}
          format={signedPts}
          words={["Avnet slower", "Level", "Avnet faster"]}
          caption="Avnet's revenue growth less the makers' combined growth, by quarter"
        />
      }
      periods={gaps.map((p) => p.label)}
      index={i}
      onIndex={setI}
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status="live" label="SEC" />}
    />
  );
}

/* ---------- Scenario Modeler ---------- */

export type ScenarioKind = "share" | "hold" | "growth";
const SCENARIO_TERM: Record<ScenarioKind, string> = { share: "Market share", hold: "Holding share", growth: "Compound annual growth" };
const horizon = (n: number) => (n === 1 ? "In one year" : `In ${count(n)} years`);

export function ExplainScenario({ p, kind }: { p: ScenarioFigures; kind: ScenarioKind }) {
  const r = kind === "share" ? readScenarioShare(p) : kind === "hold" ? readAgainstHold(p) : readScenarioGrowth(p);
  const at = horizon(p.years);
  const gap = p.billingsAt - p.billings;
  const figure =
    kind === "share" ? (
      <PairBars
        rows={[
          { label: "Share today", value: p.share * 100, fill: VIZ.avnet },
          { label: `${at}, this scenario`, value: p.shareAt * 100, fill: VIZ.avnet2 },
        ]}
        format={pct1}
        caption="Avnet's share of the mapped market today and in the scenario"
      />
    ) : kind === "hold" ? (
      <Waterfall
        steps={[
          { label: `${at}, holding share`, kind: "total", value: p.holdAt },
          { label: "Share change", kind: "step", value: p.billingsAt - p.holdAt },
          { label: `${at}, this scenario`, kind: "total", value: p.billingsAt },
        ]}
        highlight={2}
        format={money}
        caption="Scenario billings against holding today's share"
      />
    ) : (
      <PairBars
        rows={[
          { label: "Mapped billings today", value: p.billings, fill: VIZ.avnet },
          { label: `${at}, this scenario`, value: p.billingsAt, fill: VIZ.avnet2 },
        ]}
        format={money}
        gapText={Math.abs(gap) < 0.5 ? undefined : `${money(Math.abs(gap))} ${gap > 0 ? "more" : "less"} than today`}
        caption="Avnet's mapped billings today and at the horizon"
      />
    );
  return (
    <Single
      e={explainer(SCENARIO_TERM[kind])}
      label={kind === "share" ? "Share of mapped market" : undefined}
      lead={r.lead}
      figure={figure}
      sentence={r.sentence}
      note={r.note}
      source={<DataChip status="mock" />}
    />
  );
}
