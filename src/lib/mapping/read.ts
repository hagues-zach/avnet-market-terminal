import type { Confidence, Mapping } from "@/lib/avnet/contracts";
import { segmentShort } from "@/lib/avnet/format";

// The Code Mapping read: coverage, the review queue's order and the lead
// sentence. Pure, so the page and its tests read the same rule.

export interface Summary {
  categories: number;
  validated: number;
  review: number;
  unmapped: number;
  /** Billings on mappings waiting for a decision (suggested or in review), $M. */
  reviewBillings: number;
  /** Segment with the most billings waiting for review. */
  reviewLeader?: string;
}

/** "WSTS › Memory › DRAM": source, segment, category. Never a slash (the brand rule). */
export const categoryPath = (m: Mapping) => `${m.source} › ${segmentShort(m.segment)} › ${m.name}`;

export const needsReview = (m: Mapping) => m.status === "suggested" || m.status === "review";

export function summarise(ms: Mapping[]): Summary {
  const review = ms.filter(needsReview);
  const bySegment = new Map<string, number>();
  for (const m of review) bySegment.set(m.segment, (bySegment.get(m.segment) ?? 0) + m.billings);
  const reviewLeader = [...bySegment.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    categories: ms.length,
    validated: ms.filter((m) => m.status === "validated").length,
    review: review.length,
    unmapped: ms.filter((m) => m.status === "unmapped").length,
    reviewBillings: review.reduce((n, m) => n + m.billings, 0),
    reviewLeader,
  };
}

const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}B` : `$${Math.round(v)}M`);
const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * "85% of Avnet's billings map to a market category, and 61% of categories are validated.
 *  52 mappings wait for review, covering $1.9B of billings; the most is in Memory."
 */
export function lead(mappedShare: number, s: Summary): string {
  const first = `${pct(mappedShare)} of Avnet's billings map to a market category, and ${pct(s.validated / (s.categories || 1))} of categories are validated.`;
  if (!s.review) return `${first} Nothing is waiting for review.`;
  const noun = s.review === 1 ? "mapping waits" : "mappings wait";
  const most = s.reviewLeader ? `; the most is in ${s.reviewLeader}` : "";
  return `${first} ${s.review} ${noun} for review, covering ${money(s.reviewBillings)} of billings${most}.`;
}

const RANK: Record<Confidence, number> = { Low: 0, Medium: 1, High: 2 };

/** Review order: most billings at stake first; on a tie, lower confidence first. */
export function reviewOrder(a: Mapping, b: Mapping): number {
  if (b.billings !== a.billings) return b.billings - a.billings;
  return RANK[a.confidence ?? "Low"] - RANK[b.confidence ?? "Low"];
}

export interface SegmentCoverage {
  segment: string;
  billings: number;
  /** Share of the segment's mapped billings on validated mappings. */
  validatedShare: number;
  validated: number;
  review: number;
  unmapped: number;
}

export function coverage(ms: Mapping[], segments: readonly string[]): SegmentCoverage[] {
  return segments.map((segment) => {
    const mine = ms.filter((m) => m.segment === segment);
    const billings = mine.reduce((n, m) => n + m.billings, 0);
    const validatedBillings = mine.filter((m) => m.status === "validated").reduce((n, m) => n + m.billings, 0);
    return {
      segment,
      billings,
      validatedShare: billings ? validatedBillings / billings : 0,
      validated: mine.filter((m) => m.status === "validated").length,
      review: mine.filter(needsReview).length,
      unmapped: mine.filter((m) => m.status === "unmapped").length,
    };
  });
}

/** The segment with the smallest share of billings on validated mappings. */
export const weakest = (cs: SegmentCoverage[]) => [...cs].sort((a, b) => a.validatedShare - b.validatedShare)[0];

/** Free-text match on the category path, codes and PCC level. */
export function matches(m: Mapping, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [m.source, m.segment, m.name, ...m.codes, m.pcc ?? ""].some((s) => s.toLowerCase().includes(q));
}
