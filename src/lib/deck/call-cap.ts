// A cap on Claude calls per window in this server process, so a stuck button or
// a tray changed on every click can't run up the bill. Stored answers don't count.
// Pure apart from its own memory; one per route.

export function callCap(max: number, windowMs: number) {
  const recent: number[] = [];
  /** True and counted when a call may go ahead now; false when the window is full. */
  return (now = Date.now()): boolean => {
    while (recent.length && now - recent[0] >= windowMs) recent.shift();
    if (recent.length >= max) return false;
    recent.push(now);
    return true;
  };
}

const SHARED = Symbol.for("avnet.deck.callCap");
type WithCap = typeof globalThis & { [SHARED]?: (now?: number) => boolean };

/**
 * The one budget every Claude call from the deck tray takes from (commentary and
 * the storyline): 20 uncached calls per 10 minutes per server process. Kept on
 * globalThis, so two route bundles that each load this module still share it.
 */
export function deckCallCap(): (now?: number) => boolean {
  const g = globalThis as WithCap;
  return (g[SHARED] ??= callCap(20, 10 * 60_000));
}
