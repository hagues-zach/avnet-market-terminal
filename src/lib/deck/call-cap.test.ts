// Run with: npx tsx src/lib/deck/call-cap.test.ts
import assert from "node:assert/strict";
import { callCap } from "./call-cap";

const take = callCap(2, 1000);
assert.equal(take(0), true);
assert.equal(take(10), true);
assert.equal(take(20), false, "the third call in the window waits");
assert.equal(take(999), false);
assert.equal(take(1000), true, "the first call has left the window");
assert.equal(take(1005), false);
console.log("call-cap.test.ts: ok");
