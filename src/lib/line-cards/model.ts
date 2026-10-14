// Line cards: which suppliers each distributor carries, stored as dated snapshots
// so additions and removals can be tracked. Pure types and helpers — safe to
// import from client components.

export interface Distributor {
  slug: string;
  name: string;
  /** Public manufacturer listing, when the site can be read automatically. */
  sourceUrl?: string;
}

// The first three are collected from their public pages. The rest block automated
// requests, so their line cards come in through the import form.
export const DISTRIBUTORS: Distributor[] = [
  { slug: "avnet", name: "Avnet" },
  { slug: "arrow", name: "Arrow" },
  { slug: "tti", name: "TTI", sourceUrl: "https://www.tti.com/content/ttiinc/en/manufacturers.html" },
  { slug: "future", name: "Future Electronics", sourceUrl: "https://www.futureelectronics.com/manufacturers" },
  { slug: "newark", name: "Newark (Farnell)", sourceUrl: "https://www.newark.com/manufacturers" },
  { slug: "mouser", name: "Mouser" },
  { slug: "digikey", name: "DigiKey" },
];

export const HOME_DISTRIBUTOR = "avnet";

export interface Snapshot {
  distributor: string; // slug
  date: string; // YYYY-MM-DD
  /** "collected" from the distributor's public page, or "imported" by a person. */
  method: "collected" | "imported";
  source: string; // URL, or a note on where an imported list came from
  /** Supplier names exactly as listed. Matching keys are derived on read. */
  suppliers: string[];
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_SUPPLIERS = 5000;
export const MAX_NAME_LENGTH = 120;

export function distributorName(slug: string): string {
  return DISTRIBUTORS.find((d) => d.slug === slug)?.name ?? slug.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Names differ between sites ("Texas Instruments", "TEXAS INSTRUMENTS INC", "TI").
// These map well-known variants to one key before the general clean-up.
const ALIASES: [RegExp, string][] = [
  [/^(ti|texas instruments)$/, "texas instruments"],
  [/^(adi|analog devices)$/, "analog devices"],
  [/^(onsemi|on semi|on semiconductor)$/, "onsemi"],
  [/^(st|stmicroelectronics|stmicro)$/, "stmicroelectronics"],
  [/^(te|te connectivity)$/, "te connectivity"],
  [/^nxp( usa)?$/, "nxp"],
  [/^(mps|monolithic power systems?|monolithic power)$/, "monolithic power"],
  [/^(digi key|digikey)$/, "digikey"],
];

const LEGAL_SUFFIX = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|gmbh|ag|sa|plc|nv|bv|kk|spa|srl|pte)\b/g;
// Dropped only from the end, and only when a real name is left ("Vishay
// Semiconductors" → "vishay", but "ON Semiconductor" is handled by an alias).
const DESCRIPTOR_TAIL = /\s+(semiconductors?|technolog(y|ies)|electronics?|components?|international|group|holdings?|solutions|systems|usa|americas?)$/;

/** A matching key for a supplier name. Two listings with the same key are the same supplier. */
export function supplierKey(name: string): string {
  let key = name
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[®™©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, canonical] of ALIASES) if (pattern.test(key)) return canonical;
  for (let i = 0; i < 2; i++) {
    const stripped = key.replace(DESCRIPTOR_TAIL, "");
    if (stripped === key || stripped.length < 3) break;
    key = stripped;
  }
  for (const [pattern, canonical] of ALIASES) if (pattern.test(key)) return canonical;
  return key;
}

/**
 * Some sites list a brand under its owner as "Brand / Owner" (TTI) or
 * "OWNER - BRAND" (Newark). The owner key lets a brand count toward its parent.
 */
export function ownerKey(name: string): string | null {
  const slash = name.split(" / ");
  if (slash.length === 2) return supplierKey(slash[1]);
  const dash = name.split(" - ");
  if (dash.length === 2) return supplierKey(dash[0]);
  return null;
}

export function cleanName(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
