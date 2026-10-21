import type { DataSource } from "@/lib/data/types";
import { DataChip } from "./chip";

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

/** Provenance of a metric, drawn as a DataChip. Mock is the dashed yellow chip. */
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
    <DataChip
      status={isMock ? "mock" : "live"}
      label={isMock ? undefined : LABELS[source]}
      title={isMock ? "Seeded mock data (anchored to published figures), not a live feed" : `Source: ${LABELS[source]}${vintage ? `, ${vintage}` : ""}`}
      className={className}
    />
  );
}
