import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANTS: Record<Variant, string> = {
  // One primary per view. Green fill, black label (9.2:1).
  primary: "bg-primary text-primary-fg hover:brightness-95 active:brightness-90",
  secondary: "border border-ink bg-surface text-ink hover:bg-surface-sunken",
  ghost: "text-ink hover:bg-surface-sunken",
  destructive: "border border-negative bg-surface text-negative hover:bg-negative hover:text-surface",
};

const BASE =
  "inline-flex h-control shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-none px-3 font-body text-button transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={cn(BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "secondary",
  className,
  href,
  external,
  children,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  /** Another site: a plain link that opens in a new tab. */
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(BASE, VARIANTS[variant], className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}
