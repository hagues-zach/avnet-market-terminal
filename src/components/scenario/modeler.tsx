"use client";

import { Suspense, use, useId, useState } from "react";
import Link from "next/link";
import { VIEWS, goalSeek, lead, money, path, pct, project, type Assumptions, type MarketView, type SegmentInput } from "@/lib/scenario/model";
import { DataChip } from "@/components/ui/chip";
import { KpiTile } from "@/components/ui/kpi-tile";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { LoadingBlock } from "@/components/ui/states";
import { HorizonChart } from "./charts";
import { cn } from "@/lib/utils";

// The Scenario Modeler: one control bar, the model by segment with growth and
// share editable in each row, then the billings path, the bridge and a check
// against what Avnet, Arrow and the supply chain reported. The maths runs on
// the shared mock model; the reality check's reported growth is live.

export interface RealityCheck {
  /** Latest calendar quarter with figures, e.g. "CY26 Q3". */
  quarter?: string;
  avnet?: number;
  arrow?: number;
  supply?: number;
  supplyCompanies: number;
  /** WSTS forecast growth for next year (mock). */
  wsts: number;
  wstsYear: number;
  failed?: boolean;
}

const HORIZONS = [1, 2, 3, 4];
const PRESETS = [
  { value: 0, label: "Hold" },
  { value: 0.25, label: "+0.25 pts" },
  { value: 0.5, label: "+0.5 pts" },
];
const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const CELL_INPUT =
  "h-7 w-16 border-0 border-b bg-surface-sunken px-1.5 text-right font-body text-table tabular-nums text-ink focus:border-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
const link = "text-ink underline-offset-2 hover:underline";
const inYears = (n: number) => (n === 1 ? "in one year" : `in ${n} years`);

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL} id={id}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="inline-flex border border-hairline">
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
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
  );
}

/** Today to the horizon as floating bars: today, the market's part, share's part, the scenario. */
function Bridge({ b }: { b: { today: number; market: number; share: number; scenario: number } }) {
  const steps = [
    { label: "Billings today", from: 0, to: b.today, value: money(b.today), color: "bg-viz-avnet" },
    { label: "Market growth", from: b.today, to: b.today + b.market, value: money(b.market, true), color: "bg-viz-benchmark" },
    { label: "Share change", from: b.today + b.market, to: b.scenario, value: money(b.share, true), color: "bg-viz-avnet" },
    { label: "Scenario", from: 0, to: b.scenario, value: money(b.scenario), color: "bg-viz-avnet" },
  ];
  const max = Math.max(...steps.flatMap((s) => [s.from, s.to]), 1);
  return (
    <ul className="space-y-3">
      {steps.map((s) => {
        const lo = Math.min(s.from, s.to);
        const w = Math.abs(s.to - s.from);
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className={cn("text-ink", s.label === "Scenario" && "font-semibold")}>{s.label}</span>
              <span className={cn("tabular-nums text-ink", s.label === "Scenario" && "font-semibold")}>{s.value}</span>
            </div>
            <div className="relative mt-1 h-2" aria-hidden>
              <div
                className={cn("absolute inset-y-0", s.color)}
                style={{ left: `${(lo / max) * 100}%`, width: `${Math.max((w / max) * 100, w > 0 ? 0.5 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Check({ checks, cagr }: { checks: Promise<RealityCheck>; cagr: number }) {
  const c = use(checks);
  const q = c.quarter ? c.quarter.replace(/^CY(\d+) Q(\d)$/, "Q$2 20$1") : "the latest quarter";
  const rows: { label: string; note: string; value?: number; status: "live" | "mock"; color: string }[] = [
    { label: "This scenario", note: "Billings growth a year", value: cagr, status: "mock", color: "bg-viz-avnet" },
    { label: "Avnet, reported", note: `Revenue, ${q} on a year ago`, value: c.avnet, status: "live", color: "bg-viz-avnet-2" },
    { label: "Arrow, reported", note: `Revenue, ${q} on a year ago`, value: c.arrow, status: "live", color: "bg-viz-arrow" },
    {
      label: "Supply chain",
      note: `${c.supplyCompanies} companies, combined revenue, ${q}`,
      value: c.supply,
      status: "live",
      color: "bg-viz-benchmark",
    },
    { label: `WSTS forecast, ${c.wstsYear}`, note: "World semiconductor market growth", value: c.wsts, status: "mock", color: "bg-viz-benchmark" },
  ];
  const max = Math.max(...rows.map((r) => Math.abs(r.value ?? 0)), 0.01);
  const gap = c.avnet === undefined ? undefined : cagr - c.avnet;
  return (
    <>
      <p className="mb-3 text-caption text-ink-muted">
        {c.failed
          ? "Reported growth couldn't be loaded from SEC filings; try again in a few minutes."
          : gap === undefined
            ? "Avnet's latest quarter isn't filed yet."
            : `The scenario grows ${Math.abs(gap * 100).toFixed(1)} pts a year ${gap >= 0 ? "faster" : "slower"} than Avnet's revenue grew in its latest quarter.`}
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-body-sm text-ink">
                {r.label}
                <DataChip status={r.status} label={r.status === "live" ? "SEC filings" : undefined} />
              </span>
              <span className="whitespace-nowrap font-display text-card-title tabular-nums text-ink">
                {r.value === undefined ? "n/a" : pct(r.value, 1, true)}
              </span>
            </div>
            <div className="mt-1 h-2" aria-hidden>
              <div className={cn("h-full", r.color)} style={{ width: `${(Math.abs(r.value ?? 0) / max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-caption text-ink-muted">{r.note}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ScenarioModeler({
  segments,
  spread,
  quarters,
  checks,
}: {
  segments: SegmentInput[];
  /** Upside and downside band by year ahead. */
  spread: number[];
  /** The latest fiscal quarter, e.g. "FY27 Q1", and the ones after it, for the chart. */
  quarters: string[];
  checks: Promise<RealityCheck>;
}) {
  const all = segments.map((s) => s.segment);
  const start: Assumptions = { years: 2, view: "base", growth: {}, shareChange: Object.fromEntries(all.map((s) => [s, 0.25])) };
  const [a, setA] = useState<Assumptions>(start);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [target, setTarget] = useState("");
  const uid = useId();

  const p = project(segments, a, spread);
  const rows = path(segments, a, spread).map((r) => ({ ...r, label: quarters[r.q] ?? `+${r.q}Q` }));
  const uniform = all.every((s) => (a.shareChange[s] ?? 0) === (a.shareChange[all[0]] ?? 0)) ? (a.shareChange[all[0]] ?? 0) : null;
  const targetM = Number(target) * 1000;
  const need = target.trim() ? goalSeek(p, targetM) : undefined;
  const dirty = JSON.stringify(a) !== JSON.stringify(start);

  const setShareAll = (v: number) => setA({ ...a, shareChange: Object.fromEntries(all.map((s) => [s, v])) });
  const reset = () => {
    setA(start);
    setDrafts({});
    setTarget("");
  };
  const edit = (kind: "growth" | "shareChange", seg: string, text: string) => {
    setDrafts({ ...drafts, [`${kind}:${seg}`]: text });
    const n = Number(text);
    if (kind === "growth") setA({ ...a, growth: { ...a.growth, [seg]: text.trim() === "" || !Number.isFinite(n) ? undefined : n / 100 } });
    else if (Number.isFinite(n)) setA({ ...a, shareChange: { ...a.shareChange, [seg]: text.trim() === "" ? 0 : n } });
  };
  const draft = (kind: "growth" | "shareChange", seg: string, shown: string) => drafts[`${kind}:${seg}`] ?? shown;
  const blur = (kind: "growth" | "shareChange", seg: string) => {
    const next = { ...drafts };
    delete next[`${kind}:${seg}`];
    setDrafts(next);
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${uid}-lead`} className="space-y-3">
        <h2 id={`${uid}-lead`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink" aria-live="polite">
          <span>{lead(p, a)}</span>
          <DataChip status="mock" />
        </h2>
        <HookupMarker ids={["billings", "wsts", "gartner-forecast", "ipe-forecast", "code-map"]} />
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiTile
          label={`Billings ${inYears(a.years)}`}
          value={money(p.billingsAt)}
          note={`from ${money(p.billings)} today`}
          source={{ status: "mock" }}
        />
        <KpiTile label="Growth a year" value={pct(p.cagr, 1, true)} note="billings, compounded" source={{ status: "mock" }} />
        <KpiTile label="Share of mapped market" value={pct(p.shareAt)} note={`from ${pct(p.share)}`} source={{ status: "mock" }} />
        <KpiTile
          label="Against holding share"
          value={money(p.billingsAt - p.holdAt, true)}
          delta={{ value: p.billingsAt - p.holdAt, display: pct((p.billingsAt - p.holdAt) / p.holdAt), period: "on holding share" }}
          source={{ status: "mock" }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-sm border border-hairline bg-surface px-4 py-3">
        <Segmented
          label="Horizon"
          options={HORIZONS.map((h) => ({ value: h, label: h === 1 ? "1 year" : `${h} years` }))}
          value={a.years}
          onChange={(years) => setA({ ...a, years })}
        />
        <Segmented<MarketView> label="Market view" options={VIEWS} value={a.view} onChange={(view) => setA({ ...a, view })} />
        <Segmented label="Share change, every segment" options={PRESETS} value={uniform} onChange={setShareAll} />
        <div className="flex flex-col gap-0.5">
          <label htmlFor={`${uid}-target`} className={LABEL}>
            Goal seek, billings target
          </label>
          <span className="flex items-center gap-2">
            <span className="flex items-center border-b border-hairline bg-surface-sunken focus-within:border-ink">
              <span className="pl-2 text-body-sm text-ink-muted">$</span>
              <input
                id={`${uid}-target`}
                name="billings-target"
                inputMode="decimal"
                autoComplete="off"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="28.0…"
                className="h-control w-20 border-0 bg-transparent px-1 font-body text-body-sm tabular-nums text-ink focus:outline-none focus-visible:outline-none"
              />
              <span className="pr-2 text-body-sm text-ink-muted">B</span>
            </span>
            <span className="text-caption text-ink" aria-live="polite">
              {need === undefined ? (
                <span className="text-ink-muted">Enter billings in $B</span>
              ) : need === null ? (
                "Out of reach with the same change in every segment"
              ) : (
                <>
                  Needs {need >= 0 ? "+" : "−"}
                  {Math.abs(need).toFixed(2)} pts in every segment{" "}
                  <button type="button" onClick={() => setShareAll(Math.round(need * 100) / 100)} className={cn(link, "underline")}>
                    Use it
                  </button>
                </>
              )}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!dirty && !target}
          className="ml-auto h-control px-2 font-body text-button text-ink underline-offset-2 hover:underline disabled:cursor-default disabled:text-ink-muted disabled:no-underline"
        >
          Reset
        </button>
      </div>

      <section aria-labelledby={`${uid}-model`} className="rounded-sm border border-hairline bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3">
          <div>
            <h2 id={`${uid}-model`} className="font-display text-card-title text-ink">
              The model, by segment
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              Growth starts at the forecast; type over it or the share change in any row and the totals follow. An empty growth cell goes back to the
              forecast
            </p>
          </div>
          <DataChip status="mock" />
        </header>
        <div role="region" aria-label="The model by segment" tabIndex={0} className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse font-body text-table">
            <caption className="sr-only">
              Each segment&apos;s market today, growth a year, Avnet share now, the share change, share and billings {inYears(a.years)}, and the
              change. Mock data.
            </caption>
            <thead className="bg-surface-sunken">
              <tr className="border-y border-hairline">
                <th scope="col" className={cn(TH, "text-left")}>
                  Segment
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Market today
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Growth a year
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Share now
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Share change
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Share {inYears(a.years)}
                </th>
                <th scope="col" className={cn(TH, "text-right")}>
                  Billings {inYears(a.years)}
                </th>
                <th scope="col" className={cn(TH, "text-left")}>
                  Change on today
                </th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r) => {
                const change = r.billingsAt - r.billings;
                const maxChange = Math.max(...p.rows.map((x) => Math.abs(x.billingsAt - x.billings)), 1);
                return (
                  <tr key={r.segment} className="border-b border-hairline hover:bg-surface-sunken">
                    <th scope="row" className="whitespace-nowrap px-3 py-1 text-left font-normal text-ink">
                      {r.segment.replace(/ & /g, " and ")}
                    </th>
                    <td className="px-3 py-1 text-right tabular-nums text-ink">{money(r.market)}</td>
                    <td className="px-3 py-1 text-right">
                      <input
                        type="number"
                        step={0.5}
                        name={`growth-${r.segment}`}
                        aria-label={`Growth a year, ${r.segment}, percent`}
                        autoComplete="off"
                        value={draft("growth", r.segment, (r.growth * 100).toFixed(1))}
                        onChange={(e) => edit("growth", r.segment, e.target.value)}
                        onBlur={() => blur("growth", r.segment)}
                        className={cn(CELL_INPUT, r.edited ? "border-ink font-semibold" : "border-hairline")}
                      />
                      <span className="ml-0.5 text-ink-muted">%</span>
                      {r.edited && <span className="sr-only"> (edited)</span>}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-ink">{pct(r.share)}</td>
                    <td className="px-3 py-1 text-right">
                      <input
                        type="number"
                        step={0.05}
                        name={`share-${r.segment}`}
                        aria-label={`Share change, ${r.segment}, points`}
                        autoComplete="off"
                        value={draft("shareChange", r.segment, String(a.shareChange[r.segment] ?? 0))}
                        onChange={(e) => edit("shareChange", r.segment, e.target.value)}
                        onBlur={() => blur("shareChange", r.segment)}
                        className={cn(CELL_INPUT, "border-hairline")}
                      />
                      <span className="ml-0.5 text-ink-muted">pts</span>
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums text-ink">{pct(r.shareAt)}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-ink">{money(r.billingsAt)}</td>
                    <td className="px-3 py-1">
                      <span className="flex items-center gap-2">
                        <span className="w-14 text-right tabular-nums text-ink">{money(change, true)}</span>
                        <span className="block h-1.5 w-14" aria-hidden>
                          <span className="block h-full bg-viz-avnet" style={{ width: `${(Math.abs(change) / maxChange) * 100}%` }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink font-semibold">
                <th scope="row" className="px-3 py-1.5 text-left text-ink">
                  All mapped segments
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{money(p.market)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{pct((p.marketAt / p.market) ** (1 / a.years) - 1)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{pct(p.share)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">
                  {uniform === null ? "Varies" : `${uniform > 0 ? "+" : uniform < 0 ? "−" : ""}${Math.abs(uniform)} each`}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{pct(p.shareAt)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-ink">{money(p.billingsAt)}</td>
                <td className="px-3 py-1.5 tabular-nums text-ink">{money(p.billingsAt - p.billings, true)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-12 [&>*]:min-w-0">
        <section aria-labelledby={`${uid}-path`} className="rounded-sm border border-hairline bg-surface xl:col-span-5">
          <header className="px-4 pt-3">
            <h2 id={`${uid}-path`} className="font-display text-card-title text-ink">
              Billings to the horizon
            </h2>
            <p className="mt-0.5 text-caption text-ink-muted">
              Trailing four quarters, by fiscal quarter, against holding today&apos;s share in every segment
            </p>
          </header>
          <div className="px-2 pb-2 pt-1">
            <HorizonChart rows={rows} />
          </div>
        </section>
        <section aria-labelledby={`${uid}-bridge`} className="rounded-sm border border-hairline bg-surface px-4 py-3 xl:col-span-3">
          <h2 id={`${uid}-bridge`} className="font-display text-card-title text-ink">
            Where the change comes from
          </h2>
          <p className="mb-3 mt-0.5 text-caption text-ink-muted">
            The market adds {money(p.bridge.market)}; share {p.bridge.share >= 0 ? "adds" : "takes away"} {money(Math.abs(p.bridge.share))}
          </p>
          <Bridge b={p.bridge} />
        </section>
        <section aria-labelledby={`${uid}-check`} className="rounded-sm border border-hairline bg-surface px-4 py-3 xl:col-span-4">
          <h2 id={`${uid}-check`} className="font-display text-card-title text-ink">
            Is it believable?
          </h2>
          <Suspense fallback={<LoadingBlock label="Loading reported growth…" lines={5} />}>
            <Check checks={checks} cagr={p.cagr} />
          </Suspense>
          <p className="mt-3 flex flex-wrap gap-x-3 text-caption">
            <Link href="/cycle" className={link}>
              Market Cycle
            </Link>
            <Link href="/competitive" className={link}>
              Avnet vs Arrow
            </Link>
          </p>
        </section>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
        <DataChip status="planned" />
        Saving, comparing scenarios and sending one to Pitch Deck Builder arrive with the database (step 4.1).
      </p>
      <p className="text-caption text-ink-muted">
        Billings {inYears(a.years)} are each segment&apos;s market at the horizon times Avnet&apos;s share, which moves evenly to the change set
        above. The market effect is today&apos;s share on the bigger market; the share effect is the rest. Base growth is the forecast for each
        segment, standing in for WSTS and Gartner (semiconductors) and the IP&amp;E forecast until they are hooked up; upside and downside move every
        market by the WSTS forecast&apos;s band ({spread.map((s) => `${Math.round(s * 100)}%`).join(", ")} for one to four years). Market sizes and
        shares are the same mock figures as{" "}
        <Link href="/market-share" className={link}>
          Market Share
        </Link>{" "}
        and{" "}
        <Link href="/tam" className={link}>
          TAM, SAM and SOM
        </Link>
        , trailing 12 months to {quarters[0]}.
      </p>
    </div>
  );
}
