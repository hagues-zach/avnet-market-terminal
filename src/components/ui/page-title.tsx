import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Page header from DESIGN.md: optional breadcrumb, the title in Oswald Light caps,
 * one subtitle line, actions on the right. No slash mark: the current brand kit
 * no longer uses it.
 * Replaces the older PageHeader in step 1.6.
 */
export function PageTitle({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  /** Chips or tabs under the title. */
  children?: React.ReactNode;
}) {
  return (
    <header>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-1 text-caption text-ink-muted">
            {breadcrumb.map((b, i) => (
              <li key={b.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" strokeWidth={1.5} aria-hidden />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-ink hover:underline underline-offset-2">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink" aria-current="page">
                    {b.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-page-title font-light uppercase text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-body text-ink-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
