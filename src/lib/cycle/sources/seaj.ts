// Japan-made semiconductor equipment, from the Semiconductor Equipment Association
// of Japan (seaj.or.jp/english/statistics). The "Back Number" workbook holds
// monthly 3-month averages: bookings, billings and book-to-bill from 2005, and
// billings only from April 2017, when SEAJ stopped publishing bookings. The file
// name changes with each release, so it's found by its link. Pure: the history
// script fetches, reads the sheet into rows, and passes them here.

export const SEAJ_INDEX = "https://www.seaj.or.jp/english/statistics/index.html";
export const seajFileUrl = (href: string) => new URL(href, SEAJ_INDEX).toString();

export interface SeajMonth {
  month: string;
  /** Millions of yen, 3-month average. */
  billings: number;
  bookings?: number;
  bookToBill?: number;
}

/** The workbook links on the statistics page. */
export function seajLinks(indexHtml: string): string[] {
  return [...new Set([...indexHtml.matchAll(/href="([^"]+\.xlsx?)"/gi)].map((m) => m[1]))];
}

type Cell = string | number | null | undefined;
const text = (c: Cell) => (c === null || c === undefined ? "" : String(c).trim());
const number = (c: Cell): number | undefined => {
  if (typeof c === "number") return Number.isFinite(c) ? c : undefined;
  const t = text(c).replace(/,/g, "");
  if (!t || /%$/.test(t)) return undefined;
  const v = Number(t);
  return Number.isFinite(v) ? v : undefined;
};

/** The sheet is the semiconductor one (the other workbook is flat panel equipment). */
export function isSemiconductorSheet(rows: Cell[][]): boolean {
  return rows.slice(0, 12).some((r) => r.some((c) => /Semiconductor Manufacturing Equipment/i.test(text(c))));
}

/**
 * Rows to months. The year sits in the first column of January only, so it is
 * carried down; a month with no billings yet (the rest of this year) is skipped.
 * Columns after year and month: bookings, bookings growth, billings, billings
 * growth, book-to-bill until March 2017; billings and billings growth after.
 */
export function parseSeaj(rows: Cell[][]): SeajMonth[] {
  if (!isSemiconductorSheet(rows)) throw new Error("Not the SEAJ semiconductor equipment sheet");
  const out: SeajMonth[] = [];
  let year: number | null = null;
  for (const raw of rows) {
    const cells = raw.map(text).filter((c) => c !== "");
    if (!cells.length) continue;
    let i = 0;
    if (/^(19|20)\d\d$/.test(cells[0])) {
      year = Number(cells[0]);
      i = 1;
    }
    if (year === null || !/^\d{1,2}$/.test(cells[i] ?? "")) continue;
    const m = Number(cells[i]);
    if (m < 1 || m > 12) continue;
    // Numbers only, growth rates (with %) dropped.
    const values = cells.slice(i + 1).map((c) => number(c)).filter((v): v is number => v !== undefined);
    const month = `${year}-${String(m).padStart(2, "0")}`;
    if (values.length >= 3) out.push({ month, bookings: values[0], billings: values[1], bookToBill: values[2] });
    else if (values.length >= 1) out.push({ month, billings: values[0] });
  }
  return out.sort((a, b) => a.month.localeCompare(b.month));
}
