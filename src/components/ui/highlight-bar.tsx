import { cn } from "@/lib/utils";

/**
 * The brand highlight bar: an angled green bar that bleeds off the left edge,
 * black text. One per page at most, never on dense data pages. `bleed` cancels the
 * page padding so the bar reaches the edge (16px, 24px from 1280px).
 */
export function HighlightBar({
  children,
  bleed = "-ml-4 xl:-ml-6",
  className,
}: {
  children: React.ReactNode;
  bleed?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("relative max-w-3xl bg-primary py-2.5 pl-6 pr-12 text-body-strong text-primary-fg", bleed, className)}
      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0 100%)" }}
    >
      {children}
    </div>
  );
}
