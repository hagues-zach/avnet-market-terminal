// Market Overview: the split between the devices AI spending lands on and the
// rest of the market, this quarter's growth by company group, how the forecast
// has moved, and the lead. Pure, tested with frozen figures; a missing live
// figure reads "n/a" and the sentence says what is missing.

export interface Part {
  /** 2025 sales, $M. */
  usdM: number;
  /** The same a year earlier, $M. */
  prior: number;
  growth: number;
  /** Share of the market. */
  share: number;
}

const part = (usdM: number, prior: number, market: number): Part => ({ usdM, prior, growth: usdM / prior - 1, share: usdM / market });

/** The AI devices against everything else. A device's prior-year sales are its sales ÷ (1 + growth); the rest is the market less the devices. */
export function split(devices: { usdM: number; yoy: number }[], market: number, marketPrior: number): { ai: Part; rest: Part } {
  const usdM = devices.reduce((s, d) => s + d.usdM, 0);
  const prior = devices.reduce((s, d) => s + d.usdM / (1 + d.yoy), 0);
  return { ai: part(usdM, prior, market), rest: part(market - usdM, marketPrior - prior, market) };
}

export type Pace = "faster" | "slower" | "steady";
export const PACE_WORDS: Record<Pace, string> = { faster: "Faster", slower: "Slower", steady: "Steady" };
/** Within two points of the quarter before is steady. */
export const PACE_BAND = 0.02;

/** Whether growth sped up or slowed on the quarter before; null without both figures. */
export function pace(now?: number, before?: number): Pace | null {
  if (now === undefined || before === undefined) return null;
  const d = now - before;
  return Math.abs(d) < PACE_BAND ? "steady" : d > 0 ? "faster" : "slower";
}

/** "+65.6%", "−4.0%", "n/a". */
export function pct(v?: number, digits = 1): string {
  if (v === undefined || !Number.isFinite(v)) return "n/a";
  return `${v < 0 ? "−" : "+"}${Math.abs(v * 100).toFixed(digits)}%`;
}

/** "$772B" (whole billions) or "$772.2B". Input $M. */
export function bn(usdM: number, digits = 0): string {
  return `$${(usdM / 1000).toFixed(digits)}B`;
}

/** "Memory & storage" to "memory and storage", for a sentence. */
export const inWords = (label: string) => label.replace(/ & /g, " and ").replace(/^[A-Z][a-z]/, (m) => m.toLowerCase());

/** How the forecast for one year moved from the first vintage to the latest. */
export function forecastDrift(vintages: { vintage: string; value: number }[], year: number): string {
  if (vintages.length < 2) return `One WSTS forecast for ${year} so far.`;
  const first = vintages[0];
  const last = vintages[vintages.length - 1];
  const change = last.value / first.value - 1;
  const way = change >= 0 ? "raised" : "cut";
  return `WSTS has ${way} its ${year} forecast by ${Math.round(Math.abs(change) * 100)}% since ${first.vintage}.`;
}

/** The answer in words. Devices are named as listed. */
export function lead(i: {
  year: number;
  market: number;
  growth: number;
  forecast: number;
  devices: string[];
  rest: Part;
  quarter?: string;
  supplyGrowth?: number;
  leader?: string;
}): string {
  const size = `The chip market reached ${bn(i.market)} in ${i.year}, up ${(i.growth * 100).toFixed(1)}%, and WSTS expects ${bn(i.forecast)} in ${i.year + 1}.`;
  const names = i.devices.length > 1 ? `${i.devices.slice(0, -1).join(", ")} and ${i.devices[i.devices.length - 1]}` : (i.devices[0] ?? "n/a");
  const carried = `${names} carried it: the rest of the market grew ${Math.round(i.rest.growth * 100)}%.`;
  const now =
    i.supplyGrowth === undefined || !i.quarter
      ? "The latest quarter's filings couldn't be read, so the supply chain's growth is n/a."
      : `In ${i.quarter} the supply chain's revenue grew ${(i.supplyGrowth * 100).toFixed(1)}%${i.leader ? `, led by ${inWords(i.leader)}` : ""}.`;
  return `${size} ${carried} ${now}`;
}
