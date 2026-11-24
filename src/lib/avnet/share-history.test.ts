// A row's share by quarter agrees with the table. Run with: npx tsx src/lib/avnet/share-history.test.ts
import assert from "node:assert/strict";
import { buildModel, shareHistory } from "./derive";
import { mockInputs } from "./mock";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-12;

// A flat market gives a straight line through the two pinned quarters.
const flat = shareHistory(0.05, 0.01, [0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04]);
assert.equal(flat.length, 8);
assert.ok(close(flat[7], 0.05));
assert.ok(close(flat[3], 0.04));
assert.ok(close(flat[5], 0.045));
assert.ok(close(flat[0], 0.0325));

// The real model: every segment, supplier and region pins to its table figures.
const m = buildModel(mockInputs());
const trend = m.shareTrend.map((r) => r["Avnet share of mapped TAM"]);
const rows = [...m.shareBySegment.map((s) => ({ name: s.segment, share: s.share, shareChange: s.shareChange })), ...m.shareBySupplier, ...m.shareByRegion];
for (const r of rows) {
  const h = shareHistory(r.share, r.shareChange, trend);
  assert.equal(h.length, trend.length, r.name);
  assert.ok(close(h[h.length - 1], r.share), `${r.name}: latest`);
  assert.ok(close(h[h.length - 5], r.share - r.shareChange), `${r.name}: year ago`);
  assert.ok(h.every((v) => Number.isFinite(v) && v > 0), `${r.name}: positive`);
}

assert.deepEqual(shareHistory(0.05, 0, []), []);

console.log("share history: ok");
