// The finder. Run with: npx tsx src/lib/cycle/finder.test.ts
import assert from "node:assert/strict";
import { bestCorrelation, place, score, type Scorecard } from "./finder";
import { addMonths, type Series } from "./transform";
import { CHIP_RULES, datedTurns } from "./turns";

// A 44-month cycle over 30 years, and copies of it shifted earlier and later.
const N = 360;
const cycleAt = (i: number) => Math.sin((2 * Math.PI * i) / 44) * 0.2 + Math.sin(i * 1.7) * 0.01;
const shifted = (lead: number): Series => Array.from({ length: N }, (_, i) => ({ month: addMonths("1990-01", i), value: cycleAt(i + lead) }));
const reference = shifted(0);
const turns = datedTurns(reference, { ...CHIP_RULES, minSwing: 0.1 });

// Correlation recovers a planted 6-month lead.
assert.equal(bestCorrelation(shifted(6), reference)!.lead, 6);
assert.equal(bestCorrelation(shifted(-4), reference)!.lead, -4);

// Turn matching: a series 6 months ahead leads; 5 months behind lags; in step is coincident.
const lead = score("leads", shifted(6), reference, turns);
assert.equal(lead.placement, "leading", lead.reason);
assert.ok(Math.abs(lead.lead! - 6) <= 1, `lead ${lead.lead}`);
assert.ok(lead.hitRate >= 0.9);
assert.equal(lead.stable, true);
assert.equal(score("lags", shifted(-5), reference, turns).placement, "lagging");
assert.equal(score("same", shifted(0), reference, turns).placement, "coincident");

// A series that moves against the cycle (a credit spread) is read inverted.
const inverted = shifted(6).map((p) => ({ ...p, value: -p.value }));
assert.equal(score("spread", inverted, reference, turns, false).placement, "leading");

// Noise isn't placed.
const noise: Series = Array.from({ length: N }, (_, i) => ({ month: addMonths("1990-01", i), value: Math.sin(i * 12.9898) * 0.2 }));
assert.equal(score("noise", noise, reference, turns).placement, "not placed");

// A lead that flips between eras isn't trusted.
const base: Scorecard = { key: "x", correlation: { lead: 5, r: 0.7 }, turns: 8, matched: 8, missed: 0, falseTurns: 0, hitRate: 1, lead: 5, leadAtPeaks: 5, leadAtTroughs: 5, range: [-4, 9], eras: { before: 8, after: -3 }, stable: false, placement: "not placed", reason: "" };
assert.equal(place(base).placement, "not placed");
assert.match(place(base).reason, /not in both eras/);
// Too few turns falls back on correlation.
assert.equal(place({ ...base, matched: 1, stable: "one era", correlation: { lead: 4, r: 0.8 } }).placement, "leading");
assert.match(place({ ...base, matched: 1, stable: "one era", correlation: { lead: 4, r: 0.8 } }).reason, /by correlation/);

console.log("cycle finder: ok");
