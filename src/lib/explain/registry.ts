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
  { term: "Backlog", name: "Backlog", formula: "Opening backlog plus bookings less billings", learnHref: "/learn#glossary" },
  {
    term: "Billings (last 12 months)",
    name: "Billings, last 12 months",
    formula: "The last four quarters' billings added together",
    learnHref: "/learn#glossary",
  },
  {
    term: "Design-approved billings",
    name: "Design-approved billings",
    formula: "Billings on DRMS 04 parts ÷ all billings",
    learnHref: "/learn#glossary",
  },
  { term: "Approved pipeline", name: "Approved pipeline", formula: "Approved value less what already bills", learnHref: "/learn#glossary" },
  { term: "Approval rate", name: "Approval rate", formula: "Approved ÷ submitted, last 12 months", learnHref: "/learn#glossary" },
  {
    term: "Design registration (DRMS)",
    name: "New registrations",
    formula: "Registrations submitted in the quarter",
    learnHref: "/learn#glossary",
  },
  {
    term: "Customer concentration",
    name: "Customer concentration",
    formula: "Billings from the largest customers ÷ all billings",
    learnHref: "/learn#glossary",
  },
  { term: "Active customers", name: "Active customers", formula: "Parent companies billed in the last 12 months", learnHref: "/learn#glossary" },
  { term: "Market share", name: "Share of mapped market", formula: "Mapped billings ÷ the market they map to", learnHref: "/learn#glossary" },
  { term: "Mapped billings", name: "Mapped billings", formula: "Billings on codes in the code map ÷ all billings", learnHref: "/learn#glossary" },
  {
    term: "Validated categories",
    name: "Validated categories",
    formula: "Categories with a validated mapping ÷ all categories",
    learnHref: "/learn#glossary",
  },
  {
    term: "Share of Avnet and Arrow",
    name: "Share of Avnet + Arrow",
    formula: "Avnet revenue ÷ Avnet and Arrow revenue combined",
    learnHref: "/learn#glossary",
  },
  {
    term: "Growth over makers",
    name: "Growth over makers",
    formula: "Avnet revenue growth less the makers' combined revenue growth, year on year",
    learnHref: "/learn#glossary",
  },
  { term: "Holding share", name: "Against holding share", formula: "Scenario billings less billings at today's share", learnHref: "/learn#glossary" },
  {
    term: "Supply-chain revenue",
    name: "Supply-chain revenue",
    formula: "Combined revenue ÷ the same companies' revenue a year earlier, less one",
    learnHref: "/learn#glossary",
  },
  { term: "Companies growing", name: "Companies growing", formula: "Companies with revenue up on a year ago ÷ all with both quarters", learnHref: "/learn#glossary" },
  { term: "Median revenue growth", name: "Median revenue growth", formula: "The middle company's revenue growth on a year ago", learnHref: "/learn#glossary" },
  { term: "Distributor inventory", name: "Distributor inventory", formula: "The middle distributor's inventory days", learnHref: "/learn#glossary" },
  {
    term: "Hyperscaler capex",
    name: "Hyperscaler capex",
    formula: "Capital spending of the five hyperscalers added together",
    learnHref: "/learn#glossary",
  },
  {
    term: "Compound annual growth",
    name: "Growth a year",
    formula: "(Billings at the horizon ÷ billings today) to the power of one over the years, less one",
    learnHref: "/learn#glossary",
  },
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
