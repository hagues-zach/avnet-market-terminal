import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A figure that doesn't compare cleanly with the rest of its row or column:
 * a small mark with the reason on hover, and in full for screen readers.
 */
export function CaveatMark({ reason, className }: { reason?: string; className?: string }) {
  if (!reason) return null;
  return (
    <span title={reason} className={cn("ml-1 inline-flex align-middle text-ink-muted", className)}>
      <Info className="h-3 w-3" strokeWidth={1.5} aria-hidden />
      <span className="sr-only"> Caveat: {reason}</span>
    </span>
  );
}
