"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Explainer } from "@/lib/explain/registry";

// The body every stepped explainer shares: the answer first, the diagram, a
// quarter stepper (buttons and the arrow keys), the figures in an aria-live
// sentence, an optional line of context, and the definition, formula, glossary
// link and source. The body takes focus when the explainer opens, so the arrow
// keys work at once.

export function ExplainFrame({
  explainer,
  lead,
  figure,
  periods,
  index,
  onIndex,
  sentence,
  note,
  source,
}: {
  explainer: Explainer;
  lead: string;
  figure: React.ReactNode;
  /** Period labels, oldest first. The stepper shows when there is more than one. */
  periods: string[];
  index: number;
  onIndex: (i: number) => void;
  sentence: string;
  note?: string;
  /** The source: a DataChip, or a line of text. */
  source: React.ReactNode;
}) {
  const last = periods.length - 1;
  const step = (d: number) => onIndex(Math.min(last, Math.max(0, index + d)));
  return (
    <div
      data-explain-focus
      tabIndex={-1}
      className="space-y-3 px-4 pb-3 pt-3 focus-visible:outline-none"
      onKeyDown={(ev) => {
        if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
        ev.preventDefault();
        step(ev.key === "ArrowLeft" ? -1 : 1);
      }}
    >
      <p className="text-pretty text-body font-semibold text-ink">{lead}</p>

      <figure className="space-y-3">{figure}</figure>

      {periods.length > 1 && (
        <div className="flex items-center justify-between border border-hairline">
          <StepButton label="Previous quarter" disabled={index === 0} onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </StepButton>
          <span className="font-display text-card-title tabular-nums text-ink">{periods[index]}</span>
          <StepButton label="Next quarter" disabled={index === last} onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </StepButton>
        </div>
      )}

      <p aria-live="polite" className="text-body-sm text-ink">
        {sentence}
      </p>
      {note && <p className="text-body-sm text-ink-muted">{note}</p>}

      <div className="space-y-2 border-t border-hairline pt-2">
        <p className="text-caption text-ink-muted">{explainer.definition}</p>
        <p className="text-caption text-ink">{explainer.formula}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <Link href={explainer.learnHref} className="text-caption text-ink underline underline-offset-2 hover:no-underline">
              More in the glossary
            </Link>
            {source}
          </span>
        </div>
      </div>
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-control w-8 cursor-pointer items-center justify-center text-ink transition-colors duration-150 hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
