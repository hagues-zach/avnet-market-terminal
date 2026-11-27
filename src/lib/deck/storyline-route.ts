import { z } from "zod";
import type { Store } from "@/lib/store";
import { deckCallCap } from "./call-cap";
import { AUDIENCES, audienceLabel } from "./outline";
import { getStoryline, writeStoryline, type Storyline } from "./storyline";
import { TraySchema } from "./tray";

// The storyline route's handler (src/app/api/deck/tray/storyline/route.ts),
// built here with its store, writer and cap passed in so the tests can use
// fakes. The same contract as the commentary route: a bad request is 400 or 413,
// the cap is 429, everything else is 200 with `status` ("ok", "off" or "failed")
// and a `message`. The cap is the one the commentary route takes from.

/** The same cap as the export and the commentary route. */
const MAX_BYTES = 1_000_000;
export const BUSY = "Claude has been asked a lot about this deck in the last few minutes. Try again shortly.";

const Body = z.object({
  title: z.string().max(120).optional(),
  audience: z.enum(AUDIENCES.map((a) => a.value) as ["supplier", "customer", "internal"]),
  items: TraySchema.min(1),
});

const json = (body: Storyline, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const failed = (message: string, status: number) => json({ status: "failed", reasons: {}, sections: {}, message }, status);

export function makeStorylinePost(deps: { store?: Store; write?: typeof writeStoryline; on?: boolean; takeCall?: () => boolean } = {}) {
  const takeCall = deps.takeCall ?? deckCallCap();
  const write = deps.write ?? writeStoryline;
  return async function POST(req: Request): Promise<Response> {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return failed("That deck is too large to suggest an order for.", 413);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > MAX_BYTES) return failed("That deck is too large to suggest an order for.", 413);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return failed("The deck couldn't be read.", 400);
    }
    const body = Body.safeParse(parsed);
    if (!body.success) return failed("The deck couldn't be read. Remove any slide that looks wrong and try again.", 400);
    const { items } = body.data;
    if (new Set(items.filter((x) => x.included).map((x) => x.id)).size < 2) return failed("Include at least two slides to suggest an order.", 400);

    const input = { title: body.data.title?.trim() || "Avnet market review", audience: audienceLabel(body.data.audience), items };
    const result = await getStoryline(input, {
      ...(deps.store ? { store: deps.store } : {}),
      ...(deps.on !== undefined ? { on: deps.on } : {}),
      // Counted, and capped, only when a call is actually made: a stored answer is free.
      write: async (...args) => {
        if (!takeCall()) return { status: "failed", reasons: {}, sections: {}, dropped: [], usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, message: BUSY };
        return write(...args);
      },
    });
    return json(result, result.message === BUSY ? 429 : 200);
  };
}
