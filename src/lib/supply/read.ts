import type { LiveArticle } from "@/lib/data/live/shared";

// The Supply Chain read: three live signals, each scored tighter, looser or
// flat, rolled up into "Tightening", "Easing" or "Mixed". Pure, so the page and
// its tests read the same rule. Mock lead times are deliberately not counted.

export type Direction = "tighter" | "looser" | "flat";
export type Read = "Tightening" | "Easing" | "Mixed";

export const SIGNAL_KEYS = {
  utilisation: "util-semis",
  semiPrices: "PCU334413334413",
  connectorPrices: "PCU334417334417",
  boardPrices: "PCU334412334412",
} as const;

export const METAL_KEYS = ["imf-PCOPP", "imf-PTIN", "imf-PNICK", "imf-PALUM"] as const;

/** Thresholds: utilisation in points, prices as a share, inventory in days; each on a year ago. */
export const THRESHOLDS = { utilisation: 1, prices: 0.02, inventoryDays: 3 };

export interface Inputs {
  /** Change in capacity utilisation on a year ago, in points (79.4% − 77.3% = 2.1). */
  utilisationChange?: number;
  /** Change in semiconductor producer prices on a year ago, as a share (0.038). */
  priceChange?: number;
  /** Change in the chain's inventory days on a year ago. */
  inventoryChange?: number;
}

export interface Scored {
  key: "utilisation" | "prices" | "inventory";
  direction: Direction | null; // null when the signal is missing
}

const score = (v: number | undefined, threshold: number, upIsTighter: boolean): Direction | null => {
  if (v === undefined) return null;
  if (Math.abs(v) <= threshold) return "flat";
  return v > 0 === upIsTighter ? "tighter" : "looser";
};

export function scoreSignals(i: Inputs): Scored[] {
  return [
    { key: "utilisation", direction: score(i.utilisationChange, THRESHOLDS.utilisation, true) },
    { key: "prices", direction: score(i.priceChange, THRESHOLDS.prices, true) },
    // Inventory falling means less buffer in the chain: tighter.
    { key: "inventory", direction: score(i.inventoryChange, THRESHOLDS.inventoryDays, false) },
  ];
}

/** Two or more tighter with none looser is Tightening; the reverse is Easing; anything else is Mixed. */
export function readOf(scored: Scored[]): Read {
  const tighter = scored.filter((s) => s.direction === "tighter").length;
  const looser = scored.filter((s) => s.direction === "looser").length;
  if (tighter >= 2 && looser === 0) return "Tightening";
  if (looser >= 2 && tighter === 0) return "Easing";
  return "Mixed";
}

const PHRASE: Record<Scored["key"], Record<Direction, string>> = {
  utilisation: { tighter: "fabs are running hotter", looser: "fabs are running cooler", flat: "fab utilisation is steady" },
  prices: { tighter: "chip prices are rising", looser: "chip prices are falling", flat: "chip prices are flat" },
  inventory: { tighter: "inventory in the chain is falling", looser: "inventory in the chain is building", flat: "inventory in the chain is steady" },
};

/** "Supply is tightening. Fabs are running hotter, chip prices are rising and inventory in the chain is falling." */
export function sentence(scored: Scored[]): string {
  const read = readOf(scored);
  const lead = read === "Tightening" ? "Supply is tightening." : read === "Easing" ? "Supply is easing." : "Supply signals are mixed.";
  const parts = scored.filter((s) => s.direction).map((s) => PHRASE[s.key][s.direction!]);
  if (!parts.length) return lead;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `${lead} ${list.charAt(0).toUpperCase()}${list.slice(1)}.`;
}

/* ---------- Supply news ---------- */

const SUPPLY =
  /\b(lead[- ]times?|shortages?|allocation|allocat(e|ed|ing)|capacity|price (hikes?|increases?|rises?)|raises? prices|supply (chain|constraints?|tight\w*)|tight(en|ening) supply|inventor(y|ies)|backlog)\b/i;

/** Stories about supply, newest first, filings left out. */
export function supplyStories(articles: LiveArticle[], limit = 6): LiveArticle[] {
  return articles
    .filter((a) => a.kind !== "filing" && SUPPLY.test(`${a.title} ${a.summary}`))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, limit);
}

/* ---------- Categories ---------- */

/**
 * The lead-time categories against the live series that bear on them: which
 * producer price index applies (none for passives and electromechanical, which
 * have no matching series here) and which supplier's earnings release speaks
 * for the category.
 */
export const CATEGORY_LINKS: Record<string, { prices?: keyof typeof SIGNAL_KEYS; supplier: string }> = {
  MCUs: { prices: "semiPrices", supplier: "microchip" },
  Analog: { prices: "semiPrices", supplier: "texas-instruments" },
  "Discretes & power": { prices: "semiPrices", supplier: "onsemi" },
  Memory: { prices: "semiPrices", supplier: "micron" },
  FPGAs: { prices: "semiPrices", supplier: "amd" },
  Connectors: { prices: "connectorPrices", supplier: "amphenol" },
  "Passives (MLCC)": { supplier: "vishay" },
  Electromechanical: { supplier: "te-connectivity" },
};

// Claude says so when a release is silent on a topic; that is not something the supplier said.
const SILENT =
  /\b(does not|did not|doesn't|didn't) (discuss|mention|address|comment|cover|give|provide)|\bnot (discussed|mentioned|addressed|covered)\b|\bno (comment|mention|commentary)\b/i;

/** A topic from a digest, or undefined when the release did not speak to it. */
export function spoken(text: string | null | undefined): string | undefined {
  return text && !SILENT.test(text) ? text : undefined;
}

/** The first sentence of a longer passage, for a table cell. */
export function firstSentence(text: string | null | undefined, max = 110): string | undefined {
  if (!text) return undefined;
  const s = text.split(/(?<=[.;])\s/)[0].replace(/[.;]$/, "");
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
