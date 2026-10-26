import Link from "next/link";
import output from "../../../../../data/cycle/output.json";
import { SERIES } from "@/lib/cycle/catalog";
import { phases } from "@/lib/cycle/signals";
import { PageBody } from "@/components/layout/page-body";
import { PageTitle } from "@/components/ui/page-title";
import { Panel, SourceLine } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { AiGapBars, GrowthLines, ReferenceChart } from "@/components/cycle-engine/charts";
import { cn } from "@/lib/utils";

// The semiconductor cycle engine, shown plainly so its choices can be checked:
// the dated reference cycle, which series lead or lag it, the composite indexes,
// the AI gap, the signal backtest and the stress flag. It reads the engine's
// committed output (scripts/run-cycle-engine.ts); nothing is computed per request.
// Not in the navigation; linked from Economic Signals.

type Out = typeof output;
const label = (key: string) => SERIES.find((s) => s.key === key)?.label ?? key;
const pct = (v: number | null | undefined, signed = true) =>
  v === null || v === undefined ? "n/a" : `${v < 0 ? "−" : signed && v > 0 ? "+" : ""}${Math.abs(v * 100).toFixed(1)}%`;
const months = (v: number | null | undefined) => (v === null || v === undefined ? "n/a" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`);
const monthName = (m: string) => new Date(`${m}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const TH = "h-control whitespace-nowrap px-3 text-left font-display text-label font-normal uppercase text-ink-muted";
const TD = "px-3 py-1.5 align-top";
const PLACED: Record<string, string> = { leading: "Leading", coincident: "Moves with the cycle", lagging: "Lagging", "not placed": "Not placed" };

export default function CycleEnginePage() {
  const o = output as Out;
  const downturns = phases(o.reference.turns as { month: string; kind: "peak" | "trough"; value: number }[], "down");
  const groups = ["leading", "coincident", "lagging", "not placed"].map((p) => ({ p, rows: o.scorecard.filter((c) => c.placement === p) }));
  const live = o.indexes.filter((i) => !i.empty);
  const signals = o.signals as { available: boolean; reason?: string; down?: { drop: number; steps: { step: string; episodes: string[]; hits: number; falseSignals: number; caught: number; of: number; lead: number | null }[] }; up?: { drop: number; steps: { step: string; episodes: string[]; hits: number; falseSignals: number; caught: number; of: number; lead: number | null }[] } };
  const secGap = o.aiGap.sec.filter((r) => r.quarter >= "CY12 Q1");
  const lastGap = secGap.at(-1);

  return (
    <PageBody>
      <PageTitle title="How the cycle engine works" subtitle="Which public series lead, move with or lag the chip cycle, and the indexes and signals built from them" />

      <div className="space-y-2">
        <p className="text-pretty text-xl leading-snug text-ink">{o.stage.sentence}</p>
        <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
          <Chip>{o.reference.source === "Public proxy" ? "Reference: public proxy until WSTS arrives" : "Reference: WSTS"}</Chip>
          History fetched {o.history.fetched}, run {o.generated}. {o.history.note}
        </p>
      </div>

      <Panel
        title="The reference cycle"
        subtitle={`${o.reference.series}, growth on a year ago. Downturns, peak to trough, shaded.`}
        footer={<SourceLine source={o.reference.series} asOf={o.reference.turns.at(-1) ? monthName(o.reference.turns.at(-1)!.month) : undefined} />}
      >
        {o.reference.growth && <ReferenceChart growth={o.reference.growth as [string, number][]} downturns={downturns} />}
        <p className="mt-3 text-body-sm text-ink">
          Troughs: {o.reference.turns.filter((t) => t.kind === "trough").map((t) => monthName(t.month)).join(", ")}.
        </p>
        <p className="mt-1 text-caption text-ink-muted">{o.reference.method}</p>
        <p className="mt-2 text-body-sm text-ink">
          Since 2010, {o.reference.check.agree.length} of the proxy&apos;s turns line up with chip makers&apos; own revenue turns within six months, and{" "}
          {o.reference.check.unmatched.length} don&apos;t. US electronics shipments are a stand-in for global chip sales; WSTS will date the cycle on the real thing.
        </p>
      </Panel>

      <Panel title="Which series lead, move with or lag the cycle" subtitle="Each series' own turns matched to the cycle's, and its best correlation at a shift. A lead must hold before and after 2008.">
        <div role="region" aria-label="The finder's scorecard" tabIndex={0} className="overflow-x-auto">
          <table className="w-full border-collapse font-body text-table">
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                {["Series", "Starting guess", "Placed as", "Lead, months", "Turns matched", "Holds in both eras", "Best correlation", "Why"].map((h) => (
                  <th key={h} scope="col" className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map(({ p, rows }) => (
              <tbody key={p} className="border-b border-hairline">
                <tr>
                  <th colSpan={8} scope="rowgroup" className="bg-surface px-3 pb-1 pt-3 text-left text-body-strong text-ink">
                    {PLACED[p]} ({rows.length})
                  </th>
                </tr>
                {rows.map((c) => (
                  <tr key={c.key} className="border-t border-hairline">
                    <th scope="row" className={cn(TD, "text-left font-normal text-ink")}>
                      {c.label}
                      <span className="block text-caption text-ink-muted">{c.source}</span>
                    </th>
                    <td className={cn(TD, "capitalize text-ink-muted")}>{c.guess}</td>
                    <td className={cn(TD, "text-ink")}>{PLACED[c.placement]}</td>
                    <td className={cn(TD, "tabular-nums text-ink")}>{c.tested ? months(c.lead) : "n/a"}</td>
                    <td className={cn(TD, "tabular-nums text-ink")}>{c.tested ? `${c.matched} of ${c.matched + c.missed}, ${Math.round(c.hitRate * 100)}%` : "n/a"}</td>
                    <td className={cn(TD, "text-ink")}>{!c.tested ? "n/a" : c.stable === true ? "Yes" : c.stable === false ? "No" : "One era only"}</td>
                    <td className={cn(TD, "tabular-nums text-ink")}>{c.correlation ? `${c.correlation.r.toFixed(2)} at ${months(c.correlation.lead)}` : "n/a"}</td>
                    <td className={cn(TD, "min-w-[18rem] text-body-sm text-ink-muted")}>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-2 text-caption text-ink-muted">
          A positive lead means the series turns first. Leading needs a median lead of {o.rules.tier.leadMonths} months or more and {Math.round(o.rules.tier.leadingHitRate * 100)}% of turns
          matched; at least half of a series&apos; own turns must be the cycle&apos;s, with a correlation of {o.rules.tier.supportCorrelation} or more.
        </p>
      </Panel>

      <Panel title="The indexes" subtitle="Built the Conference Board way from the series placed in each tier; growth is EPB's 6-month smoothed annualised rate.">
        {live.length > 0 && <GrowthLines series={live.map((i) => ({ name: i.name, growth: i.growth as [string, number][] }))} />}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse font-body text-table">
            <thead className="bg-surface-sunken">
              <tr className="border-b border-hairline">
                {["Index", "Growth", "Series in it", "What moved it last month"].map((h) => (
                  <th key={h} scope="col" className={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.indexes.map((i) => (
                <tr key={i.name} className="border-b border-hairline last:border-b-0">
                  <th scope="row" className={cn(TD, "text-left font-normal text-ink")}>
                    {i.name}
                  </th>
                  <td className={cn(TD, "tabular-nums text-ink")}>{i.latest ? `${pct(i.latest.growth)}, ${monthName(i.latest.month)}` : "n/a"}</td>
                  <td className={cn(TD, "text-body-sm text-ink")}>{i.empty ? "No series passed the test for this tier yet." : i.members.map(label).join(", ")}</td>
                  <td className={cn(TD, "text-body-sm text-ink-muted")}>
                    {i.movers
                      ? [...i.movers.up.map((m) => `${label(m.key)} up`), ...i.movers.down.map((m) => `${label(m.key)} down`)].join(", ") || "Nothing moved it"
                      : "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-7"
          title="The AI gap"
          subtitle="Chip makers' revenue growth on a year ago: AI and datacenter against everyone else"
          footer={<SourceLine source="SEC filings, Market Cycle groups" asOf={lastGap?.quarter} />}
        >
          <AiGapBars rows={secGap} />
          {lastGap && (
            <p className="mt-2 text-body-sm text-ink">
              In {lastGap.quarter}, AI and datacenter revenue grew {pct(lastGap.ai)} against {pct(lastGap.exai)} for everyone else, a gap of {pct(lastGap.gap)}.
            </p>
          )}
        </Panel>
        <Panel className="xl:col-span-5" title="Stress flag" subtitle="Finished goods piling up while margins slip">
          <dl className="divide-y divide-hairline text-body-sm">
            {(
              [
                ["Flag", o.stress.on ? "On" : "Off"],
                ["Finished goods share of electronics inventory", o.stress.share === null ? "n/a" : `Higher than ${Math.round(o.stress.share * 100)}% of its history (flag at 80%)`],
                ["Chip makers' operating margin", o.stress.latestMargin ? `${pct(o.stress.latestMargin.margin, false)} in ${o.stress.latestMargin.quarter}` : "n/a"],
                ["Down from its 4-quarter high", o.stress.drawdown === null ? "n/a" : o.stress.drawdown <= 0 ? "Not down; at a high" : `${(o.stress.drawdown * 100).toFixed(1)} points`],
                ["Drawdown that flags it", o.stress.threshold === null ? "n/a" : `${(o.stress.threshold * 100).toFixed(1)} points, the median of past downturns`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="Turning point signals" subtitle="EPB's downturn signal, built and backtested one step at a time on chip history, and its mirror for the upturn">
        {!signals.available ? (
          <p className="text-body text-ink">{signals.reason} The steps run as soon as a leading index exists: the leading index a set drop below its 24-month high, the yield curve inverted in the last 24 months, leading momentum negative, and signals within 12 months counted once.</p>
        ) : (
          ([["Downturn", signals.down!], ["Upturn", signals.up!]] as const).map(([name, s]) => (
            <div key={name} className="mt-3 first:mt-0">
              <h3 className="text-body-strong text-ink">
                {name} signal, at a {(s.drop * 100).toFixed(1)}% move
              </h3>
              <table className="mt-1 w-full border-collapse font-body text-table">
                <thead className="bg-surface-sunken">
                  <tr className="border-b border-hairline">
                    {["Step", "Signals", "Right", "False", "Turns caught", "Median lead, months"].map((h) => (
                      <th key={h} scope="col" className={TH}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.steps.map((st) => (
                    <tr key={st.step} className="border-b border-hairline">
                      <th scope="row" className={cn(TD, "text-left font-normal text-ink")}>
                        {st.step}
                      </th>
                      <td className={cn(TD, "tabular-nums")}>{st.episodes.length}</td>
                      <td className={cn(TD, "tabular-nums")}>{st.hits}</td>
                      <td className={cn(TD, "tabular-nums")}>{st.falseSignals}</td>
                      <td className={cn(TD, "tabular-nums")}>
                        {st.caught} of {st.of}
                      </td>
                      <td className={cn(TD, "tabular-nums")}>{months(st.lead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </Panel>

      <p className="text-body-sm text-ink-muted">
        Built from public data only. WSTS global chip sales will replace the reference proxy when Avnet&apos;s files arrive; Japan&apos;s equipment billings, Korea and Taiwan chip
        exports and the SOX are still to add. See <Link href="/signals" className="text-ink underline underline-offset-2">Economic Signals</Link>.
      </p>
    </PageBody>
  );
}
