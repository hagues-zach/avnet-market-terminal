"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Cohort } from "@/lib/data/live/earnings-model";
import type { Primer } from "@/lib/learn/content";
import type { LeadRow } from "@/lib/leads/data";
import { GROUPS, PRIMER_GROUPS, filter, groupLabel, lead, leadsHref, techName, useFor, type LeadStart } from "@/lib/leads/rank";
import { ButtonLink } from "@/components/ui/button";
import { DataChip } from "@/components/ui/chip";
import { Delta } from "@/components/ui/delta";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

// Lead Finder: the answer in words, the controls, then the ranked customer
// companies beside the selected one: why it showed up, its news, Avnet's
// (mock) business with it and where to go next. Filtering works now; private
// companies and enrichment arrive in 3.6.

const LABEL = "font-display text-label uppercase text-ink-muted";
const H3 = "font-display text-card-title text-ink";
const link = "text-ink underline underline-offset-2 hover:text-ink-muted";
const field = "h-control border border-hairline bg-surface px-2.5 text-body-sm text-ink";

/** "$28.2B", "$777M", "n/a". Input in dollars. */
function usd(v?: number): string {
  if (v === undefined || !Number.isFinite(v)) return "n/a";
  const a = Math.abs(v);
  return a >= 1e9 ? `$${(a / 1e9).toFixed(1)}B` : `$${Math.round(a / 1e6)}M`;
}
const days = (v?: number) => (v === undefined || !Number.isFinite(v) ? "n/a" : String(Math.round(v)));

export function LeadFinder({ start, primers, leads: all }: { start: LeadStart; primers: Pick<Primer, "slug" | "name">[]; leads: LeadRow[] }) {
  const router = useRouter();
  const uid = useId();
  const [group, setGroup] = useState<Cohort | undefined>(start.group);
  const [news, setNews] = useState(start.news);
  const shown = filter(all, group, news);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const selected = shown.find((l) => l.company.slug === picked) ?? shown[0];
  const p = start.primer;
  const groups = GROUPS.filter((g) => (PRIMER_GROUPS[p.slug] ?? []).includes(g.value));

  // Filters update the URL in place, so a list can be shared; the data is already here, so no server round trip.
  const sync = (g: Cohort | undefined, n: boolean) => window.history.replaceState(null, "", leadsHref({ primer: p.slug, group: g, news: n }));
  const chooseGroup = (g: Cohort | undefined) => {
    setGroup(g);
    sync(g, news);
  };
  const toggleNews = () => {
    setNews(!news);
    sync(group, !news);
  };
  const reset = () => {
    setGroup(undefined);
    setNews(false);
    sync(undefined, false);
  };

  return (
    <>
      <div className="space-y-1">
        <p aria-live="polite" className="text-pretty text-xl leading-snug text-ink">
          {lead(shown, p, group, news)}
        </p>
        {start.supplier && (
          <p className="text-body-sm text-ink-muted">
            Showing {techName(p)}, which {start.supplier.name} makes.
          </p>
        )}
        {start.notes.map((n) => (
          <p key={n} className="text-body-sm text-ink-muted">
            {n}
          </p>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${uid}-tech`} className={LABEL}>
              Technology
            </label>
            <Link href={`/learn/${p.slug}`} className={cn(link, "text-caption")}>
              Read the primer
            </Link>
          </div>
          <select
            id={`${uid}-tech`}
            name="primer"
            autoComplete="off"
            value={p.slug}
            onChange={(e) => router.push(leadsHref({ primer: e.target.value }))}
            className={cn(field, "min-w-[11rem]")}
          >
            {primers.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={LABEL} id={`${uid}-group`}>
            Customer group
          </span>
          <div role="group" aria-labelledby={`${uid}-group`} className="inline-flex border border-hairline">
            {[{ value: undefined, label: "All" }, ...groups].map((o, i) => {
              const active = o.value === group;
              return (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseGroup(o.value)}
                  className={cn(
                    "h-control cursor-pointer whitespace-nowrap px-3 font-body text-body-sm transition-colors",
                    i > 0 && "border-l border-hairline",
                    active ? "bg-surface-sunken font-semibold text-ink" : "bg-surface text-ink-muted hover:text-ink",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="flex h-control cursor-pointer items-center gap-2 text-body-sm text-ink">
          <input type="checkbox" name="news" checked={news} onChange={toggleNews} className="h-4 w-4 cursor-pointer accent-ink" />
          Only with news on it
        </label>
        <button
          type="button"
          onClick={reset}
          disabled={!group && !news}
          className="h-control cursor-pointer px-3 font-body text-button text-ink hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section aria-labelledby={`${uid}-list`} className="flex flex-col rounded-sm border border-hairline bg-surface xl:col-span-5">
          <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
            <h2 id={`${uid}-list`} className={H3}>
              {shown.length} {shown.length === 1 ? "company" : "companies"}, ranked
            </h2>
            <DataChip status="live" />
          </header>
          <p className="px-4 pt-0.5 text-caption text-ink-muted">Most reasons first, then faster growth</p>
          {shown.length ? (
            <ol className="mt-2 flex-1 divide-y divide-hairline border-t border-hairline">
              {shown.map((l, i) => {
                const active = l.company.slug === selected?.company.slug;
                return (
                  <li key={l.company.slug} className="relative">
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
                    <button
                      type="button"
                      onClick={() => setPicked(l.company.slug)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-3 px-4 py-2 text-left hover:bg-surface-sunken",
                        active && "bg-surface-selected hover:bg-surface-selected",
                      )}
                    >
                      <span className="w-5 shrink-0 pt-0.5 text-right text-caption tabular-nums text-ink-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className={cn("text-body-sm text-ink", active && "font-semibold")}>{l.company.name}</span>
                          <span className="text-caption text-ink-muted">{groupLabel(l.group)}</span>
                        </span>
                        <span className="block text-caption text-ink-muted">{l.reasons.map((r) => r.text).join(". ")}</span>
                      </span>
                      <span className="shrink-0 pt-0.5">
                        {l.growth !== undefined ? <Delta value={l.growth} neutral /> : <span className="text-caption text-ink-muted">n/a</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="px-4">
              <EmptyState
                title="No company matches the filter."
                body={news ? `Clear "Only with news on it" to see every company whose market uses ${techName(p)}.` : undefined}
                action={
                  <button type="button" onClick={reset} className={cn(link, "cursor-pointer text-body-sm")}>
                    Reset the filter
                  </button>
                }
              />
            </div>
          )}
          <footer className="border-t border-hairline px-4 py-2 text-caption text-ink-muted">
            Source: SEC filings, each company&apos;s latest 10-Q or 10-K; Market News, last 30 days
          </footer>
        </section>

        <div className="xl:col-span-7">{selected && <Detail l={selected} p={p} />}</div>
      </div>

      <section
        aria-labelledby={`${uid}-how`}
        className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-sm border border-hairline bg-surface px-4 py-3 md:grid-cols-2"
      >
        <div>
          <h2 id={`${uid}-how`} className={H3}>
            Where these come from
          </h2>
          <ul className="mt-1.5 space-y-1 text-body-sm text-ink">
            <li>
              Customer groups that use {techName(p)}, from{" "}
              <Link href={`/learn/${p.slug}`} className={link}>
                the Learning Center primer
              </Link>
            </li>
            <li>
              Revenue, growth and inventory from each company&apos;s filings, as on{" "}
              <Link href="/customers" className={link}>
                Customers &amp; End Markets
              </Link>
            </li>
            <li>News from the last 30 days that mentions the technology</li>
          </ul>
        </div>
        <div>
          <h2 className={H3}>Not here yet</h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
            <DataChip status="planned" />
            Private and mid-size companies, hiring signals and contacts arrive with Treg enrichment in step 3.6.
          </p>
          <p className="mt-1.5 text-body-sm text-ink-muted">
            Gaps on Avnet&apos;s line card need its line card imported; until then{" "}
            <Link href="/line-cards" className={link}>
              Line Cards
            </Link>{" "}
            shows who carries each supplier.
          </p>
        </div>
      </section>
    </>
  );
}

function Detail({ l, p }: { l: LeadRow; p: Primer }) {
  const usedIn = useFor(p, l.group);
  const story = l.stories.slice(0, 3);
  const c = l.company;
  return (
    <section aria-labelledby="lead-name" className="rounded-sm border border-hairline bg-surface px-4 py-3">
      <h2 id="lead-name" className="font-display text-section-title text-ink">
        {c.name}
      </h2>
      <p className="text-caption text-ink-muted">
        {groupLabel(l.group)}, {l.quarter ?? "latest quarter n/a"}
      </p>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-hairline border-y border-hairline">
        <div className="px-3 py-2 first:pl-0">
          <dt className={LABEL}>Revenue</dt>
          <dd className="font-display text-figure tabular-nums text-ink">{usd(l.revenue)}</dd>
        </div>
        <div className="px-3 py-2">
          <dt className={LABEL}>Growth on a year ago</dt>
          <dd className="font-display text-figure tabular-nums text-ink">
            {l.growth !== undefined ? <Delta value={l.growth} neutral className="font-display text-figure" /> : "n/a"}
          </dd>
        </div>
        <div className="px-3 py-2">
          <dt className={LABEL}>Inventory days</dt>
          <dd className="flex items-baseline gap-2">
            <span className="font-display text-figure tabular-nums text-ink">{days(l.inventoryDays)}</span>
            {l.inventoryDaysYearAgo !== undefined && <span className="text-caption text-ink-muted">{days(l.inventoryDaysYearAgo)} a year ago</span>}
          </dd>
        </div>
      </dl>
      {l.error && (
        <p className="mt-2 text-caption text-ink-muted">Some of {c.name}&apos;s filings couldn&apos;t be loaded; missing figures read n/a.</p>
      )}

      <h3 className={cn(H3, "mt-4")}>Why it showed up</h3>
      <ul className="mt-1 space-y-0.5 text-body-sm text-ink">
        <li>
          Its market uses {techName(p)}
          {usedIn ? `: ${usedIn}.` : "."}
        </li>
        {l.reasons
          .filter((r) => r.kind !== "fit")
          .map((r) => (
            <li key={r.kind}>{r.text}.</li>
          ))}
      </ul>

      <h3 className={cn(H3, "mt-4")}>In the news</h3>
      {story.length ? (
        <ul className="mt-1 divide-y divide-hairline border-t border-hairline">
          {story.map((s) => (
            <li key={s.url} className="flex items-baseline justify-between gap-3 py-1.5 text-body-sm">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-ink underline-offset-2 hover:underline">
                {s.title}
                <span className="sr-only"> (opens the source)</span>
                <ExternalLink className="ml-1 inline h-3 w-3 text-ink-muted" strokeWidth={1.5} aria-hidden />
              </a>
              <span className="shrink-0 whitespace-nowrap text-caption text-ink-muted">
                {s.onTechnology && <span className="mr-2 text-ink">On {techName(p)}</span>}
                {s.outlet}, {s.date}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-body-sm text-ink-muted">No stories on {c.name} in the feed lately.</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <h3 className={H3}>Avnet&apos;s business with {c.name}</h3>
        <DataChip status="mock" />
      </div>
      <dl className="mt-1 divide-y divide-hairline border-y border-hairline">
        {l.business.rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-body-sm text-ink-muted">{r.label}</dt>
            <dd className="font-display text-section-title tabular-nums text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2">
        <HookupMarker ids={l.business.hookups} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-3">
        <ButtonLink href={`/network/${c.slug}`}>Company Profile</ButtonLink>
        <ButtonLink href={`/tools/qbr?company=${c.slug}&meeting=customer`}>Prepare a QBR</ButtonLink>
        <ButtonLink href={`/tools/deck?company=${c.slug}&primer=${p.slug}&from=leads`}>Build a pitch</ButtonLink>
      </div>
    </section>
  );
}
