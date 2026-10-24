import { available, deckName, isFrame, isSlideId, parseStart, slide, sourcesPreview, statusOf, type SlideId } from "@/lib/deck/outline";
import { previewsFor } from "@/lib/deck/preview";
import { buildDeck, type DeckSlide } from "@/lib/deck/pptx";

// Pitch Deck Builder export (step 3.3): the deck on screen as a PowerPoint download.
// The query is the builder's own start (?company=microchip&from=qbr&...) plus
// slides=company,arrow,... in the order shown. A slide whose data couldn't be
// loaded, or a talking points slide with nothing saved, is left out rather than
// shipped as an error, and the sources slide lists only what's in the file.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const start = parseStart(params);
  const asked = (params.slides ?? "").split(",").filter(isSlideId);
  const ids = asked.filter((id, i) => asked.indexOf(id) === i && !isFrame(id) && available(id, start));
  if (!ids.length) return new Response("No slides to export. Choose at least one slide in the outline.", { status: 400 });

  try {
    const previews = await previewsFor(start);
    const kept = ids.filter((id) => previews[id] && !previews[id]!.error);
    if (!kept.length) return new Response("None of the chosen slides could be loaded just now. Try again in a few minutes.", { status: 503 });
    const order: SlideId[] = ["cover", ...kept, "sources"];
    const slides: DeckSlide[] = [
      { kind: "cover", mock: false, preview: previews.cover! },
      ...kept.map((id) => ({ mock: statusOf(slide(id)) === "mock", preview: previews[id]! })),
      { kind: "sources", mock: false, preview: sourcesPreview(order, previews) },
    ];
    const name = deckName(start).replace(/^An? /, "");
    const file = await buildDeck(name, slides);
    const filename = `${name.charAt(0).toUpperCase()}${name.slice(1)} ${new Date().toISOString().slice(0, 10)}.pptx`.replace(/[^\w ,.-]/g, "");
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": PPTX,
        "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.warn("Deck export failed.", e);
    return new Response("The deck couldn't be built just now. Try again in a few minutes.", { status: 500 });
  }
}
