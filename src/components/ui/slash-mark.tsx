import { cn } from "@/lib/utils";

/**
 * The brand slash mark: a drawn green diagonal, never a typed "/". Once per page,
 * left of the page title. Sized from the brand rule (about 1.5× the cap height).
 */
export function SlashMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 28"
      aria-hidden
      focusable="false"
      className={cn("h-7 w-3 shrink-0 fill-primary", className)}
    >
      <polygon points="8,0 12,0 4,28 0,28" />
    </svg>
  );
}
