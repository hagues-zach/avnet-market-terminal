"use client";

import { useCallback, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Sparkline } from "@/components/charts/sparkline";
import { ChartDrawer } from "@/components/chart-view/chart-drawer";
import { shareChartData } from "@/lib/chart-view/share";
import { VIZ } from "@/lib/colors";
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
  /** Avnet's share by quarter, oldest first, matching `periods`. */
  history?: number[];
}

type View = "segment" | "supplier" | "region";

const VIEWS: Record<View, { label: string; title: string; subtitle: string; name: string; size: string; source: string; hookups: string[] }> = {
  segment: {
    label: "Segment",
    title: "Share by segment",
    subtitle: "Avnet billings ÷ the segment's market, latest four quarters",
    name: "Segment",
    size: "Market size",
    source: "Avnet billings, WSTS and Gartner market sizes, joined through the code map",
    hookups: ["billings", "wsts", "gartner-forecast", "code-map"],
  },
  supplier: {
    label: "Supplier",
    title: "Share by supplier",
    subtitle: "Avnet billings of each supplier's parts ÷ that supplier's revenue. Names withheld in mock",
    name: "Supplier",
    size: "Supplier revenue",
    source: "Avnet billings by manufacturer, suppliers' reported revenue",
    hookups: ["billings", "sec"],
  },
  region: {
    label: "Region",
    title: "Share by region",
    subtitle: "Avnet billings in the region ÷ the region's market, latest four quarters",
    name: "Region",
    size: "Market size",
    source: "Avnet billings by region, WSTS regional market sizes",
    hookups: ["billings", "wsts"],
  },
};

const pts = (v: number) => `${Math.abs(v * 100).toFixed(1)} pts`;
const trendId = (view: View, name: string) => `share-trend-${view}-${name.replace(/[^\w-]+/g, "-")}`;

/**
 * The page's core table: one breakdown at a time, share drawn as a trackless
 * Avnet bar and its last eight quarters as a sparkline. Clicking a row or its
 * sparkline opens the chart drawer; the drawer's up and down buttons follow the
 * table's sorted order.
 */
export function ShareBreakdown({
  rows,
  periods = [],
  footerLink,
}: {
  rows: Record<View, ShareRow[]>;
  /** Quarter labels for each row's history. */
  periods?: string[];
  footerLink?: React.ReactNode;
}) {
  const [view, setView] = useState<View>("segment");
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const v = VIEWS[view];
  const max = Math.max(...rows[view].map((r) => r.share));
  const hasHistory = periods.length > 1 && rows[view].some((r) => (r.history?.length ?? 0) > 1);
  const current = selected === null ? undefined : rows[view].find((r) => r.name === selected);
  const at = selected === null ? -1 : order.indexOf(selected);
  const close = useCallback(() => {
    if (selected !== null) document.getElementById(trendId(view, selected))?.focus();
    setSelected(null);
  }, [selected, view]);

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
    ...(hasHistory
      ? [
          {
            key: "trend",
            header: "8-quarter trend",
            render: (r: ShareRow) =>
              r.history && r.history.length > 1 ? (
                <button
                  id={trendId(view, r.name)}
                  type="button"
                  aria-pressed={r.name === selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r.name);
                  }}
                  title="Chart the last eight quarters"
                  className="inline-flex cursor-pointer items-center px-1 py-0.5 hover:bg-surface"
                >
                  <Sparkline data={r.history} color={VIZ.avnet} width={96} height={22} />
                  <span className="sr-only">Chart {r.name}, last eight quarters</span>
                </button>
              ) : null,
          } satisfies Column<ShareRow>,
        ]
      : []),
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
          onChange={(next) => {
            setView(next);
            setSelected(null);
          }}
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
        selectedKey={selected}
        onRowClick={hasHistory ? (r) => setSelected(r.name) : undefined}
        onOrder={setOrder}
      />
      <ChartDrawer
        data={current?.history ? shareChartData({ view: v.title, name: current.name, history: current.history, periods, source: v.source, hookups: v.hookups }) : null}
        position={at >= 0 ? `${at + 1} of ${order.length}` : undefined}
        onClose={close}
        onPrev={at > 0 ? () => setSelected(order[at - 1]) : undefined}
        onNext={at >= 0 && at < order.length - 1 ? () => setSelected(order[at + 1]) : undefined}
      />
    </Panel>
  );
}
