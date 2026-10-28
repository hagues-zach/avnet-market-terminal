import { cn } from "@/lib/utils";
import { Delta } from "./delta";
import { CaveatMark } from "./caveat-mark";
import { DataChip, type DataStatus } from "./chip";

/**
 * Label, figure, change, source. One figure size per row. The change never wraps;
 * shorten it ("+40 bps") rather than widen the label.
 */
export function KpiTile({
  label,
  value,
  delta,
  source,
  asOf,
  note,
  caveat,
  className,
}: {
  label: string;
  value: string;
  delta?: React.ComponentProps<typeof Delta>;
  source?: { status: DataStatus; label?: string };
  asOf?: string;
  /** A short qualifier under the figure, e.g. "Non-GAAP". */
  note?: string;
  /** Why the figure doesn't compare cleanly with other companies' (accounting rules, a segment). */
  caveat?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-sm border border-hairline bg-surface px-4 py-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-label uppercase text-ink-muted">
          {label}
          <CaveatMark reason={caveat} />
        </span>
        {source && <DataChip status={source.status} label={source.label} />}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-figure tabular-nums text-ink">{value}</span>
        {note && <span className="truncate text-caption text-ink-muted">{note}</span>}
      </div>
      {(delta || asOf) && (
        <div className="mt-1 flex items-center justify-between gap-2">
          {delta ? <Delta {...delta} /> : <span />}
          {asOf && <span className="whitespace-nowrap text-caption text-ink-muted">{asOf}</span>}
        </div>
      )}
    </div>
  );
}
