import Link from "next/link";
import { getPeerRows } from "@/lib/data/live/earnings";
import { COHORT_LABELS, type Cohort } from "@/lib/data/live/earnings-model";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { earningsHref, format, longDate, type Row } from "./format";

const COLUMNS: Row[] = [
  { metric: "revenue", label: "Revenue", kind: "usd" },
  { metric: "revenueYoY", label: "YoY", kind: "growth" },
  { metric: "grossMargin", label: "Gross margin", kind: "pct" },
  { metric: "operatingMargin", label: "Op margin", kind: "pct" },
  { metric: "inventoryDays", label: "Inv days", kind: "days" },
  { metric: "fcfMargin", label: "FCF margin", kind: "pct" },
];

const TITLE = "Latest quarter across the set";

/** Server component: awaits every company, so the page streams it in behind a fallback. */
export async function PeerTable({ company, group }: { company: string; group: Cohort | "all" }) {
  const all = await getPeerRows();
  const rows = all.filter((r) => group === "all" || r.company.cohort === group);
  const failed = all.filter((r) => !r.latest);

  return (
    <Card
      title={TITLE}
      subtitle={`${rows.length} companies · each row is that company's most recent reported quarter · select a company to open it`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-xs">
          <thead>
            <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
              <th scope="col" className="px-4 py-2 text-left font-normal">
                Company
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Group
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Quarter
              </th>
              {COLUMNS.map((c) => (
                <th key={c.metric} scope="col" className="px-3 py-2 font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ company: c, latest: q }) => (
              <tr
                key={c.slug}
                className={cn("border-b border-line last:border-b-0 transition-colors duration-200", c.slug === company ? "bg-avnet-green/10" : "hover:bg-canvas")}
              >
                <th scope="row" className="px-4 py-1.5 text-left font-normal">
                  <Link
                    href={earningsHref(c.slug, group)}
                    aria-current={c.slug === company ? "true" : undefined}
                    className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                  >
                    {c.slug === "avnet" && <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />}
                    {c.name}
                  </Link>
                </th>
                <td className="px-3 py-1.5 text-left text-muted">{COHORT_LABELS[c.cohort]}</td>
                <td className="px-3 py-1.5 text-left text-muted" title={q ? `Quarter ended ${longDate(q.end)}` : undefined}>
                  {q ? `${q.fiscalLabel} · ${q.calendarLabel}` : "Unavailable"}
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.metric} className="px-3 py-1.5 text-right tabular text-ink">
                    {format(col.kind, q?.values[col.metric])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failed.length > 0 && (
        <p className="border-t border-line px-4 py-2 text-2xs text-muted">Could not load: {failed.map((r) => r.company.name).join(", ")}.</p>
      )}
    </Card>
  );
}

export function PeerTableFallback() {
  return (
    <Card title={TITLE} subtitle="Reading each company's filings from SEC EDGAR. The first load after a refresh can take a minute.">
      <div className="space-y-2" role="status" aria-label="Loading the cross-company table">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
