import { GLOSSARY } from "@/lib/learn/content";
import { EXPLAINERS } from "./registry";

// Definition-only explainers for numeric table columns. A column spans many
// companies or segments, so there's no diagram: the term's glossary
// definition, its formula when the registry has one, and one line on how to
// read the column.

export interface ColumnHelp {
  /** The glossary term the definition comes from. */
  term: string;
  /** The column's name in sentence case, for the panel's title. */
  name: string;
  /** How to read the column, first. */
  read: string;
}

export const COLUMN_HELP = {
  revenueYoY: {
    term: "Revenue growth (year on year)",
    name: "Growth on a year ago",
    read: "Each company's revenue against the same quarter a year earlier. Sort it to see who is growing fastest.",
  },
  grossMargin: {
    term: "Gross margin",
    name: "Gross margin",
    read: "Sort it within one group, never across: a distributor and a chip maker make money in different ways.",
  },
  operatingMargin: {
    term: "Operating margin",
    name: "Operating margin",
    read: "What's left of each revenue dollar after running the business. Read it against companies in the same group.",
  },
  inventoryDays: {
    term: "Inventory days",
    name: "Inventory days",
    read: "How long inventory would last at the current rate of sales. Days rising early in a downturn are the warning sign.",
  },
  fcfMargin: {
    term: "Free cash flow margin",
    name: "Free cash flow margin",
    read: "Cash left after capital spending, for each revenue dollar. Distributors often make the most cash in a downturn, as inventory runs down.",
  },
  marketSize: {
    term: "TAM (total addressable market)",
    name: "Market size",
    read: "The whole market in the row over the last 12 months, whoever sells it.",
  },
  share: {
    term: "Market share",
    name: "Avnet share",
    read: "Avnet's billings in the row divided by the size in the column before it. A small share of a big row is the white space.",
  },
  shareChange: {
    term: "Market share",
    name: "Share change on a year ago",
    read: "Points of share gained or lost on a year ago. A gain means Avnet grew faster than the market in the row.",
  },
  confidence: {
    term: "Mapping confidence",
    name: "Mapping confidence",
    read: "How sure the code map is for the row. Low means its share figure is the least certain.",
  },
} satisfies Record<string, ColumnHelp>;

export type ColumnKey = keyof typeof COLUMN_HELP;

export function columnHelp(key: ColumnKey) {
  const h: ColumnHelp = COLUMN_HELP[key];
  const g = GLOSSARY.find((x) => x.term === h.term);
  if (!g) throw new Error(`Column help "${key}" has no glossary entry`);
  return { ...h, definition: g.definition, formula: EXPLAINERS.find((e) => e.term === h.term)?.formula };
}
