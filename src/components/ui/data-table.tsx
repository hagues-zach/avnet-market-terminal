"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Segmented } from "./tabs";

export interface Column<Row> {
  key: string;
  header: string;
  /** Numbers are right-aligned with tabular figures. */
  numeric?: boolean;
  render?: (row: Row) => React.ReactNode;
  /** Value to sort by; omit to make the column unsortable. */
  sortValue?: (row: Row) => number | string;
  className?: string;
  /** An explainer mark after the header, e.g. <ExplainColumn column="grossMargin" />. */
  explain?: React.ReactNode;
}

type Density = "compact" | "comfortable";

/**
 * Dense table: sticky header on the sunken surface, ALL CAPS Oswald labels,
 * hairlines between rows only, 32px rows (40px comfortable), right-aligned numbers.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  defaultSort,
  densityToggle = false,
  defaultDensity = "compact",
  className,
  selectedKey,
  onRowClick,
  onOrder,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Read by screen readers; describe what the table holds. */
  caption: string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  densityToggle?: boolean;
  defaultDensity?: Density;
  className?: string;
  /** The row to mark as selected (selected fill and a green left edge). */
  selectedKey?: string | null;
  /** Makes rows clickable. Keep a real button in the row for keyboard users. */
  onRowClick?: (row: Row) => void;
  /** Called with the row keys in their displayed (sorted) order, whenever it changes. */
  onOrder?: (keys: string[]) => void;
}) {
  const [sort, setSort] = useState(defaultSort);
  const [density, setDensity] = useState<Density>(defaultDensity);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort!.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  const order = sorted.map(rowKey).join("\u0000");
  useEffect(() => {
    onOrder?.(order ? order.split("\u0000") : []);
    // Only when the displayed order changes, not on every new onOrder function.
  }, [order]);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div className={className}>
      {densityToggle && (
        <div className="mb-2 flex justify-end">
          <Segmented
            label="Row density"
            value={density}
            onChange={setDensity}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
            ]}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-body text-table">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-surface-sunken">
            <tr className="border-b border-hairline">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const SortIcon = !active ? ArrowUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted",
                      c.numeric ? "text-right" : "text-left",
                      c.className,
                    )}
                  >
                    {/* The mark sits outside the sort button, so opening it never re-sorts. */}
                    <span className={cn("inline-flex items-center", c.numeric && "flex-row-reverse")}>
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={cn("inline-flex cursor-pointer items-center gap-1 uppercase hover:text-ink", c.numeric && "flex-row-reverse", active && "text-ink")}
                        >
                          {c.header}
                          <SortIcon className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                        </button>
                      ) : (
                        c.header
                      )}
                      {c.explain}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-hairline last:border-b-0",
                  onRowClick && "cursor-pointer",
                  selectedKey != null && rowKey(row) === selectedKey ? "bg-surface-selected shadow-[inset_3px_0_0_theme(colors.primary)]" : "hover:bg-surface-sunken",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-3 text-ink",
                      density === "compact" ? "h-control" : "h-row-comfortable",
                      c.numeric && "text-right tabular-nums",
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
