// The slide each card makes, for Add to deck on every card (Panel and ChartCard,
// src/components/ui). A card hands its own figures to one of these builders at
// its call site, so the slide carries native, editable data: a chart over
// quarters or years, a comparison, a table, large-number tiles or a list of
// points. Each returns a Preview, the shape the layout, the PowerPoint, the PDF
// and the tray already take, kept inside the tray's size limits. Pure.

import { AVNET, VIZ } from "@/lib/colors";
import { formatPctSigned, formatUsdMillions } from "@/lib/format";
import type { Chart, Panel, Preview, SeriesWho } from "./outline";

/** The slide a card makes: its tray id, the title the tray shows, and the slide. */
export interface CardSlide {
  id: string;
  /** The tray's name for it, when the card's own title isn't enough ("Microchip: Trend"). */
  title?: string;
  preview: Preview;
}

/** What every card slide carries besides its content. */
export interface SlideBase {
  /** Unique across the app: "<page>:<card>", plus the company or view where the card shows one of several. */
  key: string;
  /** The slide's headline: the card's title, or its takeaway when it has one. */
  title: string;
  /** The takeaway sentence under the headline. */
  text?: string;
  source: string;
  period?: string;
  /** Data hookups it reads (src/lib/hookups.ts), so mock cards say so on the slide. */
  hookups?: string[];
  /** The tray's name for the card, when the headline isn't it. */
  trayTitle?: string;
  /** Says Claude wrote the text, as the page does: "Written by Claude from each company's latest earnings release". */
  claude?: string;
}

export type SlideUnit = Chart["format"];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const cut = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const defined = <T>(o: T): T => Object.fromEntries(Object.entries(o as object).filter(([, v]) => v !== undefined)) as T;

function base(b: SlideBase): Pick<Preview, "headline" | "text" | "source" | "period" | "hookups" | "claude"> {
  return defined({
    headline: cut(b.title, 240)!,
    text: cut(b.text, 1200),
    source: cut(b.source, 300)!,
    period: cut(b.period, 60),
    hookups: b.hookups?.length ? b.hookups.slice(0, 12) : undefined,
    claude: b.claude ? { label: cut(b.claude, 120)! } : undefined,
  });
}

const linesOf = (lines?: string[]) => (lines?.filter(Boolean).length ? { lines: lines.filter(Boolean).slice(0, 12).map((l) => cut(l, 300)!) } : {});

const card = (b: SlideBase, preview: Preview): CardSlide => defined({ id: `card:${slug(b.key)}`, title: b.trayTitle, preview });

/** Dollars to three figures: $412B, $77.2B, $1.62B, $850M; trillions as $1.21T. */
export function usdShort(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(v >= 100e9 ? 0 : v >= 10e9 ? 1 : 2)}B`;
  return `$${formatUsdMillions(v / 1e6).slice(1)}`;
}

/** A value as a slide writes it, in its unit. */
export function formatFigure(unit: SlideUnit, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "n/a";
  switch (unit) {
    case "usd":
      return `${v < 0 ? "−" : ""}${usdShort(Math.abs(v))}`;
    case "pct":
      return `${v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}%`;
    case "days":
      return `${Math.round(v)} days`;
    case "eps":
      return `${v < 0 ? "−" : ""}$${Math.abs(v).toFixed(2)}`;
    case "number":
      return Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(1);
  }
}

/** A change written as growth: "+22.5%". */
export const formatGrowth = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : formatPctSigned(v));

/** Series colours that aren't Avnet's or Arrow's, in the app's chart order. */
const ORDER = [VIZ.arrow, VIZ.orange, VIZ.blueLight, VIZ.yellow, VIZ.benchmark, VIZ.other];

function colours(names: string[], given: (string | undefined)[]): { who: SeriesWho; color?: string }[] {
  const arrow = names.some((n) => /^arrow\b/i.test(n));
  let k = arrow ? 1 : 0;
  return names.map((n, i) => {
    if (/^avnet\b/i.test(n)) return { who: "avnet" };
    if (/^arrow\b/i.test(n)) return { who: "arrow" };
    return { who: "market", color: given[i] ?? ORDER[k++ % ORDER.length] };
  });
}

/* ---------- Series over time ---------- */

export interface SeriesInput {
  name: string;
  /** One per period, null where not reported. */
  values: (number | null | undefined)[];
  /** Its colour on the page (a #RRGGBB hex), so the slide matches. Avnet and Arrow keep theirs. */
  color?: string;
}

/**
 * Quarters, years or months as columns (one dollar series) or lines, with the
 * latest four periods as the figures beside it. Months are thinned to at most
 * twelve points so a slide stays readable.
 */
export function seriesSlide(
  b: SlideBase & { unit: SlideUnit; periods: string[]; series: SeriesInput[]; kind?: "column" | "line"; chartTitle?: string; lines?: string[] },
): CardSlide {
  const series = b.series.filter((s) => s.values.some((v) => v !== null && v !== undefined && Number.isFinite(v))).slice(0, 6);
  let idx = b.periods.map((_, i) => i).filter((i) => series.every((s) => Number.isFinite(s.values[i] as number)));
  if (idx.length > 12) {
    // Every nth period, always ending on the latest.
    const step = Math.ceil(idx.length / 12);
    idx = idx.filter((_, j) => (idx.length - 1 - j) % step === 0);
  }
  const looks = colours(
    series.map((s) => s.name),
    series.map((s) => s.color),
  );
  const kind = b.kind ?? (series.length === 1 && (b.unit === "usd" || b.unit === "eps") ? "column" : "line");
  const chart: Chart | undefined =
    idx.length >= 2 && series.length
      ? defined({
          kind: idx.length === 1 ? ("bar" as const) : kind,
          format: b.unit,
          title: cut(b.chartTitle, 120),
          series: series.map((s, k) => ({
            name: cut(s.name, 80)!,
            ...looks[k],
            points: idx.map((i) => ({ label: cut(b.periods[i], 40)!, value: s.values[i] as number })),
          })),
        })
      : undefined;
  const cols = b.periods
    .map((_, i) => i)
    .filter((i) => series.some((s) => Number.isFinite(s.values[i] as number)))
    .slice(-4);
  const preview: Preview = {
    ...base(b),
    ...(chart ? { chart } : {}),
    ...(cols.length
      ? {
          columns: cols.map((i) => cut(b.periods[i], 40)!),
          facts: series.slice(0, 12).map((s) => ({ label: cut(s.name, 80)!, values: cols.map((i) => formatFigure(b.unit, s.values[i])) })),
        }
      : {}),
    ...linesOf(b.lines),
  };
  return card(b, preview);
}

/* ---------- A comparison ---------- */

/**
 * One value per item (devices, stages, end markets, companies) as horizontal
 * bars, largest first unless `keepOrder`. Extra columns (growth, share) go in
 * the table beside it.
 */
export function comparisonSlide(
  b: SlideBase & {
    unit: SlideUnit;
    /** What the bars measure: "2025 sales". */
    measure: string;
    items: { name: string; value: number | null | undefined; color?: string; extra?: string[] }[];
    /** Headers for `extra`, in order. */
    extraColumns?: string[];
    keepOrder?: boolean;
    lines?: string[];
  },
): CardSlide {
  const items = b.items.filter((x) => Number.isFinite(x.value as number));
  const sorted = (b.keepOrder ? items : [...items].sort((x, y) => (y.value as number) - (x.value as number))).slice(0, 8);
  // One grey for every item but Avnet and Arrow, which keep their colours and stand out.
  const looks = colours(
    sorted.map((x) => x.name),
    sorted.map((x) => x.color ?? AVNET.grayDark),
  );
  const chart: Chart | undefined = sorted.length
    ? {
        kind: "bar",
        format: b.unit,
        title: cut(b.measure, 120),
        series: sorted.map((x, k) => ({ name: cut(x.name, 80)!, ...looks[k], points: [{ label: cut(b.measure, 40)!, value: x.value as number }] })),
      }
    : undefined;
  const extra = b.extraColumns ?? [];
  const preview: Preview = {
    ...base(b),
    ...(chart ? { chart } : {}),
    ...(b.items.length
      ? {
          columns: ["", cut(b.measure, 40)!, ...extra.map((c) => cut(c, 40)!)],
          facts: (b.keepOrder ? b.items : [...b.items].sort((x, y) => ((y.value ?? -Infinity) as number) - ((x.value ?? -Infinity) as number)))
            .slice(0, 16)
            .map((x) => ({ label: cut(x.name, 80)!, values: [formatFigure(b.unit, x.value), ...(x.extra ?? []).slice(0, extra.length).map((v) => cut(v, 40)!)] })),
        }
      : {}),
    ...linesOf(b.lines),
  };
  return card(b, preview);
}

/* ---------- A table ---------- */

/** Rows and columns as written on the card (up to 16 rows and 11 value columns). */
export function tableSlide(b: SlideBase & { columns: string[]; rows: { label: string; values: string[] }[]; lines?: string[] }): CardSlide {
  const width = Math.min(11, Math.max(0, ...b.rows.map((r) => r.values.length)));
  const preview: Preview = {
    ...base(b),
    columns: b.columns.slice(0, width + 1).map((c) => cut(c, 40)!),
    facts: b.rows.slice(0, 16).map((r) => ({ label: cut(r.label, 80)!, values: Array.from({ length: width }, (_, i) => cut(r.values[i] ?? "", 40)!) })),
    ...linesOf(b.lines),
  };
  return card(b, preview);
}

/* ---------- Large-number tiles ---------- */

/** A few headline figures as tiles across the slide, with any points under them. */
export function figuresSlide(b: SlideBase & { figures: { label: string; value: string }[]; lines?: string[] }): CardSlide {
  const preview: Preview = {
    ...base(b),
    facts: b.figures.slice(0, 16).map((f) => ({ label: cut(f.label, 80)!, values: [cut(f.value, 40)!] })),
    ...linesOf(b.lines),
  };
  return card(b, preview);
}

/* ---------- Points ---------- */

/** A headline and up to twelve points: sentences to use, stories, reasons. */
export function linesSlide(b: SlideBase & { lines: string[] }): CardSlide {
  return card(b, { ...base(b), lines: b.lines.filter(Boolean).slice(0, 12).map((l) => cut(l, 300)!) });
}

/* ---------- Panels ---------- */

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

/** Side-by-side panels, drawn as the page draws them (up to six). */
export function panelsSlide(b: SlideBase & { panels: Panel[] }): CardSlide {
  const panels = b.panels.slice(0, 6).map((x) =>
    defined({
      ...x,
      title: cut(x.title, 80),
      kicker: cut(x.kicker, 80),
      notesLabel: cut(x.notesLabel, 60),
      detail: cut(x.detail, 200),
      metrics: x.metrics?.slice(0, 5),
      notes: x.notes?.slice(0, 3).map((n) => defined({ ...n, text: cut(n.text, 160) })),
      spark: x.spark && { ...x.spark, values: x.spark.values.filter(Number.isFinite).slice(-16) },
      bar: x.bar && { ...x.bar, share: clamp01(x.bar.share) },
      rows: x.rows?.slice(0, 10).map((r) =>
        defined({
          ...r,
          title: cut(r.title, 120)!,
          text: cut(r.text, 300),
          bar: r.bar && { ...r.bar, share: clamp01(r.bar.share) },
          lines: r.lines?.map((l) => ({ ...l, values: l.values.slice(-16).map((v) => (v !== null && Number.isFinite(v) ? v : null)) })),
        }),
      ),
      table: x.table && { columns: x.table.columns.slice(0, 5), rows: x.table.rows.slice(0, 12).map((r) => ({ ...r, cells: r.cells.slice(0, 4) })) },
      bars: x.bars && { ...x.bars, labels: x.bars.labels.slice(-12), values: x.bars.values.slice(-12).map((v) => (v !== null && Number.isFinite(v) ? v : null)), valueLabels: x.bars.valueLabels?.slice(-12) },
      pairs: x.pairs?.slice(0, 12),
    }),
  );
  return card(b, { ...base(b), panels });
}
