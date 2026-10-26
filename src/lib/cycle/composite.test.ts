// Composite indexes. Run with: npx tsx src/lib/cycle/composite.test.ts
import assert from "node:assert/strict";
import { composite, monthlyChanges, smoothedGrowth, weights, type Component } from "./composite";
import { addMonths, type Series } from "./transform";

const months = (n: number, f: (i: number) => number, from = "2015-01"): Series => Array.from({ length: n }, (_, i) => ({ month: addMonths(from, i), value: f(i) }));
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

// Symmetric percent change: from 100 to 102 is 200 x 2 / 202.
near(monthlyChanges({ key: "a", level: [{ month: "2020-01", value: 100 }, { month: "2020-02", value: 102 }], change: "percent", sign: 1 })[0].value, 400 / 202, 1e-9, "symmetric change");
// A difference, and a bad-news series turned around.
assert.equal(monthlyChanges({ key: "s", level: [{ month: "2020-01", value: 1.5 }, { month: "2020-02", value: 1 }], change: "difference", sign: -1 })[0].value, 0.5);
// A gap in the months isn't a change.
assert.equal(monthlyChanges({ key: "g", level: [{ month: "2020-01", value: 1 }, { month: "2020-03", value: 2 }], change: "difference", sign: 1 }).length, 0);

// Inverse-volatility weights: the calmer series gets the larger weight, and they sum to one.
const w = weights([months(24, (i) => (i % 2 ? 1 : -1)), months(24, (i) => (i % 2 ? 3 : -3))]);
near(w[0], 0.75, 1e-9, "calm weight");
near(w[0] + w[1], 1, 1e-9, "weights sum");

// A hand-worked index: one component rising 1% a month, chained, base 2015 averages 100.
const one: Component = { key: "up", level: months(36, (i) => 100 * 1.01 ** i), change: "percent", sign: 1 };
const c = composite([one], "2015");
const base = c.index.filter((p) => p.month.startsWith("2015"));
near(base.reduce((a, p) => a + p.value, 0) / base.length, 100, 1e-6, "base year averages 100");
for (let i = 1; i < c.index.length; i++) near(c.index[i].value / c.index[i - 1].value, 1.01, 1e-9, "chains the monthly change");

// Two components that cancel leave the index flat; contributions say who moved it.
const down: Component = { key: "down", level: months(36, (i) => 100 / 1.01 ** i), change: "percent", sign: 1 };
const flat = composite([one, down], "2015");
for (const p of flat.index) near(p.value, 100, 1e-6, "cancelling components");
const parts = flat.contributions.get("2016-06")!;
assert.ok(parts.find((p) => p.key === "up")!.value > 0 && parts.find((p) => p.key === "down")!.value < 0);

// A component that starts later: the index runs on the others, then reweights.
const late: Component = { key: "late", level: months(12, (i) => 100 * 1.02 ** i, "2017-01"), change: "percent", sign: 1 };
const mixed = composite([one, late], "2015", 0.4);
assert.equal(mixed.index[0].month, "2015-02");

// EPB growth on a constant 10% a year comes back as about 10%.
const steady = months(48, (i) => 100 * 1.1 ** (i / 12));
for (const g of smoothedGrowth(steady)) near(g.value, 0.1, 0.002, "smoothed growth");
// A turn shows in the sign: rising then falling.
const turn = months(48, (i) => (i < 30 ? 100 + i : 130 - (i - 30) * 2));
const sg = smoothedGrowth(turn);
assert.ok(sg.find((p) => p.month === addMonths("2015-01", 20))!.value > 0 && sg.at(-1)!.value < 0);

console.log("cycle composite: ok");
