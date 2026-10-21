"use client";

import { useMemo, useState } from "react";
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
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={rowKey(row)} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
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
