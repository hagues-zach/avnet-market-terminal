// Add to deck: the tray of slides a reader collects while browsing, then orders
// and ships as a PowerPoint or a PDF (docs/design/deck-tray). Pure, so the
// browser's tray, the review page, the export route and the tests agree.
//
// Each item keeps a copy of what the reader saw (a Preview, the same shape the
// Pitch Deck Builder exports), so the deck matches the screen even if the data
// moves on. The tray lives in the browser until there is sign-in; the export
// route validates it with the same schema, so nothing the browser sends is trusted
// beyond its shape and size.
import { z } from "zod";
import { HOOKUPS, type Hookup } from "@/lib/hookups";
import { evidenceOf, groundPiece } from "./evidence";
import type { Preview, SlideId } from "./outline";
import type { DeckSlide } from "./pptx";

/** The most slides a tray holds. */
export const TRAY_LIMIT = 25;

/** The Pitch Deck Builder slides a page can add to the tray as they are. */
export const VIEW_SLIDES = ["company", "commentary", "arrow", "cycle", "economy", "share", "performance"] as const satisfies readonly SlideId[];
export type ViewSlide = (typeof VIEW_SLIDES)[number];
export const isViewSlide = (v: string): v is ViewSlide => (VIEW_SLIDES as readonly string[]).includes(v);

const text = (max: number) => z.string().max(max);

const ChartSchema = z.object({
  kind: z.enum(["bar", "column", "line"]),
  format: z.enum(["usd", "pct", "days", "eps", "number"]),
  title: text(120).optional(),
  series: z
    .array(
      z.object({
        name: text(80),
        who: z.enum(["avnet", "arrow", "company", "market"]),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        points: z.array(z.object({ label: text(40), value: z.number() })).max(16),
      }),
    )
    .min(1)
    // A comparison's bars are a series each, up to eight (comparisonSlide); a time series has up to six.
    .max(8),
});

const Tone = z.enum(["good", "bad", "neutral", "plain"]);
const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const PanelRowSchema = z.object({
  title: text(120),
  strong: z.boolean().optional(),
  value: text(60).optional(),
  large: z.boolean().optional(),
  note: text(40).optional(),
  change: text(40).optional(),
  tone: Tone.optional(),
  period: text(30).optional(),
  caption: text(200).optional(),
  bar: z.object({ share: z.number().min(0).max(1), color: Hex }).optional(),
  markers: z.array(z.object({ text: text(60), color: Hex, strong: z.boolean().optional() })).max(3).optional(),
  text: text(300).optional(),
  lines: z.array(z.object({ values: z.array(z.number().nullable()).max(16), color: Hex, width: z.number().min(0.25).max(4).optional() })).max(3).optional(),
});
const ScatterAxisSchema = z.object({ label: text(60), format: z.enum(["pct", "growth"]), min: z.number(), max: z.number() });
const PanelCellSchema = z.union([
  text(40),
  z.object({ text: text(40), bold: z.boolean().optional(), muted: z.boolean().optional(), marker: Hex.optional() }),
  z.object({ change: text(40), tone: Tone.optional(), period: text(20).optional() }),
  z.object({ spark: z.array(z.number().nullable()).max(16), color: Hex.optional() }),
]);

export const PreviewSchema = z.object({
  headline: text(240),
  text: text(1200).optional(),
  columns: z.array(text(40)).max(12).optional(),
  facts: z.array(z.object({ label: text(80), values: z.array(text(40)).max(12) })).max(16).optional(),
  chart: ChartSchema.optional(),
  lines: z.array(text(300)).max(12).optional(),
  groups: z.array(z.object({ title: text(80), lines: z.array(text(300)).max(8) })).max(2).optional(),
  panels: z
    .array(
      z.object({
        title: text(80).optional(),
        kicker: text(80).optional(),
        tag: text(40).optional(),
        tagMock: z.boolean().optional(),
        detail: text(200).optional(),
        figure: z.object({ value: text(40), note: text(200).optional(), change: text(40).optional(), tone: Tone.optional(), period: text(40).optional() }).optional(),
        metrics: z
          .array(z.object({ label: text(60), value: text(40), change: text(60).optional(), tone: Tone.optional(), period: text(40).optional(), large: z.boolean().optional() }))
          .max(5)
          .optional(),
        bar: z.object({ share: z.number().min(0).max(1), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), label: text(80).optional() }).optional(),
        notes: z.array(z.object({ title: text(60), value: text(40).optional(), text: text(160).optional(), marker: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() })).max(3).optional(),
        notesLabel: text(60).optional(),
        next: z.boolean().optional(),
        marker: Hex.optional(),
        lede: text(300).optional(),
        paragraphs: z.array(z.object({ lead: text(40).optional(), text: text(400) })).max(6).optional(),
        rows: z.array(PanelRowSchema).max(10).optional(),
        rowRules: z.boolean().optional(),
        table: z
          .object({
            columns: z.array(text(40)).max(8),
            rows: z.array(z.object({ label: text(80), marker: Hex.optional(), cells: z.array(PanelCellSchema).max(7) })).max(16),
          })
          .optional(),
        bars: z.object({ labels: z.array(text(20)).max(12), values: z.array(z.number().nullable()).max(12), valueLabels: z.array(text(20)).max(12).optional(), color: Hex, forecast: z.array(z.boolean()).max(12).optional() }).optional(),
        pairs: z.array(z.object({ label: text(40), value: text(30) })).max(12).optional(),
        scatter: z
          .object({
            x: ScatterAxisSchema,
            y: ScatterAxisSchema,
            points: z.array(z.object({ x: z.number(), y: z.number(), color: Hex, strong: z.boolean().optional(), label: text(40).optional() })).max(150),
            medians: z.object({ x: z.number().optional(), y: z.number().optional() }).optional(),
            note: text(120).optional(),
          })
          .optional(),
        spark: z.object({ label: text(60), values: z.array(z.number()).max(16), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() }).optional(),
      }),
    )
    .max(6)
    .optional(),
  claude: z.object({ label: text(120), date: text(40).optional() }).optional(),
  source: text(300),
  period: text(60).optional(),
  hookups: z.array(text(40)).max(12).optional(),
  error: z.boolean().optional(),
}) satisfies z.ZodType<Preview>;

/** The most Claude's commentary on one slide may hold, so saved commentary always passes the schema. */
export const COMMENTARY = { headline: 240, text: 600, bullet: 240, bullets: 4, summaryLine: 300, summaryLines: 5 } as const;

/**
 * Claude's commentary on one slide (Phase 2): a headline that makes the point, one
 * sentence, and up to four bullets, every figure in them checked against the
 * slide (src/lib/deck/commentary.ts). Kept beside the app's preview, never
 * written into it, so clearing it gives the app's wording back.
 */
/** A day as YYYY-MM-DD: the only thing a "written on" field may hold, so it can't carry text onto the slide. */
const Ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CommentarySchema = z.object({
  headline: text(COMMENTARY.headline),
  text: text(COMMENTARY.text).optional(),
  bullets: z.array(text(COMMENTARY.bullet)).max(COMMENTARY.bullets),
  writtenAt: Ymd,
  /** The reader's point it was written from, so the page can say when the point has changed since. */
  forNote: text(300).optional(),
});
export type Commentary = z.infer<typeof CommentarySchema>;

/** Claude's executive summary for the deck, with the slides it was written from, in order. */
export const DeckSummarySchema = z.object({
  lines: z.array(text(COMMENTARY.summaryLine)).min(1).max(COMMENTARY.summaryLines),
  writtenAt: Ymd,
  slideIds: z.array(text(200)).max(TRAY_LIMIT),
});
export type DeckSummary = z.infer<typeof DeckSummarySchema>;

export const TrayItemSchema = z.object({
  /** Stable for the thing added, so adding it twice is caught: see chartItemId and viewItemId. */
  id: text(200),
  /** "chart": a table's chart view. "view": one of the Pitch Deck Builder's slides. */
  kind: z.enum(["chart", "view"]),
  title: text(200),
  from: z.object({
    page: text(80),
    // A path inside the app, never another site or a script URL.
    href: text(300).regex(/^\/(?![/\\])/),
  }),
  /** ISO time it was added. */
  addedAt: text(40),
  preview: PreviewSchema,
  /** The reader's point for this slide: the slide's title, or with commentary, Claude's brief for the headline. */
  note: text(300).optional(),
  included: z.boolean(),
  /** Claude's commentary, when the reader asked for it. Trays saved before Phase 2 have none. */
  commentary: CommentarySchema.optional(),
});

export type TrayItem = z.infer<typeof TrayItemSchema>;
export const TraySchema = z.array(TrayItemSchema).max(TRAY_LIMIT);

/** The tray as saved, or empty when what's saved is missing, old or broken. */
export function parseTray(raw: string | null | undefined): TrayItem[] {
  if (!raw) return [];
  try {
    const r = TraySchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : [];
  } catch {
    return [];
  }
}

/* ---------- Ids ---------- */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** A table's chart view: one item per chart and view (tab). */
export const chartItemId = (eyebrow: string, title: string, tab: string) => `chart:${slugify(eyebrow)}:${slugify(title)}:${slugify(tab)}`;
/** A Pitch Deck Builder slide, for a company where it needs one. */
export const viewItemId = (slide: string, company?: string) => `view:${slide}${company ? `:${company}` : ""}`;

/* ---------- Changes ---------- */

export type AddResult = { items: TrayItem[]; added: true } | { items: TrayItem[]; added: false; reason: "duplicate" | "full" };

export function addItem(items: TrayItem[], item: TrayItem): AddResult {
  if (items.some((x) => x.id === item.id)) return { items, added: false, reason: "duplicate" };
  if (items.length >= TRAY_LIMIT) return { items, added: false, reason: "full" };
  return { items: [...items, item], added: true };
}

export const removeItem = (items: TrayItem[], id: string) => items.filter((x) => x.id !== id);

/** Move an item one place up (-1) or down (1). */
export function moveItem(items: TrayItem[], id: string, dir: -1 | 1): TrayItem[] {
  const i = items.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return items;
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function updateItem(items: TrayItem[], id: string, patch: Partial<Pick<TrayItem, "note" | "included" | "commentary">>): TrayItem[] {
  return items.map((x) => {
    if (x.id !== id) return x;
    const next = { ...x, ...patch };
    // Clearing commentary removes the key, so the saved tray reads as it did before.
    if ("commentary" in patch && !patch.commentary) delete next.commentary;
    return next;
  });
}

/* ---------- Reading ---------- */

/** Mock when any source it reads is still mock in the register. */
export function isMock(item: Pick<TrayItem, "preview">, register: Hookup[] = HOOKUPS): boolean {
  return (item.preview.hookups ?? []).some((id) => register.find((h) => h.id === id)?.status === "mock");
}

export const CLAUDE_COMMENTARY = "Commentary written by Claude";
export const CLAUDE_SUMMARY = "Summary written by Claude";

/** YYYY-MM-DD as "November 25, 2026", the same in every time zone; "" for anything else. */
export function writtenDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * The slide as it ships. With Claude's commentary: its headline (the reader's
 * point, then the card's, when it doesn't hold up), its sentence (the card's own
 * when Claude's was dropped) and its bullets as the slide's lines (the card's own
 * when none held up), marked as Claude's; the figures, chart, table and panels
 * stay as the app saved them. Every piece is checked against the slide again
 * here, so commentary from the browser's saved tray can't bring a figure the
 * slide doesn't show. A two-column slide keeps its columns, which already are
 * its points. Without commentary: the reader's point, when they wrote one, is
 * its title.
 */
export function slidePreview(item: Pick<TrayItem, "preview" | "note" | "commentary">): Preview {
  const c = item.commentary;
  const note = item.note?.trim();
  if (c) {
    const p = item.preview;
    const ev = evidenceOf(p);
    const head = groundPiece(c.headline, ev);
    const text = c.text ? groundPiece(c.text, ev) : "";
    const bullets = p.groups?.length ? [] : c.bullets.map((b) => groundPiece(b, ev)).filter(Boolean);
    if (head || text || bullets.length)
      return {
        ...p,
        headline: head || note || p.headline,
        ...(text ? { text } : {}),
        ...(bullets.length ? { lines: bullets } : {}),
        claude: { label: CLAUDE_COMMENTARY, ...(writtenDate(c.writtenAt) ? { date: writtenDate(c.writtenAt) } : {}) },
      };
  }
  return note ? { ...item.preview, headline: note } : item.preview;
}

/** True when the summary was written from exactly these slides, in this order. */
export const summaryMatches = (summary: DeckSummary | undefined, items: TrayItem[]): summary is DeckSummary => {
  const ids = items.filter((x) => x.included).map((x) => x.id);
  return Boolean(summary) && summary!.slideIds.length === ids.length && summary!.slideIds.every((id, i) => id === ids[i]);
};

/**
 * The executive summary slide, its lines checked again against the slides it
 * ships with; none when no line holds up.
 */
export function summaryPreview(summary: DeckSummary, items: TrayItem[]): Preview | undefined {
  const ev = items
    .filter((x) => x.included)
    .map((x) => evidenceOf(x.preview))
    .join("\n");
  const lines = summary.lines.map((l) => groundPiece(l, ev)).filter(Boolean);
  return lines.length ? { headline: "Executive summary", lines, claude: { label: CLAUDE_SUMMARY, ...(writtenDate(summary.writtenAt) ? { date: writtenDate(summary.writtenAt) } : {}) }, source: "This deck's slides" } : undefined;
}

/** The sources slide for a tray: each slide's source and period, mock ones said so. */
export function traySources(items: TrayItem[], register: Hookup[] = HOOKUPS): Preview {
  const mock = items.filter((x) => isMock(x, register)).length;
  return {
    headline: "Sources",
    text: mock
      ? `${mock} of ${items.length} slides ${mock === 1 ? "uses" : "use"} mock data until Avnet's sources are hooked up.`
      : "Every slide is on live data.",
    lines: items.map((x) => {
      const where = `${x.preview.source}${x.preview.period ? `, ${x.preview.period}` : ""}`;
      return `${x.title}: ${where}${isMock(x, register) && !/mock/i.test(where) ? " (mock data)" : ""}`;
    }),
    source: "This deck",
  };
}

/**
 * The deck a tray ships as: a cover, Claude's executive summary when one is
 * given and was written from these slides, each included slide in order, then
 * the sources. The same list feeds the PowerPoint export and the printed PDF.
 */
export function trayDeckSlides(
  items: TrayItem[],
  { title, audience, date, summary }: { title: string; audience: string; date: string; summary?: DeckSummary },
  register: Hookup[] = HOOKUPS,
): DeckSlide[] {
  const shipped = items.filter((x) => x.included);
  const mock = shipped.some((x) => isMock(x, register));
  const sum = summaryMatches(summary, items) ? summaryPreview(summary, items) : undefined;
  return [
    { kind: "cover", mock: false, preview: { headline: title, text: `${audience}, ${date}`, source: "This deck" } },
    ...(sum ? [{ mock, preview: sum }] : []),
    ...shipped.map((x) => ({ mock: isMock(x, register), preview: slidePreview(x) })),
    { kind: "sources", mock: false, preview: traySources(shipped, register) },
  ];
}

/** "4 slides, 1 on mock data". */
export function trayLead(items: TrayItem[], register: Hookup[] = HOOKUPS): string {
  if (!items.length) return "No slides yet";
  const mock = items.filter((x) => isMock(x, register)).length;
  const slides = `${items.length} ${items.length === 1 ? "slide" : "slides"}`;
  return mock ? `${slides}, ${mock} on mock data` : slides;
}
