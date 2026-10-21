import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/data/types";
import { SourceChip } from "./source-chip";

/**
 * The page-level card used across the app. Same look as Panel (white, hairline,
 * 2px corners, no shadow, sentence-case Oswald title); keeps the older props so
 * existing pages move over without edits.
 */
export function Card({
  title,
  subtitle,
  source,
  className,
  bodyClassName,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  source?: DataSource;
  className?: string;
  bodyClassName?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-sm border border-hairline bg-surface", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            <h2 className="font-display text-card-title text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-caption text-ink-muted">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {source && <SourceChip source={source} />}
          </div>
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
