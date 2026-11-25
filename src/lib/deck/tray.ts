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
    .max(6),
});

export const PreviewSchema = z.object({
  headline: text(240),
  text: text(1200).optional(),
  columns: z.array(text(40)).max(12).optional(),
  facts: z.array(z.object({ label: text(80), values: z.array(text(40)).max(12) })).max(16).optional(),
  chart: ChartSchema.optional(),
  lines: z.array(text(300)).max(12).optional(),
  groups: z.array(z.object({ title: text(80), lines: z.array(text(300)).max(8) })).max(2).optional(),
  claude: z.object({ label: text(120), date: text(40).optional() }).optional(),
  source: text(300),
  period: text(60).optional(),
  hookups: z.array(text(40)).max(12).optional(),
  error: z.boolean().optional(),
}) satisfies z.ZodType<Preview>;

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
  /** The reader's point for this slide. Until Claude writes commentary, it becomes the slide's title. */
  note: text(300).optional(),
  included: z.boolean(),
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

export function updateItem(items: TrayItem[], id: string, patch: Partial<Pick<TrayItem, "note" | "included">>): TrayItem[] {
  return items.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

/* ---------- Reading ---------- */

/** Mock when any source it reads is still mock in the register. */
export function isMock(item: Pick<TrayItem, "preview">, register: Hookup[] = HOOKUPS): boolean {
  return (item.preview.hookups ?? []).some((id) => register.find((h) => h.id === id)?.status === "mock");
}

/** The slide as it ships: the reader's point, when they wrote one, is its title. */
export function slidePreview(item: Pick<TrayItem, "preview" | "note">): Preview {
  const note = item.note?.trim();
  return note ? { ...item.preview, headline: note } : item.preview;
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
 * The deck a tray ships as: a cover, each included slide in order, then the
 * sources. The same list feeds the PowerPoint export and the printed PDF.
 */
export function trayDeckSlides(
  items: TrayItem[],
  { title, audience, date }: { title: string; audience: string; date: string },
  register: Hookup[] = HOOKUPS,
): DeckSlide[] {
  const shipped = items.filter((x) => x.included);
  return [
    { kind: "cover", mock: false, preview: { headline: title, text: `${audience}, ${date}`, source: "This deck" } },
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
