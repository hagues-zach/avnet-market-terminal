import Link from "next/link";
import { Plug } from "lucide-react";
import { hookup, PILLAR_NAMES } from "@/lib/hookups";

/**
 * The marker for "real data goes here". Every mock section carries one, naming
 * the source it is waiting for. Collapsed to one line; expands to the tables and
 * fields from the register in src/lib/hookups.ts.
 */
export function DataHookup({ ids }: { ids: string[] }) {
  const items = ids.map(hookup).filter((h): h is NonNullable<typeof h> => Boolean(h) && h!.status !== "live");
  if (!items.length) return null;
  return (
    <details className="group mt-3 rounded border border-dashed border-accent-yellow bg-accent-yellow/5 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-ink">
        <Plug className="h-3.5 w-3.5 shrink-0 text-ink" aria-hidden />
        <span>
          <span className="font-medium">Mock data. Hook up:</span> {items.map((h) => h.name).join(" · ")}
        </span>
        <span className="ml-auto text-2xs text-muted group-open:hidden">Details</span>
      </summary>
      <div className="space-y-3 border-t border-dashed border-accent-yellow px-3 py-2">
        {items.map((h) => (
          <div key={h.id}>
            <p className="font-medium text-ink">
              {h.name} <span className="font-normal text-muted">· {PILLAR_NAMES[h.pillar]} · refresh {h.refresh.toLowerCase()}</span>
            </p>
            <ul className="mt-1 space-y-0.5 font-mono text-2xs text-ink">
              {h.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {h.fields && <p className="mt-1 text-2xs text-muted">Fields: {h.fields.join(", ")}</p>}
            {h.replaceIn && <p className="mt-0.5 text-2xs text-muted">Replace the mock in {h.replaceIn}</p>}
          </div>
        ))}
        <Link href="/data-hookups" className="inline-block text-2xs text-ink underline decoration-line underline-offset-2 hover:text-avnet-greenDark">
          All data hookups
        </Link>
      </div>
    </details>
  );
}
