"use client";

import { useActionState } from "react";
import type { Vote } from "@/lib/ai/news-brief-eval";
import { saveVote, type VoteState } from "./actions";

const FIELD = "h-control border-0 border-b border-hairline bg-surface-sunken px-2 font-body text-body-sm text-ink focus:border-ink";

function Score({ name, label, value }: { name: string; label: string; value?: number }) {
  return (
    <label className="flex items-center gap-2 text-body-sm text-ink">
      {label}
      <select name={name} defaultValue={value ?? ""} className={FIELD}>
        <option value="">Not rated</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/** One story's blind vote: which brief is better, and how useful each "Why it matters" is. */
export function VoteForm({ slug, vote }: { slug: string; vote?: Vote }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(saveVote, { ok: false, message: "" });
  return (
    <form action={action} className="space-y-3 border-t border-hairline pt-4">
      <input type="hidden" name="slug" value={slug} />
      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <legend className="mb-2 text-body-sm font-semibold text-ink">Which brief is better overall?</legend>
        {(["A", "B", "tie"] as const).map((p) => (
          <label key={p} className="flex items-center gap-2 text-body-sm text-ink">
            <input type="radio" name="pick" value={p} defaultChecked={vote?.pick === p} required />
            {p === "tie" ? "About the same" : `Brief ${p}`}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Score name="whyA" label="Why it matters, A (1 to 5)" value={vote?.whyA} />
        <Score name="whyB" label="Why it matters, B (1 to 5)" value={vote?.whyB} />
      </div>
      <label className="block text-body-sm text-ink">
        Reason (optional)
        <input name="reason" defaultValue={vote?.reason} maxLength={500} autoComplete="off" className={`${FIELD} mt-1 w-full`} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-control items-center border border-ink bg-surface px-3 font-body text-button text-ink hover:bg-surface-sunken disabled:opacity-50">
          {pending ? "Saving…" : vote ? "Update vote" : "Save vote"}
        </button>
        <p aria-live="polite" className={state.ok ? "text-caption text-ink-muted" : "text-caption text-negative"}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
