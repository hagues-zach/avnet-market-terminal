// Cycle signals. Run with: npx tsx src/lib/cycle/signals.test.ts
import assert from "node:assert/strict";
import { backtest, chooseDrop, episodes, evaluate, phases, stageSentence, stateOf, stress } from "./signals";
import { addMonths, type Series } from "./transform";
import type { Turn } from "./turns";

const months = (n: number, f: (i: number) => number, from = "2000-01"): Series => Array.from({ length: n }, (_, i) => ({ month: addMonths(from, i), value: f(i) }));

// Episodes: runs of months, or anything within 12 months when merging.
assert.deepEqual(episodes(["2001-01", "2001-02", "2001-05", "2001-06"]), ["2001-01", "2001-05"]);
assert.deepEqual(episodes(["2001-01", "2001-02", "2001-05", "2002-06"], 12), ["2001-01", "2002-06"]);

// A constructed downturn: the leading index falls 12% from 2003-01, the cycle peaks 2003-09 and bottoms 2004-06.
const cycle: Turn[] = [
  { month: "2001-06", kind: "trough", value: 0 },
  { month: "2003-09", kind: "peak", value: 1 },
  { month: "2004-06", kind: "trough", value: 0 },
];
const leading = months(72, (i) => (i < 36 ? 100 + i * 0.2 : 107 - (i - 36) * 0.8));
const growth = months(72, (i) => (i < 38 ? 0.02 : -0.05));
const curve = months(72, (i) => (i >= 30 && i < 34 ? -0.2 : 1));
const steps = backtest(leading, growth, curve, cycle, 0.05);
assert.equal(steps.length, 4);
const final = steps.at(-1)!;
assert.equal(final.episodes.length, 1, `episodes ${final.episodes}`);
assert.equal(final.caught, 1);
assert.equal(final.falseSignals, 0);
assert.ok(final.lead! >= 0, "the signal comes before the peak");
// Without the curve, steps 2 to 4 never fire.
assert.equal(backtest(leading, growth, null, cycle, 0.05)[1].episodes.length, 0);

// Phases and evaluation: a signal far from any turn is false.
assert.deepEqual(phases(cycle, "down"), [{ start: "2003-09", end: "2004-06" }]);
assert.equal(evaluate("x", ["2010-01"], phases(cycle, "down"), "2000-01").falseSignals, 1);

// The grid picks the drop with fewest false signals that still catches the downturn.
const pick = chooseDrop((d) => backtest(leading, growth, curve, cycle, d));
assert.ok(pick.final.caught === 1 && pick.grid.length === 5);

// Stage: who turned, who's still going, who hasn't turned yet.
const up = months(24, (i) => (i < 20 ? -0.02 : 0.03));
const down = months(24, () => -0.04);
const laggingUp = months(24, () => 0.01);
const sentence = stageSentence([stateOf("Leading", up), stateOf("Cyclical", down), stateOf("Aggregate", down), stateOf("Lagging", laggingUp)]);
assert.equal(sentence, "Leading has turned up; Cyclical and Aggregate are still falling; Lagging hasn't turned yet.");
assert.equal(stageSentence([null, stateOf("Cyclical", down), stateOf("Aggregate", down), stateOf("Lagging", down)]), "Cyclical, Aggregate and Lagging are still falling. No leading index yet.");
assert.ok(!/[/·—–]/.test(sentence));

// Stress: both conditions needed.
const highShare = months(60, (i) => 0.3 + i * 0.001);
const margins = [0.3, 0.32, 0.31, 0.29, 0.22].map((margin, i) => ({ quarter: `CY24 Q${i + 1}`, margin }));
assert.equal(stress(highShare, margins, [0.05, 0.08]).on, true);
assert.equal(stress(months(60, (i) => 0.4 - i * 0.001), margins, [0.05, 0.08]).on, false, "inventory low");
assert.equal(stress(highShare, margins.map((m) => ({ ...m, margin: 0.3 })), [0.05]).on, false, "margins steady");

console.log("cycle signals: ok");
