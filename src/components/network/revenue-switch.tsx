"use client";

import { useState } from "react";
import type { Quarter } from "@/lib/data/live/earnings-model";
import { GrowthChart, RevenueChart } from "@/components/charts/earnings-charts";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";

/** One chart card for revenue and its year-over-year growth, with a switch between them. */
export function RevenueSwitch({ quarters, color, footer }: { quarters: Quarter[]; color: string; footer: React.ReactNode }) {
  const [view, setView] = useState<"revenue" | "growth">("revenue");
  return (
    <Panel
      title={view === "revenue" ? "Revenue by fiscal quarter" : "Revenue growth, year over year"}
      actions={
        <Segmented
          label="Revenue chart view"
          value={view}
          onChange={setView}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "growth", label: "Growth" },
          ]}
        />
      }
      footer={footer}
    >
      {view === "revenue" ? <RevenueChart quarters={quarters} color={color} /> : <GrowthChart quarters={quarters} color={color} />}
    </Panel>
  );
}
