// The semiconductor cycle engine's candidate series (docs/semis-cycle-engine-plan.md).
// Every one is public and free: FRED's keyless CSV downloads, and quarterly SEC
// revenue by Market Cycle group. The tier here is only the starting guess; the
// finder places each series by its measured lead against the dated chip cycle.
//
// The reference cycle, until WSTS global chip sales are in hand, is US shipments
// of computers and electronic products: revenue-like, and the series that should
// move with chip revenue line up with it (decided 2026-10-26; US semiconductor
// production lined up less well). When WSTS arrives, src/lib/cycle/reference.ts
// dates the cycle on it instead.

export type Tier = "leading" | "cyclical" | "aggregate" | "lagging";

/**
 * How a series is read for the cycle. yoy: growth on a year ago (output, orders,
 * prices). level: the value itself (spreads, diffusion indexes, ratios).
 */
export type Measure = "yoy" | "level";

export interface CatalogSeries {
  key: string;
  label: string;
  source: string;
  /** FRED series id; a ratio or deflated series names both parts. */
  fred?: string;
  /** Numerator over denominator, both FRED ids: real money (M2 over CPI), the finished goods share. */
  ratio?: [string, string];
  /** From the history script's SEC roll-up instead of FRED. */
  sec?: "chips" | "exai" | "ai";
  frequency: "monthly" | "daily" | "quarterly";
  measure: Measure;
  /** Whether a rise is good news for the chip market. */
  upIsGood: boolean;
  /** The starting guess, before the finder measures it. */
  guess: Tier;
  /** In the cyclical all-in or ex-AI index, when the finder places it there. */
  cyclical?: "all" | "exai" | "both";
  /** False when history is too short to test against past cycles; shown, never tested. */
  backtest: boolean;
  /** The reference cycle itself: dated, not tested against itself. */
  reference?: true;
}

const FRED = "FRED";

export const SERIES: CatalogSeries[] = [
  // Leading: money, credit and new commitments.
  { key: "real-m2", label: "Real money supply (M2 over CPI)", source: `${FRED}, Federal Reserve and BLS`, ratio: ["M2SL", "CPIAUCSL"], frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "curve-10y3m", label: "Yield curve, 10-year minus 3-month", source: `${FRED}, Federal Reserve`, fred: "T10Y3M", frequency: "daily", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "curve-10y2y", label: "Yield curve, 10-year minus 2-year", source: `${FRED}, Federal Reserve`, fred: "T10Y2Y", frequency: "daily", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "orders-electronics", label: "New orders, computers and electronic products", source: `${FRED}, Census M3`, fred: "A34SNO", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "orders-capital", label: "New orders, core capital goods", source: `${FRED}, Census M3`, fred: "NEWORDER", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "orders-durable", label: "New orders, durable goods", source: `${FRED}, Census M3`, fred: "DGORDER", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "philly-orders", label: "Philadelphia Fed new orders", source: `${FRED}, Federal Reserve Bank of Philadelphia`, fred: "NOFDFSA066MSFRBPHI", frequency: "monthly", measure: "level", upIsGood: true, guess: "leading", cyclical: "exai", backtest: true },
  { key: "construction-mfg", label: "Manufacturing construction spending", source: `${FRED}, Census`, fred: "TLMFGCONS", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  // Asia and the OECD's own leading indicators: where chip demand turns first.
  { key: "cli-korea", label: "Korea leading indicator (OECD)", source: `${FRED}, OECD`, fred: "KORLOLITOAASTSAM", frequency: "monthly", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "cli-china", label: "China leading indicator (OECD)", source: `${FRED}, OECD`, fred: "CHNLOLITOAASTSAM", frequency: "monthly", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "cli-japan", label: "Japan leading indicator (OECD)", source: `${FRED}, OECD`, fred: "JPNLOLITOAASTSAM", frequency: "monthly", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "cli-us", label: "US leading indicator (OECD)", source: `${FRED}, OECD`, fred: "USALOLITOAASTSAM", frequency: "monthly", measure: "level", upIsGood: true, guess: "leading", backtest: true },
  { key: "exports-korea", label: "Korea exports", source: `${FRED}, OECD`, fred: "XTEXVA01KRM664S", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "exports-japan", label: "Japan exports", source: `${FRED}, OECD`, fred: "XTEXVA01JPM664S", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "leading", backtest: true },
  { key: "hy-spread", label: "High-yield credit spread", source: `${FRED}, ICE BofA`, fred: "BAMLH0A0HYM2", frequency: "daily", measure: "level", upIsGood: false, guess: "leading", backtest: false },

  // Cyclical: production, shipments and jobs in the core.
  { key: "ip-semis", label: "US semiconductor production", source: `${FRED}, Federal Reserve G.17`, fred: "IPG3344S", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "cyclical", cyclical: "all", backtest: true },
  { key: "util-semis", label: "Semiconductor capacity utilisation", source: `${FRED}, Federal Reserve G.17`, fred: "CAPUTLG3344S", frequency: "monthly", measure: "level", upIsGood: true, guess: "cyclical", cyclical: "all", backtest: true },
  { key: "ship-electronics", label: "Shipments, computers and electronic products", source: `${FRED}, Census M3`, fred: "A34SVS", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "aggregate", cyclical: "all", backtest: true, reference: true },
  { key: "jobs-semis", label: "Semiconductor and component jobs", source: `${FRED}, BLS`, fred: "CES3133440001", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "cyclical", cyclical: "all", backtest: true },
  { key: "autos", label: "Motor vehicle assemblies", source: `${FRED}, Federal Reserve G.17`, fred: "MVAAUTLTTS", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "cyclical", cyclical: "exai", backtest: true },
  { key: "ip-total", label: "Total industrial production", source: `${FRED}, Federal Reserve G.17`, fred: "INDPRO", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "cyclical", cyclical: "exai", backtest: true },

  // Aggregate: chip revenue, the headline the reference cycle should agree with.
  { key: "sec-chips", label: "Chip makers' revenue, all groups", source: "SEC filings, Market Cycle groups", sec: "chips", frequency: "quarterly", measure: "yoy", upIsGood: true, guess: "aggregate", cyclical: "all", backtest: true },
  { key: "sec-exai", label: "Chip makers' revenue, excluding AI and datacenter", source: "SEC filings, Manufacturers group", sec: "exai", frequency: "quarterly", measure: "yoy", upIsGood: true, guess: "aggregate", cyclical: "exai", backtest: true },
  { key: "sec-ai", label: "Chip makers' revenue, AI and datacenter", source: "SEC filings, Large players and AI and connectivity groups", sec: "ai", frequency: "quarterly", measure: "yoy", upIsGood: true, guess: "aggregate", backtest: true },

  // Lagging: late prices, inventories and services jobs.
  { key: "ppi-semis", label: "Semiconductor producer prices", source: `${FRED}, BLS`, fred: "PCU334413334413", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "lagging", backtest: true },
  { key: "cpi-electronics", label: "Consumer electronics prices", source: `${FRED}, BLS`, fred: "CUSR0000SEEE01", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "lagging", backtest: true },
  { key: "jobs-design", label: "Computer systems design jobs", source: `${FRED}, BLS`, fred: "CES6054150001", frequency: "monthly", measure: "yoy", upIsGood: true, guess: "lagging", backtest: true },
  { key: "inv-electronics", label: "Inventories, computers and electronic products", source: `${FRED}, Census M3`, fred: "A34STI", frequency: "monthly", measure: "yoy", upIsGood: false, guess: "lagging", backtest: true },
  { key: "inv-finished-share", label: "Finished goods share of electronics inventory", source: `${FRED}, Census M3`, ratio: ["A34SFI", "A34STI"], frequency: "monthly", measure: "level", upIsGood: false, guess: "lagging", backtest: true },
];

export const REFERENCE = SERIES.find((s) => s.reference)!;
/** Every FRED id the history script downloads, ratio parts included. */
export const FRED_IDS = [...new Set(SERIES.flatMap((s) => (s.fred ? [s.fred] : s.ratio ?? [])))];
