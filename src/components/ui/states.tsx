import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Loading placeholder shaped like the final layout. Pulses only if motion is allowed. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-sm bg-hairline motion-safe:animate-pulse", className)} />;
}

/** A loading panel body: a few skeleton lines with a screen-reader status. */
export function LoadingBlock({ label = "Loading", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Why it's empty, in one line, and one action. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <p className="text-body-strong text-ink">{title}</p>
      {body && <p className="max-w-prose text-body text-ink-muted">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** What failed, which source, and a retry. */
export function ErrorState({
  title,
  source,
  detail,
  onRetry,
  retryHref,
}: {
  title: string;
  source?: string;
  detail?: string;
  onRetry?: () => void;
  retryHref?: string;
}) {
  return (
    <div role="alert" className="flex items-start gap-3 py-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" strokeWidth={1.5} aria-hidden />
      <div className="space-y-1">
        <p className="text-body-strong text-ink">{title}</p>
        {source && <p className="text-caption text-ink-muted">Source: {source}</p>}
        {detail && <p className="text-caption text-ink-muted">{detail}</p>}
        {onRetry && (
          <Button variant="secondary" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
        {retryHref && !onRetry && (
          <a href={retryHref} className="mt-2 inline-flex h-control items-center border border-ink px-3 text-button text-ink hover:bg-surface-sunken">
            Try again
          </a>
        )}
      </div>
    </div>
  );
}
