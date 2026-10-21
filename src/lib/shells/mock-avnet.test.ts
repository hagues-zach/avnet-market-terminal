// The shared mock model adds up. Run with: npx tsx src/lib/shells/mock-avnet.test.ts
import assert from "node:assert/strict";
import {
  APPROVED_PIPELINE,
  CONCENTRATION,
  PIPELINE,
  PIPELINE_BY_SEGMENT,
  PIPELINE_BY_SUPPLIER,
  PIPELINE_BY_VERTICAL,
  PIPELINE_STAGES,
  TOP_CUSTOMERS,
  TTM_BILLINGS,
  TTM_BILLINGS_YEAR_AGO,
  VERTICALS,
} from "./mock-avnet";

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

// The billings each vertical added sum to the growth in total billings (to $10M).
near(
  VERTICALS.reduce((n, v) => n + (v.billings * v.growth) / (1 + v.growth), 0),
  TTM_BILLINGS - TTM_BILLINGS_YEAR_AGO,
  10,
);
near(
  VERTICALS.reduce((n, v) => n + v.share, 0),
  1,
  1e-9,
);

// The ten largest customers make up the top-10 share, and fit inside their markets.
assert.equal(TOP_CUSTOMERS.length, 10);
near(
  TOP_CUSTOMERS.reduce((n, c) => n + c.billings, 0),
  TTM_BILLINGS * CONCENTRATION.top10.now,
  1e-6,
);
for (const v of VERTICALS) {
  const mine = TOP_CUSTOMERS.filter((c) => c.vertical === v.name);
  assert.ok(mine.reduce((n, c) => n + c.billings, 0) < v.billings, `top customers exceed ${v.name}`);
  const pipe = PIPELINE_BY_VERTICAL.find((p) => p.name === v.name)!.pipeline;
  assert.ok(mine.reduce((n, c) => n + c.pipeline, 0) < pipe, `top customers' pipeline exceeds ${v.name}`);
}
assert.ok(TOP_CUSTOMERS.every((c) => VERTICALS.some((v) => v.name === c.vertical)));

console.log("mock-avnet: all tests passed");
