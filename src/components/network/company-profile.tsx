import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCompanyNews } from "@/lib/data/live/company-news";
import { getAccount } from "@/lib/avnet";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getNextRelease, TIMING_LABELS } from "@/lib/data/live/earnings-calendar";
import { COHORT_LABELS, ROLE_SINGULAR, roleOf, type Company, type CompanyEarnings, type Quarter } from "@/lib/data/live/earnings-model";
import { getRevenueMix, type RevenueMix } from "@/lib/data/live/revenue-mix";
import { getCommentary, type Digest } from "@/lib/ai/commentary";
import { getCarriers } from "@/lib/line-cards/analysis";
import { isHidden } from "@/lib/visibility";
import { companyColor } from "@/lib/colors";
import { Panel, SourceLine } from "@/components/ui/panel";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Chip, DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { EmptyState, LoadingBlock } from "@/components/ui/states";
import { RevenueSwitch } from "./revenue-switch";
import { format, longDate } from "@/components/earnings/format";

const DAY = 86_400_000;

export function yearAgo(quarters: Quarter[], q: Quarter): Quarter | undefined {
  const target = Date.parse(q.end) - 364 * DAY;
  return quarters.find((p) => Math.abs(Date.parse(p.end) - target) <= 20 * DAY);
}

const points = (v: number) => `${(Math.abs(v) * 100).toFixed(1)} points`;

/**
 * Plain-language facts a seller can open a conversation with. Every line is a
 * rule applied to reported figures; nothing here is generated or inferred.
 */
export function glance(earnings: CompanyEarnings, mix: RevenueMix): string[] {
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

const linkClass = "text-ink underline-offset-2 hover:underline";

/* ---------- Header ---------- */

/** Chips under the title; "Carried by Avnet" only once Avnet's line card is imported. */
export async function ProfileChips({ company }: { company: Company }) {
  const role = roleOf(company);
  let onAvnet = false;
  if (role === "supplier" && !isHidden("/line-cards")) {
    const { carriers, hasHome } = await getCarriers(company.name).catch(() => ({ carriers: [], hasHome: false }));
    onAvnet = hasHome && carriers.some((c) => c.slug === "avnet");
  }
  return (
    <>
      <Chip>SEC filer</Chip>
      {onAvnet && (
        <Chip>
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          Carried by Avnet
        </Chip>
      )}
    </>
  );
}

/** Rail card: role, cohort, next earnings (estimated) and the latest results filing. */
export async function ProfileKeyFacts({ company }: { company: Company }) {
  const [earnings, next] = await Promise.all([getCompanyEarnings(company.slug), getNextRelease(company.slug)]);
  const filing = earnings.latestFiling;
  const q = earnings.quarters[earnings.quarters.length - 1];
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Next earnings",
      value: next ? (
        <>
          {next.status === "due" ? "Expected around " : ""}
          {longDate(next.date)}
          {next.timing && <span className="block text-caption text-ink-muted">{TIMING_LABELS[next.timing]}</span>}
          <Chip tone="warning" className="mt-1">
            Estimate
          </Chip>
        </>
      ) : (
        "Not known"
      ),
    },
    {
      label: "Latest filing",
      value: filing ? (
        <a href={filing.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${linkClass}`}>
          {filing.form}, {longDate(filing.filed)}
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        </a>
      ) : (
        "Not found"
      ),
    },
    ...(q ? [{ label: "Latest quarter", value: `${q.fiscalLabel}, ended ${longDate(q.end)}` }] : []),
    { label: "Role", value: ROLE_SINGULAR[roleOf(company)] },
    { label: "Cohort", value: COHORT_LABELS[company.cohort] },
  ];
  return (
    <Panel title="Key facts">
      <dl className="divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7rem_1fr] gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="text-body-sm text-ink-muted">{r.label}</dt>
            <dd className="text-body-sm text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ---------- Overview ---------- */

export async function ProfileOverview({ company }: { company: Company }) {
  // The mix is cached and shared with the Revenue mix section.
  const [earnings, mix] = await Promise.all([getCompanyEarnings(company.slug), getRevenueMix(company.slug)]);
  const { quarters } = earnings;
  const q = quarters[quarters.length - 1];
  if (!q) {
    return (
      <Panel title="Overview">
        <EmptyState title={`${company.name}'s filings couldn't be loaded from SEC EDGAR right now.`} body={earnings.error} />
      </Panel>
    );
  }
  const p = yearAgo(quarters, q);
  const v = q.values;
  const lines = glance(earnings, mix);
  // Avnet Green only ever represents Avnet.
  const color = companyColor(company.slug);
  const gmDelta = v.grossMargin !== undefined && p?.values.grossMargin !== undefined ? v.grossMargin - p.values.grossMargin : undefined;
  const invDelta = v.inventoryDays !== undefined && p?.values.inventoryDays !== undefined ? Math.round(v.inventoryDays - p.values.inventoryDays) : undefined;
  const footer = <SourceLine source={`${company.name}'s SEC filings`} asOf={`quarter ended ${longDate(q.end)}`} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label={`Revenue, ${q.fiscalLabel}`}
          value={format("usd", v.revenue)}
          delta={v.revenueYoY === undefined ? undefined : { value: v.revenueYoY, period: "YoY" }}
        />
        <KpiTile
          label="Gross margin"
          value={format("pct", v.grossMargin)}
          delta={gmDelta === undefined ? undefined : { value: gmDelta, display: `${(Math.abs(gmDelta) * 100).toFixed(1)} pts`, period: "YoY" }}
        />
        <KpiTile label="Operating margin" value={format("pct", v.operatingMargin)} />
        <KpiTile
          label="Inventory days"
          value={format("days", v.inventoryDays)}
          note={v.inventoryDays === undefined ? "Not reported" : undefined}
          delta={invDelta === undefined || invDelta === 0 ? undefined : { value: invDelta, display: `${Math.abs(invDelta)}`, period: "YoY", invert: true }}
        />
      </div>
      <RevenueSwitch quarters={quarters} color={color} footer={footer} />
      {lines.length > 0 && (
        <Panel title="In brief" subtitle="Plain facts from the filings, for opening a conversation">
          <ul className="list-disc space-y-1 pl-5 text-body text-ink marker:text-ink-muted">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ---------- Commentary ---------- */

const TOPICS: { key: keyof Omit<Digest, "headline" | "takeaways">; label: string }[] = [
  { key: "guidance", label: "Guidance" },
  { key: "demand", label: "Demand" },
  { key: "inventory", label: "Inventory" },
  { key: "leadTimes", label: "Lead times and supply" },
  { key: "pricing", label: "Pricing" },
  { key: "channel", label: "Distribution channel" },
  { key: "endMarkets", label: "End markets" },
];

export async function ProfileCommentary({ company }: { company: Company }) {
  const c = await getCommentary(company.slug);
  const covered = c.digest ? TOPICS.filter((t) => c.digest![t.key]) : [];
  const silent = c.digest ? TOPICS.filter((t) => !c.digest![t.key]).map((t) => t.label.toLowerCase()) : [];
  return (
    <Panel
      title="Management commentary"
      subtitle={c.filed ? `From the earnings press release filed ${longDate(c.filed)}` : "From the latest earnings press release"}
      actions={c.digest ? <Chip>Written by Claude</Chip> : undefined}
      footer={
        <>
          <span>
            {c.digest
              ? `Written by Claude from the press release only, so it can miss or misread things. Check the release before quoting it.${
                  silent.length ? ` The release didn't address ${silent.join(", ")}.` : ""
                }`
              : "Prepared remarks and the call's question-and-answer session aren't included."}
          </span>
          {c.releaseUrl && (
            <a href={c.releaseUrl} target="_blank" rel="noopener noreferrer" className={`ml-auto inline-flex items-center gap-1 ${linkClass}`}>
              Press release
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            </a>
          )}
        </>
      }
    >
      {!c.digest ? (
        <EmptyState
          title={c.message ?? "No summary yet"}
          body={c.status === "off" && c.releaseWords ? `The release was found (about ${c.releaseWords.toLocaleString("en-US")} words) and will be summarised once Claude is on.` : undefined}
        />
      ) : (
        <>
          <p className="text-body-strong text-ink">{c.digest.headline}</p>
          {covered.length > 0 && (
            <dl className="mt-3 divide-y divide-hairline border-t border-hairline">
              {covered.map((t) => (
                <div key={t.key} className="grid gap-1 py-2.5 md:grid-cols-[11rem_1fr] md:gap-4">
                  <dt className="font-display text-label uppercase text-ink-muted md:pt-0.5">{t.label}</dt>
                  <dd className="text-body text-ink">{c.digest![t.key]}</dd>
                </div>
              ))}
            </dl>
          )}
          {c.digest.takeaways.length > 0 && (
            <div className="mt-3 border-t border-hairline pt-3">
              <h3 className="font-display text-card-title text-ink">To raise in a conversation</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body text-ink marker:text-ink-muted">
                {c.digest.takeaways.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ---------- Distribution, news, Avnet business ---------- */

/** Which tracked distributors list this supplier. */
export async function ProfileDistribution({ company }: { company: Company }) {
  const { carriers, tracked, hasHome } = await getCarriers(company.name);
  const onAvnet = carriers.some((c) => c.slug === "avnet");
  return (
    <Panel
      title="Distribution"
      subtitle={`${carriers.length} of ${tracked} tracked line cards list it`}
      footer={
        <>
          <span>
            {hasHome
              ? onAvnet
                ? `${company.name} is on Avnet's line card.`
                : `${company.name} isn't on Avnet's imported line card.`
              : "Avnet's own line card hasn't been imported yet."}{" "}
            A listing isn&apos;t proof of a franchise agreement.
          </span>
          <Link href="/line-cards" className={`ml-auto ${linkClass}`}>
            Line Cards
          </Link>
        </>
      }
    >
      {tracked === 0 ? (
        <EmptyState title="No line cards collected yet" />
      ) : carriers.length === 0 ? (
        <EmptyState title={`No tracked distributor lists ${company.name}`} body="It may be listed under a different name." />
      ) : (
        <table className="w-full text-table">
          <caption className="sr-only">Distributors that list {company.name}</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="h-control pr-3 text-left font-display text-label font-normal uppercase text-ink-muted">
                Distributor
              </th>
              <th scope="col" className="h-control text-right font-display text-label font-normal uppercase text-ink-muted">
                Listed as of
              </th>
            </tr>
          </thead>
          <tbody>
            {carriers.map((c) => (
              <tr key={c.slug} className="border-b border-hairline last:border-b-0">
                <td className="h-control pr-3 text-ink">{c.name}</td>
                <td className="h-control text-right tabular-nums text-ink-muted">{longDate(c.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

/** Recent stories and filings that name the company. */
export async function ProfileNews({ company }: { company: Company }) {
  const articles = await getCompanyNews(company);
  const short = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
  return (
    <Panel
      title="In the news"
      subtitle={`Stories and filings that name ${company.name}`}
      footer={
        <Link href="/news" className={`ml-auto ${linkClass}`}>
          Market News
        </Link>
      }
    >
      {articles.length === 0 ? (
        <EmptyState title={`Nothing in the current feed names ${company.name}`} />
      ) : (
        <ul className="divide-y divide-hairline">
          {articles.map((a) => (
            <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-body-sm font-medium text-ink underline-offset-2 hover:underline">
                {a.title}
              </a>
              <p className="mt-0.5 text-caption text-ink-muted">
                {a.outlet}, {short(a.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Avnet's business with a supplier or customer, from src/lib/avnet (mock until
 * AVNET_DATA points at Avnet's tables); shared by the profile, the QBR brief,
 * leads and the deck so they agree.
 */
export async function avnetBusiness(company: Company) {
  const supplier = roleOf(company) === "supplier";
  const { figures: f, status } = await getAccount(company.slug, company.name, supplier);
  const count = (v: number | undefined) => (v === undefined ? "n/a" : v.toLocaleString("en-US"));
  return {
    supplier,
    status,
    rows: f
      ? [
          { label: "Billings, last 12 months", value: `$${f.billings.toFixed(1)}M` },
          { label: "Backlog", value: `$${f.backlog.toFixed(1)}M` },
          supplier ? { label: "Open design registrations", value: count(f.openRegistrations) } : { label: "Open quotes", value: count(f.openQuotes) },
        ]
      : [{ label: "Billings, last 12 months", value: "None on record" }],
    hookups: supplier ? ["billings", "backlog", "drms"] : ["billings", "backlog", "quotes", "customer-master"],
  };
}

export async function ProfileAvnetBusiness({ company }: { company: Company }) {
  const { supplier, rows, hookups, status } = await avnetBusiness(company);
  return (
    <Panel title="Avnet business" subtitle={supplier ? `${company.name} as a supplier to Avnet` : `${company.name} as an Avnet customer`} actions={<DataChip status={status} />}>
      <dl className="divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt className="text-body-sm text-ink-muted">{r.label}</dt>
            <dd className="font-display text-section-title tabular-nums text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <HookupMarker ids={hookups} />
      </div>
    </Panel>
  );
}

export function ProfileFallback({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <LoadingBlock label={`Loading ${title.toLowerCase()}…`} />
    </Panel>
  );
}
