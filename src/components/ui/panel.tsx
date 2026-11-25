import { AddCardToDeck } from "@/components/deck/add-card-to-deck";
import type { CardSlide } from "@/lib/deck/slides";
import { cn } from "@/lib/utils";

/**
 * The one card level: white, 1px hairline, 2px corners, no shadow. Never nest
 * panels; group inside one with hairline dividers instead.
 */
export function Panel({
  title,
  subtitle,
  actions,
  footer,
  deck,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  /** One sentence-case line, ideally the takeaway. */
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * The slide this card makes, for Add to deck (src/lib/deck/slides.ts). Every
   * card on a visible page passes one; `null` says it has none (a form, a setup
   * tool) or nothing to show just now. cards-covered.test.ts checks.
   */
  deck?: CardSlide | null;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col rounded-sm border border-hairline bg-surface", className)}>
      {(title || actions || deck) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3">
          <div className="min-w-0">
            {title && <h2 className="font-display text-card-title text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-caption text-ink-muted">{subtitle}</p>}
          </div>
          {(actions || deck) && (
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              {actions}
              {deck && <AddCardToDeck title={title ?? deck.title ?? "card"} deck={deck} />}
            </div>
          )}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline px-4 py-2 text-caption text-ink-muted">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Source and as-of line for a panel or chart footer. */
export function SourceLine({ source, asOf, children }: { source: string; asOf?: string; children?: React.ReactNode }) {
  return (
    <>
      <span>Source: {source}</span>
      {asOf && <span>As of {asOf}</span>}
      {children}
    </>
  );
}
