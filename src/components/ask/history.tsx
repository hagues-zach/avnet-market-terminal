"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// "Asked this session": the questions asked in this browser tab, newest first,
// kept in sessionStorage. Nothing leaves the browser; an empty or blocked store
// just shows nothing.

const KEY = "ask-history";
const MAX = 8;

export function AskedThisSession({ current }: { current?: string }) {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    } catch {
      list = [];
    }
    if (current) list = [current, ...list.filter((q) => q !== current)].slice(0, MAX);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      // Storage blocked: the list lives for this render only.
    }
    setItems(list.filter((q) => q !== current));
  }, [current]);

  return (
    <section aria-labelledby="asked" className="rounded-sm border border-hairline bg-surface px-4 py-3">
      <h2 id="asked" className="font-display text-card-title text-ink">
        Asked this session
      </h2>
      {items.length ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((q) => (
            <li key={q}>
              <Link href={`/copilot?q=${encodeURIComponent(q)}`} className="text-body-sm text-ink underline-offset-2 hover:underline">
                {q}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-caption text-ink-muted">Earlier questions in this tab appear here.</p>
      )}
    </section>
  );
}
