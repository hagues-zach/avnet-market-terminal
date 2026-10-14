import { Suspense } from "react";
import Link from "next/link";
import { getPeerRows } from "@/lib/data/live/earnings";
import { getEarningsCalendar } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, COMPANIES, ROLES, ROLE_LABELS, roleOf, type Role } from "@/lib/data/live/earnings-model";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { format, longDate } from "@/components/earnings/format";
import { cn } from "@/lib/utils";

// Rendered per request; the underlying filings are cached.
export const dynamic = "force-dynamic";

const chip =
  "inline-flex items-center gap-1 rounded px-2 py-1 font-display text-2xs uppercase tracking-wider transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40";

async function Directory({ role }: { role: Role | "all" }) {
  const [rows, calendar] = await Promise.all([getPeerRows(), getEarningsCalendar()]);
  const next = new Map(calendar.events.filter((e) => e.status !== "reported").map((e) => [e.company.slug, e]));
  // Avnet leads the list, then the largest companies first.
  const shown = rows
    .filter((r) => role === "all" || roleOf(r.company) === role || r.company.slug === "avnet")
    .sort((a, b) => Number(b.company.slug === "avnet") - Number(a.company.slug === "avnet") || (b.latest?.values.revenue ?? 0) - (a.latest?.values.revenue ?? 0));

  return (
    <Card title="Companies" subtitle={`${shown.length} companies · largest first · figures are each company's most recent reported quarter`} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs">
          <thead>
            <tr className="border-b border-line text-right font-display text-2xs uppercase tracking-wider text-muted">
              <th scope="col" className="px-4 py-2 text-left font-normal">
                Company
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Relationship
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Group
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Revenue
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Growth YoY
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Op margin
              </th>
              <th scope="col" className="px-3 py-2 text-left font-normal">
                Next earnings (est.)
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ company: c, latest: q }) => {
              const e = next.get(c.slug);
              return (
                <tr key={c.slug} className={cn("border-b border-line last:border-b-0", c.slug === "avnet" ? "bg-avnet-green/10" : "hover:bg-canvas")}>
                  <th scope="row" className="px-4 py-1.5 text-left font-normal">
                    <Link
                      href={`/network/${c.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
                    >
                      {c.slug === "avnet" && <span className="h-1.5 w-1.5 rounded-full bg-avnet-green" />}
                      {c.name}
                    </Link>
                  </th>
                  <td className="px-3 py-1.5 text-left text-muted">{ROLE_LABELS[roleOf(c)].replace(/s$/, "")}</td>
                  <td className="px-3 py-1.5 text-left text-muted">{COHORT_LABELS[c.cohort]}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{format("usd", q?.values.revenue)}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{format("growth", q?.values.revenueYoY)}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">{format("pct", q?.values.operatingMargin)}</td>
                  <td className="px-3 py-1.5 text-left text-muted">{e ? `${e.status === "due" ? "Due · " : ""}${longDate(e.date)}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DirectoryFallback() {
  return (
    <Card title="Companies" subtitle="Reading each company's filings from SEC EDGAR. The first load after a refresh can take a minute.">
      <div className="space-y-2" role="status" aria-label="Loading the company directory">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role: Role | "all" = ROLES.includes(params.role as Role) ? (params.role as Role) : "all";
  const count = (r: Role) => COMPANIES.filter((c) => roleOf(c) === r).length;

  return (
    <div className="space-y-5 p-5">
      <PageHeader title="Company Profiles" subtitle="The suppliers, competitors and customers around Avnet. Open a company for its profile." />
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Relationship to Avnet">
        <Link href="/network" scroll={false} aria-current={role === "all" ? "true" : undefined} className={cn(chip, role === "all" ? "bg-ink text-white" : "text-muted hover:bg-canvas")}>
          All <span className={role === "all" ? "text-white/70" : "text-gray-medium"}>{COMPANIES.length}</span>
        </Link>
        {ROLES.map((r) => (
          <Link
            key={r}
            href={`/network?role=${r}`}
            scroll={false}
            aria-current={role === r ? "true" : undefined}
            className={cn(chip, role === r ? "bg-ink text-white" : "text-muted hover:bg-canvas")}
          >
            {ROLE_LABELS[r]} <span className={role === r ? "text-white/70" : "text-gray-medium"}>{count(r)}</span>
          </Link>
        ))}
      </div>
      <Suspense fallback={<DirectoryFallback />}>
        <Directory role={role} />
      </Suspense>
      <p className="px-1 text-2xs text-muted">
        Suppliers make components; competitors are other distributors; customers buy components, including contract manufacturers;
        ecosystem companies (equipment and design software) sit upstream of the suppliers. Only companies that file quarterly with
        the SEC are listed, so large foreign suppliers and distributors are missing. Earnings dates are estimates from last
        year&apos;s filing dates.
      </p>
    </div>
  );
}
