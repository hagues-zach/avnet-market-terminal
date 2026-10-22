import { ExternalLink } from "lucide-react";
import { getRevenueMix, type Breakdown } from "@/lib/data/live/revenue-mix";
import { Panel } from "@/components/ui/panel";
import { LoadingBlock } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { NA, format, longDate } from "./format";

const TITLE = "Revenue mix";
const LABEL = "mb-1.5 font-display text-label uppercase text-ink-muted";

function BreakdownTable({ breakdown, isAvnet }: { breakdown: Breakdown; isAvnet: boolean }) {
  const { items } = breakdown;
  const max = Math.max(...items.map((i) => i.value));
  const hasMargin = items.some((i) => i.margin !== undefined);
  return (
    <div>
      <h3 className={LABEL}>{breakdown.title}</h3>
      <table className="w-full text-xs">
        <thead className="sr-only">
          <tr>
            <th scope="col">{breakdown.title.replace(/^By /, "")}</th>
            <th scope="col">Revenue</th>
            <th scope="col">Share of revenue</th>
            <th scope="col">Change year over year</th>
            {hasMargin && <th scope="col">Operating margin</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key} className="border-b border-line last:border-b-0">
              <th scope="row" className="w-2/5 py-1.5 pr-2 text-left font-normal text-ink">
                {item.label}
              </th>
              <td className="py-1">
                <div className="relative flex h-6 items-center justify-end">
                  {/* Avnet Green only ever represents Avnet; anyone else's one-colour bars are grey. */}
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0.5 left-0", isAvnet ? "bg-viz-avnet/40" : "bg-viz-other")}
                    style={{ width: `${Math.max(0, (item.value / max) * 100)}%` }}
                  />
                  <span className="relative tabular text-ink">{format("usd", item.value)}</span>
                </div>
              </td>
              <td className="w-14 py-1.5 pl-2 text-right tabular text-muted">{item.share === undefined ? NA : `${Math.round(item.share * 100)}%`}</td>
              <td className="w-16 py-1.5 pl-2 text-right tabular text-ink">{item.yoy === undefined ? NA : format("growth", item.yoy)}</td>
              {hasMargin && (
                <td className="w-16 py-1.5 pl-2 text-right tabular text-muted" title="Segment operating margin">
                  {item.margin === undefined ? NA : `${(item.margin * 100).toFixed(1)}% m`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {breakdown.overlapping && <p className="mt-1 text-2xs text-muted">Includes subtotals reported alongside their parts, so shares add to more than 100%.</p>}
    </div>
  );
}

/** Server component: reads the latest filing document, so the page streams it in. */
export async function RevenueMix({ company }: { company: string }) {
  const mix = await getRevenueMix(company);
  const empty = mix.breakdowns.length === 0 && mix.customers.length === 0;
  const period =
    mix.periodEnd && mix.periodKind ? `${mix.periodKind === "year" ? "Fiscal year" : "Quarter"} ended ${longDate(mix.periodEnd)}` : undefined;

  return (
    <Panel
      title={TITLE}
      subtitle={
        empty
          ? mix.company.name
          : `${mix.company.name}, ${period}. The bar is revenue, then its share of total revenue and the change on the same period a year earlier.`
      }
      actions={
        mix.url && (
          <a
            href={mix.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark"
          >
            {mix.form}
            <ExternalLink className="h-3 w-3" />
          </a>
        )
      }
    >
      {empty ? (
        <p className="py-6 text-center text-sm text-muted">
          {mix.error ? `Could not read the latest filing: ${mix.error}` : `${mix.company.name} does not tag a segment, region or product split in its latest filing.`}
        </p>
      ) : (
        <>
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            {mix.breakdowns.map((b) => (
              <BreakdownTable key={b.axis} breakdown={b} isAvnet={mix.company.slug === "avnet"} />
            ))}
            {mix.customers.length > 0 && (
              <div>
                <h3 className={LABEL}>Largest customers</h3>
                <table className="w-full text-xs">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Customer</th>
                      <th scope="col">Share of revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mix.customers.map((c) => (
                      <tr key={c.label} className="border-b border-line last:border-b-0">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink">
                          {c.label}
                        </th>
                        <td className="py-1.5 text-right tabular text-ink">{(c.share * 100).toFixed(0)}% of revenue</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="mt-4 text-2xs text-muted">
            From the company&apos;s own tags in its latest {mix.form}, so categories and names are the company&apos;s and are not
            comparable across companies. A 10-K gives the fiscal year and a 10-Q the quarter. Where a company reports the same split
            more than one way, the simplest one is used. &quot;m&quot; is segment operating margin where the company tags it.
          </p>
        </>
      )}
    </Panel>
  );
}

export function RevenueMixFallback() {
  return (
    <Panel title={TITLE} subtitle="Reading the latest filing document from SEC EDGAR.">
      <LoadingBlock label="Loading the revenue mix…" lines={5} />
    </Panel>
  );
}
