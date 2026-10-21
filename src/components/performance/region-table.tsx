"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";

export interface RegionRow {
  region: string;
  billings: number; // $M, latest quarter
  growth: number;
  bookToBill: number;
  backlog: number; // $M
  share: number; // of total billings
}

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);

export function RegionTable({ rows }: { rows: RegionRow[] }) {
  const max = Math.max(...rows.map((r) => r.share));
  const columns: Column<RegionRow>[] = [
    { key: "region", header: "Region", sortValue: (r) => r.region, className: "w-full" },
    { key: "billings", header: "Billings, latest quarter", numeric: true, sortValue: (r) => r.billings, render: (r) => money(r.billings) },
    { key: "growth", header: "Growth on a year ago", numeric: true, sortValue: (r) => r.growth, render: (r) => <Delta value={r.growth} /> },
    { key: "btb", header: "Book-to-bill", numeric: true, sortValue: (r) => r.bookToBill, render: (r) => r.bookToBill.toFixed(2) },
    { key: "backlog", header: "Backlog", numeric: true, sortValue: (r) => r.backlog, render: (r) => money(r.backlog) },
    {
      key: "share",
      header: "Share of billings",
      sortValue: (r) => r.share,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="w-12 text-right tabular-nums">{(r.share * 100).toFixed(0)}%</span>
          <span className="block h-2 w-28" aria-hidden>
            <span className="block h-full bg-viz-avnet" style={{ width: `${(r.share / max) * 100}%` }} />
          </span>
        </span>
      ),
    },
  ];
  return (
    <DataTable
      caption="Billings, growth, book-to-bill and backlog by region for the latest quarter"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.region}
      defaultSort={{ key: "billings", dir: "desc" }}
    />
  );
}
