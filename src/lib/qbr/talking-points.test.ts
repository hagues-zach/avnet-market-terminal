// QBR talking points: grounding, the cache key and the week. Run with: npx tsx src/lib/qbr/talking-points.test.ts
import assert from "node:assert/strict";
import { numbers, ungrounded } from "./grounded";
import { isoWeek, keepGrounded, pointsKey, type Point } from "./talking-points";

// Numbers are compared as written; years and small counts are not figures.
assert.deepEqual(numbers("Revenue was $1,480M, up 38.0% in 2026"), ["1480", "38.0"]);
const brief = "Revenue: $1.48B, +38.0% on a year ago\nGross margin: 63.2%, +1.4 pts\nNext earnings Nov 5\n3 of 5 distributors";
assert.deepEqual(ungrounded("Revenue rose 38.0% to $1.48B in 2026", brief), []);
assert.deepEqual(ungrounded("Gross margin reached 64%", brief), ["64"]);
assert.deepEqual(ungrounded("3 distributors carry it", brief), [], "small counts are words");
assert.deepEqual(ungrounded("Margin up 1.5 points", brief), ["1.5"], "decimals always count");

// Items with a figure the brief lacks are dropped and reported; the rest are tidied.
const dropped: string[] = [];
const kept = keepGrounded<Point & { why?: string }>(
  [
    { text: "Ask about the 38.0% growth — is it sustainable?", section: "quarter" },
    { text: "Margins hit 70%.", section: "quarter" },
    { text: "Raise lead times.", why: "They grew 12 weeks.", section: "management" },
  ],
  brief,
  dropped,
);
assert.equal(kept.length, 1);
assert.equal(kept[0].text, "Ask about the 38.0% growth, is it sustainable?");
assert.equal(dropped.length, 2);
assert.match(dropped[1], /\[12\]/, "the reason counts too");
assert.equal(keepGrounded(Array.from({ length: 7 }, (_, i) => ({ text: `Point ${i}`, section: "news" as const })), brief, []).length, 5);

// The key changes with company, meeting, focus, filing and week, not with spacing or end punctuation.
const now = new Date("2026-10-23T12:00:00Z");
const k = pointsKey("microchip", "supplier", "Lead times?", "2026-08-07", now);
assert.equal(k, pointsKey("microchip", "supplier", "  lead   times ", "2026-08-07", now));
assert.notEqual(k, pointsKey("microchip", "customer", "lead times", "2026-08-07", now));
assert.notEqual(k, pointsKey("microchip", "supplier", "lead times", "2026-11-06", now));
assert.notEqual(k, pointsKey("microchip", "supplier", "lead times", "2026-08-07", new Date("2026-10-27T12:00:00Z")));
assert.equal(isoWeek(now), "2026-W43");
assert.equal(isoWeek(new Date("2027-01-01T00:00:00Z")), "2026-W53");

console.log("qbr talking points: ok");
