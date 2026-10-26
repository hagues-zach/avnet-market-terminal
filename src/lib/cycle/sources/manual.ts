// Sources that block automated downloads (Taiwan export orders, TSMC monthly
// revenue): the user saves the monthly release to data/cycle/manual/<key>.csv as
// "month,value" rows (YYYY-MM, a number). This reads the file and says how
// current it is. Pure over the file's text.

export interface ManualRead {
  points: { month: string; value: number }[];
  /** Lines that couldn't be read, with their line number. */
  bad: { line: number; text: string }[];
  latest: string | null;
}

export function parseManualCsv(text: string): ManualRead {
  const points: { month: string; value: number }[] = [];
  const bad: { line: number; text: string }[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || /^month\s*,/i.test(line)) return;
    // The value may carry thousands separators ("45,750", as release tables print it),
    // so everything after the first comma is the value; anything else ambiguous is bad.
    const cut = line.indexOf(",");
    const m = cut < 0 ? line : line.slice(0, cut).trim();
    const v = cut < 0 ? "" : line.slice(cut + 1).trim().replace(/^"|"$/g, "").replace(/^\$/, "");
    const clean = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) ? v.replace(/,/g, "") : v;
    const value = Number(clean);
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(m) && clean !== "" && !clean.includes(",") && Number.isFinite(value)) points.push({ month: m, value });
    else bad.push({ line: i + 1, text: line });
  });
  const byMonth = new Map(points.map((p) => [p.month, p]));
  const sorted = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  return { points: sorted, bad, latest: sorted.at(-1)?.month ?? null };
}

/** Whole months between the file's latest month and this month. */
export function monthsBehind(latest: string | null, today: string): number | null {
  if (!latest) return null;
  const idx = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
  return idx(today.slice(0, 7)) - idx(latest);
}

export interface ManualSource {
  key: string;
  label: string;
  /** Where to find the release each month. */
  where: string;
  /** The figure to copy into the value column. */
  value: string;
}

export const MANUAL: ManualSource[] = [
  {
    key: "taiwan-orders-electronics",
    label: "Taiwan export orders, electronic products",
    where: "Ministry of Economic Affairs, Department of Statistics: Export Orders release (moea.gov.tw, Statistics, Export Orders), published around the 20th",
    value: "Export orders for electronic products, US$ millions",
  },
  {
    key: "tsmc-revenue",
    label: "TSMC monthly revenue",
    where: "TSMC Investor Relations: Monthly Revenue (investor.tsmc.com), published around the 10th",
    value: "Net revenue for the month, NT$ millions",
  },
];
