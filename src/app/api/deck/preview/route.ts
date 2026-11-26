import { NextResponse } from "next/server";
import { hrefOf, parseStart, slide } from "@/lib/deck/outline";
import { previewFor } from "@/lib/deck/preview";
import { isViewSlide, viewItemId, type TrayItem } from "@/lib/deck/tray";

// Add to deck for a page's own view (docs/design/deck-tray): one Pitch Deck
// Builder slide, ?slide=cycle or ?slide=company&company=microchip, as the tray
// item the page adds. Only the slides pages offer; a slide whose data couldn't be
// loaded is refused, so the tray never holds an error.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const id = params.slide ?? "";
  if (!isViewSlide(id)) return new NextResponse("That view can't be added to a deck.", { status: 400 });
  const start = parseStart({ company: params.company });
  if (params.company && !start.company) return new NextResponse(`No company called "${params.company}" in the app.`, { status: 404 });

  const preview = await previewFor(id, start);
  if (!preview) return new NextResponse("That view needs a company.", { status: 400 });
  if (preview.error) return new NextResponse(`Couldn't load ${slide(id).from} just now. Try again in a few minutes.`, { status: 503 });

  const s = slide(id);
  const item: Omit<TrayItem, "addedAt" | "included"> = {
    id: viewItemId(id, start.company?.slug),
    kind: "view",
    title: start.company && !s.title.includes(start.company.name) ? `${start.company.name}: ${s.title}` : s.title,
    from: { page: s.from, href: hrefOf(id, start) ?? "/tools/deck" },
    preview: { ...preview, hookups: preview.hookups ?? s.hookups },
  };
  return NextResponse.json(item, { headers: { "cache-control": "no-store" } });
}
