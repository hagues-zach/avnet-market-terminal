import { z } from "zod";
import { AUDIENCES, audienceLabel } from "@/lib/deck/outline";
import { buildDeck } from "@/lib/deck/pptx";
import { DeckSummarySchema, TraySchema, trayDeckSlides } from "@/lib/deck/tray";

// Add to deck, shipped as PowerPoint (docs/design/deck-tray): the reader's tray,
// in their order, on the Avnet FY27 template. A cover, Claude's executive summary
// when the reader had one written, each included slide (with Claude's commentary
// as the reader saw it, or the reader's point as its title), the sources, then
// the template's closing slide. Nothing here calls Claude: the commentary ships
// as it was saved with the tray. The tray comes from the browser, so it is checked
// against the tray's schema and size limits before anything is built.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
/** A full tray of 25 slides is well under this. */
const MAX_BYTES = 1_000_000;

const Body = z.object({
  title: z.string().max(120).optional(),
  audience: z.enum(AUDIENCES.map((a) => a.value) as ["supplier", "customer", "internal"]),
  items: TraySchema.min(1),
  /** Claude's executive summary, shipped after the cover only while it matches the included slides. */
  summary: DeckSummarySchema.optional(),
});

const today = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response("That deck is too large to build.", { status: 413 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return new Response("That deck is too large to build.", { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new Response("The deck couldn't be read.", { status: 400 });
  }
  const body = Body.safeParse(json);
  if (!body.success) return new Response("The deck couldn't be read. Remove any slide that looks wrong and try again.", { status: 400 });

  if (!body.data.items.some((x) => x.included)) return new Response("No slides to ship. Include at least one slide.", { status: 400 });
  const title = body.data.title?.trim() || "Avnet market review";

  try {
    const slides = trayDeckSlides(body.data.items, { title, audience: audienceLabel(body.data.audience), date: today(), summary: body.data.summary });
    const file = await buildDeck(title, slides);
    const filename = `${title} ${new Date().toISOString().slice(0, 10)}.pptx`.replace(/[^\w ,.-]/g, "");
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": PPTX,
        "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.warn("Tray export failed.", e);
    return new Response("The deck couldn't be built just now. Try again in a few minutes.", { status: 500 });
  }
}
