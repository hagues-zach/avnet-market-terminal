import assert from "node:assert/strict";
import { isCurrentQuarter, quarterMonths, ROADMAP } from "./items";

// Avnet's year starts in July.
assert.equal(quarterMonths("FY27 Q1").range, "Jul to Sep 2026");
assert.equal(quarterMonths("FY27 Q3").range, "Jan to Mar 2027");
assert.equal(quarterMonths("FY28 Q2").range, "Oct to Dec 2027");
assert.ok(isCurrentQuarter("FY27 Q3", new Date("2027-02-01T12:00:00Z")));
assert.ok(isCurrentQuarter("FY27 Q3", new Date("2027-03-31T23:00:00Z")));
assert.ok(!isCurrentQuarter("FY27 Q3", new Date("2026-11-05T12:00:00Z")));

// The file a person edits by hand: quarters in order with no gaps, and copy that follows the voice rules.
ROADMAP.forEach((q, i) => {
  if (i > 0) {
    const prev = quarterMonths(ROADMAP[i - 1].quarter).end.getTime();
    assert.equal(quarterMonths(q.quarter).start.getTime(), prev + 86_400_000, `${q.quarter} follows ${ROADMAP[i - 1].quarter}`);
  }
  assert.ok(q.items.length > 0, `${q.quarter} has items`);
  for (const item of q.items) {
    assert.ok(item.title && item.why, `${q.quarter}: title and why`);
    assert.ok(!/[–—]/.test(item.title + item.why), `${item.title}: no en or em dashes`);
  }
});
