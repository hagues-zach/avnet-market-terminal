// Economic Signals read. Run with: npx tsx src/lib/signals/read.test.ts
import assert from "node:assert/strict";
import { costsOf, demandOf, dollarOf, financingOf, sentence, type Changes } from "./read";

// Today's figures, roughly: production up, metals and boards up, chip prices down, yields up, currencies split.
const now: Changes = {
  "ip-semis": 0.199,
  "ip-electronics": 0.095,
  "ip-total": 0.022,
  PCU334413334413: -0.022,
  PCU334417334417: 0.07,
  PCU334412334412: 0.458,
  "imf-PCOPP": 0.448,
  "imf-PTIN": 0.556,
  "imf-PNICK": 0.081,
  "imf-PALUM": 0.237,
  "ust-10y": 1.1,
  "fed-funds": -0.23,
  "fx-EUR": 0.042,
  "fx-JPY": 0.051,
  "fx-CNY": -0.062,
  "fx-KRW": -0.065,
};

assert.equal(demandOf(now)?.verdict, "Growing");
const costs = costsOf(now)!;
assert.equal(costs.verdict, "Rising");
assert.equal(costs.leader?.key, "imf-PTIN");
assert.equal(financingOf(now)?.verdict, "Tighter");
assert.equal(dollarOf(now)?.verdict, "Steady");
assert.equal(
  sentence(now),
  "US chip production is growing, up 20% on a year ago, while input costs are rising, led by tin (+56%), and borrowing is dearer, with the 10-year yield up 1.1 points.",
);

// Demand: two shrinking with none growing; a split is mixed; nothing is null.
assert.equal(demandOf({ "ip-semis": -0.05, "ip-electronics": -0.03, "ip-total": 0.01 })?.verdict, "Shrinking");
assert.equal(demandOf({ "ip-semis": 0.05, "ip-electronics": -0.03 })?.verdict, "Mixed");
assert.equal(demandOf({}), null);

// Costs: more than half falling; an even split is mixed and names no leader in the sentence.
assert.equal(costsOf({ PCU334413334413: -0.05, "imf-PCOPP": -0.1, "imf-PTIN": 0.01 })?.verdict, "Falling");
assert.equal(costsOf({ PCU334413334413: -0.05, "imf-PCOPP": 0.1 })?.verdict, "Mixed");

// Financing within 0.25 points is steady; the dollar needs two currencies.
assert.equal(financingOf({ "ust-10y": -0.2 })?.verdict, "Steady");
assert.equal(financingOf({ "ust-10y": -0.6 })?.verdict, "Easier");
assert.equal(dollarOf({ "fx-EUR": 0.05 }), null);
assert.equal(dollarOf({ "fx-EUR": 0.05, "fx-JPY": 0.03 })?.verdict, "Stronger");

// The sentence adapts: shrinking demand, falling costs, easier money and a weaker dollar.
assert.equal(
  sentence({
    "ip-semis": -0.06,
    "ip-electronics": -0.04,
    "imf-PCOPP": -0.12,
    PCU334413334413: -0.03,
    "ust-10y": -0.6,
    "fx-EUR": -0.05,
    "fx-JPY": -0.04,
  }),
  "US chip production is shrinking, down 6% on a year ago, while input costs are falling, led by copper (−12%), borrowing is cheaper, with the 10-year yield down 0.6 points, and the dollar is weaker.",
);
assert.equal(sentence({}), "");

console.log("signals read: all tests passed");
