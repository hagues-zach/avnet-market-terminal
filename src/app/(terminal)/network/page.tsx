import { Suspense } from "react";
import Link from "next/link";
import { getPeerRows } from "@/lib/data/live/earnings";
import { getEarningsCalendar } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, COMPANIES, ROLES, ROLE_LABELS, comparability, comparableValue, roleOf, type Role } from "@/lib/data/live/earnings-model";
import { CaveatMark } from "@/components/ui/caveat-mark";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { Panel } from "@/components/ui/panel";
import { LoadingBlock } from "@/components/ui/states";
import { NA, format, longDate } from "@/components/earnings/format";
import { cn } from "@/lib/utils";

// Rendered per request; the underlying filings are cached.
export const dynamic = "force-dynamic";

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

async function Directory({ role }: { role: Role | "all" }) {
  const [rows, calendar] = await Promise.all([getPeerRows(), getEarningsCalendar()]);
  const next = new Map(calendar.events.filter((e) => e.status !== "reported").map((e) => [e.company.slug, e]));
  // Avnet leads the list, then the largest companies first.
  const shown = rows
    .filter((r) => role === "all" || roleOf(r.company) === role || r.company.slug === "avnet")
    .sort(
      (a, b) =>
        Number(b.company.slug === "avnet") - Number(a.company.slug === "avnet") || (b.latest?.values.revenue ?? 0) - (a.latest?.values.revenue ?? 0),
    );

  return (
    <Panel
      title="Companies"
      subtitle={`${shown.length} companies, largest first, each with its most recent reported quarter`}
      bodyClassName="p-0 pt-3"
    >
      <div className="overflow-x-auto" role="region" aria-label="Companies" tabIndex={0}>
        <table className="w-full min-w-[820px] border-collapse font-body text-table">
          <thead className="bg-surface-sunken">
            <tr className="border-y border-hairline text-right">
              <th scope="col" className={cn(TH, "pl-4 text-left")}>
                Company
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Relationship
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Group
              </th>
              <th scope="col" className={TH}>
                Revenue
              </th>
              <th scope="col" className={TH}>
                Growth YoY
              </th>
              <th scope="col" className={TH}>
                Op margin
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Next earnings (est.)
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ company: c, latest: q }) => {
              const e = next.get(c.slug);
              return (
                <tr
                  key={c.slug}
                  className={cn("border-b border-hairline last:border-b-0", c.slug === "avnet" ? "bg-surface-selected" : "hover:bg-surface-sunken")}
                >
                  <th scope="row" className="py-1.5 pl-4 pr-3 text-left font-normal">
                    <Link
                      href={`/network/${c.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {c.slug === "avnet" && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                      {c.name}
                    </Link>
                  </th>
                  <td className="px-3 py-1.5 text-left text-ink-muted">{ROLE_LABELS[roleOf(c)].replace(/s$/, "")}</td>
                  <td className="px-3 py-1.5 text-left text-ink-muted">{COHORT_LABELS[c.cohort]}</td>
                  {(
                    [
                      ["revenue", "usd"],
                      ["revenueYoY", "growth"],
                      ["operatingMargin", "pct"],
                    ] as const
                  ).map(([m, kind]) => (
                    <td key={m} className="px-3 py-1.5 text-right tabular-nums text-ink">
                      {format(kind, comparableValue(c, m, q?.values[m]))}
                      {q?.values[m] !== undefined && <CaveatMark reason={comparability(c, m)?.reason} />}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-left text-ink-muted">
                    {e ? `${longDate(e.date)}${e.status === "due" ? ", due, not filed" : ""}` : NA}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DirectoryFallback() {
  return (
    <Panel title="Companies" subtitle="Reading each company's filings from SEC EDGAR. The first load after a restart can take a minute.">
      <LoadingBlock label="Loading the company directory…" lines={8} />
    </Panel>
  );
}

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role: Role | "all" = ROLES.includes(params.role as Role) ? (params.role as Role) : "all";
  const count = (r: Role) => COMPANIES.filter((c) => roleOf(c) === r).length;
  const options: { href: string; label: string; n: number; active: boolean }[] = [
    { href: "/network", label: "All", n: COMPANIES.length, active: role === "all" },
    ...ROLES.map((r) => ({ href: `/network?role=${r}`, label: ROLE_LABELS[r], n: count(r), active: role === r })),
  ];

  return (
    <PageBody>
      <PageTitle title="Company Profiles" subtitle="The suppliers, competitors and customers around Avnet. Open a company for its profile." />
      <nav aria-label="Relationship to Avnet" className="inline-flex border border-hairline">
        {options.map((o, i) => (
          <Link
            key={o.href}
            href={o.href}
            scroll={false}
            aria-current={o.active ? "page" : undefined}
            className={cn(
              "flex h-control items-center gap-1.5 whitespace-nowrap px-3 font-body text-body-sm transition-colors",
              i > 0 && "border-l border-hairline",
              o.active ? "bg-surface-sunken font-semibold text-ink" : "bg-surface text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
            <span className="tabular-nums text-ink-muted">{o.n}</span>
          </Link>
        ))}
      </nav>
      <Suspense fallback={<DirectoryFallback />}>
        <Directory role={role} />
      </Suspense>
      <p className="text-caption text-ink-muted">
        Suppliers make components; competitors are other distributors; customers buy components, including contract manufacturers; ecosystem companies
        (equipment and design software) sit upstream of the suppliers. Only companies that file quarterly with the SEC are listed, so large foreign
        suppliers and distributors are missing. Earnings dates are estimates from last year&apos;s filing dates.
      </p>
    </PageBody>
  );
}
