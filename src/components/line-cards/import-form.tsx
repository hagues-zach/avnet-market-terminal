"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { importSnapshot, type ActionState } from "@/app/(terminal)/line-cards/actions";
import { DISTRIBUTORS } from "@/lib/line-cards/model";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-gray-medium focus:border-avnet-green focus:outline-none focus:ring-2 focus:ring-avnet-green/30";
const label = "mb-1 block font-display text-2xs uppercase tracking-widest text-muted";

export function ImportForm({ today, suggested }: { today: string; suggested: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(importSnapshot, { ok: false, messages: [] });
  const [distributor, setDistributor] = useState(suggested);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label htmlFor="lc-distributor" className={label}>
            Distributor
          </label>
          <select id="lc-distributor" name="distributor" value={distributor} onChange={(e) => setDistributor(e.target.value)} className={cn(field, "cursor-pointer")}>
            {DISTRIBUTORS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
            <option value="other">Another distributor</option>
          </select>
        </div>
        {distributor === "other" && (
          <div>
            <label htmlFor="lc-other" className={label}>
              Distributor name
            </label>
            <input id="lc-other" name="other" type="text" maxLength={40} required className={field} />
          </div>
        )}
        <div>
          <label htmlFor="lc-date" className={label}>
            List is as of
          </label>
          <input id="lc-date" name="date" type="date" defaultValue={today} max={today} required className={field} />
        </div>
        <div>
          <label htmlFor="lc-source" className={label}>
            Where it came from (optional)
          </label>
          <input id="lc-source" name="source" type="text" maxLength={200} placeholder="e.g. avnet.com manufacturers page" className={field} />
        </div>
      </div>
      <div className="flex flex-col">
        <label htmlFor="lc-list" className={label}>
          Supplier names
        </label>
        <textarea
          id="lc-list"
          name="list"
          required
          rows={9}
          placeholder={"One supplier per line, or paste a CSV with names in the first column.\n\nTexas Instruments\nMicrochip\nVishay"}
          className={cn(field, "min-h-[12rem] flex-1 font-mono text-xs")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded bg-ink px-3 py-1.5 font-display text-2xs uppercase tracking-wider text-white transition-colors duration-200 hover:bg-ink/80 cursor-pointer disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-avnet-green/40"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save snapshot
        </button>
        {state.messages.map((m) => (
          <p key={m} role="status" className={cn("text-xs", state.ok ? "text-avnet-greenDark" : "text-danger")}>
            {m}
          </p>
        ))}
      </div>
    </form>
  );
}
