import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/data/types";

const LABELS: Record<DataSource, string> = {
  wsts: "WSTS",
  sia: "SIA",
  gartner: "Gartner",
  fred: "FRED",
  ecia: "ECIA",
  semi: "SEMI",
  polymarket: "Polymarket",
  internal: "Internal",
  mock: "Mock",
};

/** Provenance of a metric. Mock data is visually distinct (dashed amber) so seeded
 * figures can't be mistaken for live licensed/public data. */
export function SourceChip({
  source,
  vintage,
  className,
}: {
  source: DataSource;
  vintage?: string;
  className?: string;
}) {
  const isMock = source === "mock";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-display uppercase tracking-wider",
        isMock
          ? "border border-dashed border-accent-yellow text-accent-yellow"
          : "border border-line text-muted",
        className,
      )}
      title={isMock ? "Seeded mock data (anchored to published figures) — not a live feed" : `Source: ${LABELS[source]}${vintage ? ` · ${vintage}` : ""}`}
    >
      <span className={cn("h-1 w-1 rounded-full", isMock ? "bg-accent-yellow" : "bg-avnet-green")} />
      {LABELS[source]}
    </span>
  );
}
