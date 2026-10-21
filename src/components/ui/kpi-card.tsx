import type { DataSource } from "@/lib/data/types";
import { Delta } from "./delta";
import { SourceChip } from "./source-chip";

/**
 * The older KPI card API, drawn as a KpiTile: label, figure, change, source.
 * Prefer KpiTile in new code.
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  invertDelta = false,
  source,
}: {
  label: string;
  value: string;
  delta?: number; // signed fraction, e.g. 0.042
  deltaLabel?: string;
  invertDelta?: boolean; // when down-is-good (e.g. aging days)
  source?: DataSource;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-sm border border-hairline bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-label uppercase text-ink-muted">{label}</span>
        {source && <SourceChip source={source} />}
      </div>
      <div className="mt-1.5 font-display text-figure tabular-nums text-ink">{value}</div>
      {typeof delta === "number" && (
        <div className="mt-1">
          <Delta value={delta} period={deltaLabel} invert={invertDelta} />
        </div>
      )}
    </div>
  );
}
