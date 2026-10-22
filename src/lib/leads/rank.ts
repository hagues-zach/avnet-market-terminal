// Lead Finder: which customer companies build with a technology, and why they
// are worth a call now. Pure, so the page, the deck's lead-list slide and the
// test rank the same way. Every reason comes from live data (SEC filings and
// news); a missing figure is never a reason.
import { COMPANIES, type Cohort, type Company } from "@/lib/data/live/earnings-model";
import { PRIMERS, type Primer } from "@/lib/learn/content";

/** The customer groups in the app, in the order the page shows them. */
export const GROUPS: { value: Cohort; label: string; /** In a sentence: "among carmakers". */ people: string }[] = [
  { value: "auto", label: "Automotive", people: "carmakers" },
  { value: "industrial", label: "Industrial OEMs", people: "industrial OEMs" },
  { value: "ems", label: "Contract manufacturers", people: "contract manufacturers" },
  { value: "systems", label: "Devices and systems", people: "device and systems makers" },
  { value: "hyperscaler", label: "Hyperscalers", people: "hyperscalers" },
];

export const groupLabel = (c: Cohort) => GROUPS.find((g) => g.value === c)?.label ?? "n/a";
export const isCustomer = (c: Company) => GROUPS.some((g) => g.value === c.cohort);
export const CUSTOMERS = COMPANIES.filter(isCustomer);

const ALL: Cohort[] = ["auto", "industrial", "ems", "systems", "hyperscaler"];

/** The customer groups that use each primer's technology, from where the primer says it is used. Contract manufacturers build for every market. */
export const PRIMER_GROUPS: Record<string, Cohort[]> = {
  microcontrollers: ["auto", "industrial", "systems", "ems"],
  "sic-mosfets": ["auto", "industrial", "ems"],
  mlccs: ALL,
  connectors: ALL,
  fpgas: ["hyperscaler", "systems", "industrial", "ems"],
  "power-management": ALL,
};

/** Words that mark a story as being about the technology. */
export const PRIMER_TERMS: Record<string, RegExp> = {
  microcontrollers: /\b(microcontrollers?|MCUs?)\b/i,
  "sic-mosfets": /\b(SiC|silicon carbide)\b/i,
  mlccs: /\b(MLCCs?|ceramic capacitors?)\b/i,
  connectors: /\bconnectors?\b/i,
  fpgas: /\bFPGAs?\b/i,
  "power-management": /\b(power management|PMICs?|voltage regulators?)\b/i,
};

/** Where the primer says the technology is used, for the "why" line: "traction inverters and on-board chargers". */
export function useFor(p: Primer, group: Cohort): string | undefined {
  // Contract manufacturers build for every market, so no one use describes them.
  const words: Partial<Record<Cohort, RegExp>> = {
    auto: /automotive|electric vehicles/i,
    industrial: /industrial/i,
    systems: /consumer|communications|computing|connected|processors/i,
    hyperscaler: /data cent|processors/i,
  };
  const re = words[group];
  return re ? p.uses.find((u) => re.test(u.name))?.detail : undefined;
}

export interface Story {
  title: string;
  outlet: string;
  /** "Nov 5". */
  date: string;
  url: string;
  /** Days since it was published. */
  age: number;
  /** True when it mentions the technology. */
  onTechnology: boolean;
}

export interface LeadInput {
  company: Company;
  /** "Q2 2026". */
  quarter?: string;
  revenue?: number;
  growth?: number;
  inventoryDays?: number;
  inventoryDaysYearAgo?: number;
  stories: Story[];
}

export type ReasonKind = "growth" | "news" | "inventory" | "fit";

export interface Lead extends LeadInput {
  group: Cohort;
  reasons: { kind: ReasonKind; text: string }[];
  /** Reasons beyond fitting the market. */
  signals: number;
}

export const GROWTH_FLOOR = 0.1;
export const NEWS_DAYS = 30;

/** A name inside a sentence: "connectors", "industrial OEMs", but "SiC MOSFETs" and "FPGAs" as written. */
export const inSentence = (name: string) => (/^[A-Z][a-z]+(\s|$)/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);
export const techName = (p: Pick<Primer, "name">) => inSentence(p.name);

const pct = (v: number) => `${(Math.abs(v) * 100).toFixed(1)}%`;

/** The reasons a company is on the list, in words; fit first when nothing else applies. */
export function reasonsFor(l: LeadInput, p: Primer): Lead["reasons"] {
  const out: Lead["reasons"] = [];
  if (l.growth !== undefined && l.growth >= GROWTH_FLOOR) out.push({ kind: "growth", text: `Revenue up ${pct(l.growth)} on a year ago` });
  const story = l.stories.find((s) => s.onTechnology && s.age <= NEWS_DAYS);
  if (story) out.push({ kind: "news", text: `In the news on ${techName(p)}, ${story.date}` });
  if (l.inventoryDays !== undefined && l.inventoryDaysYearAgo !== undefined && Math.round(l.inventoryDays) < Math.round(l.inventoryDaysYearAgo))
    out.push({ kind: "inventory", text: `Inventory down to ${Math.round(l.inventoryDays)} days from ${Math.round(l.inventoryDaysYearAgo)}` });
  if (!out.length) out.push({ kind: "fit", text: `Its market uses ${techName(p)}` });
  return out;
}

/** Customer companies whose market uses the technology, most reasons first, then faster growth, then name. */
export function rank(inputs: LeadInput[], p: Primer): Lead[] {
  const groups = PRIMER_GROUPS[p.slug] ?? [];
  return inputs
    .filter((l) => isCustomer(l.company) && groups.includes(l.company.cohort))
    .map((l) => {
      const reasons = reasonsFor(l, p);
      return { ...l, group: l.company.cohort, reasons, signals: reasons.filter((r) => r.kind !== "fit").length };
    })
    .sort((a, b) => b.signals - a.signals || (b.growth ?? -Infinity) - (a.growth ?? -Infinity) || a.company.name.localeCompare(b.company.name));
}

/** Filter a ranked list to one group, and to those with news on the technology. */
export const filter = <T extends Lead>(leads: T[], group?: Cohort, news = false): T[] =>
  leads.filter((l) => (!group || l.group === group) && (!news || l.reasons.some((r) => r.kind === "news")));

/** "a, b and c". */
export function list(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** The answer in words: the top two or three and what they share. */
export function lead(leads: Lead[], p: Primer, group?: Cohort, news = false): string {
  const where = group ? ` among ${GROUPS.find((g) => g.value === group)!.people}` : "";
  if (!leads.length)
    return news
      ? `No customer company${where} has been in the news on ${techName(p)} in the last 30 days.`
      : `No customer company in the app${where} uses ${techName(p)}.`;
  const top = leads.filter((l) => l.signals === leads[0].signals).slice(0, 3);
  const names = list(top.map((l) => l.company.name));
  const verb = top.length === 1 ? "leads" : "lead";
  const kinds = (["growth", "news", "inventory"] as const).filter((k) => top.every((l) => l.reasons.some((r) => r.kind === k)));
  const why = kinds.map((k) =>
    k === "growth"
      ? top.length === 1
        ? `revenue is up ${pct(top[0].growth ?? 0)} on a year ago`
        : `revenue is up ${Math.floor(Math.round(Math.min(...top.map((l) => l.growth ?? 0)) * 1000) / 10)}% or more on a year ago`
      : k === "news"
        ? `${top.length === 1 ? "it is" : "they are"} in the news on it`
        : "inventory is down on a year ago",
  );
  const market = top.length === 1 ? "its market uses the part" : "their markets use the part";
  return `For ${techName(p)}${where}, ${names} ${verb}: ${list([market, ...why])}.`;
}

/* ---------- Where a list starts ---------- */

export interface LeadStart {
  primer: Primer;
  group?: Cohort;
  news: boolean;
  /** The supplier whose technology this is, when the URL named one. */
  supplier?: Company;
  notes: string[];
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export const DEFAULT_PRIMER = "sic-mosfets";

export function parseLeadStart(q: Params): LeadStart {
  const notes: string[] = [];
  const slug = one(q.primer)?.toLowerCase();
  let primer = slug ? PRIMERS.find((p) => p.slug === slug) : undefined;
  if (slug && !primer) notes.push(`No primer called "${slug}" in the Learning Center.`);
  const supplierSlug = one(q.supplier)?.toLowerCase();
  const supplier = supplierSlug ? COMPANIES.find((c) => c.slug === supplierSlug) : undefined;
  if (supplierSlug && !supplier) notes.push(`No company called "${supplierSlug}" in the app.`);
  if (!primer && supplier) {
    primer = PRIMERS.find((p) => p.makers.includes(supplier.slug));
    if (!primer) notes.push(`${supplier.name} doesn't make a part with a primer yet.`);
  }
  const g = one(q.group);
  const group = GROUPS.find((x) => x.value === g)?.value;
  if (g && !group) notes.push(`No customer group called "${g}".`);
  return { primer: primer ?? PRIMERS.find((p) => p.slug === DEFAULT_PRIMER)!, group, news: one(q.news) === "1", supplier, notes };
}

/** The URL for a list, so links into Lead Finder and its own controls agree. */
export function leadsHref(s: { primer?: string; group?: Cohort; news?: boolean }): string {
  const q = new URLSearchParams();
  if (s.primer) q.set("primer", s.primer);
  if (s.group) q.set("group", s.group);
  if (s.news) q.set("news", "1");
  const qs = q.toString();
  return qs ? `/tools/leads?${qs}` : "/tools/leads";
}
