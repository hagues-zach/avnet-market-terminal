"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search } from "lucide-react";
import type { SupplierRow } from "@/lib/line-cards/analysis";
import { cn } from "@/lib/utils";

const PAGE = 150;

type View = "all" | "shared" | "whitespace" | "exclusive";

export function SupplierTable({
  suppliers,
  distributors,
  home,
}: {
  suppliers: SupplierRow[];
  distributors: { slug: string; name: string }[];
  /** Avnet's slug when its line card has been imported; null otherwise. */
  home: string | null;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [shown, setShown] = useState(PAGE);

  const views: { key: View; label: string; hint: string }[] = [
    { key: "all", label: "All", hint: "Every supplier on any tracked line card" },
    { key: "shared", label: "On two or more", hint: "Carried by at least two tracked distributors" },
    ...(home
      ? ([
          { key: "whitespace", label: "Not on Avnet", hint: "Carried by another distributor but not by Avnet" },
          { key: "exclusive", label: "Only on Avnet", hint: "Carried by Avnet and no other tracked distributor" },
        ] as const)
      : []),
  ];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (view === "shared") return s.carriedBy.length >= 2;
      if (view === "whitespace") return !s.carriedBy.includes(home!);
      if (view === "exclusive") return s.carriedBy.length === 1 && s.carriedBy[0] === home;
      return true;
    });
  }, [suppliers, query, view, home]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search suppliers</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Search suppliers"
            className="w-full rounded-none border border-hairline bg-surface py-1.5 pl-8 pr-2 text-body-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Which suppliers to show">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              title={v.hint}
              aria-pressed={view === v.key}
              onClick={() => {
                setView(v.key);
                setShown(PAGE);
              }}
              className={cn(
                "h-6 px-2 font-body text-micro transition-colors cursor-pointer",
                view === v.key ? "bg-surface-sunken font-semibold text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-caption tabular-nums text-ink-muted">
          {rows.length.toLocaleString("en-US")} of {suppliers.length.toLocaleString("en-US")}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-caption">
          <thead>
            <tr className="border-b border-hairline font-display text-micro uppercase tracking-wider text-ink-muted">
              <th scope="col" className="px-4 py-2 text-left font-normal">
                Supplier
              </th>
              {distributors.map((d) => (
                <th key={d.slug} scope="col" className="px-2 py-2 text-center font-normal">
                  {d.name}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Carried by
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((s) => (
              <tr key={s.key} className="border-b border-hairline last:border-b-0 hover:bg-surface-sunken">
                <th scope="row" className="px-4 py-1.5 text-left font-normal text-ink">
                  {s.profile ? (
                    <Link href={`/network/${s.profile}`} className="font-medium underline decoration-hairline underline-offset-2 hover:text-ink-muted">
                      {s.name}
                    </Link>
                  ) : (
                    s.name
                  )}
                  {s.brands > 1 && <span className="ml-2 text-micro text-ink-muted">{s.brands} listings</span>}
                </th>
                {distributors.map((d) => (
                  <td key={d.slug} className="px-2 py-1.5 text-center">
                    {s.carriedBy.includes(d.slug) ? (
                      <Check className={cn("mx-auto h-3.5 w-3.5", d.slug === home ? "text-ink" : "text-ink")} aria-label={`On ${d.name}'s line card`} />
                    ) : (
                      <span className="text-gray-light" aria-label={`Not on ${d.name}'s line card`}>
                        ·
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right tabular-nums text-ink-muted">
                  {s.carriedBy.length} of {distributors.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="px-4 py-8 text-center text-body-sm text-ink-muted">No suppliers match.</p>}
      {rows.length > shown && (
        <div className="border-t border-hairline px-4 py-2 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-caption text-ink underline decoration-hairline underline-offset-2 hover:text-ink-muted cursor-pointer">
            Show {Math.min(PAGE, rows.length - shown)} more
          </button>
        </div>
      )}
    </div>
  );
}
