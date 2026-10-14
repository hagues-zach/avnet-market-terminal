import { COMPANIES } from "@/lib/data/live/earnings-model";
import { DISTRIBUTORS, HOME_DISTRIBUTOR, distributorName, ownerKey, supplierKey, type Snapshot } from "./model";
import { getHistories, type DistributorHistory } from "./store";

// Everything the Line Cards page shows, derived from the stored snapshots.
// Server-only.
//
// Sites list sub-brands separately ("Amphenol RF", "Amphenol Aerospace", …), which
// buries the picture in near-duplicates. Listings are therefore rolled up into
// supplier families before anything is counted.

export interface DistributorSummary {
  slug: string;
  name: string;
  count: number; // supplier families
  listings: number; // names as listed, before roll-up
  /** Families no other tracked distributor carries. */
  only: number;
  date: string;
  method: "collected" | "imported";
  source: string;
  snapshots: number;
  /** Against the previous snapshot; null when there is only one. */
  added: string[] | null;
  removed: string[] | null;
}

export interface SupplierRow {
  key: string; // family key
  name: string;
  carriedBy: string[]; // distributor slugs
  /** Distinct listings rolled into this family across all line cards. */
  brands: number;
  /** Slug of the matching company profile, when the supplier is one of the tracked companies. */
  profile?: string;
}

export interface LineCards {
  distributors: DistributorSummary[]; // tracked, in registry order then others
  missing: { slug: string; name: string; collectable: boolean }[]; // registry entries with no snapshot yet
  overlap: { a: string; b: string; shared: number }[];
  suppliers: SupplierRow[];
  hasHome: boolean;
}

interface Family {
  key: string;
  /** A display name: the parent as listed, or the shortest member listing. */
  name: string;
}

/** Builds the listing → family rule from every name seen on any line card. */
function familyResolver(allNames: string[]): (name: string) => Family {
  const listed = new Map<string, string>(); // key → a listing of exactly that name
  for (const n of allNames) {
    const k = supplierKey(n);
    const prev = listed.get(k);
    // Prefer a mixed-case listing over all capitals, then the shorter one.
    if (!prev || Number(n === n.toUpperCase()) - Number(prev === prev.toUpperCase()) < 0 || (n.length < prev.length && (n === n.toUpperCase()) === (prev === prev.toUpperCase()))) {
      listed.set(k, n);
    }
  }
  return (name) => {
    const key = supplierKey(name);
    // "Brand / Owner" and "OWNER - BRAND" name the parent outright.
    const owner = ownerKey(name);
    if (owner) {
      const ownerName = name.includes(" / ") ? name.split(" / ")[1] : name.split(" - ")[0];
      return { key: owner, name: listed.get(owner) ?? ownerName.trim() };
    }
    // "Amphenol RF" belongs to "Amphenol" when Amphenol is itself listed somewhere.
    const first = key.split(" ")[0];
    if (first.length >= 4 && first !== key && listed.has(first)) return { key: first, name: listed.get(first)! };
    return { key, name: listed.get(key) ?? name };
  };
}

function families(snapshot: Snapshot, resolve: (name: string) => Family): Map<string, { name: string; listings: Set<string> }> {
  const out = new Map<string, { name: string; listings: Set<string> }>();
  for (const listing of snapshot.suppliers) {
    const f = resolve(listing);
    if (!f.key) continue;
    const row = out.get(f.key) ?? { name: f.name, listings: new Set<string>() };
    row.listings.add(supplierKey(listing));
    out.set(f.key, row);
  }
  return out;
}

const order = (slug: string) => {
  const i = DISTRIBUTORS.findIndex((d) => d.slug === slug);
  return i < 0 ? DISTRIBUTORS.length : i;
};

async function load() {
  const histories = (await getHistories()).sort((a, b) => order(a.distributor) - order(b.distributor) || a.distributor.localeCompare(b.distributor));
  const resolve = familyResolver(histories.flatMap((h) => [...h.latest.suppliers, ...(h.previous?.suppliers ?? [])]));
  return { histories, resolve, cards: histories.map((h) => ({ history: h, now: families(h.latest, resolve) })) };
}

function summarise(h: DistributorHistory, now: ReturnType<typeof families>, resolve: (name: string) => Family, only: number): DistributorSummary {
  const before = h.previous ? families(h.previous, resolve) : null;
  return {
    slug: h.distributor,
    name: distributorName(h.distributor),
    count: now.size,
    listings: new Set(h.latest.suppliers.map(supplierKey)).size,
    only,
    date: h.latest.date,
    method: h.latest.method,
    source: h.latest.source,
    snapshots: h.snapshots,
    added: before ? Array.from(now).filter(([k]) => !before.has(k)).map(([, f]) => f.name).sort() : null,
    removed: before ? Array.from(before).filter(([k]) => !now.has(k)).map(([, f]) => f.name).sort() : null,
  };
}

export async function getLineCards(): Promise<LineCards> {
  const { histories, resolve, cards } = await load();

  const overlap: LineCards["overlap"] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      let shared = 0;
      for (const k of cards[i].now.keys()) if (cards[j].now.has(k)) shared += 1;
      overlap.push({ a: cards[i].history.distributor, b: cards[j].history.distributor, shared });
    }
  }

  const profiles = new Map(COMPANIES.map((c) => [supplierKey(c.name), c.slug]));
  const rows = new Map<string, SupplierRow & { listings: Set<string> }>();
  for (const { history, now } of cards) {
    for (const [key, f] of now) {
      const row = rows.get(key) ?? { key, name: f.name, carriedBy: [], brands: 0, listings: new Set<string>(), profile: profiles.get(key) };
      row.carriedBy.push(history.distributor);
      for (const l of f.listings) row.listings.add(l);
      rows.set(key, row);
    }
  }
  const suppliers: SupplierRow[] = Array.from(rows.values(), ({ listings, ...row }) => ({ ...row, brands: listings.size })).sort(
    (a, b) => b.carriedBy.length - a.carriedBy.length || a.name.localeCompare(b.name),
  );

  const onlyCount = (slug: string) => suppliers.filter((s) => s.carriedBy.length === 1 && s.carriedBy[0] === slug).length;
  const tracked = new Set(histories.map((h) => h.distributor));
  return {
    distributors: cards.map(({ history, now }) => summarise(history, now, resolve, onlyCount(history.distributor))),
    missing: DISTRIBUTORS.filter((d) => !tracked.has(d.slug)).map((d) => ({ slug: d.slug, name: d.name, collectable: Boolean(d.sourceUrl) })),
    overlap,
    suppliers,
    hasHome: tracked.has(HOME_DISTRIBUTOR),
  };
}

/** Which tracked distributors list a company, for its profile page and the momentum table. */
export async function getCarriers(companyName: string): Promise<{ carriers: { slug: string; name: string; date: string }[]; tracked: number; hasHome: boolean }> {
  const { histories, cards } = await load();
  const key = supplierKey(companyName);
  const carriers = cards
    .filter(({ now }) => now.has(key))
    .map(({ history }) => ({ slug: history.distributor, name: distributorName(history.distributor), date: history.latest.date }));
  return { carriers, tracked: histories.length, hasHome: histories.some((h) => h.distributor === HOME_DISTRIBUTOR) };
}

/** Supplier family key → distributors carrying it, for looking up many companies at once. */
export async function getCarrierIndex(): Promise<{ carriedBy: (companyName: string) => string[]; tracked: { slug: string; name: string }[]; hasHome: boolean }> {
  const { histories, cards } = await load();
  return {
    carriedBy: (companyName) => {
      const key = supplierKey(companyName);
      return cards.filter(({ now }) => now.has(key)).map(({ history }) => history.distributor);
    },
    tracked: histories.map((h) => ({ slug: h.distributor, name: distributorName(h.distributor) })),
    hasHome: histories.some((h) => h.distributor === HOME_DISTRIBUTOR),
  };
}
