// Scenario Modeler maths and content. Run with: npx tsx src/lib/scenario/model.test.ts
import assert from "node:assert/strict";
import { SEGMENT_BILLINGS, SEGMENTS, MAPPED_BILLINGS } from "@/lib/shells/mock-avnet";
import { FORECAST_SPREAD, SEGMENT_FORECAST } from "@/lib/shells/mock-market";
import { goalSeek, growthFactor, lead, money, path, pct, project, shareWords, spreadAt, type Assumptions, type SegmentInput } from "./model";

const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

// ---- On a small two-segment market ----
const segs: SegmentInput[] = [
  { segment: "A", market: 1000, share: 0.1, billings: 100, forecast: [0.1, 0.1, 0.1, 0.1] },
  { segment: "B", market: 500, share: 0.02, billings: 10, forecast: [0, 0, 0, 0] },
];
const spread = [0.05, 0.1, 0.15, 0.2];
const hold: Assumptions = { years: 2, view: "base", growth: {}, shareChange: {} };

const p0 = project(segs, hold, spread);
close(p0.rows[0].marketAt, 1210);
close(p0.billingsAt, 121 + 10);
close(p0.billingsAt, p0.holdAt);
close(p0.bridge.share, 0);
close(p0.bridge.market, 21);
assert.equal(
  lead(p0, hold),
  "With the base market and share held, Avnet's mapped billings reach $131M in two years. The market adds $21M on today's $110M.",
);

// A one-point gain in A: share effect is the point on A's horizon market.
const gain: Assumptions = { ...hold, shareChange: { A: 1 } };
const p1 = project(segs, gain, spread);
close(p1.rows[0].shareAt, 0.11);
close(p1.bridge.share, 12.1);
close(p1.bridge.today + p1.bridge.market + p1.bridge.share, p1.bridge.scenario);
assert.equal(shareWords(gain, ["A", "B"]), null);
assert.match(
  lead(p1, gain),
  /^With the base market and share changed by segment, .*, \$12M more than holding share\. The market adds \$21M and share adds \$12M\.$/,
);

// Same change everywhere reads in words; a loss is a loss.
assert.equal(shareWords({ ...hold, shareChange: { A: 0.25, B: 0.25 } }, ["A", "B"]), "a quarter-point share gain");
assert.equal(shareWords({ ...hold, shareChange: { A: -0.5, B: -0.5 } }, ["A", "B"]), "a half-point share loss");
const loss: Assumptions = { ...hold, shareChange: { A: -1, B: -1 } };
assert.match(lead(project(segs, loss, spread), loss), /less than holding share\. The market adds \$21M and share takes away \$/);

// An edited growth replaces the forecast, and the lead says so.
const edited: Assumptions = { ...hold, growth: { B: 0.2 } };
const pe = project(segs, edited, spread);
close(pe.rows[1].marketAt, 720);
assert.ok(pe.rows[1].edited && !pe.rows[0].edited);
close(pe.rows[1].growth, 0.2);
assert.match(lead(pe, edited), /^With the base market and growth edited in some segments and share held,/);

// Market views move every segment by the band at the horizon.
const up = project(segs, { ...hold, view: "upside" }, spread);
const down = project(segs, { ...hold, view: "downside" }, spread);
close(up.marketAt, p0.marketAt * 1.1);
close(down.marketAt, p0.marketAt * 0.9);
close(spreadAt(spread, 0), 0);
close(spreadAt(spread, 0.5), 0.025);
close(spreadAt(spread, 1.5), 0.075);
close(spreadAt(spread, 9), 0.2);
close(growthFactor([0.1, 0.2], 1.5), 1.1 * 1.2 ** 0.5);

// The path starts today and ends at the projection.
const q = path(segs, gain, spread);
assert.equal(q.length, 9);
close(q[0].scenario, p1.billings);
close(q[8].scenario, p1.billingsAt);
close(q[8].hold, p1.holdAt);

// Goal seek: the same gain everywhere that hits the target; impossible targets are null.
const need = goalSeek(p0, 150)!;
const check = project(segs, { ...hold, shareChange: { A: need, B: need } }, spread);
close(check.billingsAt, 150);
assert.equal(goalSeek(p0, 0), null);
assert.equal(goalSeek(p0, 1e9), null);
assert.equal(goalSeek(p0, 1), null, "would need negative share");

assert.equal(money(27_512), "$27.5B");
assert.equal(money(-120, true), "−$120M");
assert.equal(money(2300, true), "+$2.3B");
assert.equal(pct(0.1444, 1, true), "+14.4%");

// ---- On the shared model ----
const shared: SegmentInput[] = SEGMENT_BILLINGS.map((s) => ({
  segment: s.segment,
  market: s.market,
  share: s.share,
  billings: s.billings,
  forecast: SEGMENT_FORECAST[s.segment],
}));
assert.deepEqual(
  shared.map((s) => s.segment),
  [...SEGMENTS],
);
for (const s of shared) assert.equal(s.forecast.length, 4, s.segment);
assert.equal(FORECAST_SPREAD.length, 4);
for (let i = 1; i < FORECAST_SPREAD.length; i++) assert.ok(FORECAST_SPREAD[i] > FORECAST_SPREAD[i - 1], "the band widens with the horizon");
// Today's billings add back to the shared model's mapped billings, and rows add to the total.
const ps = project(shared, { years: 2, view: "base", growth: {}, shareChange: Object.fromEntries(SEGMENTS.map((s) => [s, 0.25])) }, FORECAST_SPREAD);
close(ps.billings, MAPPED_BILLINGS, 1e-3);
close(
  ps.rows.reduce((n, r) => n + r.billingsAt, 0),
  ps.billingsAt,
);
assert.ok(ps.billingsAt > ps.holdAt);

// No slash, middle dot or em-dash in any sentence the page shows.
for (const view of ["base", "upside", "downside"] as const)
  for (const years of [1, 2, 3, 4]) {
    const a: Assumptions = { years, view, growth: {}, shareChange: { Analog: 0.5 } };
    const t = lead(project(shared, a, FORECAST_SPREAD), a);
    assert.ok(!/[/·—–]/.test(t), t);
  }

console.log("scenario model: ok");
