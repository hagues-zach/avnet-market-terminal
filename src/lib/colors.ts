// Avnet brand colors for data-viz, in code so the rules are enforceable.
// The palette and its validation are documented in DESIGN.md ("Data visualization").
export const AVNET = {
  green: "#41C363", // SIGNATURE — in any chart this ALWAYS represents Avnet
  greenDark: "#138036",
  blueLight: "#7DCEF1",
  blueDark: "#4273B8",
  yellow: "#FDB813",
  orange: "#E88320",
  grayMedium: "#919191",
  grayDark: "#5F6369",
  grayLight: "#D2D2D2",
  danger: "#D7263D",
  ink: "#000000",
} as const;

/**
 * Chart steps. Light Blue and Yellow are darkened at the same hue so they clear the
 * validator's lightness band (the brand hexes sit at OKLCH L 0.81–0.83, too light to
 * read as series on white). Everything else is a brand hex.
 */
export const VIZ = {
  avnet: AVNET.green,
  avnet2: AVNET.greenDark, // Avnet's second series only (prior year, plan, forecast)
  arrow: AVNET.blueDark, // Arrow Electronics, on every page
  orange: AVNET.orange,
  blueLight: "#53B8E1", // brand Light Blue #7DCEF1 at OKLCH L 0.74
  yellow: "#E7A300", // brand Yellow #FDB813 at OKLCH L 0.76
  other: AVNET.grayLight, // "All other" fills, remainders
  benchmark: AVNET.grayMedium, // "All other" or benchmark as a line
} as const;

/**
 * Non-Avnet series order, validated for adjacent pairs (bars, stacks, lines):
 * worst colour-blind ΔE 22.4, worst normal-vision ΔE 26.0. Slot 0 is Dark Blue, which
 * is also Arrow's colour, so a chart with Avnet + Arrow + others reads in order.
 * Never cycle: series past the end fold into "All other".
 */
const SERIES_ORDER = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.yellow] as const;

/**
 * Scatter, bubble and small multiples compare every pair, not just neighbours. Only
 * these three pass that test together (worst ΔE 17.1); more series need facets.
 */
export const ALL_PAIRS_ORDER = [VIZ.avnet, VIZ.arrow, VIZ.blueLight] as const;

/**
 * Pick a chart series color. If `isAvnet`, you ALWAYS get Avnet Green.
 * Otherwise you walk the non-green order — green is never handed out here — and
 * anything past the fourth series gets the "All other" grey.
 */
export function chartSeriesColor(index: number, isAvnet = false): string {
  if (isAvnet) return VIZ.avnet;
  return SERIES_ORDER[index] ?? VIZ.other;
}

/** The colour for a named company: Avnet and Arrow are fixed, others by order. */
export function entityColor(name: string, index: number): string {
  const key = name.trim().toLowerCase();
  if (key === "avnet") return VIZ.avnet;
  if (key === "arrow" || key === "arrow electronics") return VIZ.arrow;
  // Arrow owns slot 0, so other companies start at slot 1.
  return SERIES_ORDER[index + 1] ?? VIZ.other;
}

// Ordered severity, low to high. It starts at grey, never at Avnet Green, and is
// reserved for severity: always shown with a label, never as categorical series.
export const RISK_COLOR = {
  low: AVNET.grayLight,
  moderate: AVNET.yellow,
  elevated: AVNET.orange,
  high: AVNET.danger,
} as const;

/** Shared chart chrome so charts stop hard-coding hex values. */
export const CHART = {
  grid: "#EEF0F2", // hairline-soft, horizontal only, solid
  axis: "#E3E5E8", // hairline
  tick: "#6B7075", // ink-muted
  tickFontSize: 11,
  tooltip: {
    fontSize: 12,
    borderRadius: 2,
    border: "1px solid #E3E5E8",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  },
  lineWidth: 2,
  lineWidthLight: 2.5, // Light Blue, Yellow and grey lines
  activeDot: { r: 4, stroke: "#FFFFFF", strokeWidth: 2 },
} as const;
