"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { collectNow, type ActionState } from "@/app/(terminal)/line-cards/actions";
import { Button } from "@/components/ui/button";

/** Reads today's snapshot from the distributors whose sites allow it. A secondary action. */
export function CollectButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button disabled={pending} onClick={() => start(async () => setResult(await collectNow()))} className="disabled:cursor-wait disabled:opacity-60">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
        {pending ? "Collecting" : "Collect today's snapshot"}
      </Button>
      {result && (
        <ul className="mt-2 space-y-0.5 text-caption text-ink-muted" role="status">
          {result.messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
