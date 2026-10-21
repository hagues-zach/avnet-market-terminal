"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PATHS, ROLES, type Role } from "@/lib/learn/content";
import { glossaryGroups } from "@/lib/learn/read";
import { cn } from "@/lib/utils";

// The two interactive parts of the Learning Center: the role switch for the
// paths and the glossary search.

export function RolePaths() {
  const [role, setRole] = useState<Role>("seller");
  return (
    <div>
      <div role="group" aria-label="Your role" className="flex flex-wrap gap-x-6 border-b border-hairline px-4">
        {ROLES.map((r) => {
          const active = r.id === role;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={active}
              onClick={() => setRole(r.id)}
              className={cn(
                "-mb-px inline-flex h-tab cursor-pointer items-center border-b-2 font-body text-body-sm transition-colors",
                active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <ol className="grid divide-y divide-hairline md:grid-cols-5 md:divide-x md:divide-y-0">
        {PATHS[role].map((s, i) => (
          <li key={`${role}-${s.page}`} className="px-4 py-3">
            <span className="font-display text-label uppercase text-ink-muted">Step {i + 1}</span>
            <Link href={s.href} className="group mt-1 flex items-start justify-between gap-2 text-body-strong text-ink">
              <span className="underline-offset-2 group-hover:underline">{s.page}</span>
              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
            </Link>
            <p className="mt-0.5 text-body-sm text-ink-muted">{s.why}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GlossarySearch({ entries }: { entries: { term: string; definition: string }[] }) {
  const [query, setQuery] = useState("");
  const groups = glossaryGroups(entries, query);
  const count = groups.reduce((n, g) => n + g.entries.length, 0);
  return (
    <div>
      <label className="flex flex-col gap-0.5">
        <span className="font-display text-label uppercase text-ink-muted">Search the glossary</span>
        <input
          type="search"
          name="glossary-search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A term or a word in its definition…"
          className="h-control border-0 border-b border-hairline bg-surface-sunken px-2 font-body text-body-sm text-ink focus:border-ink"
        />
      </label>
      <p className="mt-2 text-caption text-ink-muted" aria-live="polite">
        {query ? `${count} ${count === 1 ? "term matches" : "terms match"}` : `${count} terms`}
      </p>
      {groups.length === 0 ? (
        <p className="mt-3 text-body-sm text-ink-muted">
          No terms match.{" "}
          <button type="button" onClick={() => setQuery("")} className="text-ink underline underline-offset-2">
            Clear the search
          </button>
        </p>
      ) : (
        <div className="mt-3 columns-1 gap-6 md:columns-2">
          {groups.map((g) => (
            <section key={g.letter} aria-label={g.letter} className="mb-3 break-inside-avoid">
              <h3 className="font-display text-label uppercase text-ink-muted">{g.letter}</h3>
              <dl className="mt-1 space-y-2">
                {g.entries.map((e) => (
                  <div key={e.term}>
                    <dt className="text-body-strong text-ink">{e.term}</dt>
                    <dd className="text-body-sm text-ink-muted">{e.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
