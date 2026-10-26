import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { gatherBrief, type BriefSetup } from "@/lib/qbr/gather";
import { MEETING_LABELS } from "@/lib/qbr/setup";
import { format, longDate } from "@/components/earnings/format";
import { Panel } from "@/components/ui/panel";
import { DataChip, type DataStatus } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { PrintFooter } from "@/components/ui/print-footer";
import { LoadingBlock, Skeleton } from "@/components/ui/states";
import { Outline } from "./outline";
import { TalkingPoints, TalkingPointsFallback } from "./talking-points";

const link = "text-ink underline-offset-2 hover:underline";
const short = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
const meetingDate = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

function Section({ id, n, title, takeaway, source, children }: { id: string; n: number; title: string; takeaway?: string; source?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-hairline pt-5 first:border-t-0 first:pt-0">
      <h2 className="font-display text-section-title text-ink">
        {n}. {title}
      </h2>
      {takeaway && <p className="mt-2 text-body-strong text-ink">{takeaway}</p>}
      <div className="mt-3">{children}</div>
      {source && <p className="mt-3 text-caption text-ink-muted">{source}</p>}
    </section>
  );
}

function Figure({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-hairline px-3 py-2.5">
      <div className="font-display text-label uppercase text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-figure tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 min-h-4">{delta}</div>
    </div>
  );
}

export async function QbrBrief({ setup }: { setup: BriefSetup }) {
  const { company, meeting, date, focus } = setup;
  const brief = await gatherBrief(setup);
  const { supplier, earnings, commentary, digest, news, cycle, carriers, companyMoves, business, q, v, lines, gm, inv, onAvnet, summary } = brief;

  const sections = [
    { id: "quarter", label: "The quarter in brief" },
    { id: "management", label: "What management said" },
    { id: "distribution", label: supplier ? "Distribution position" : "Market backdrop" },
    { id: "news", label: "In the news" },
    { id: "business", label: "Our business with them" },
    { id: "talking", label: "Talking points" },
  ];

  const sources: { label: string; status: DataStatus; asOf?: string }[] = [
    { label: "SEC filings", status: earnings.latestFiling ? "live" : "planned", asOf: earnings.latestFiling ? longDate(earnings.latestFiling.filed) : undefined },
    { label: "Earnings release", status: digest ? "live" : "planned", asOf: commentary.filed ? longDate(commentary.filed) : undefined },
    ...(supplier ? [{ label: "Line cards", status: (carriers?.tracked ? "live" : "planned") as DataStatus }] : []),
    { label: "Market News", status: "live" as DataStatus },
    { label: "Avnet billings", status: "mock" as DataStatus },
  ];

  // The printed footer names the sources that fed this brief, mock ones marked.
  const printSource = `Sources: ${sources
    .filter((s) => s.status !== "planned")
    .map((s) => (s.status === "mock" ? `${s.label} (mock)` : s.label))
    .join(", ")}.`;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <article data-print="avnet" className="min-w-0 rounded-sm border border-hairline bg-surface p-5 lg:col-span-9 xl:p-6">
        <header className="border-b border-hairline pb-4">
          <h2 className="font-display text-page-title font-light uppercase text-ink">
            {company.name}: {MEETING_LABELS[meeting].toLowerCase()}
            {date ? `, ${meetingDate(date)}` : ""}
          </h2>
          {focus && <p className="mt-1 text-body-sm text-ink-muted">Focus: {focus}</p>}
          {summary && <p className="mt-3 max-w-prose text-body text-ink">{summary}</p>}
        </header>

        <div className="mt-5 space-y-6">
          <Section
            id="quarter"
            n={1}
            title="The quarter in brief"
            takeaway={lines[1]}
            source={q ? `Source: ${company.name}'s SEC filings, quarter ended ${longDate(q.end)}.` : undefined}
          >
            {q ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 print:grid-cols-4">
                <Figure label={`Revenue, ${q.fiscalLabel}`} value={format("usd", v.revenue)} delta={v.revenueYoY !== undefined && <Delta value={v.revenueYoY} period="YoY" />} />
                <Figure label="Gross margin" value={format("pct", v.grossMargin)} delta={gm !== undefined && <Delta value={gm} display={`${(Math.abs(gm) * 100).toFixed(1)} pts`} period="YoY" />} />
                <Figure label="Operating margin" value={format("pct", v.operatingMargin)} />
                <Figure label="Inventory days" value={format("days", v.inventoryDays)} delta={inv ? <Delta value={inv} display={`${Math.abs(inv)}`} period="YoY" invert /> : undefined} />
              </div>
            ) : (
              <p className="text-body text-ink-muted">The filings couldn&apos;t be loaded from SEC EDGAR right now.</p>
            )}
          </Section>

          <Section
            id="management"
            n={2}
            title="What management said"
            takeaway={digest?.headline}
            source={
              commentary.releaseUrl ? (
                <>
                  Written by Claude from the earnings press release{commentary.filed ? ` filed ${longDate(commentary.filed)}` : ""}. Check it before quoting.{" "}
                  <a href={commentary.releaseUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${link}`}>
                    Press release
                    <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                  </a>
                </>
              ) : undefined
            }
          >
            {digest ? (
              <dl className="divide-y divide-hairline border-y border-hairline">
                {(
                  [
                    ["Guidance", digest.guidance],
                    ["Demand", digest.demand],
                    ["Inventory", digest.inventory],
                    ["Lead times and supply", digest.leadTimes],
                    ["Pricing", digest.pricing],
                    ["Distribution channel", digest.channel],
                  ] as const
                )
                  .filter(([, text]) => text)
                  .map(([label, text]) => (
                    <div key={label} className="grid gap-1 py-2.5 md:grid-cols-[11rem_1fr] md:gap-4">
                      <dt className="font-display text-label uppercase text-ink-muted md:pt-0.5">{label}</dt>
                      <dd className="text-body text-ink">{text}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="text-body text-ink-muted">{commentary.message ?? "No summary of the latest release yet."}</p>
            )}
          </Section>

          <Section
            id="distribution"
            n={3}
            title={supplier ? "Distribution position" : "Market backdrop"}
            takeaway={
              supplier && carriers
                ? `${carriers.carriers.length} of ${carriers.tracked} tracked distributor line cards list ${company.name}${
                    onAvnet === null ? "." : onAvnet ? ", including Avnet." : "; Avnet's imported line card doesn't."
                  }`
                : cycle?.phase
                  ? `The semiconductor cycle is in ${cycle.phase.toLowerCase()} (${cycle.latest}).`
                  : undefined
            }
            source={supplier ? "Source: stored distributor line cards and franchise news. A listing isn't proof of a franchise agreement." : "Source: SEC filings of the supply chain, rolled up on Market Cycle."}
          >
            {supplier ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ul className="divide-y divide-hairline">
                  {(carriers?.carriers ?? []).map((c) => (
                    <li key={c.slug} className="flex justify-between gap-3 py-1.5 text-body-sm">
                      <span className="text-ink">{c.name}</span>
                      <span className="text-ink-muted">listed as of {longDate(c.date)}</span>
                    </li>
                  ))}
                  {!carriers?.carriers.length && <li className="py-1.5 text-body-sm text-ink-muted">No tracked distributor lists it.</li>}
                </ul>
                <div>
                  <h3 className="font-display text-card-title text-ink">Recent franchise news</h3>
                  {companyMoves.length ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {companyMoves.map((m) => (
                        <li key={m.id} className="text-body-sm">
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className={link}>
                            {m.title}
                          </a>
                          <span className="block text-caption text-ink-muted">
                            {m.outlet}, {short(m.date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-body-sm text-ink-muted">None in the current feed.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-body text-ink">
                See <Link href="/cycle" className={link}>Market Cycle</Link> for growth, inventory and margins across the supply chain and its customers.
              </p>
            )}
          </Section>

          <Section id="news" n={4} title="In the news" source="Source: the Market News feed.">
            {news.length ? (
              <ul className="divide-y divide-hairline">
                {news.map((a) => (
                  <li key={a.id} className="flex gap-3 py-2 first:pt-0">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className={`min-w-0 flex-1 text-body-sm font-medium ${link}`}>
                      {a.title}
                    </a>
                    <span className="shrink-0 text-caption text-ink-muted">
                      {a.outlet}, {short(a.publishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body text-ink-muted">Nothing in the current feed names {company.name}.</p>
            )}
          </Section>

          <Section id="business" n={5} title="Our business with them" takeaway="Mock figures until Avnet's billings and account data are hooked up.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {business.rows.map((r) => (
                <div key={r.label} className="rounded-sm border border-dashed border-mock px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-label uppercase text-ink-muted">{r.label}</span>
                    <DataChip status="mock" />
                  </div>
                  <div className="mt-1 font-display text-figure tabular-nums text-ink">{r.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <HookupMarker ids={business.hookups} />
            </div>
          </Section>

          <Section
            id="talking"
            n={6}
            title="Talking points"
            takeaway={`For this ${MEETING_LABELS[meeting].toLowerCase()}${focus ? `, with the focus on ${focus}` : ""}.`}
          >
            <Suspense key={`${company.slug}-${meeting}-${focus}`} fallback={<TalkingPointsFallback />}>
              <TalkingPoints brief={brief} setup={setup} />
            </Suspense>
          </Section>
        </div>
        <PrintFooter>{printSource}</PrintFooter>
      </article>

      <aside className="min-w-0 space-y-4 lg:col-span-3 print:hidden" aria-label="About this brief">
        <div className="space-y-4 lg:sticky lg:top-4">
          <Panel title="On this brief">
            <Outline sections={sections} />
          </Panel>
          <Panel title="Sources">
            <ul className="divide-y divide-hairline">
              {sources.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="text-body-sm text-ink">{s.label}</span>
                  <span className="flex items-center gap-2">
                    {s.asOf && <span className="text-caption text-ink-muted">{s.asOf}</span>}
                    <DataChip status={s.status} />
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </aside>
    </div>
  );
}

export function QbrBriefFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 rounded-sm border border-hairline bg-surface p-5 lg:col-span-9">
        <Skeleton className="h-7 w-2/3" />
        <LoadingBlock label="Building the brief…" lines={8} />
      </div>
      <div className="lg:col-span-3">
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
