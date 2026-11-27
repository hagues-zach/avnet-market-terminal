"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FLAT, SCALE, readBookToBill, type BookToBillQuarter } from "@/lib/explain/book-to-bill";
import { count } from "@/lib/explain/diagrams";
import { explainer } from "@/lib/explain/registry";
import { fmtM } from "@/lib/avnet/format";
import { VIZ } from "@/lib/colors";
import { DataChip, type DataStatus } from "@/components/ui/chip";
import { ExplainPopover } from "./explain-popover";
import { PairBars } from "./diagrams/pair-bars";
import { RatioScale } from "./diagrams/ratio-scale";

// The book-to-bill explainer: the answer, where the ratio sits on a 0.80 to 1.20
// scale with the earlier quarters as a trail, the bookings and billings behind it,
// and a stepper through the quarters. Nothing moves unless the user steps; the
// marker's 150 ms slide is off under reduced motion.

const ratio = (v: number) => v.toFixed(2);

export function ExplainBookToBill({
  quarters,
  status,
  subject = "Avnet",
}: {
  /** Oldest first; the last is the quarter the tile shows. */
  quarters: BookToBillQuarter[];
  status: DataStatus;
  subject?: string;
}) {
  if (quarters.length === 0) return null;
  const n = quarters.length;
  return (
    <ExplainPopover label="Explain book-to-bill" title={n === 1 ? "Book-to-bill" : `Book-to-bill, last ${count(n)} quarters`}>
      <BookToBillBody quarters={quarters} status={status} subject={subject} />
    </ExplainPopover>
  );
}

function BookToBillBody({ quarters, status, subject }: { quarters: BookToBillQuarter[]; status: DataStatus; subject: string }) {
  const [i, setI] = useState(quarters.length - 1);
  const q = quarters[i];
  const r = readBookToBill(q, subject);
  const e = explainer("Book-to-bill");
  const step = (d: number) => setI((v) => Math.min(quarters.length - 1, Math.max(0, v + d)));

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
      <p className="text-pretty text-body font-semibold text-ink">{r.lead}</p>

      <figure className="space-y-3">
        <RatioScale
          points={quarters.map((x) => ({ label: x.quarter, value: x.bookToBill }))}
          selected={i}
          onSelect={setI}
          scale={SCALE}
          reference={1}
          band={{ min: FLAT.low, max: FLAT.high }}
          format={ratio}
          words={["Shrinking", "Flat", "Growing"]}
          caption="Book-to-bill by quarter"
        />
        <PairBars
          rows={[
            { label: "Bookings", value: q.bookings, fill: VIZ.avnet2 },
            { label: "Billings", value: q.billings, fill: VIZ.avnet },
          ]}
          format={fmtM}
          gapText={r.gapText}
          caption={`Bookings and billings in ${q.quarter}`}
        />
      </figure>

      {quarters.length > 1 && (
        <div className="flex items-center justify-between border border-hairline">
          <StepButton label="Previous quarter" disabled={i === 0} onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </StepButton>
          <span className="font-display text-card-title tabular-nums text-ink">{q.quarter}</span>
          <StepButton label="Next quarter" disabled={i === quarters.length - 1} onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </StepButton>
        </div>
      )}

      <p aria-live="polite" className="text-body-sm text-ink">
        {r.sentence}
      </p>

      <div className="space-y-2 border-t border-hairline pt-2">
        <p className="text-caption text-ink-muted">{e.definition}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-ink">{e.formula}</span>
          <span className="flex items-center gap-3">
            <Link href={e.learnHref} className="text-caption text-ink underline underline-offset-2 hover:no-underline">
              More in the glossary
            </Link>
            <DataChip status={status} />
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
