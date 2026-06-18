import type { ForecastPoint, ForecastSummary, Scenario, Sourced } from "../types";

// Actuals (WSTS/SIA history) + WSTS Autumn-2025 forecast base, extended to 2028
// (2027–2028 are illustrative extrapolations, clearly modeled). Confidence band
// and bull/bear scenarios widen with the horizon.
const ACTUAL: Record<number, number> = {
  2020: 440_400, 2021: 555_900, 2022: 574_100, 2023: 526_900, 2024: 630_500, 2025: 772_200,
};
const BASE: Record<number, number> = {
  2025: 772_200, 2026: 975_500, 2027: 1_080_000, 2028: 1_180_000,
};
// half-width of the confidence band / scenario spread per forecast year
const SPREAD: Record<number, number> = { 2025: 0, 2026: 0.05, 2027: 0.09, 2028: 0.13 };

export function getForecast(): Sourced<ForecastSummary> {
  const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028];
  const points: ForecastPoint[] = years.map((year) => {
    const p: ForecastPoint = { year };
    if (ACTUAL[year] != null) p.actual = ACTUAL[year];
    if (BASE[year] != null) {
      const s = SPREAD[year] ?? 0;
      p.base = BASE[year];
      p.bull = Math.round(BASE[year] * (1 + s));
      p.bear = Math.round(BASE[year] * (1 - s));
      p.low = Math.round(BASE[year] * (1 - s));
      p.high = Math.round(BASE[year] * (1 + s));
    }
    return p;
  });

  const cagr = (from: number, to: number, yrs: number) => (to / from) ** (1 / yrs) - 1;
  const scenarios: Record<Scenario, { label: string; value2028: number; cagr: number }> = {
    bull: { label: "Bull", value2028: Math.round(BASE[2028] * 1.13), cagr: cagr(772_200, BASE[2028] * 1.13, 3) },
    base: { label: "Base", value2028: BASE[2028], cagr: cagr(772_200, BASE[2028], 3) },
    bear: { label: "Bear", value2028: Math.round(BASE[2028] * 0.87), cagr: cagr(772_200, BASE[2028] * 0.87, 3) },
  };

  // How the WSTS forecast for 2026 was revised across vintages (kept rising).
  const vintages = [
    { vintage: "Spring 2024", proj2026: 687_000, isCurrent: false },
    { vintage: "Autumn 2024", proj2026: 760_000, isCurrent: false },
    { vintage: "Spring 2025", proj2026: 760_700, isCurrent: false },
    { vintage: "Autumn 2025", proj2026: 975_500, isCurrent: true },
  ];

  return {
    value: { points, scenarios, vintages, cagrBase: scenarios.base.cagr, base2026: BASE[2026] },
    source: "wsts",
    vintage: "WSTS Autumn 2025",
  };
}
