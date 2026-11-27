"use client";

import { ExplainColumn } from "@/components/explain/column";
import type { ColumnKey } from "@/lib/explain/columns";
import Link from "next/link";
import type { Quarter } from "@/lib/data/live/earnings-model";
import { CaveatMark } from "@/components/ui/caveat-mark";
import { DataTable, type Column } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { format, longDate } from "./format";

export interface GroupRow {
  slug: string;
  name: string;
  group: string;
  latest: Quarter | null;
  /** Why a figure doesn't compare cleanly with the US GAAP filers', by metric. */
  caveats?: Partial<Record<keyof Values, string>>;
}

type Values = Quarter["values"];
const val = (r: GroupRow, m: keyof Values) => r.latest?.values[m];
const sortNum = (m: keyof Values) => (r: GroupRow) => val(r, m) ?? -Infinity;

/**
 * The company's group (or all companies), each on its latest quarter, sortable.
 * The selected company is in bold; the group median sits under
 * the table as a reference, outside the sort.
 */
export function GroupTable({
  rows,
  current,
  showGroup = false,
  median,
}: {
  rows: GroupRow[];
  /** The company to mark (in bold); empty for none. */
  current: string;
  /** Add a Group column, for tables that mix groups. */
  showGroup?: boolean;
  median: Partial<Record<keyof Values, number>>;
}) {
  const num = (m: keyof Values, kind: Parameters<typeof format>[0], header: string, help?: ColumnKey): Column<GroupRow> => ({
    key: m,
    header,
    numeric: true,
    explain: help ? <ExplainColumn column={help} /> : undefined,
    sortValue: sortNum(m),
    render: (r) => (
      <>
        {format(kind, val(r, m))}
        <CaveatMark reason={r.caveats?.[m]} />
      </>
    ),
  });
  const columns: Column<GroupRow>[] = [
    {
      key: "name",
      header: "Company",
      sortValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/network/${r.slug}`}
          aria-current={r.slug === current ? "true" : undefined}
          className={cn("inline-flex items-center gap-1.5 text-ink underline-offset-2 hover:underline", r.slug === current && "font-semibold")}
        >
          {r.slug === "avnet" && <span className="h-2.5 w-2.5 shrink-0 bg-viz-avnet" aria-hidden />}
          {r.name}
        </Link>
      ),
    },
    ...(showGroup
      ? [
          {
            key: "group",
            header: "Group",
            sortValue: (r: GroupRow) => r.group,
            render: (r: GroupRow) => <span className="text-ink-muted">{r.group}</span>,
          },
        ]
      : []),
    {
      key: "quarter",
      header: "Quarter",
      sortValue: (r) => r.latest?.end ?? "",
      render: (r) =>
        r.latest ? (
          <span className="text-ink-muted" title={`Quarter ended ${longDate(r.latest.end)}`}>
            {r.latest.fiscalLabel}, {r.latest.calendarLabel}
          </span>
        ) : (
          <span className="text-ink-muted">Unavailable</span>
        ),
    },
    num("revenue", "usd", "Revenue"),
    num("revenueYoY", "growth", "Growth YoY", "revenueYoY"),
    num("grossMargin", "pct", "Gross margin", "grossMargin"),
    num("operatingMargin", "pct", "Op margin", "operatingMargin"),
    num("inventoryDays", "days", "Inv days", "inventoryDays"),
    num("fcfMargin", "pct", "FCF margin", "fcfMargin"),
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.slug}
        caption="Each company on its latest reported quarter"
        defaultSort={{ key: "revenueYoY", dir: "desc" }}
        selectedKey={current || null}
      />
      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-hairline bg-surface-sunken px-3 py-2 text-caption text-ink">
        <dt className="font-semibold">Group median</dt>
        {(
          [
            ["revenueYoY", "growth", "Growth"],
            ["grossMargin", "pct", "Gross margin"],
            ["operatingMargin", "pct", "Op margin"],
            ["inventoryDays", "days", "Inv days"],
            ["fcfMargin", "pct", "FCF margin"],
          ] as const
        ).map(([m, kind, label]) => (
          <dd key={m} className="tabular-nums">
            <span className="text-ink-muted">{label} </span>
            {format(kind, median[m])}
          </dd>
        ))}
      </dl>
    </div>
  );
}
