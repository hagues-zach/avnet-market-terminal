"use client";

import { useState } from "react";
import { fmtM } from "@/lib/avnet/format";
import { VIZ } from "@/lib/colors";
import { RatioScale } from "@/components/explain/diagrams/ratio-scale";
import { PairBars } from "@/components/explain/diagrams/pair-bars";
import { Waterfall } from "@/components/explain/diagrams/waterfall";
import { Funnel } from "@/components/explain/diagrams/funnel";

// The four explainer diagram shapes at popover width, with example figures.

const DAYS = [
  { label: "Q1", value: 72 },
  { label: "Q2", value: 78 },
  { label: "Q3", value: 85 },
  { label: "Q4", value: 91 },
  { label: "Q5", value: 98 },
  { label: "Q6", value: 104 },
  { label: "Q7", value: 99 },
  { label: "Q8", value: 94 },
];

const PL = [
  { label: "Revenue", kind: "total" as const, value: 5900 },
  { label: "Cost of sales", kind: "step" as const, value: -5250 },
  { label: "Gross profit", kind: "total" as const, value: 650 },
  { label: "Operating costs", kind: "step" as const, value: -430 },
  { label: "Operating profit", kind: "total" as const, value: 220 },
];

const PIPE = [
  { label: "Registered", value: 1240 },
  { label: "Approved (DRMS 04)", value: 770 },
  { label: "Billing", value: 310 },
];

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-[340px] max-w-full rounded-sm border border-hairline bg-surface">
      <h3 className="border-b border-hairline px-4 py-2 font-display text-card-title text-ink">{title}</h3>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export function DiagramDemos() {
  const [day, setDay] = useState(DAYS.length - 1);
  const [pl, setPl] = useState(2);
  const [stage, setStage] = useState(1);
  return (
    <div className="flex flex-wrap gap-4">
      <Frame title="Ratio scale">
        <RatioScale
          points={DAYS}
          selected={day}
          onSelect={setDay}
          scale={{ min: 40, max: 140 }}
          reference={90}
          format={(v) => `${Math.round(v)}`}
          caption="Inventory days by quarter"
        />
      </Frame>
      <Frame title="Pair bars">
        <PairBars
          rows={[
            { label: "This quarter", value: 5900, fill: VIZ.avnet },
            { label: "A year ago", value: 5480, fill: VIZ.avnet2 },
          ]}
          format={fmtM}
          gapText="$420M more than a year ago"
          caption="Revenue against the same quarter a year ago"
        />
      </Frame>
      <Frame title="Waterfall">
        <Waterfall steps={PL} highlight={pl} onSelect={setPl} format={fmtM} caption="Revenue to operating profit" />
      </Frame>
      <Frame title="Funnel">
        <Funnel stages={PIPE} highlight={stage} onSelect={setStage} format={(v) => v.toLocaleString("en-US")} caption="Design registrations by stage" />
      </Frame>
    </div>
  );
}
