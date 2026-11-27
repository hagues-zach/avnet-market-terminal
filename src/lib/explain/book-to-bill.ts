import { fmtM } from "@/lib/avnet/format";
import { position } from "./diagrams";

// What a book-to-bill figure says, in words and positions, for the KPI explainer.
// Pure, so the popover and its test read the same rule. No data here.

export interface BookToBillQuarter {
  quarter: string;
  /** $M in the quarter. */
  bookings: number;
  /** $M in the quarter. */
  billings: number;
  /** Bookings ÷ billings, as reported. */
  bookToBill: number;
}

export type Band = "shrinking" | "flat" | "growing";

/** The flat band: within two points of 1.00 either way, inclusive. */
export const FLAT = { low: 0.98, high: 1.02 } as const;
/** The scale the explainer draws. A value outside it is pinned to the nearer end. */
export const SCALE = { min: 0.8, max: 1.2 } as const;

export function bandOf(ratio: number): Band {
  if (ratio < FLAT.low) return "shrinking";
  if (ratio > FLAT.high) return "growing";
  return "flat";
}

const LEAD: Record<Band, string> = {
  growing: "Orders are arriving faster than they ship.",
  flat: "Orders and shipments are roughly in balance.",
  shrinking: "Shipments are running ahead of new orders.",
};

const SO: Record<Band, string> = {
  growing: "so orders are arriving faster than they ship",
  flat: "so orders and shipments are roughly in balance",
  shrinking: "so it shipped more than it took in",
};

export interface BookToBillReading {
  ratio: number;
  band: Band;
  /** The answer in one short line, for the top of the popover. */
  lead: string;
  /** The figures in a sentence, read out when the quarter changes. */
  sentence: string;
  /** Bookings minus billings, $M. */
  gap: number;
  /** The gap in words, e.g. "$470M more orders than shipments". */
  gapText: string;
}

export function readBookToBill(q: BookToBillQuarter, subject = "Avnet"): BookToBillReading {
  const ratio = q.bookToBill;
  const band = bandOf(ratio);
  const gap = q.bookings - q.billings;
  const size = fmtM(Math.abs(gap));
  const gapText =
    Math.round(gap) === 0 ? "Orders equal shipments" : gap > 0 ? `${size} more orders than shipments` : `${size} fewer orders than shipments`;
  return {
    ratio,
    band,
    lead: LEAD[band],
    sentence: `${subject} booked $${ratio.toFixed(2)} of orders for every $1.00 it shipped in ${q.quarter}, ${SO[band]}.`,
    gap,
    gapText,
  };
}

/** Where a ratio sits on the scale, 0 to 1, pinned to the ends. */
export function scalePosition(ratio: number): number {
  return position(ratio, SCALE);
}

/** How many quarters in a row, counting back from the last, the ratio has been above 1. */
export function quartersAboveOne(quarters: BookToBillQuarter[]): number {
  let n = 0;
  for (let i = quarters.length - 1; i >= 0 && quarters[i].bookToBill > 1; i--) n++;
  return n;
}
