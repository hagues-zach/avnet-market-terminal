import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getCompanyNews } from "@/lib/data/live/company-news";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getNextRelease, TIMING_LABELS } from "@/lib/data/live/earnings-calendar";
import { roleOf, type Company, type CompanyEarnings, type Quarter } from "@/lib/data/live/earnings-model";
import { getRevenueMix, type RevenueMix } from "@/lib/data/live/revenue-mix";
import { AVNET } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { GrowthChart, RevenueChart } from "@/components/charts/earnings-charts";
import { DASH, earningsHref, format, longDate } from "@/components/earnings/format";

const DAY = 86_400_000;

function yearAgo(quarters: Quarter[], q: Quarter): Quarter | undefined {
  const target = Date.parse(q.end) - 364 * DAY;
  return quarters.find((p) => Math.abs(Date.parse(p.end) - target) <= 20 * DAY);
}

const points = (v: number) => `${(Math.abs(v) * 100).toFixed(1)} points`;

/**
 * Plain-language facts a seller can open a conversation with. Every line is a
 * rule applied to reported figures; nothing here is generated or inferred.
 */
function glance(earnings: CompanyEarnings, mix: RevenueMix): string[] {
  const { quarters } = earnings;
  const q = quarters[quarters.length - 1];
  if (!q) return [];
  const p = yearAgo(quarters, q);
  const v = q.values;
  const lines: string[] = [];

  if (v.revenue !== undefined) {
    let line = `${q.fiscalLabel} revenue was ${format("usd", v.revenue)}`;
    if (v.revenueYoY !== undefined) {
      line += `, ${v.revenueYoY >= 0 ? "up" : "down"} ${(Math.abs(v.revenueYoY) * 100).toFixed(1)}% on a year earlier`;
      // How long the current direction has held.
      let streak = 0;
      for (let i = quarters.length - 1; i >= 0; i--) {
        const g = quarters[i].values.revenueYoY;
        if (g === undefined || g >= 0 !== v.revenueYoY >= 0) break;
        streak += 1;
      }
      if (streak >= 2) line += ` (${streak} quarters in a row of ${v.revenueYoY >= 0 ? "growth" : "decline"})`;
    }
    lines.push(`${line}.`);
  }
  if (v.grossMargin !== undefined) {
    const d = p?.values.grossMargin !== undefined ? v.grossMargin - p.values.grossMargin : undefined;
    lines.push(
      `Gross margin is ${format("pct", v.grossMargin)}${d === undefined || Math.abs(d) < 0.0005 ? "" : `, ${d > 0 ? "up" : "down"} ${points(d)} on the year`}${
        v.operatingMargin === undefined ? "" : `; operating margin is ${format("pct", v.operatingMargin)}`
      }.`,
    );
  }
  if (v.inventoryDays !== undefined) {
    const d = p?.values.inventoryDays !== undefined ? Math.round(v.inventoryDays - p.values.inventoryDays) : undefined;
    lines.push(
      `It holds ${Math.round(v.inventoryDays)} days of inventory${
        d === undefined || d === 0 ? "" : `, ${Math.abs(d)} ${Math.abs(d) === 1 ? "day" : "days"} ${d > 0 ? "more" : "fewer"} than a year ago`
      }.`,
    );
  }
  const period = mix.periodKind === "year" ? "fiscal year" : "quarter";
  const channel = mix.breakdowns.find((b) => /sales channel/i.test(b.title))?.items.find((i) => /distribut|reseller|intermediar/i.test(i.label));
  if (channel?.share !== undefined) {
    lines.push(
      `${Math.round(channel.share * 100)}% of its revenue went through distribution in the latest ${period}${
        channel.yoy === undefined ? "" : `, with that channel ${channel.yoy >= 0 ? "up" : "down"} ${(Math.abs(channel.yoy) * 100).toFixed(1)}% on the year`
      }.`,
    );
  }
  const segment = mix.breakdowns.find((b) => b.title === "By segment")?.items[0];
  if (segment?.share !== undefined) lines.push(`Its largest segment is ${segment.label}, at ${Math.round(segment.share * 100)}% of revenue in the latest ${period}.`);
  const place = mix.breakdowns.find((b) => b.title === "By region")?.items[0];
  if (place?.share !== undefined) lines.push(`Its largest market is ${place.label}, at ${Math.round(place.share * 100)}% of revenue.`);
  return lines;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span className="font-display text-2xs uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1.5 font-display text-2xl tabular text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{note ?? " "}</div>
    </div>
  );
}

/** Server component: the headline card and financial snapshot for one company. */
export async function ProfileSummary({ company }: { company: Company }) {
  // The mix is cached and shared with the Revenue mix section below.
  const [earnings, mix, next] = await Promise.all([getCompanyEarnings(company.slug), getRevenueMix(company.slug), getNextRelease(company.slug)]);
  const { quarters, latestFiling } = earnings;
  const q = quarters[quarters.length - 1];
  const lines = glance(earnings, mix);
  const v = q?.values ?? {};
  // Avnet Green only ever represents Avnet.
  const color = company.slug === "avnet" ? AVNET.green : AVNET.blueDark;

  return (
    <>
      <Card
        title="At a glance"
        subtitle={q ? `From ${company.name}'s filings · latest quarter ended ${longDate(q.end)}` : company.name}
        actions={
          <Link href={earningsHref(company.slug, "all")} className="inline-flex items-center gap-1 text-xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
            Full earnings view
            <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        {lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            {company.name}&apos;s filings could not be loaded from SEC EDGAR right now{earnings.error ? ` (${earnings.error})` : ""}.
          </p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink marker:text-avnet-green">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-3 text-xs">
          <div>
            <dt className="font-display text-2xs uppercase tracking-widest text-muted">Next earnings</dt>
            <dd className="mt-0.5 text-ink">
              {next ? (
                <>
                  {next.status === "due" ? "Expected around " : ""}
                  {longDate(next.date)}
                  {next.timing ? `, ${TIMING_LABELS[next.timing].toLowerCase()}` : ""}{" "}
                  <span className="rounded border border-dashed border-accent-yellow px-1.5 py-0.5 font-display text-2xs uppercase tracking-wider">Estimate</span>
                </>
              ) : (
                DASH
              )}
            </dd>
          </div>
          {latestFiling && (
            <div>
              <dt className="font-display text-2xs uppercase tracking-widest text-muted">Latest results filing</dt>
              <dd className="mt-0.5">
                <a
                  href={latestFiling.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark"
                >
                  {latestFiling.form} filed {longDate(latestFiling.filed)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {q && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label="Revenue" value={format("usd", v.revenue)} note={v.revenueYoY === undefined ? q.fiscalLabel : `${format("growth", v.revenueYoY)} YoY · ${q.fiscalLabel}`} />
            <Tile label="Gross margin" value={format("pct", v.grossMargin)} note={q.fiscalLabel} />
            <Tile label="Operating margin" value={format("pct", v.operatingMargin)} note={q.fiscalLabel} />
            <Tile label="Inventory days" value={format("days", v.inventoryDays)} note={v.inventoryDays === undefined ? "Not reported" : q.fiscalLabel} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Revenue" subtitle="By fiscal quarter">
              <RevenueChart quarters={quarters} color={color} />
            </Card>
            <Card title="Revenue growth" subtitle="Year over year, by fiscal quarter">
              <GrowthChart quarters={quarters} color={color} />
            </Card>
          </div>
        </>
      )}
    </>
  );
}

/** Server component: recent stories and filings that name the company. */
export async function ProfileNews({ company }: { company: Company }) {
  const articles = await getCompanyNews(company);
  const now = Date.now();
  const ago = (iso: string) => {
    const days = Math.max(0, Math.round((now - Date.parse(iso)) / DAY));
    return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  };
  return (
    <Card
      title="In the news"
      subtitle={`Stories and filings in the Market News feed that name ${company.name}`}
      actions={
        <Link href="/news" className="inline-flex items-center gap-1 text-xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
          Market News
          <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {articles.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Nothing in the current feed names {company.name}.</p>
      ) : (
        <ul className="divide-y divide-line">
          {articles.map((a) => (
            <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-start gap-1.5 text-sm font-medium text-ink hover:text-avnet-greenDark focus:outline-none focus-visible:underline"
              >
                <span>{a.title}</span>
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-gray-medium group-hover:text-avnet-greenDark" />
              </a>
              <p className="mt-0.5 text-2xs text-gray-medium">
                {a.outlet} · {ago(a.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** What the profile will gain as later steps of the plan land. */
export function ProfileComingNext({ company }: { company: Company }) {
  const role = roleOf(company);
  const lineCard =
    role === "supplier"
      ? `Which distributors carry ${company.name}, and whether Avnet is one of them.`
      : role === "competitor" || role === "avnet"
        ? `${company.name}'s line card, with additions, removals and overlap with other distributors.`
        : null;
  return (
    <Card title="Coming to this profile" subtitle="Planned in docs/superapp-plan.md">
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-gray-light">
        {lineCard && (
          <li>
            <span className="text-ink">Line card.</span> {lineCard}
          </li>
        )}
        <li>
          <span className="text-ink">Management commentary.</span> What {company.name} said about demand, lead times, inventory and pricing in its latest results.
        </li>
        <li>
          <span className="text-ink">QBR prep.</span> A one-click brief built from this profile.
        </li>
      </ul>
    </Card>
  );
}

export function ProfileFallback({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-2" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-canvas" />
        ))}
      </div>
    </Card>
  );
}
