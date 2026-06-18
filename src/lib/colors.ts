// Avnet brand colors for data-viz, in code so the rules are enforceable.
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

// Series-color order for non-Avnet data: secondary accents first, then data-viz tertiary.
const SERIES_ORDER = [
  AVNET.blueLight,
  AVNET.yellow,
  AVNET.grayMedium,
  AVNET.blueDark,
  AVNET.orange,
  AVNET.greenDark,
  AVNET.grayDark,
];

/**
 * Pick a chart series color. If `isAvnet`, you ALWAYS get Avnet Green.
 * Otherwise you walk the non-green order — green is never handed out here.
 */
export function chartSeriesColor(index: number, isAvnet = false): string {
  if (isAvnet) return AVNET.green;
  return SERIES_ORDER[index % SERIES_ORDER.length];
}

// Ordered severity uses the universal traffic-light convention (green = good/low,
// not "Avnet"). Reserved for RAG-style severity, never categorical series.
export const RISK_COLOR = {
  low: AVNET.green,
  moderate: AVNET.yellow,
  elevated: AVNET.orange,
  high: AVNET.danger,
} as const;
