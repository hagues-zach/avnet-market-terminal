import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/data/types";
import { SourceChip } from "./source-chip";

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
  const hasDelta = typeof delta === "number";
  const positive = hasDelta && delta! >= 0;
  const good = invertDelta ? !positive : positive;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xs uppercase tracking-wider text-muted">{label}</span>
        {source && <SourceChip source={source} />}
      </div>
      <div className="mt-1.5 font-display text-2xl tabular text-ink">{value}</div>
      {hasDelta && (
        <div
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 text-xs tabular",
            good ? "text-avnet-greenDark" : "text-danger",
          )}
        >
          <Arrow className="h-3.5 w-3.5" />
          {Math.abs(delta! * 100).toFixed(1)}%
          {deltaLabel && <span className="ml-1 text-muted">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
