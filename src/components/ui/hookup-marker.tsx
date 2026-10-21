import Link from "next/link";
import { Plug } from "lucide-react";
import { hookup, PILLAR_NAMES } from "@/lib/hookups";

/**
 * "Real data goes here." Dashed yellow on a faint tint, black text. Sits directly
 * under the section it describes. Expands to the tables and fields from the
 * register in src/lib/hookups.ts, and disappears once every source is live.
 * Replaces the shell's DataHookup in step 1.6.
 */
export function HookupMarker({ ids }: { ids: string[] }) {
  const items = ids.map(hookup).filter((h): h is NonNullable<typeof h> => Boolean(h) && h!.status !== "live");
  if (!items.length) return null;
  return (
    <details className="group rounded-sm border border-dashed border-mock bg-mock/[0.06] text-caption text-ink">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
        <Plug className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
        <span>
          <span className="font-semibold">Mock data. Hook up:</span> {items.map((h) => h.name).join(", ")}
        </span>
        <span className="ml-auto text-ink-muted underline-offset-2 group-hover:underline group-open:hidden">Details</span>
      </summary>
      <div className="space-y-3 border-t border-dashed border-mock px-3 py-2">
        {items.map((h) => (
          <div key={h.id}>
            <p className="font-semibold">
              <Link href={`/data-hookups#${h.id}`} className="underline-offset-2 hover:underline">
                {h.name}
              </Link>{" "}
              <span className="font-normal text-ink-muted">
                {PILLAR_NAMES[h.pillar]}, refreshed {h.refresh.toLowerCase()}
              </span>
            </p>
            <ul className="mt-1 space-y-0.5 break-all font-mono text-micro">
              {h.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {h.fields && <p className="mt-1 text-micro text-ink-muted">Fields: {h.fields.join(", ")}</p>}
            {h.replaceIn && <p className="mt-0.5 text-micro text-ink-muted">Replace the mock in {h.replaceIn}</p>}
          </div>
        ))}
        <Link href="/data-hookups" className="inline-block text-micro underline underline-offset-2 hover:text-ink-muted">
          All data hookups
        </Link>
      </div>
    </details>
  );
}
