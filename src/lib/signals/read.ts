// The Economic Signals read: four rules over live series, each on a year ago.
// Demand (US production), costs (producer prices and metals), financing (the
// 10-year yield) and the dollar (four currencies per dollar). Pure, so the page
// and its tests read the same rule. Supply (utilisation, chip prices, chain
// inventory) is read on Supply Chain, not here.

/** One-year change by signal key: a share for indexes and prices, points for rates. */
export type Changes = Record<string, number | undefined>;

export const DEMAND_KEYS = ["ip-semis", "ip-electronics", "ip-total"] as const;
export const COST_KEYS = ["PCU334413334413", "PCU334417334417", "PCU334412334412", "imf-PCOPP", "imf-PTIN", "imf-PNICK", "imf-PALUM"] as const;
export const FINANCING_KEYS = ["ust-10y", "fed-funds"] as const;
export const DOLLAR_KEYS = ["fx-EUR", "fx-JPY", "fx-CNY", "fx-KRW"] as const;

/** Short names for the sentence and the tiles. */
export const SHORT: Record<string, string> = {
  "ip-semis": "Semiconductor production",
  "ip-electronics": "Electronics production",
  "ip-total": "All industry",
  PCU334413334413: "chip prices",
  PCU334417334417: "connector prices",
  PCU334412334412: "circuit board prices",
  "imf-PCOPP": "copper",
  "imf-PTIN": "tin",
  "imf-PNICK": "nickel",
  "imf-PALUM": "aluminium",
  "ust-10y": "10-year Treasury",
  "fed-funds": "Federal funds rate",
  "fx-EUR": "Euro",
  "fx-JPY": "Yen",
  "fx-CNY": "Yuan",
  "fx-KRW": "Won",
};

/** Thresholds on a year ago: production and prices as a share, the yield in points, the dollar as a share. */
export const THRESHOLDS = { demand: 0.02, costs: 0.02, financing: 0.25, dollar: 0.02 };

export type Demand = "Growing" | "Shrinking" | "Mixed";
export type Costs = "Rising" | "Falling" | "Mixed";
export type Financing = "Tighter" | "Easier" | "Steady";
export type Dollar = "Stronger" | "Weaker" | "Steady";
/** Which way the verdict points, for its arrow. */
export type Way = "up" | "down" | "flat";

export interface Reads {
  demand: { verdict: Demand; way: Way } | null;
  costs: { verdict: Costs; way: Way; leader?: { key: string; change: number } } | null;
  financing: { verdict: Financing; way: Way; change: number } | null;
  dollar: { verdict: Dollar; way: Way; change: number } | null;
}

const present = (c: Changes, keys: readonly string[]) => keys.map((k) => c[k]).filter((v): v is number => v !== undefined);
const sides = (vs: number[], t: number) => ({ up: vs.filter((v) => v > t).length, down: vs.filter((v) => v < -t).length });

export function demandOf(c: Changes): Reads["demand"] {
  const vs = present(c, DEMAND_KEYS);
  if (!vs.length) return null;
  const { up, down } = sides(vs, THRESHOLDS.demand);
  if (up >= 2 && down === 0) return { verdict: "Growing", way: "up" };
  if (down >= 2 && up === 0) return { verdict: "Shrinking", way: "down" };
  return { verdict: "Mixed", way: "flat" };
}

export function costsOf(c: Changes): Reads["costs"] {
  const keyed = COST_KEYS.filter((k) => c[k] !== undefined).map((k) => ({ key: k, change: c[k]! }));
  if (!keyed.length) return null;
  const { up, down } = sides(
    keyed.map((x) => x.change),
    THRESHOLDS.costs,
  );
  const half = keyed.length / 2;
  const verdict: Costs = up > half ? "Rising" : down > half ? "Falling" : "Mixed";
  const way: Way = verdict === "Rising" ? "up" : verdict === "Falling" ? "down" : "flat";
  // The largest mover in the verdict's direction (or overall when mixed).
  const pool = verdict === "Rising" ? keyed.filter((x) => x.change > 0) : verdict === "Falling" ? keyed.filter((x) => x.change < 0) : keyed;
  const leader = [...pool].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  return { verdict, way, leader };
}

export function financingOf(c: Changes): Reads["financing"] {
  const v = c["ust-10y"];
  if (v === undefined) return null;
  if (v > THRESHOLDS.financing) return { verdict: "Tighter", way: "up", change: v };
  if (v < -THRESHOLDS.financing) return { verdict: "Easier", way: "down", change: v };
  return { verdict: "Steady", way: "flat", change: v };
}

/** The mean change in currency units per dollar: positive is a stronger dollar. */
export function dollarOf(c: Changes): Reads["dollar"] {
  const vs = present(c, DOLLAR_KEYS);
  if (vs.length < 2) return null;
  const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
  if (mean > THRESHOLDS.dollar) return { verdict: "Stronger", way: "up", change: mean };
  if (mean < -THRESHOLDS.dollar) return { verdict: "Weaker", way: "down", change: mean };
  return { verdict: "Steady", way: "flat", change: mean };
}

export const readsOf = (c: Changes): Reads => ({ demand: demandOf(c), costs: costsOf(c), financing: financingOf(c), dollar: dollarOf(c) });

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${pct(v)}`;

/**
 * One sentence from the reads:
 * "US chip production is growing, up 20% on a year ago, while input costs are rising, led by tin (+56%), and borrowing is dearer, with the 10-year yield up 1.1 points."
 */
export function sentence(c: Changes, r: Reads = readsOf(c)): string {
  const parts: string[] = [];
  const semis = c["ip-semis"];
  if (r.demand && semis !== undefined) {
    const dir = semis >= 0 ? "up" : "down";
    parts.push(
      r.demand.verdict === "Mixed"
        ? `US production is mixed, with chip output ${dir} ${pct(semis)} on a year ago`
        : `US chip production is ${r.demand.verdict.toLowerCase()}, ${dir} ${pct(semis)} on a year ago`,
    );
  }
  if (r.costs) {
    const led = r.costs.leader && r.costs.verdict !== "Mixed" ? `, led by ${SHORT[r.costs.leader.key]} (${signed(r.costs.leader.change)})` : "";
    parts.push(`input costs are ${r.costs.verdict.toLowerCase()}${led}`);
  }
  if (r.financing) {
    const pts = Math.abs(r.financing.change).toFixed(1);
    parts.push(
      r.financing.verdict === "Tighter"
        ? `borrowing is dearer, with the 10-year yield up ${pts} points`
        : r.financing.verdict === "Easier"
          ? `borrowing is cheaper, with the 10-year yield down ${pts} points`
          : "borrowing costs are steady",
    );
  }
  if (r.dollar && r.dollar.verdict !== "Steady") parts.push(`the dollar is ${r.dollar.verdict.toLowerCase()}`);
  if (!parts.length) return "";
  const [first, ...rest] = parts;
  const tail = rest.length === 0 ? "" : rest.length === 1 ? `, while ${rest[0]}` : `, while ${rest.slice(0, -1).join(", ")}, and ${rest.at(-1)}`;
  const s = `${first}${tail}.`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
