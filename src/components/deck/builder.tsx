"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, use, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AUDIENCES,
  GROUPS,
  SLIDES,
  addSlide,
  available,
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
  type Preview,
  type SlideId,
  type Start,
} from "@/lib/deck/outline";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { LoadingBlock } from "@/components/ui/states";
import { cn } from "@/lib/utils";

// Pitch Deck Builder: the deck in words, the outline beside a preview of the
// selected slide, what an export needs, then every slide the app can make.
// Choosing, ordering and previewing work now; the export is Planned for 3.3.

const LABEL = "font-display text-label uppercase text-ink-muted";
const link = "text-ink underline underline-offset-2 hover:text-ink-muted";
const field = "h-control border border-hairline bg-surface px-2.5 text-body-sm text-ink";

type Previews = Partial<Record<SlideId, Preview>>;

export function DeckBuilder({
  start,
  companies,
  previews,
}: {
  start: Start;
  companies: { slug: string; name: string; group: string }[];
  previews: Promise<Previews>;
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
              <PreviewPane id={selected} ids={included} start={start} previews={previews} headingId={`${uid}-preview`} />
            </Suspense>
          </section>

          <section aria-labelledby={`${uid}-export`} className="rounded-sm border border-hairline bg-surface px-4 py-3">
            <h2 id={`${uid}-export`} className="font-display text-card-title text-ink">
              What a finished export needs
            </h2>
            <ul className="mt-2 space-y-1 text-body-sm text-ink">
              <li>The Avnet PowerPoint template, with the slash mark removed from its masters</li>
              <li>PowerPoint and PDF export from that template, one layout per slide</li>
              <li>Mock slides marked in the file until their data is hooked up</li>
            </ul>
            <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-body-sm text-ink-muted">
              <DataChip status="planned" />
              Export to PowerPoint and PDF arrives in step 3.3.
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
                {SLIDES.filter((s) => s.group === g).map((s) => {
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
  headingId,
}: {
  id?: SlideId;
  ids: SlideId[];
  start: Start;
  previews: Promise<Previews>;
  headingId: string;
}) {
  const all = use(previews);
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

function SlideBody({ p }: { p: Preview }) {
  const max = p.bars ? Math.max(...p.bars.map((b) => Math.abs(b.value)), 0.0001) : 1;
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
      {p.bars && (
        <div className="space-y-1.5" role="img" aria-label={p.bars.map((b) => `${b.label} ${b.display}`).join(", ")}>
          <p className="text-micro text-ink-muted">Revenue growth on a year ago</p>
          {p.bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-caption">
              <span className="w-12 shrink-0 text-ink-muted">{b.label}</span>
              <span
                className={cn("h-3", b.who === "avnet" ? "bg-viz-avnet" : "bg-viz-arrow")}
                style={{ width: `${(Math.abs(b.value) / max) * 60}%` }}
              />
              <span className="tabular-nums text-ink">{b.display}</span>
            </div>
          ))}
        </div>
      )}
      {!p.bars && p.facts && p.facts.length > 0 && (
        <table className="w-full max-w-md border-collapse text-caption">
          <caption className="sr-only">The figures on this slide{p.period ? `, ${p.period}` : ""}.</caption>
          {p.columns && (
            <thead>
              <tr className="border-b border-hairline">
                {p.columns.map((c, i) => (
                  <th
                    key={c}
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
