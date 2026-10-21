import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** One 44px row of filters above the content it filters. */
export function FilterBar({ children, onReset, className }: { children: React.ReactNode; onReset?: () => void; className?: string }) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn("flex min-h-filter-bar flex-wrap items-center gap-2 rounded-sm border border-hairline bg-surface px-3 py-1.5", className)}
    >
      {children}
      {onReset && (
        <Button variant="ghost" onClick={onReset} className="ml-auto">
          Reset
        </Button>
      )}
    </div>
  );
}

/** A labelled native select: square, 32px, chevron on the right. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("relative inline-flex h-control items-center border border-hairline bg-surface text-body-sm", disabled && "opacity-60")}>
      <span className="pl-2.5 text-ink-muted">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-full cursor-pointer disabled:cursor-not-allowed appearance-none bg-transparent pl-1.5 pr-8 font-medium text-ink focus-visible:outline-offset-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-ink-muted" strokeWidth={1.5} aria-hidden />
    </label>
  );
}

/** An applied filter you can remove. */
export function FilterChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 border border-hairline bg-surface-sunken pl-2 pr-1 text-micro text-ink">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="cursor-pointer p-0.5 hover:bg-hairline">
        <X className="h-3 w-3" strokeWidth={1.5} aria-hidden />
      </button>
    </span>
  );
}
