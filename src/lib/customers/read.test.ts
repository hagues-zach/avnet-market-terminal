// Customers & End Markets read. Run with: npx tsx src/lib/customers/read.test.ts
import assert from "node:assert/strict";
import { VERTICALS } from "@/lib/shells/mock-avnet";
import { added, againstDemand, concentration, fraction, lead, MARKET_GROUP, trailingGrowth } from "./read";

// Added billings: this year less last year.
assert.equal(Math.round(added({ name: "X", billings: 134, growth: 0.34 })), 34);
assert.equal(Math.round(added({ name: "X", billings: 96, growth: -0.04 })), -4);

// Fractions near a simple ratio are words; the rest are percentages.
assert.equal(fraction(0.33), "a third");
assert.equal(fraction(0.5), "half");
assert.equal(fraction(0.41), "41%");

// The lead names the market that added the most, not the fastest or the largest.
assert.equal(
  lead([
    { name: "Big", billings: 1000, growth: 0.02 },
    { name: "Fast", billings: 50, growth: 0.9 },
    { name: "Mid", billings: 400, growth: 0.2 },
  ]),
  "Mid added the most growth: billings up 20% on a year ago, 61% of Avnet's growth from 28% of its billings.",
);
// On the shared model it is data centre.
assert.equal(
  lead(VERTICALS),
  "Data center & computing added the most growth: billings up 34% on a year ago, a third of Avnet's growth from 15% of its billings.",
);
assert.equal(lead([]), "");

// Customer growth over four quarters, with at least three present.
const close = (a: number | undefined, b: number) => assert.ok(a !== undefined && Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
close(trailingGrowth([{ growth: 0.5 }, { growth: 0.1 }, { growth: 0.2 }, { growth: 0.3 }, { growth: 0.2 }]), 0.2);
close(trailingGrowth([{ growth: 0.1 }, {}, { growth: 0.2 }, { growth: 0.3 }]), 0.2);
assert.equal(trailingGrowth([{}, {}, { growth: 0.2 }, { growth: 0.3 }]), undefined);

// More than 5 points either way is ahead or behind; no group is n/a.
assert.equal(againstDemand(0.34, 0.14), "ahead");
assert.equal(againstDemand(0.04, 0.12), "behind");
assert.equal(againstDemand(0.13, 0.09), "with");
assert.equal(againstDemand(0.12, undefined), null);

// Every mapped market is one of Avnet's verticals; aerospace and medical have no group.
for (const name of Object.keys(MARKET_GROUP))
  assert.ok(
    VERTICALS.some((v) => v.name === name),
    name,
  );
assert.equal(MARKET_GROUP["Aerospace & defense"], undefined);
assert.equal(MARKET_GROUP.Medical, undefined);

assert.equal(concentration(0.18, 0.171), "The top 10 customers are 18% of billings, up 0.9 points on a year ago.");
assert.equal(concentration(0.18, 0.18), "The top 10 customers are 18% of billings, unchanged on a year ago.");

console.log("customers read: all tests passed");
