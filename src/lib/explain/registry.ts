import { GLOSSARY } from "@/lib/learn/content";

// The KPIs that have an explainer, keyed by their glossary term. The definition
// is read from the glossary, so the Learning Center and the explainer never drift.

export interface Explainer {
  term: string;
  /** The tile label it explains, in sentence case. */
  name: string;
  /** The formula in words. */
  formula: string;
  definition: string;
  learnHref: string;
}

const ENTRIES: Omit<Explainer, "definition">[] = [
  { term: "Book-to-bill", name: "Book-to-bill", formula: "Bookings ÷ billings", learnHref: "/learn#glossary" },
  { term: "Gross margin", name: "Gross margin", formula: "Gross profit ÷ revenue", learnHref: "/learn#glossary" },
  { term: "Operating margin", name: "Operating margin", formula: "Operating profit ÷ revenue", learnHref: "/learn#glossary" },
  {
    term: "Inventory days",
    name: "Inventory days",
    formula: "Inventory ÷ cost of sales × days in the quarter",
    learnHref: "/learn#glossary",
  },
  {
    term: "Revenue growth (year on year)",
    name: "Revenue growth",
    formula: "Revenue ÷ revenue a year earlier, less one",
    learnHref: "/learn#glossary",
  },
  { term: "Free cash flow", name: "Free cash flow", formula: "Cash from operations less capital spending", learnHref: "/learn#glossary" },
  { term: "Diluted EPS", name: "Diluted EPS", formula: "Net income ÷ diluted shares", learnHref: "/learn#glossary" },
];

export const EXPLAINERS: Explainer[] = ENTRIES.map((e) => {
  const g = GLOSSARY.find((x) => x.term === e.term);
  if (!g) throw new Error(`Explainer "${e.term}" has no glossary entry`);
  return { ...e, definition: g.definition };
});

export function explainer(term: string): Explainer {
  const e = EXPLAINERS.find((x) => x.term === term);
  if (!e) throw new Error(`No explainer for "${term}"`);
  return e;
}
