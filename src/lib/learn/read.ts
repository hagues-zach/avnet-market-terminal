// Learning Center rules: the maker trend line under each primer and the
// glossary search. Pure, so the pages and their tests read the same rule.

export interface Maker {
  slug: string;
  name: string;
  /** Revenue growth on a year ago in the latest quarter; undefined when no filing was read. */
  growth?: number;
}

const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * "2 of 3 makers grew revenue on a year ago; the median is +4%." With one maker,
 * "Vishay's revenue grew 5% on a year ago." Names makers without a filing.
 */
export function makerTrend(makers: Maker[]): string {
  const known = makers.filter((m) => m.growth !== undefined);
  const missing = makers.filter((m) => m.growth === undefined).map((m) => m.name);
  const tail = missing.length ? ` No recent filing for ${list(missing)}.` : "";
  if (!known.length) return `No recent filings for these makers yet.`;
  if (known.length === 1) {
    const g = known[0].growth!;
    return `${known[0].name}'s revenue ${g >= 0 ? "grew" : "fell"} ${Math.round(Math.abs(g) * 100)}% on a year ago.${tail}`;
  }
  const grew = known.filter((m) => m.growth! > 0).length;
  return `${grew} of ${known.length} makers grew revenue on a year ago; the median is ${signedPct(median(known.map((m) => m.growth!)))}.${tail}`;
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** Glossary terms matching a query in the term or its definition, grouped by first letter, A to Z. */
export function glossaryGroups<T extends { term: string; definition: string }>(entries: T[], query: string): { letter: string; entries: T[] }[] {
  const q = query.trim().toLowerCase();
  const hits = entries.filter((e) => !q || e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q));
  const sorted = [...hits].sort((a, b) => a.term.localeCompare(b.term));
  const groups = new Map<string, T[]>();
  for (const e of sorted) {
    const letter = e.term.charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), e]);
  }
  return [...groups.entries()].map(([letter, entries]) => ({ letter, entries }));
}
