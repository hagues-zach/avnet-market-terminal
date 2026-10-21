"use client";

import { DataTable, type Column } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { formatUsdMillions } from "@/lib/format";
import { PRODUCT_LABEL } from "@/lib/data/types";
import type { CategoryRow } from "@/lib/tam/categories";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** A trackless bar beside a figure. Grey for the market, Avnet Green for Avnet. */
function BarFigure({ value, max, label, avnet = false }: { value: number; max: number; label: string; avnet?: boolean }) {
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="block h-2 w-16" aria-hidden>
        <span className={`ml-auto block h-full ${avnet ? "bg-viz-avnet" : "bg-viz-other"}`} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className="w-16 text-right tabular-nums">{label}</span>
    </span>
  );
}

/** Market by WSTS product category: published size and growth, then the mock served slice and Avnet's part. */
export function CategoryTable({ rows }: { rows: CategoryRow[] }) {
  const maxMarket = Math.max(...rows.map((r) => r.market));
  const maxSom = Math.max(...rows.map((r) => r.som));
  const columns: Column<CategoryRow>[] = [
    { key: "product", header: "Category", sortValue: (r) => PRODUCT_LABEL[r.product], render: (r) => PRODUCT_LABEL[r.product], className: "w-full" },
    {
      key: "market",
      header: "2025 market",
      numeric: true,
      sortValue: (r) => r.market,
      render: (r) => <BarFigure value={r.market} max={maxMarket} label={formatUsdMillions(r.market)} />,
    },
    { key: "growth", header: "Growth on 2024", numeric: true, sortValue: (r) => r.growth, render: (r) => <Delta value={r.growth} /> },
    { key: "shareOfTam", header: "Share of TAM", numeric: true, sortValue: (r) => r.shareOfTam, render: (r) => pct(r.shareOfTam) },
    { key: "served", header: "Served (mock)", numeric: true, sortValue: (r) => r.served, render: (r) => formatUsdMillions(r.served) },
    {
      key: "som",
      header: "Avnet SOM (mock)",
      numeric: true,
      sortValue: (r) => r.som,
      render: (r) => <BarFigure value={r.som} max={maxSom} label={formatUsdMillions(r.som)} avnet />,
    },
    { key: "shareOfServed", header: "Share of served", numeric: true, sortValue: (r) => r.shareOfServed, render: (r) => pct(r.shareOfServed) },
  ];
  return (
    <DataTable
      caption="Semiconductor market by product category: 2025 size, growth, share of the total market, the part served by distribution and Avnet's part"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.product}
      defaultSort={{ key: "market", dir: "desc" }}
    />
  );
}
