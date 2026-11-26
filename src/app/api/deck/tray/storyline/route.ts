import { makeStorylinePost } from "@/lib/deck/storyline-route";

// Add to deck, Phase 3: Claude's suggested order for the reader's tray, for the
// review page to show before anything moves (docs/design/deck-tray). The handler,
// its checks and its contract are in src/lib/deck/storyline-route.ts: the tray is
// validated against the tray's schema and size limits first; the same deck as
// before gets the saved answer and no call; uncached calls share the commentary
// route's cap. Nothing here changes the tray.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = makeStorylinePost();
