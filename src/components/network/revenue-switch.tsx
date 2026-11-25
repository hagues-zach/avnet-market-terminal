"use client";

import { useState } from "react";
import type { Quarter } from "@/lib/data/live/earnings-model";
import { GrowthChart, RevenueChart } from "@/components/charts/earnings-charts";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";
import { seriesSlide } from "@/lib/deck/slides";

/** One chart card for revenue and its year-over-year growth, with a switch between them. */
export function RevenueSwitch({
  quarters,
  color,
  footer,
  period = "quarter",
  company,
}: {
  quarters: Quarter[];
  color: string;
  footer: React.ReactNode;
  /** What each bar is: a fiscal quarter, or a half for half-yearly reporters. */
  period?: "quarter" | "half";
  /** Whose revenue, for the slide it makes. */
  company?: { slug: string; name: string };
}) {
  const [view, setView] = useState<"revenue" | "growth">("revenue");
  return (
    <Panel
      title={view === "revenue" ? `Revenue by fiscal ${period}` : "Revenue growth, year over year"}
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
      deck={
        company && quarters.length
          ? seriesSlide({
              key: `profile:${company.slug}:revenue-${view}`,
              title: view === "revenue" ? `${company.name}: revenue by fiscal ${period}` : `${company.name}: revenue growth, year over year`,
              unit: view === "revenue" ? "usd" : "pct",
              kind: "column",
              periods: quarters.map((q) => q.fiscalLabel),
              series: [
                {
                  name: company.slug === "avnet" ? "Avnet" : company.name,
                  color,
                  values: quarters.map((q) => (view === "revenue" ? q.values.revenue : q.values.revenueYoY)),
                },
              ],
              chartTitle: view === "revenue" ? "Revenue, $" : "Revenue growth on a year ago, %",
              source: "SEC filings, GAAP as reported",
              period: quarters.at(-1)?.fiscalLabel,
            })
          : null
      }
    >
      {view === "revenue" ? <RevenueChart quarters={quarters} color={color} /> : <GrowthChart quarters={quarters} color={color} />}
    </Panel>
  );
}
