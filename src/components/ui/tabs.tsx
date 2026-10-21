"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Page tabs: square, 2px green underline on the selected tab. Link-based. */
export function Tabs({
  items,
  current,
  label = "Sections",
}: {
  items: { label: string; href: string }[];
  current: string;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="border-b border-hairline">
      <ul className="flex gap-6">
        {items.map((t) => {
          const active = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-tab items-center border-b-2 font-body text-body-sm transition-colors",
                  active ? "border-primary font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A two-to-four option switch, e.g. Compact | Comfortable or Chart | Table. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex border border-hairline">
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-6 cursor-pointer px-2 font-body text-micro transition-colors",
              i > 0 && "border-l border-hairline",
              active ? "bg-surface-sunken font-semibold text-ink" : "bg-surface text-ink-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
