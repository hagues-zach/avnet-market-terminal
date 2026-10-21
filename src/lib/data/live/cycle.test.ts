// Market Cycle rules. Run with: npx tsx src/lib/data/live/cycle.test.ts
import assert from "node:assert/strict";
import { phaseOf, STAGES, type GroupPoint } from "./cycle";
import { COHORTS } from "./earnings-model";

const pts = (...growth: (number | undefined)[]): GroupPoint[] => growth.map((g, i) => ({ label: `CY26 Q${i + 1}`, growth: g, reporting: 1 }));

// The phase: sign of growth, and whether it rose or fell from the quarter before.
assert.equal(phaseOf(pts(0.1, 0.2)), "Expansion, accelerating");
assert.equal(phaseOf(pts(0.2, 0.1)), "Expansion, slowing");
assert.equal(phaseOf(pts(-0.2, -0.1)), "Contraction, easing");
assert.equal(phaseOf(pts(-0.1, -0.2)), "Contraction, deepening");
// Quarters without a figure are skipped; one figure is not enough.
assert.equal(phaseOf(pts(0.1, undefined, 0.05)), "Expansion, slowing");
assert.equal(phaseOf(pts(undefined, 0.1)), null);

// Every group belongs to exactly one stage of the chain.
const staged = STAGES.flatMap((s) => s.cohorts);
assert.deepEqual([...staged].sort(), [...COHORTS].sort());
assert.equal(new Set(staged).size, staged.length);

console.log("cycle: all tests passed");
