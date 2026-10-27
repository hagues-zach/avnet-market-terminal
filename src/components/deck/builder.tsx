"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useId, useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Bar, BarChart, Cell, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  AUDIENCES,
  GROUPS,
  isHiddenSlide,
  SLIDES,
  addSlide,
  available,
  count,
  deckHref,
  hrefOf,
  isFrame,
  lead,
  move,
  outline,
  slide,
  sourcesPreview,
  startedFrom,
  statusOf,
  unavailableReason,
  type Audience,
  type Chart,
  type Preview,
  type SlideId,
  type Start,
} from "@/lib/deck/outline";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { LoadingBlock } from "@/components/ui/states";
import { AVNET, VIZ } from "@/lib/colors";
import { cn } from "@/lib/utils";

// Pitch Deck Builder: the deck in words, the outline beside a preview of the
// selected slide, the PowerPoint download, then every slide the app can make.
// The download (step 3.3) is built on the server from the same previews, so the
// file matches what is shown here, charts included.

const LABEL = "font-display text-label uppercase text-ink-muted";
const link = "text-ink underline underline-offset-2 hover:text-ink-muted";
const field = "h-control border border-hairline bg-surface px-2.5 text-body-sm text-ink";

type Previews = Partial<Record<SlideId, Preview>>;

export function DeckBuilder({
  start,
  companies,
  previews,
  talking,
}: {
  start: Start;
  companies: { slug: string; name: string; group: string }[];
  previews: Promise<Previews>;
  /** The talking points slide when it loads on its own, since Claude may be writing it. */
  talking?: Promise<Preview>;
}) {
  const router = useRouter();
  const uid = useId();
  const first = outline(start);
  // Open on the slide the deck was started for: the scenario or the technology, else the first content slide.
  const focus =
    (start.from === "scenario" && first.find((id) => id === "scenario")) ||
    (start.from === "learn" && first.find((id) => id === "technology")) ||
    first.find((id) => !isFrame(id)) ||
    first[0];
  const [ids, setIds] = useState<SlideId[]>(first);
  const [off, setOff] = useState<SlideId[]>([]);
  const [selected, setSelected] = useState<SlideId | undefined>(focus);
  const included = ids.filter((id) => !off.includes(id));
  const from = startedFrom(start);
  const dirty = JSON.stringify(ids) !== JSON.stringify(first) || off.length > 0;

  // A new audience keeps where the deck started; a new company starts afresh.
  const setAudience = (audience: Audience) =>
    router.push(
      deckHref({
        audience,
        company: start.company?.slug,
        primer: start.from === "learn" ? start.primer?.slug : undefined,
        from: start.from,
        scenario: start.from === "scenario" ? start.scenario : undefined,
      }),
    );
  const setCompany = (company?: string) => router.push(deckHref({ company }));
  const reset = () => {
    setIds(first);
    setOff([]);
    setSelected(focus);
  };
  const content = included.filter((id) => !isFrame(id));
  const mockCount = content.filter((id) => statusOf(slide(id)) === "mock").length;
  const exportHref = `/api/deck/export?${new URLSearchParams({
    ...Object.fromEntries(
      new URLSearchParams(
        deckHref({
          audience: start.audience,
          company: start.company?.slug,
          primer: start.primer?.slug,
          from: start.from,
          scenario: start.scenario,
          qbr: start.qbr,
        }).split("?")[1] ?? "",
      ),
    ),
    slides: content.join(","),
  })}`;
  const toggle = (id: SlideId) => setOff((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const add = (id: SlideId) => {
    setIds((x) => addSlide(x, id));
    setSelected(id);
  };

  return (
    <>
      <div className="space-y-1">
        <p aria-live="polite" className="text-pretty text-xl leading-snug text-ink">
          {lead(start, included)}
        </p>
        {from && <p className="text-body-sm text-ink-muted">{from}</p>}
        {start.notes.map((n) => (
          <p key={n} className="text-body-sm text-ink-muted">
            {n}
          </p>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-0.5">
          <span className={LABEL} id={`${uid}-audience`}>
            Audience
          </span>
          <div role="group" aria-labelledby={`${uid}-audience`} className="inline-flex border border-hairline">
            {AUDIENCES.map((o, i) => {
              const active = o.value === start.audience;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => !active && setAudience(o.value)}
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
        <label className="flex flex-col gap-0.5">
          <span className={LABEL}>Company</span>
          <select
            name="company"
            autoComplete="off"
            value={start.company?.slug ?? ""}
            onChange={(e) => setCompany(e.target.value || undefined)}
            className={cn(field, "min-w-[12rem]")}
          >
            <option value="">No company</option>
            {[...new Set(companies.map((c) => c.group))].map((g) => (
              <optgroup key={g} label={g}>
                {companies
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Button variant="ghost" onClick={reset} disabled={!dirty}>
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section aria-labelledby={`${uid}-outline`} className="rounded-sm border border-hairline bg-surface xl:col-span-5">
          <header className="flex items-baseline justify-between gap-3 px-4 pt-3">
            <h2 id={`${uid}-outline`} className="font-display text-card-title text-ink">
              The outline
            </h2>
            <span className="text-caption tabular-nums text-ink-muted">
              {included.length} of {ids.length} slides in the deck
            </span>
          </header>
          <ol className="mt-2 divide-y divide-hairline border-t border-hairline">
            {ids.map((id, i) => {
              const s = slide(id);
              const on = !off.includes(id);
              const n = included.indexOf(id) + 1;
              const active = selected === id;
              return (
                <li key={id} className={cn("relative flex items-center gap-2 py-1.5 pl-3 pr-2", active && "bg-surface-selected")}>
                  {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden />}
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(id)}
                    aria-label={`Include ${s.title}`}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-ink"
                  />
                  <span className="w-5 shrink-0 text-right text-caption tabular-nums text-ink-muted">{on ? n : ""}</span>
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => setIds((x) => move(x, id, -1))}
                      disabled={i === 0}
                      aria-label={`Move ${s.title} up`}
                      className="cursor-pointer text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIds((x) => move(x, id, 1))}
                      disabled={i === ids.length - 1}
                      aria-label={`Move ${s.title} down`}
                      className="cursor-pointer text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    aria-current={active ? "true" : undefined}
                    className={cn("min-w-0 flex-1 cursor-pointer py-0.5 text-left", !on && "opacity-50")}
                  >
                    <span className={cn("block text-body-sm text-ink underline-offset-2 hover:underline", active && "font-semibold")}>{s.title}</span>
                    <span className="block text-caption text-ink-muted">{s.from}</span>
                  </button>
                  {!isFrame(id) && <DataChip status={statusOf(s)} />}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-4 xl:col-span-7">
          <section aria-labelledby={`${uid}-preview`} className="rounded-sm border border-hairline bg-surface px-4 py-3">
            <Suspense
              fallback={
                <>
                  <h2 id={`${uid}-preview`} className="font-display text-card-title text-ink">
                    Preview
                  </h2>
                  <div className="mt-3">
                    <LoadingBlock label="Loading the slides' figures…" lines={6} />
                  </div>
                </>
              }
            >
              <PreviewPane id={selected} ids={included} start={start} previews={previews} talking={talking} headingId={`${uid}-preview`} />
            </Suspense>
          </section>

          <section aria-labelledby={`${uid}-export`} className="rounded-sm border border-hairline bg-surface px-4 py-3">
            <h2 id={`${uid}-export`} className="font-display text-card-title text-ink">
              Export
            </h2>
            <p className="mt-1 text-body-sm text-ink">
              An editable PowerPoint in Avnet&apos;s layout: a cover, {count(content.length)} {content.length === 1 ? "slide" : "slides"} and the sources,
              with native charts you can restyle.
              {mockCount > 0 && ` ${capital(count(mockCount))} ${mockCount === 1 ? "slide uses" : "slides use"} mock data and ${mockCount === 1 ? "says" : "say"} so in the footer.`}
            </p>
            <DownloadButton href={exportHref} disabled={content.length === 0} />
            <p className="mt-2 text-caption text-ink-muted">
              A slide whose data can&apos;t be loaded is left out of the file. For a PDF, save the deck as PDF from PowerPoint.
            </p>
          </section>
        </div>
      </div>

      <section aria-labelledby={`${uid}-library`} className="rounded-sm border border-hairline bg-surface px-4 py-3">
        <h2 id={`${uid}-library`} className="font-display text-card-title text-ink">
          Slide library
        </h2>
        <p className="mt-0.5 text-caption text-ink-muted">Every view the app can put on a slide, marked from the data hookups register</p>
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g}>
              <h3 className={cn(LABEL, "border-b border-hairline pb-1.5")}>{g}</h3>
              <ul className="divide-y divide-hairline">
                {SLIDES.filter((s) => s.group === g && !isHiddenSlide(s.id)).map((s) => {
                  const inDeck = ids.includes(s.id);
                  const why = unavailableReason(s.id, start);
                  const href = available(s.id, start) || s.planned ? hrefOf(s.id, start) : null;
                  return (
                    <li key={s.id} className="flex min-h-10 items-center gap-2 py-1">
                      <span className="min-w-0 flex-1 text-body-sm text-ink">
                        {href ? (
                          <Link href={href} className="underline-offset-2 hover:underline">
                            {s.title}
                          </Link>
                        ) : (
                          s.title
                        )}
                        {why && <span className="block text-caption text-ink-muted">{why}</span>}
                      </span>
                      <DataChip status={statusOf(s)} />
                      <span className="w-[5.5rem] shrink-0 text-right">
                        {inDeck ? (
                          <span className="text-caption text-ink-muted">In the deck</span>
                        ) : why ? null : (
                          <Button variant="ghost" className="h-7 px-2" onClick={() => add(s.id)} aria-label={`Add ${s.title}`}>
                            Add
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PreviewPane({
  id,
  ids,
  start,
  previews,
  talking,
  headingId,
}: {
  id?: SlideId;
  ids: SlideId[];
  start: Start;
  previews: Promise<Previews>;
  talking?: Promise<Preview>;
  headingId: string;
}) {
  // Only the slides that show talking points wait for them.
  const t = talking && (id === "talking" || id === "sources") ? use(talking) : undefined;
  const all = t ? { ...use(previews), talking: t } : use(previews);
  const n = id ? ids.indexOf(id) + 1 : 0;
  if (!id)
    return (
      <h2 id={headingId} className="font-display text-card-title text-ink">
        Preview
      </h2>
    );
  const s = slide(id);
  const p = id === "sources" ? sourcesPreview(ids, all) : all[id];
  const status = statusOf(s);
  const mock = !isFrame(id) && status === "mock";
  const href = hrefOf(id, start);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-display text-card-title text-ink">
          {n ? `Preview, slide ${n} of ${ids.length}` : "Preview, left out of the deck"}
        </h2>
        <span className="text-caption text-ink-muted">{s.title}</span>
      </div>
      <figure className="mt-3" aria-label={`Slide preview: ${p?.headline ?? s.title}`}>
        <div className="flex aspect-video flex-col border border-hairline bg-surface px-[5%] py-[4%]">
          <div className="flex justify-end">
            <Wordmark className="h-5" />
          </div>
          {p ? <SlideBody p={p} /> : <p className="mt-4 text-body-sm text-ink-muted">No preview for this slide.</p>}
          <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-hairline pt-2 text-caption text-ink-muted">
            <span>
              Source: {p?.source ?? s.from}
              {p?.period ? `, ${p.period}` : ""}
              {mock && <span className="text-ink">. Mock data</span>}
            </span>
            <span className="tabular-nums">{n || ""}</span>
          </div>
        </div>
      </figure>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-body-sm">
        {href ? (
          <Link href={href} className={link}>
            Opens on {s.from}
          </Link>
        ) : (
          <span className="text-ink-muted">Made from the outline</span>
        )}
        {!isFrame(id) && <DataChip status={status} />}
      </div>
      {mock && (
        <div className="mt-2">
          <HookupMarker ids={p?.hookups ?? s.hookups} />
        </div>
      )}
    </>
  );
}

const COLOR = { avnet: VIZ.avnet, arrow: VIZ.arrow, company: AVNET.grayDark, market: VIZ.benchmark } as const;

function fmt(format: Chart["format"], v: number): string {
  if (format === "pct") return `${v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}%`;
  return Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${Math.round(v / 1e6)}M`;
}

/** The slide's chart as the exported file draws it: bars for a comparison, columns or a line over time. */
function PreviewChart({ c }: { c: Chart }) {
  const label = (v: unknown) => fmt(c.format, Number(v));
  const tick = { fontSize: 10, fill: "#6B7075" };
  if (c.kind === "bar") {
    const rows = c.series.map((s) => ({ name: s.name, value: s.points[0]?.value ?? 0, who: s.who }));
    return (
      <div className="h-24" role="img" aria-label={rows.map((r) => `${r.name} ${label(r.value)}`).join(", ")}>
        <p className="text-micro text-ink-muted">{c.series[0]?.points[0]?.label}</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" width={44} tick={tick} axisLine={false} tickLine={false} />
            <Bar dataKey="value" barSize={12} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.name} fill={COLOR[r.who]} />
              ))}
              <LabelList dataKey="value" position="right" formatter={label} style={{ fontSize: 10, fill: "#000" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  const s = c.series[0];
  const rows = s.points.map((p) => ({ name: p.label, value: p.value }));
  return (
    <div className="h-32" role="img" aria-label={`${s.name}: ${rows.map((r) => `${r.name} ${label(r.value)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        {c.kind === "line" ? (
          <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 16 }}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <Line dataKey="value" stroke={COLOR[s.who]} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={label} style={{ fontSize: 9, fill: "#000" }} />
            </Line>
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <Bar dataKey="value" fill={COLOR[s.who]} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={label} style={{ fontSize: 9, fill: "#000" }} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function SlideBody({ p }: { p: Preview }) {
  // Column headers either name every column or only the value columns; line them up either way.
  const width = (p.facts?.[0]?.values.length ?? 0) + 1;
  const headers = p.columns ? (p.columns.length === width ? p.columns : ["", ...p.columns]) : undefined;
  return (
    <div className="mt-2 space-y-3">
      <p className="text-pretty font-display text-section-title leading-tight text-ink xl:text-[22px]">{p.headline}</p>
      {p.claude && (
        <p className="text-micro text-ink-muted">
          {p.claude.label}
          {p.claude.date ? `, ${p.claude.date}` : ""}
        </p>
      )}
      {p.text && <p className="max-w-[62ch] text-pretty text-body-sm text-ink">{p.text}</p>}
      {p.error && <p className="text-caption text-ink-muted">Some figures couldn&apos;t be loaded; they read n/a.</p>}
      <div className={cn(p.chart && p.facts?.length ? "grid grid-cols-[3fr_2fr] items-start gap-4" : "space-y-3")}>
      {p.chart && <PreviewChart c={p.chart} />}
      {p.facts && p.facts.length > 0 && (
        <table className="w-full max-w-md border-collapse text-caption">
          <caption className="sr-only">The figures on this slide{p.period ? `, ${p.period}` : ""}.</caption>
          {headers && (
            <thead>
              <tr className="border-b border-hairline">
                {headers.map((c, i) => (
                  <th
                    key={`${c}-${i}`}
                    scope="col"
                    className={cn("py-1 font-display text-label font-normal uppercase text-ink-muted", i ? "text-right" : "text-left")}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-hairline">
            {p.facts.map((f) => (
              <tr key={f.label}>
                <th scope="row" className="py-1 text-left font-normal text-ink-muted">
                  {f.label}
                </th>
                {f.values.map((v, i) => (
                  <td key={i} className="py-1 pl-3 text-right tabular-nums text-ink">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
      {p.groups && p.groups.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {p.groups.map((g) => (
            <div key={g.title}>
              <p className="font-display text-label uppercase text-ink-muted">{g.title}</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-micro text-ink">
                {g.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {p.lines && p.lines.length > 0 && (
        <ul className="space-y-0.5 text-caption text-ink">
          {p.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds the deck on the server and saves it; says plainly when it can't. */
function DownloadButton({ href, disabled }: { href: string; disabled: boolean }) {
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const download = async () => {
    setState({ busy: true });
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error((await res.text()) || "The deck couldn't be built just now.");
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "Avnet deck.pptx";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setState({ busy: false });
    } catch (e) {
      setState({ busy: false, error: e instanceof Error ? e.message : "The deck couldn't be built just now." });
    }
  };
  return (
    <div className="mt-3">
      <Button variant="primary" onClick={download} disabled={disabled || state.busy} aria-busy={state.busy}>
        <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        {state.busy ? "Building the deck…" : "Download PowerPoint"}
      </Button>
      <p aria-live="polite" className="mt-1.5 text-caption text-negative empty:hidden">
        {state.error}
      </p>
    </div>
  );
}
