import Link from "next/link";
import type { Answer } from "@/lib/ask/sentences";
import { DataChip } from "@/components/ui/chip";
import { HookupMarker } from "@/components/ui/hookup-marker";
import { cn } from "@/lib/utils";

// One answer as a document: subject and period, the sentence, the figures, any
// cached Claude text (labelled), the sources and the page it came from. No
// bubbles, avatars or typing effects.

const TH = "h-control whitespace-nowrap px-3 font-display text-label font-normal uppercase text-ink-muted";
const LABEL = "font-display text-label uppercase text-ink-muted";
const link = "text-ink underline-offset-2 hover:underline";
const ask = (q: string) => `/copilot?q=${encodeURIComponent(q)}`;
const SWATCH: Record<string, string> = { Avnet: "bg-viz-avnet", Arrow: "bg-viz-arrow" };

export function AnswerView({ a }: { a: Answer }) {
  const mock = a.sources.some((s) => s.status === "mock");
  return (
    <article aria-labelledby="answer-text" className="rounded-sm border border-hairline bg-surface">
      <header className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-2">
        <span className="text-caption text-ink-muted">{a.subject}</span>
        {a.period && <span className="whitespace-nowrap text-caption tabular-nums text-ink-muted">{a.period}</span>}
      </header>
      <div className="space-y-4 px-4 py-4">
        <p className="text-caption text-ink-muted">You asked: {a.question}</p>
        <h2 id="answer-text" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pretty text-xl leading-snug text-ink">
          <span>{a.text}</span>
          {mock && <DataChip status="mock" />}
        </h2>
        {a.hookups && <HookupMarker ids={a.hookups} />}

        {a.facts && a.facts.length > 0 && (
          <div role="region" aria-label="The figures" tabIndex={0} className="overflow-x-auto">
            <table className="w-full border-collapse border border-hairline font-body text-table">
              <caption className="sr-only">The figures behind the answer{a.period ? `, ${a.period}` : ""}.</caption>
              {a.columns && (
                <thead className="bg-surface-sunken">
                  <tr className="border-b border-hairline">
                    <th scope="col" className={cn(TH, "text-left")}>
                      Measure
                    </th>
                    {a.columns.map((c) => (
                      <th key={c} scope="col" className={cn(TH, "text-right")}>
                        <span className="inline-flex items-center gap-1.5">
                          {SWATCH[c] && <span className={cn("h-2 w-2", SWATCH[c])} aria-hidden />}
                          {c}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {a.facts.map((f) => (
                  <tr key={f.label} className="border-b border-hairline last:border-b-0">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink-muted">
                      {f.label}
                    </th>
                    {f.values.map((v, i) => (
                      <td key={i} className={cn("px-3 py-1.5 text-right tabular-nums", v === "n/a" ? "text-ink-muted" : "text-ink")}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {a.note && <p className="text-caption text-ink-muted">{a.note}</p>}

        {a.stories && a.stories.length > 0 && (
          <ol className="divide-y divide-hairline border-y border-hairline">
            {a.stories.map((s) => (
              <li key={s.url} className="py-2.5">
                <a href={s.url} target="_blank" rel="noreferrer" className={cn(link, "text-body-strong")}>
                  {s.title}
                  <span className="sr-only"> (opens the source)</span>
                </a>
                <p className="mt-0.5 text-caption text-ink-muted">
                  {s.outlet}, {s.date}
                </p>
                {s.angle && (
                  <p className="mt-1 text-body-sm text-ink">
                    <span className={cn(LABEL, "mr-2")}>Why it matters, Claude</span>
                    {s.angle}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        {a.claude?.text && (
          <figure className="border-l-2 border-hairline pl-3">
            <figcaption className={LABEL}>
              {a.claude.label}
              {a.claude.date ? `, ${a.claude.date}` : ""}
            </figcaption>
            <blockquote className="mt-1 text-body-sm text-ink">{a.claude.text}</blockquote>
          </figure>
        )}
        {a.claude && !a.claude.text && <p className="text-caption text-ink-muted">{a.claude.label}.</p>}

        {a.suggestions && (
          <div className="space-y-2">
            <p className="text-body-sm text-ink-muted">Closest questions it can answer:</p>
            <ul className="space-y-1">
              {a.suggestions.map((s) => (
                <li key={s.intent}>
                  <Link href={ask(s.example)} className={cn(link, "text-body-sm underline")}>
                    {s.example}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-body-sm text-ink-muted">
              <DataChip status="planned" />
              Free questions answered by Claude, with the same sources, arrive in step 3.2.
            </p>
          </div>
        )}
      </div>
      {(a.sources.length > 0 || a.links.length > 0) && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-2">
          {a.sources
            .filter((s) => s.status === "live")
            .map((s) => (
              <DataChip key={s.label} status="live" label={s.label} />
            ))}
          <span className="ml-auto flex flex-wrap gap-x-4 text-body-sm">
            {a.links.map((l) => (
              <Link key={l.href} href={l.href} className={cn(link, "underline")}>
                {l.label}
              </Link>
            ))}
          </span>
        </footer>
      )}
    </article>
  );
}
