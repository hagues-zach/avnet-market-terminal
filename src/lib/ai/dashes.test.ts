// Dashes in cached Claude text. Run with: npx tsx src/lib/ai/dashes.test.ts
import assert from "node:assert/strict";
import { plainDashes, plainDeep } from "./dashes";

assert.equal(plainDashes("Avnet guided sales of $9.00B–$9.30B"), "Avnet guided sales of $9.00B to $9.30B");
assert.equal(plainDashes("sales up 2%–7% from Q2"), "sales up 2% to 7% from Q2");
assert.equal(plainDashes("$9.60 billion — $10.20 billion"), "$9.60 billion to $10.20 billion");
assert.equal(plainDashes("Demand improved — especially in industrial"), "Demand improved, especially in industrial");
assert.equal(plainDashes("No dashes here."), "No dashes here.");
assert.deepEqual(plainDeep({ a: "1–2", b: ["x — y"], c: null, d: 3 }), { a: "1 to 2", b: ["x, y"], c: null, d: 3 });

console.log("ai dashes: ok");
