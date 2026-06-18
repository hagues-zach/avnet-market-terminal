import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/data/types";
import { SourceChip } from "./source-chip";

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
    <section
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className,
      )}
    >
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="slash-heading text-sm">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {source && <SourceChip source={source} />}
          </div>
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
