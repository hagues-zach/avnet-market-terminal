// Turning point dating. Run with: npx tsx src/lib/cycle/turns.test.ts
import assert from "node:assert/strict";
import { CHIP_RULES, datedTurns } from "./turns";
import { addMonths, monthIndex, type Series } from "./transform";

/** A 40-month sine from 2000-01 with a little deterministic noise. */
function wave(months: number, period = 40, noise = 0.02): Series {
  return Array.from({ length: months }, (_, i) => ({
    month: addMonths("2000-01", i),
    value: Math.sin((2 * Math.PI * i) / period) * 0.2 + Math.sin(i * 7.3) * noise,
  }));
}

const s = wave(200);
const turns = datedTurns(s, { ...CHIP_RULES, minSwing: 0.1 });
// A sine with period 40 peaks at months 10, 50, 90... and bottoms at 30, 70, 110...
const expected = [10, 30, 50, 70, 90, 110, 130, 150, 170, 190].filter((m) => m >= 6 && 199 - m >= 6);
assert.equal(turns.length, expected.length, `found ${turns.map((t) => t.month).join(" ")}`);
turns.forEach((t, i) => {
  const at = monthIndex(t.month) - monthIndex("2000-01");
  assert.ok(Math.abs(at - expected[i]) <= 2, `turn ${i} at ${at}, expected about ${expected[i]}`);
  assert.equal(t.kind, i % 2 === 0 ? "peak" : "trough");
});

// The rules hold: alternation, phase and cycle length.
for (let i = 1; i < turns.length; i++) {
  assert.notEqual(turns[i].kind, turns[i - 1].kind, "alternate");
  assert.ok(monthIndex(turns[i].month) - monthIndex(turns[i - 1].month) >= CHIP_RULES.minPhase, "phase length");
  if (i >= 2) assert.ok(monthIndex(turns[i].month) - monthIndex(turns[i - 2].month) >= CHIP_RULES.minCycle, "cycle length");
}

// Noise alone, below the minimum swing, dates no cycle.
assert.equal(datedTurns(wave(200, 40, 0).map((p) => ({ ...p, value: p.value * 0.1 })), { ...CHIP_RULES, minSwing: 0.1 }).length, 0);

// A short wiggle inside a long cycle is not a cycle of its own.
const wiggle = wave(200, 80).map((p, i) => ({ ...p, value: p.value + (i >= 100 && i <= 104 ? 0.03 * Math.sin(i) : 0) }));
for (let i = 1; i < datedTurns(wiggle).length; i++) assert.ok(monthIndex(datedTurns(wiggle)[i].month) - monthIndex(datedTurns(wiggle)[i - 1].month) >= 6);

console.log("cycle turns: ok");
