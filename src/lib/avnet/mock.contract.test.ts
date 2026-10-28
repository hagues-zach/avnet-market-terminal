// The mock adapter passes the contract suite, and the derived figures match the
// mock model exactly. Run with: npx tsx src/lib/avnet/mock.contract.test.ts
import assert from "node:assert/strict";
import * as A from "@/lib/shells/mock-avnet";
import * as M from "@/lib/shells/mock-market";
import { MAPPING_ROWS, MAPPINGS, VALIDATED_MONTH_AGO } from "@/lib/shells/mock-mapping";
import { checkContract } from "./contract";
import { buildModel } from "./derive";
import { mockInputs, mockQuarter } from "./mock";

const inputs = mockInputs();
assert.deepEqual(checkContract(inputs), []);

// The fiscal calendar: FY27 Q1 is July to September 2026.
assert.deepEqual(mockQuarter("FY27 Q1"), { label: "FY27 Q1", start: "2026-07-01", end: "2026-09-30" });
assert.deepEqual(mockQuarter("FY26 Q3"), { label: "FY26 Q3", start: "2026-01-01", end: "2026-03-31" });
assert.deepEqual(mockQuarter("FY25 Q2"), { label: "FY25 Q2", start: "2024-10-01", end: "2024-12-31" });

// Derived figures equal the mock model's own, to the last digit.
const m = buildModel(inputs);
assert.equal(m.source, "mock");
assert.deepEqual(m.quarters, A.QUARTERS);
assert.deepEqual(m.billingsByQuarter, A.BILLINGS_BY_QUARTER);
assert.equal(m.ttmBillings, A.TTM_BILLINGS);
assert.equal(m.ttmBillingsYearAgo, A.TTM_BILLINGS_YEAR_AGO);
assert.equal(m.mappedBillings, A.MAPPED_BILLINGS);
assert.deepEqual(m.segments, [...A.SEGMENTS]);
assert.deepEqual(m.semiSegments, [...A.SEMI_SEGMENTS]);
assert.deepEqual(m.segmentBillings, A.SEGMENT_BILLINGS);
assert.equal(m.semiBillings, A.SEMI_BILLINGS);
assert.equal(m.approvedPipeline, A.APPROVED_PIPELINE);
assert.deepEqual(m.approvalRate, A.APPROVAL_RATE);
assert.equal(m.validatedMonthAgo, VALIDATED_MONTH_AGO);
assert.deepEqual(m.mappingRows, MAPPING_ROWS);
assert.equal(m.mappings, MAPPINGS);
assert.deepEqual(m.shareBySegment, M.SHARE_BY_SEGMENT);
assert.deepEqual(m.shareTrend, M.SHARE_TREND);
assert.deepEqual(m.shareBySupplier, M.SHARE_BY_SUPPLIER);
assert.deepEqual(m.shareByRegion, M.SHARE_BY_REGION);

// The contract catches broken data.
const broken = mockInputs();
broken.performance = { ...broken.performance, quarters: broken.performance.quarters.map((q, i) => (i === 3 ? { ...q, quarter: "FY99 Q9" } : q)) };
broken.suppliers = broken.suppliers.map((s, i) => (i === 0 ? { ...s, share: s.share + 0.2 } : s));
const problems = checkContract(broken);
assert.ok(problems.some((p) => p.startsWith("performance: quarter \"FY99 Q9\"")), problems.join("\n"));
assert.ok(problems.some((p) => p === "suppliers: shares don't add to 1"), problems.join("\n"));

console.log("avnet mock contract: all tests passed");
