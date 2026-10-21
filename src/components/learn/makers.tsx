import Link from "next/link";
import { getPeerRows } from "@/lib/data/live/earnings";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { makerTrend, type Maker } from "@/lib/learn/read";
import { DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { cn } from "@/lib/utils";

// The suppliers in the app that make a primer's part, with revenue growth from
// their latest filing. Market data, not Avnet's, so changes are in ink.

interface Row extends Maker {
  quarter?: string;
}

async function loadMakers(slugs: string[]): Promise<Row[]> {
  const peers = await getPeerRows().catch(() => []);
  return slugs.map((slug) => {
    const name = COMPANIES.find((c) => c.slug === slug)?.name ?? slug;
    const latest = peers.find((p) => p.company.slug === slug)?.latest;
    return { slug, name, growth: latest?.values.revenueYoY, quarter: latest?.calendarLabel };
  });
}

const pct = (v: number) => `${Math.abs(v * 100).toFixed(1)}%`;
const link = "text-ink underline-offset-2 hover:underline";
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";

/** The compact list for a primer tile. */
export async function MakerLine({ slugs }: { slugs: string[] }) {
  const rows = await loadMakers(slugs);
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm">
      {rows.map((r) => (
        <li key={r.slug} className="inline-flex items-baseline gap-1.5">
          <Link href={`/network/${r.slug}`} className={link}>
            {r.name}
          </Link>
          {r.growth === undefined ? (
            <span className="text-caption text-ink-muted">n/a</span>
          ) : (
            <Delta value={r.growth} display={pct(r.growth)} neutral />
          )}
        </li>
      ))}
    </ul>
  );
}

export function MakerLineFallback({ slugs }: { slugs: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm">
      {slugs.map((s) => (
        <li key={s} className="text-ink">
          {COMPANIES.find((c) => c.slug === s)?.name ?? s}
        </li>
      ))}
    </ul>
  );
}

/** The table on a primer page, with the trend line under it. */
export async function MakerTable({ slugs }: { slugs: string[] }) {
  const rows = await loadMakers(slugs);
  return (
    <div>
      <div role="region" aria-label="Who makes it" tabIndex={0} className="overflow-x-auto border border-hairline">
        <table className="w-full min-w-[520px] border-collapse font-body text-table">
          <caption className="sr-only">Suppliers in the app that make this part, with revenue growth on a year ago from their latest filing.</caption>
          <thead className="bg-surface-sunken">
            <tr className="border-b border-hairline">
              <th scope="col" className={cn(TH, "text-left")}>
                Supplier
              </th>
              <th scope="col" className={cn(TH, "text-left")}>
                Latest quarter
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                <span className="inline-flex items-center justify-end gap-1.5">
                  Revenue growth YoY
                  <DataChip status="live" label="SEC" />
                </span>
              </th>
              <th scope="col" className={cn(TH, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-hairline last:border-b-0">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  <Link href={`/network/${r.slug}`} className={link}>
                    {r.name}
                  </Link>
                </th>
                <td className="px-3 py-1.5 tabular-nums text-ink-muted">{r.quarter ?? "n/a"}</td>
                <td className="px-3 py-1.5 text-right">
                  {r.growth === undefined ? <span className="text-ink-muted">n/a</span> : <Delta value={r.growth} display={pct(r.growth)} neutral />}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right">
                  <Link href={`/tools/qbr?company=${r.slug}&meeting=supplier`} className={link}>
                    Prepare a QBR<span className="sr-only"> with {r.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-body-sm text-ink">{makerTrend(rows)}</p>
      <p className="mt-0.5 text-caption text-ink-muted">
        Suppliers in the app that make it, from their SEC filings. Avnet&apos;s line card is not imported yet.
      </p>
    </div>
  );
}
