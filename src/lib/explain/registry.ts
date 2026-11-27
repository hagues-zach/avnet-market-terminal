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
  /** The page with the tile, for links that open the explainer there (?explain=). */
  page?: string;
}

const ENTRIES: Omit<Explainer, "definition">[] = [
  {
    term: "Book-to-bill",
    page: "/performance",
    name: "Book-to-bill",
    formula: "Bookings ÷ billings",
    learnHref: "/learn#glossary",
  },
  {
    term: "Gross margin",
    page: "/network/avnet",
    name: "Gross margin",
    formula: "Gross profit ÷ revenue",
    learnHref: "/learn#glossary",
  },
  {
    term: "Operating margin",
    page: "/network/avnet",
    name: "Operating margin",
    formula: "Operating profit ÷ revenue",
    learnHref: "/learn#glossary",
  },
  {
    term: "Inventory days",
    page: "/network/avnet",
    name: "Inventory days",
    formula: "Inventory ÷ cost of sales × days in the quarter",
    learnHref: "/learn#glossary",
  },
  {
    term: "Revenue growth (year on year)",
    page: "/network/avnet",
    name: "Revenue growth",
    formula: "Revenue ÷ revenue a year earlier, less one",
    learnHref: "/learn#glossary",
  },
  {
    term: "Free cash flow",
    page: "/network/avnet",
    name: "Free cash flow",
    formula: "Cash from operations less capital spending",
    learnHref: "/learn#glossary",
  },
  {
    term: "Diluted EPS",
    page: "/network/avnet",
    name: "Diluted EPS",
    formula: "Net income ÷ diluted shares",
    learnHref: "/learn#glossary",
  },
  {
    term: "Backlog",
    page: "/performance",
    name: "Backlog",
    formula: "Opening backlog plus bookings less billings",
    learnHref: "/learn#glossary",
  },
  {
    term: "Billings (last 12 months)",
    page: "/performance",
    name: "Billings, last 12 months",
    formula: "The last four quarters' billings added together",
    learnHref: "/learn#glossary",
  },
  {
    term: "Design-approved billings",
    page: "/performance",
    name: "Design-approved billings",
    formula: "Billings on DRMS 04 parts ÷ all billings",
    learnHref: "/learn#glossary",
  },
  {
    term: "Approved pipeline",
    page: "/design-pipeline",
    name: "Approved pipeline",
    formula: "Approved value less what already bills",
    learnHref: "/learn#glossary",
  },
  {
    term: "Approval rate",
    page: "/design-pipeline",
    name: "Approval rate",
    formula: "Approved ÷ submitted, last 12 months",
    learnHref: "/learn#glossary",
  },
  {
    term: "Design registration (DRMS)",
    page: "/design-pipeline",
    name: "New registrations",
    formula: "Registrations submitted in the quarter",
    learnHref: "/learn#glossary",
  },
  {
    term: "Customer concentration",
    page: "/customers",
    name: "Customer concentration",
    formula: "Billings from the largest customers ÷ all billings",
    learnHref: "/learn#glossary",
  },
  {
    term: "Active customers",
    page: "/customers",
    name: "Active customers",
    formula: "Parent companies billed in the last 12 months",
    learnHref: "/learn#glossary",
  },
  {
    term: "Market share",
    page: "/market-share",
    name: "Share of mapped market",
    formula: "Mapped billings ÷ the market they map to",
    learnHref: "/learn#glossary",
  },
  {
    term: "Mapped billings",
    page: "/market-share",
    name: "Mapped billings",
    formula: "Billings on codes in the code map ÷ all billings",
    learnHref: "/learn#glossary",
  },
  {
    term: "Validated categories",
    page: "/tools/mapping",
    name: "Validated categories",
    formula: "Categories with a validated mapping ÷ all categories",
    learnHref: "/learn#glossary",
  },
  {
    term: "Share of Avnet and Arrow",
    page: "/market-share",
    name: "Share of Avnet + Arrow",
    formula: "Avnet revenue ÷ Avnet and Arrow revenue combined",
    learnHref: "/learn#glossary",
  },
  {
    term: "Growth over makers",
    page: "/market-share",
    name: "Growth over makers",
    formula:
      "Avnet revenue growth less the makers' combined revenue growth, year on year",
    learnHref: "/learn#glossary",
  },
  {
    term: "Holding share",
    page: "/forecast",
    name: "Against holding share",
    formula: "Scenario billings less billings at today's share",
    learnHref: "/learn#glossary",
  },
  {
    term: "Supply-chain revenue",
    page: "/cycle",
    name: "Supply-chain revenue",
    formula:
      "Combined revenue ÷ the same companies' revenue a year earlier, less one",
    learnHref: "/learn#glossary",
  },
  {
    term: "Companies growing",
    page: "/cycle",
    name: "Companies growing",
    formula: "Companies with revenue up on a year ago ÷ all with both quarters",
    learnHref: "/learn#glossary",
  },
  {
    term: "Median revenue growth",
    page: "/earnings",
    name: "Median revenue growth",
    formula: "The middle company's revenue growth on a year ago",
    learnHref: "/learn#glossary",
  },
  {
    term: "Distributor inventory",
    page: "/cycle",
    name: "Distributor inventory",
    formula: "The middle distributor's inventory days",
    learnHref: "/learn#glossary",
  },
  {
    term: "Hyperscaler capex",
    page: "/cycle",
    name: "Hyperscaler capex",
    formula: "Capital spending of the five hyperscalers added together",
    learnHref: "/learn#glossary",
  },
  {
    term: "Compound annual growth",
    page: "/forecast",
    name: "Growth a year",
    formula:
      "(Billings at the horizon ÷ billings today) to the power of one over the years, less one",
    learnHref: "/learn#glossary",
  },
];

export const EXPLAINERS: Explainer[] = ENTRIES.map((e) => {
  const g = GLOSSARY.find((x) => x.term === e.term);
  if (!g) throw new Error(`Explainer "${e.term}" has no glossary entry`);
  return { ...e, definition: g.definition };
});

/** "Share of Avnet + Arrow" to "share-of-avnet-arrow": the ?explain= value that opens it. */
export const explainSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function explainer(term: string): Explainer {
  const e = EXPLAINERS.find((x) => x.term === term);
  if (!e) throw new Error(`No explainer for "${term}"`);
  return e;
}
