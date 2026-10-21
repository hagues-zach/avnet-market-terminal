import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "negative" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "border-hairline text-ink",
  positive: "border-hairline text-positive",
  negative: "border-hairline text-negative",
  // Yellow as a border only; the text stays black (yellow text fails contrast).
  warning: "border-warning text-ink",
};

/** A small status pill. Facts are neutral; colour only for direction. Always a word. */
export function Chip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border bg-surface px-2 font-body text-micro",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type DataStatus = "live" | "mock" | "planned";

/** Where a number comes from: Live (green dot), Mock (dashed yellow), Planned (grey). */
export function DataChip({
  status,
  label,
  title,
  className,
}: {
  status: DataStatus;
  /** The source name, e.g. "SEC 10-Q". Defaults to the status word. */
  label?: string;
  title?: string;
  className?: string;
}) {
  const word = status === "live" ? "Live" : status === "mock" ? "Mock" : "Planned";
  return (
    <span
      title={title ?? (status === "mock" ? "Mock data until the real source is hooked up" : undefined)}
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full bg-surface px-2 font-body text-micro text-ink",
        status === "mock" ? "border border-dashed border-mock" : "border border-hairline",
        status === "planned" && "text-ink-muted",
        className,
      )}
    >
      {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
      {label ?? word}
      {label && status !== "live" && <span className="sr-only">({word})</span>}
    </span>
  );
}
