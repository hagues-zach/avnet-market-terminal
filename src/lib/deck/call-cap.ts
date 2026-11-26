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
