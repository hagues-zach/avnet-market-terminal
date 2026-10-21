"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/delta";
import { Segmented } from "@/components/ui/tabs";

export interface MomentumRow {
  slug: string;
  name: string;
  group: string;
  growth?: number;
  channelShare?: number;
  channelYoY?: number;
  /** null until Avnet's line card is imported. */
  onAvnet: boolean | null;
  carriers: string[]; // distributor names, Avnet excluded
  move?: { label: string; url: string; title: string };
}

const pct = (v?: number) => (v === undefined ? "n/a" : `${Math.round(v * 100)}%`);

/** Tracked suppliers, fastest growing first, with who carries them. */
export function MomentumTable({ rows, hasHome }: { rows: MomentumRow[]; hasHome: boolean }) {
  const [view, setView] = useState<"all" | "missing">("all");
  const shown = view === "missing" ? rows.filter((r) => r.onAvnet === false) : rows;
  const max = Math.min(1, Math.max(0.01, ...rows.map((r) => Math.abs(r.growth ?? 0))));

  const columns: Column<MomentumRow>[] = [
    {
      key: "name",
      header: "Supplier",
      sortValue: (r) => r.name,
      render: (r) => (
        <span>
          <Link href={`/network/${r.slug}`} className="font-medium text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink">
            {r.name}
          </Link>
          <span className="ml-2 text-caption text-ink-muted">{r.group}</span>
        </span>
      ),
    },
    {
      key: "growth",
      header: "Growth on a year ago",
      numeric: true,
      sortValue: (r) => r.growth ?? -Infinity,
      render: (r) =>
        r.growth === undefined ? (
          "n/a"
        ) : (
          <span className="flex items-center justify-end gap-2">
            <span className="block h-2 w-16" aria-hidden>
              <span className="ml-auto block h-full bg-viz-other" style={{ width: `${Math.min(1, Math.abs(r.growth) / max) * 100}%` }} />
            </span>
            <Delta value={r.growth} className="w-16 justify-end" />
          </span>
        ),
    },
    { key: "channel", header: "Via distribution", numeric: true, sortValue: (r) => r.channelShare ?? -1, render: (r) => pct(r.channelShare) },
    {
      key: "avnet",
      header: "Avnet",
      sortValue: (r) => (r.onAvnet === null ? 0 : r.onAvnet ? 2 : 1),
      render: (r) =>
        r.onAvnet === null ? <span className="text-ink-muted">Unknown</span> : r.onAvnet ? "Carried" : <span className="font-semibold text-negative">Not carried</span>,
    },
    {
      key: "carriers",
      header: "Carried by",
      sortValue: (r) => r.carriers.length,
      render: (r) => (r.carriers.length ? <span className="whitespace-normal">{r.carriers.join(", ")}</span> : <span className="text-ink-muted">None tracked</span>),
      className: "min-w-[10rem]",
    },
    {
      key: "move",
      header: "Latest agreement",
      sortValue: (r) => r.move?.label ?? "",
      render: (r) =>
        r.move ? (
          <a href={r.move.url} target="_blank" rel="noopener noreferrer" title={r.move.title} className="text-ink underline decoration-hairline underline-offset-2 hover:decoration-ink">
            {r.move.label}
          </a>
        ) : (
          <span className="text-ink-muted">None found</span>
        ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <p className="text-caption text-ink-muted">
          {view === "missing" ? `${shown.length} growing suppliers Avnet does not carry` : `${rows.length} suppliers that report to the SEC`}
        </p>
        {hasHome && (
          <Segmented
            label="Which suppliers to show"
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "All" },
              { value: "missing", label: "Not on Avnet" },
            ]}
          />
        )}
      </div>
      <DataTable
        caption="Suppliers ranked by growth, with the share they sell through distribution, whether Avnet carries them and who else does"
        columns={columns}
        rows={shown}
        rowKey={(r) => r.slug}
        defaultSort={{ key: "growth", dir: "desc" }}
      />
    </div>
  );
}
