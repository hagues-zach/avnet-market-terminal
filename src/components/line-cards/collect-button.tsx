"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { collectNow, type ActionState } from "@/app/(terminal)/line-cards/actions";

export function CollectButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await collectNow()))}
        className="inline-flex items-center gap-1.5 rounded bg-ink px-3 py-1.5 font-display text-2xs uppercase tracking-wider text-white transition-colors duration-200 hover:bg-ink/80 cursor-pointer disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {pending ? "Collecting" : "Collect today's snapshot"}
      </button>
      {result && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted" role="status">
          {result.messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
