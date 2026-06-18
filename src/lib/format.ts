// Market values are stored in USD millions.
export function formatUsdMillions(usdM: number, opts: { precise?: boolean } = {}): string {
  if (Math.abs(usdM) >= 1000) return `$${(usdM / 1000).toFixed(opts.precise ? 2 : 1)}B`;
  return `$${Math.round(usdM)}M`;
}

export function formatPctSigned(v: number, digits = 1): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
}
