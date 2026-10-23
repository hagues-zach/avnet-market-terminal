import { getAllEarnings } from "./earnings";
import { COHORTS, COMPANIES, isDemand, type Cohort, type CompanyEarnings, type Quarter } from "./earnings-model";

// Market cycle view: the per-company earnings framework rolled up by group and
// aligned on calendar quarters. No new data source — everything here is derived
// from the same SEC filings as the Quarterly Earnings page. Server-only.

// A group's figure for a quarter is only shown when most of its companies have
// reported that quarter; otherwise early reporters would stand in for the group.
const MIN_COVERAGE = 0.65;
const QUARTERS_SHOWN = 8;

export interface GroupPoint {
  label: string; // calendar quarter, e.g. "CY26 Q2"
  /** Combined revenue vs the same companies' combined revenue a year earlier. */
  growth?: number;
  /** The middle company's growth, which a few very large companies cannot move. */
  medianGrowth?: number;
  /** Median across the group's companies. */
  inventoryDays?: number;
  grossMargin?: number;
  operatingMargin?: number;
  /** Share of the group's companies growing year over year. */
  growing?: number;
  reporting: number;
}

export interface GroupSeries {
  cohort: Cohort;
  companies: number;
  points: GroupPoint[]; // oldest → newest, same labels for every group
}

export interface CapexRow {
  slug: string;
  name: string;
  capex?: number;
  yoy?: number;
  label?: string;
}

export type Phase = "Expansion, accelerating" | "Expansion, slowing" | "Contraction, easing" | "Contraction, deepening";

export type StageId = "customers" | "ems" | "distributors" | "manufacturers" | "equipment";

/**
 * The supply chain as five stages, from the customers who buy electronics back
 * to the equipment that makes chips. A stage is the companies of its groups
 * taken together (combined revenue, median inventory and margin), not an
 * average of the groups.
 */
export const STAGES: { id: StageId; name: string; detail: string; cohorts: Cohort[] }[] = [
  {
    id: "customers",
    name: "Customers",
    detail: "Hyperscalers, devices, automotive, industrial",
    cohorts: ["hyperscaler", "systems", "auto", "industrial"],
  },
  { id: "ems", name: "Contract manufacturers", detail: "Board and system assembly", cohorts: ["ems"] },
  { id: "distributors", name: "Distributors", detail: "Electronic components distribution", cohorts: ["distributor"] },
  {
    id: "manufacturers",
    name: "Manufacturers",
    detail: "Chips, memory, interconnect and passives",
    cohorts: ["manufacturer", "platform", "connectivity", "memory", "components"],
  },
  { id: "equipment", name: "Equipment & design", detail: "Fab equipment, packaging, design software", cohorts: ["equipment", "software"] },
];

/**
 * The companies whose sales WSTS counts: chip makers selling semiconductors.
 * Distributors resell the same chips, contract manufacturers and passives are
 * not semiconductors, and equipment and design software sit upstream, so none
 * of them belong in a comparison with the WSTS market. Hard-drive makers and
 * optical-module makers are left out too: their products hold chips but are not
 * chips themselves.
 */
const CHIP_COHORTS: Cohort[] = ["manufacturer", "platform", "connectivity", "memory"];
const NOT_CHIP_SALES = new Set(["western-digital", "seagate", "coherent", "lumentum"]);
export const CHIP_MAKERS = COMPANIES.filter((c) => CHIP_COHORTS.includes(c.cohort) && !NOT_CHIP_SALES.has(c.slug));

export interface StageSeries {
  id: StageId;
  name: string;
  detail: string;
  companies: number;
  points: GroupPoint[];
}

/** One company's own figures, on the same calendar quarters. */
export interface CompanySeries {
  slug: string;
  name: string;
  points: GroupPoint[];
}

export interface Cycle {
  labels: string[];
  /** Latest calendar quarter that most supply-chain companies have reported. */
  latest: string;
  groups: GroupSeries[];
  /** All supply-chain groups combined (customer groups excluded). */
  supply: GroupPoint[];
  /** Chip makers only (CHIP_MAKERS), the like-for-like comparison with the WSTS market. */
  chipMakers: GroupPoint[];
  /** The phase each quarter was in, by the same rule as `phase`. */
  phases: (Phase | null)[];
  stages: StageSeries[];
  /** Avnet and Arrow, for the distributor stage. */
  avnet: CompanySeries;
  arrow: CompanySeries;
  hyperscalerCapex: { label: string; total?: number; yoy?: number; reporting: number }[];
  hyperscalers: CapexRow[];
  phase: Phase | null;
  failed: string[];
}

const order = (label: string) => {
  const m = label.match(/^CY(\d+) Q(\d)$/);
  return m ? Number(m[1]) * 4 + Number(m[2]) : -1;
};
const shift = (label: string, quarters: number) => {
  const n = order(label) + quarters - 1;
  return `CY${Math.floor(n / 4)} Q${(n % 4) + 1}`;
};

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type ByLabel = Map<string, Quarter>;

function point(label: string, members: ByLabel[]): GroupPoint {
  const now = members.map((m) => m.get(label));
  const reported = now.filter((q): q is Quarter => q?.values.revenue !== undefined);
  const p: GroupPoint = { label, reporting: reported.length };
  if (!members.length || reported.length / members.length < MIN_COVERAGE) return p;

  // Growth uses only companies present in both quarters, so the base matches.
  let cur = 0;
  let prev = 0;
  let pairs = 0;
  let growing = 0;
  const rates: number[] = [];
  for (const m of members) {
    const a = m.get(label)?.values.revenue;
    const b = m.get(shift(label, -4))?.values.revenue;
    if (a === undefined || b === undefined) continue;
    cur += a;
    prev += b;
    pairs += 1;
    if (a > b) growing += 1;
    if (b > 0) rates.push(a / b - 1);
  }
  if (pairs / members.length >= MIN_COVERAGE && prev > 0) {
    p.growth = cur / prev - 1;
    p.growing = growing / pairs;
    p.medianGrowth = median(rates);
  }
  const med = (pick: (q: Quarter) => number | undefined) => median(reported.map(pick).filter((v): v is number => v !== undefined));
  p.inventoryDays = med((q) => q.values.inventoryDays);
  p.grossMargin = med((q) => q.values.grossMargin);
  p.operatingMargin = med((q) => q.values.operatingMargin);
  return p;
}

/** Expansion or contraction is the sign of growth; accelerating or slowing is whether it rose or fell from the quarter before. */
export function phaseOf(points: GroupPoint[]): Phase | null {
  const withGrowth = points.filter((p) => p.growth !== undefined);
  const last = withGrowth[withGrowth.length - 1];
  const before = withGrowth[withGrowth.length - 2];
  if (!last || !before) return null;
  const rising = last.growth! >= before.growth!;
  if (last.growth! >= 0) return rising ? "Expansion, accelerating" : "Expansion, slowing";
  return rising ? "Contraction, easing" : "Contraction, deepening";
}

export async function getCycle(): Promise<Cycle> {
  const all = await getAllEarnings();
  const byLabel = new Map<string, ByLabel>(all.map((e: CompanyEarnings) => [e.company.slug, new Map(e.quarters.map((q) => [q.calendarLabel, q]))]));
  const membersOf = (filter: (c: Cohort) => boolean) =>
    COMPANIES.filter((c) => filter(c.cohort)).map((c) => byLabel.get(c.slug) ?? new Map());

  const supplyMembers = membersOf((c) => !isDemand(c));
  const allLabels = Array.from(new Set(all.flatMap((e) => e.quarters.map((q) => q.calendarLabel)))).sort((a, b) => order(a) - order(b));
  // Anchor on the newest quarter the supply chain has mostly reported.
  const latest =
    [...allLabels].reverse().find((l) => supplyMembers.filter((m) => m.get(l)?.values.revenue !== undefined).length / supplyMembers.length >= MIN_COVERAGE) ??
    allLabels[allLabels.length - 1] ??
    "";
  const labels = Array.from({ length: QUARTERS_SHOWN }, (_, i) => shift(latest, i - (QUARTERS_SHOWN - 1)));

  const groups: GroupSeries[] = COHORTS.map((cohort) => {
    const members = membersOf((c) => c === cohort);
    return { cohort, companies: members.length, points: labels.map((l) => point(l, members)) };
  });
  const supply = labels.map((l) => point(l, supplyMembers));
  const chipMembers = CHIP_MAKERS.map((c) => byLabel.get(c.slug) ?? new Map());
  const chipMakers = labels.map((l) => point(l, chipMembers));
  const stages: StageSeries[] = STAGES.map((stage) => {
    const members = membersOf((c) => stage.cohorts.includes(c));
    return { id: stage.id, name: stage.name, detail: stage.detail, companies: members.length, points: labels.map((l) => point(l, members)) };
  });
  const company = (slug: string): CompanySeries => {
    const c = COMPANIES.find((x) => x.slug === slug)!;
    const m = [byLabel.get(slug) ?? new Map()];
    return { slug, name: c.name, points: labels.map((l) => point(l, m)) };
  };

  const hyper = COMPANIES.filter((c) => c.cohort === "hyperscaler");
  const hyperscalerCapex = labels.map((label) => {
    let total = 0;
    let prev = 0;
    let reporting = 0;
    let pairs = 0;
    for (const c of hyper) {
      const a = byLabel.get(c.slug)?.get(label)?.values.capex;
      const b = byLabel.get(c.slug)?.get(shift(label, -4))?.values.capex;
      if (a === undefined) continue;
      reporting += 1;
      total += a;
      if (b !== undefined) {
        prev += b;
        pairs += 1;
      }
    }
    // A combined total only means something when every hyperscaler is in it.
    const complete = reporting === hyper.length;
    return { label, total: complete ? total : undefined, yoy: complete && pairs === hyper.length && prev > 0 ? total / prev - 1 : undefined, reporting };
  });
  const hyperscalers: CapexRow[] = hyper.map((c) => {
    const m = byLabel.get(c.slug);
    const label = [...labels].reverse().find((l) => m?.get(l)?.values.capex !== undefined);
    const capex = label ? m!.get(label)!.values.capex : undefined;
    const prev = label ? m!.get(shift(label, -4))?.values.capex : undefined;
    return { slug: c.slug, name: c.name, capex, label, yoy: capex !== undefined && prev ? capex / prev - 1 : undefined };
  });

  return {
    labels,
    latest,
    groups,
    supply,
    chipMakers,
    phases: supply.map((_, i) => (supply[i].growth === undefined ? null : phaseOf(supply.slice(0, i + 1)))),
    stages,
    avnet: company("avnet"),
    arrow: company("arrow"),
    hyperscalerCapex,
    hyperscalers,
    phase: phaseOf(supply),
    failed: all.filter((e) => !e.quarters.length).map((e) => e.company.name),
  };
}
