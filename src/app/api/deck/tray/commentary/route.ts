import { makeCommentaryPost } from "@/lib/deck/commentary-route";

// Add to deck, Phase 2: Claude's commentary for the reader's tray, for the review
// page to save with the tray (docs/design/deck-tray). The handler, its checks and
// its contract are in src/lib/deck/commentary-route.ts: the tray is validated
// against the tray's schema and size limits first, as the export is; the same
// deck as before gets the saved answer and no call; `rewrite` names one slide
// written again. When Claude is off or the call fails, the answer says so and the
// page leaves the deck as it is.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = makeCommentaryPost();
