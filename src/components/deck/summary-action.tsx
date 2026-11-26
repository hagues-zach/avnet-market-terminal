"use client";

// A control inside a <details> summary (Add to deck on a folded section): a click
// on it does what the control does without also opening or closing the section.
export function SummaryAction({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0" onClick={(e) => e.preventDefault()}>
      {children}
    </span>
  );
}
