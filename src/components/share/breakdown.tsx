"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/tabs";

export interface ShareRow {
  name: string;
  /** Market size, $B. */
  tam: number;
  share: number;
  shareChange: number;
  confidence: string;
}

type View = "segment" | "supplier" | "region";

const VIEWS: Record<View, { label: string; title: string; subtitle: string; name: string; size: string; source: string }> = {
  segment: {
    label: "Segment",
    title: "Share by segment",
    subtitle: "Avnet billings ÷ the segment's market, latest four quarters",
    name: "Segment",
    size: "Market size",
    source: "Avnet billings, WSTS and Gartner market sizes, joined through the code map",
  },
  supplier: {
    label: "Supplier",
    title: "Share by supplier",
    subtitle: "Avnet billings of each supplier's parts ÷ that supplier's revenue. Names withheld in mock",
    name: "Supplier",
    size: "Supplier revenue",
    source: "Avnet billings by manufacturer, suppliers' reported revenue",
  },
  region: {
    label: "Region",
    title: "Share by region",
    subtitle: "Avnet billings in the region ÷ the region's market, latest four quarters",
    name: "Region",
    size: "Market size",
    source: "Avnet billings by region, WSTS regional market sizes",
  },
};

const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;

/** The page's core table: one breakdown at a time, share drawn as a trackless Avnet bar. */
export function ShareBreakdown({ rows, footerLink }: { rows: Record<View, ShareRow[]>; footerLink?: React.ReactNode }) {
  const [view, setView] = useState<View>("segment");
  const v = VIEWS[view];
  const max = Math.max(...rows[view].map((r) => r.share));

  const columns: Column<ShareRow>[] = [
    { key: "name", header: v.name, sortValue: (r) => r.name, className: "w-full" },
    { key: "tam", header: v.size, numeric: true, sortValue: (r) => r.tam, render: (r) => `$${r.tam.toFixed(r.tam < 10 ? 1 : 0)}B` },
    {
      key: "share",
      header: "Avnet share",
      sortValue: (r) => r.share,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="w-12 text-right tabular-nums">{(r.share * 100).toFixed(1)}%</span>
          <span className="block h-2 w-24" aria-hidden>
            <span className="block h-full bg-viz-avnet" style={{ width: `${(r.share / max) * 100}%` }} />
          </span>
        </span>
      ),
    },
    {
      key: "change",
      header: "Change YoY",
      numeric: true,
      sortValue: (r) => r.shareChange,
      render: (r) => <Delta value={r.shareChange} display={pts(r.shareChange)} />,
    },
    { key: "confidence", header: "Mapping confidence", sortValue: (r) => ["Low", "Medium", "High"].indexOf(r.confidence), render: (r) => r.confidence },
  ];

  return (
    <Panel
      title={v.title}
      subtitle={v.subtitle}
      bodyClassName="px-0 pb-0"
      actions={
        <Segmented
          label="Break share down by"
          value={view}
          onChange={setView}
          options={(Object.keys(VIEWS) as View[]).map((k) => ({ value: k, label: VIEWS[k].label }))}
        />
      }
      footer={<SourceLine source={v.source}>{footerLink}</SourceLine>}
    >
      <DataTable
        key={view}
        caption={`${v.title}: market size, Avnet share, change on a year ago and mapping confidence`}
        columns={columns}
        rows={rows[view]}
        rowKey={(r) => r.name}
        defaultSort={{ key: "tam", dir: "desc" }}
      />
    </Panel>
  );
}
