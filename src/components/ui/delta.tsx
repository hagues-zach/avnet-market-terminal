import { ArrowDown, ArrowUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A change, never colour alone: arrow + sign + value. Up is good by default;
 * pass `invert` when down is good (inventory days, lead times, costs), or
 * `neutral` when neither direction is plainly good (ink, no colour).
 */
export function Delta({
  value,
  display,
  period,
  invert = false,
  neutral = false,
  className,
}: {
  /** Signed change. Its sign sets the arrow and the colour. */
  value: number;
  /** What to show, e.g. "3.2%", "40 bps", "0.3 pts". Defaults to value as a percent. */
  display?: string;
  /** Comparison period, e.g. "QoQ", "YoY". */
  period?: string;
  invert?: boolean;
  neutral?: boolean;
  className?: string;
}) {
  const flat = value === 0;
  const up = value > 0;
  const good = invert ? !up : up;
  const Arrow = flat ? ArrowRight : up ? ArrowUp : ArrowDown;
  const shown = display ?? `${Math.abs(value * 100).toFixed(1)}%`;
  const sign = flat ? "" : up ? "+" : "−";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap font-body text-caption tabular-nums",
        flat ? "text-ink-muted" : neutral ? "text-ink" : good ? "text-positive" : "text-negative",
        className,
      )}
    >
      <Arrow className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      <span>
        {sign}
        {shown.replace(/^[+\-−]/, "")}
      </span>
      {period && <span className="ml-1 text-ink-muted">{period}</span>}
    </span>
  );
}
