// The shared mock model adds up. Run with: npx tsx src/lib/shells/mock-avnet.test.ts
import assert from "node:assert/strict";
import { APPROVED_PIPELINE, PIPELINE, PIPELINE_BY_SEGMENT, PIPELINE_BY_SUPPLIER, PIPELINE_BY_VERTICAL, PIPELINE_STAGES } from "./mock-avnet";

const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

// Approved pipeline is approved minus billing.
assert.equal(APPROVED_PIPELINE, PIPELINE.approved.value - PIPELINE.billing.value);

// Every view adds back to the funnel totals, stage by stage (counts to rounding).
for (const [name, view] of Object.entries({ PIPELINE_BY_SUPPLIER, PIPELINE_BY_SEGMENT, PIPELINE_BY_VERTICAL })) {
  for (const { id } of PIPELINE_STAGES) {
    near(view.reduce((n, r) => n + r.funnel[id].value, 0), PIPELINE[id].value, 1e-6);
    near(view.reduce((n, r) => n + r.funnel[id].count, 0), PIPELINE[id].count, view.length);
  }
  near(view.reduce((n, r) => n + r.pipeline, 0), APPROVED_PIPELINE, 1e-6);
  // A funnel never grows from one stage to the next.
  for (const r of view) for (let i = 1; i < PIPELINE_STAGES.length; i++) {
    assert.ok(r.funnel[PIPELINE_STAGES[i].id].count <= r.funnel[PIPELINE_STAGES[i - 1].id].count, `${name} ${r.name} stage ${i}`);
  }
}

console.log("mock-avnet: all tests passed");
