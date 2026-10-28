import type { Fact } from "../earnings";

// STMicroelectronics files a 20-F, so the SEC's company facts hold its US GAAP
// figures for full years only. Its quarters are in the interim 6-K it furnishes
// after each of the first three quarters: unaudited statements in plain HTML, not
// tagged. This reads those statements into the same us-gaap concepts the 10-Q
// filers carry, so the quarters go through the one earnings build. Pure over the
// document's text; fetching lives in earnings.ts.

export interface ConceptFact extends Fact {
  concept: string;
}

export interface FilingMeta {
  filed: string;
  accn: string;
  url: string;
}

type Statement = "income" | "balance" | "cash";

const HEADINGS: [RegExp, Statement | null][] = [
  [/CONSOLIDATED STATEMENTS? OF INCOME/, "income"],
  [/CONSOLIDATED BALANCE SHEETS?/, "balance"],
  [/CONSOLIDATED STATEMENTS? OF CASH FLOWS?/, "cash"],
  // Any other statement ends the one before it.
  [/CONSOLIDATED STATEMENTS? OF (COMPREHENSIVE INCOME|EQUITY|CHANGES)/, null],
  [/Notes to Interim Consolidated Financial Statements/i, null],
];

// Labels are matched from the start of the row, per statement, because the cash
// flow statement repeats balance sheet names ("Inventories") as changes. `cost`
// rows print as negatives and are stored as positive amounts, as us-gaap tags them.
const LABELS: Record<Statement, { label: RegExp; concept: string; cost?: boolean; perShare?: boolean }[]> = {
  income: [
    { label: /^net revenues$/, concept: "Revenues" },
    { label: /^cost of sales$/, concept: "CostOfRevenue", cost: true },
    { label: /^gross profit$/, concept: "GrossProfit" },
    { label: /^selling, general and administrative expenses$/, concept: "SellingGeneralAndAdministrativeExpense", cost: true },
    { label: /^research and development expenses$/, concept: "ResearchAndDevelopmentExpense", cost: true },
    { label: /^operating income( \(loss\))?$/, concept: "OperatingIncomeLoss" },
    { label: /^net income( \(loss\))? attributable to parent company stockholders$/, concept: "NetIncomeLoss" },
    { label: /^earnings per share \(diluted\)/, concept: "EarningsPerShareDiluted", perShare: true },
  ],
  balance: [
    { label: /^cash and cash equivalents$/, concept: "CashAndCashEquivalentsAtCarryingValue" },
    { label: /^trade accounts receivable, net$/, concept: "AccountsReceivableNetCurrent" },
    { label: /^inventories$/, concept: "InventoryNet" },
    { label: /^trade accounts payable$/, concept: "AccountsPayableCurrent" },
    { label: /^long-term debt$/, concept: "LongTermDebtNoncurrent" },
  ],
  cash: [
    { label: /^net cash from operating activities$/, concept: "NetCashProvidedByUsedInOperatingActivities" },
    { label: /^payment for purchase of tangible assets$/, concept: "PaymentsToAcquirePropertyPlantAndEquipment", cost: true },
    { label: /^repurchase of common stock$/, concept: "PaymentsForRepurchaseOfCommonStock", cost: true },
    { label: /^dividends paid to stockholders$/, concept: "PaymentsOfDividends", cost: true },
  ],
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DATE = new RegExp(`\\b(${MONTHS.join("|")}) (\\d{1,2}), (\\d{4})\\b`, "gi");
const SPAN = /\b(three|six|nine|twelve) months ended\b/i;
const SPAN_MONTHS: Record<string, number> = { three: 3, six: 6, nine: 9, twelve: 12 };
const DAY = 86_400_000;

function decode(s: string): string {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#x2019;|&rsquo;|&#39;|&apos;/gi, "'")
    .replace(/&#8212;|&#x2014;|&mdash;/gi, "—")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)));
}

/**
 * The document as lines of cells, one line per table row. Line breaks inside a
 * cell ("June 27,<br>2026") stay in the cell; text between tables, such as a
 * statement's heading, joins the start of the next row.
 */
export function toRows(html: string): string[][] {
  const flat = decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/\s+/g, " ")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<t[dh]\b[^>]*>/gi, "\u0001")
      .replace(/<(br|\/p|\/div)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
  return flat
    .split("\n")
    .map((line) =>
      line
        .split("\u0001")
        .map((c) => c.replace(/\s+/g, " ").trim())
        .filter((c) => c && c !== "$" && c !== ")" && c !== "%"),
    )
    .filter((cells) => cells.length);
}

/** A printed amount: "3,481", "(2,272)", "0.24", "—" (nothing). Undefined for text. */
export function amount(cell: string): number | undefined {
  const c = cell.replace(/\s/g, "");
  if (/^[—–-]$/.test(c)) return 0;
  const m = /^(\()?(-)?([\d,]+(\.\d+)?)\)?$/.exec(c);
  if (!m) return undefined;
  const v = Number(m[3].replace(/,/g, ""));
  return m[1] || m[2] ? -v : v;
}

const iso = (month: string, day: string, year: string) =>
  `${year}-${String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;

/**
 * Where a period starts. ST's fiscal year is the calendar year, so a year-to-date
 * column starts on 1 January, and the earnings build backs single quarters out of
 * those; a three-month column after the first quarter starts 90 days before it ends.
 */
function startOf(end: string, months: number): string {
  const year = end.slice(0, 4);
  const firstQuarter = Number(end.slice(5, 7)) <= 4;
  if (months === 3 && !firstQuarter) return new Date(Date.parse(`${end}T00:00:00Z`) - 90 * DAY).toISOString().slice(0, 10);
  return `${year}-01-01`;
}

/** Every mapped figure in one interim 6-K, as us-gaap facts. */
export function parseInterim(html: string, meta: FilingMeta): ConceptFact[] {
  const out: ConceptFact[] = [];
  let statement: Statement | null = null;
  let months: number | null = null;
  let ends: string[] = [];
  for (const cells of toRows(html)) {
    const text = cells.join(" ");
    const heading = HEADINGS.find(([re]) => re.test(text));
    if (heading) {
      statement = heading[1];
      months = null;
      ends = [];
    }
    if (!statement) continue;
    const span = SPAN.exec(text);
    if (span) months = SPAN_MONTHS[span[1].toLowerCase()];
    const dates = Array.from(text.matchAll(DATE)).map((d) => iso(d[1], d[2], d[3]));
    if (dates.length && cells.every((c) => amount(c) === undefined)) {
      ends = dates;
      continue;
    }
    if (!ends.length) continue;
    const label = cells[0].toLowerCase().replace(/\s+/g, " ");
    const rule = LABELS[statement].find((r) => r.label.test(label));
    if (!rule) continue;
    const values = cells.slice(1).map(amount).filter((v): v is number => v !== undefined);
    if (values.length !== ends.length) continue;
    values.forEach((v, i) => {
      const val = (rule.cost ? Math.abs(v) : v) * (rule.perShare ? 1 : 1e6);
      const end = ends[i];
      const base = { concept: rule.concept, end, val, form: "6-K", filed: meta.filed, accn: meta.accn, url: meta.url };
      if (statement === "balance") out.push(base);
      else if (months) out.push({ ...base, start: startOf(end, months) });
    });
  }
  return out;
}
