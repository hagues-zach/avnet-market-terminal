import { z } from "zod";
import type { Store } from "@/lib/store";
import { deckCallCap } from "./call-cap";
import { getDeckCommentary, writeDeckCommentary, type DeckCommentary } from "./commentary";
import { AUDIENCES, audienceLabel } from "./outline";
import { TraySchema } from "./tray";

// The commentary route's handler (src/app/api/deck/tray/commentary/route.ts),
// built here with its store, writer and cap passed in so the tests can use
// fakes. The contract: a bad request is 400 or 413, the cap is 429, and
// everything else is 200 with `status` ("ok", "off" or "failed") and a
// `message` to show, so the page reads `status`, never `res.ok` alone.

/** The same cap as the export: a full tray of 25 slides is well under it. */
const MAX_BYTES = 1_000_000;
export const BUSY = "Claude has written a lot of commentary in the last few minutes. Try again shortly.";

const Body = z.object({
  title: z.string().max(120).optional(),
  audience: z.enum(AUDIENCES.map((a) => a.value) as ["supplier", "customer", "internal"]),
  items: TraySchema.min(1),
  rewrite: z.string().max(200).optional(),
});

const json = (body: DeckCommentary, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const failed = (message: string, status: number) => json({ status: "failed", slides: {}, message }, status);

export function makeCommentaryPost(deps: { store?: Store; write?: typeof writeDeckCommentary; on?: boolean; takeCall?: () => boolean } = {}) {
  // Uncached calls this server process makes in ten minutes, shared with the storyline route,
  // so a stuck button can't run up the bill.
  const takeCall = deps.takeCall ?? deckCallCap();
  const write = deps.write ?? writeDeckCommentary;
  return async function POST(req: Request): Promise<Response> {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return failed("That deck is too large to write commentary for.", 413);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) return failed("That deck is too large to write commentary for.", 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return failed("The deck couldn't be read.", 400);
    }
    const body = Body.safeParse(parsed);
    if (!body.success) return failed("The deck couldn't be read. Remove any slide that looks wrong and try again.", 400);
    const { items, rewrite } = body.data;
    if (!items.some((x) => x.included)) return failed("Include at least one slide to write commentary for.", 400);
    if (rewrite && !items.some((x) => x.included && x.id === rewrite)) return failed("That slide isn't in the deck.", 400);

    const input = { title: body.data.title?.trim() || "Avnet market review", audience: audienceLabel(body.data.audience), items };
    const result = await getDeckCommentary(input, {
      ...(deps.store ? { store: deps.store } : {}),
      ...(deps.on !== undefined ? { on: deps.on } : {}),
      fresh: Boolean(rewrite),
      ...(rewrite ? { only: rewrite } : {}),
      // Counted, and capped, only when a call is actually made: a stored answer is free.
      write: async (...args) => {
        if (!takeCall()) return { status: "failed", slides: {}, dropped: [], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, message: BUSY };
        return write(...args);
      },
    });
    return json(result, result.message === BUSY ? 429 : 200);
  };
}
