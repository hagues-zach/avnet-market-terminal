// Code Mapping read and mock model. Run with: npx tsx src/lib/mapping/read.test.ts
import assert from "node:assert/strict";
import { MAPPED_BILLINGS, MAPPED_SHARE, SEGMENT_BILLINGS, SEGMENTS } from "@/lib/shells/mock-avnet";
import { MAPPINGS, type Mapping } from "@/lib/shells/mock-mapping";
import { coverage, lead, matches, reviewOrder, summarise, weakest } from "./read";

const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

// The model adds up: mapped billings by segment match the shared model, and unmapped categories carry none.
for (const s of SEGMENT_BILLINGS) {
  near(
    MAPPINGS.filter((m) => m.segment === s.segment).reduce((n, m) => n + m.billings, 0),
    s.billings,
    1e-6,
  );
}
near(
  MAPPINGS.reduce((n, m) => n + m.billings, 0),
  MAPPED_BILLINGS,
  1e-6,
);
assert.ok(MAPPINGS.filter((m) => m.status === "unmapped").every((m) => m.billings === 0 && !m.codes.length && m.pcc === null));
assert.ok(MAPPINGS.filter((m) => m.status !== "unmapped").every((m) => m.codes.length && m.confidence));
// No slash in any visible text (the brand's slash-mark rule) and no em-dash.
for (const m of MAPPINGS) for (const t of [m.name, m.definition, m.reason ?? "", ...m.parts]) assert.ok(!/[/—]/.test(t), t);
// Only mappings waiting on a decision name who they wait on.
assert.ok(MAPPINGS.every((m) => (m.waitsOn !== null) === (m.status === "suggested" || m.status === "review")));

// Higher confidence segments have more of their billings validated.
const cov = coverage(MAPPINGS, SEGMENTS);
const avg = (c: string) => {
  const xs = cov.filter((x) => SEGMENT_BILLINGS.find((s) => s.segment === x.segment)!.confidence === c);
  return xs.reduce((n, x) => n + x.validatedShare, 0) / xs.length;
};
assert.ok(avg("High") > avg("Medium") && avg("Medium") > avg("Low"), "validated share follows confidence");
assert.equal(SEGMENT_BILLINGS.find((s) => s.segment === weakest(cov).segment)!.confidence, "Low");

// The lead sentence.
const m = (over: Partial<Mapping>): Mapping => ({
  id: "x",
  source: "WSTS",
  segment: "Memory",
  name: "DRAM",
  codes: ["TC 3DR"],
  pcc: "PCC 104-01",
  billings: 100,
  confidence: "High",
  status: "validated",
  waitsOn: null,
  definition: "",
  reason: null,
  parts: [],
  history: [],
  ...over,
});
const sample = [
  m({ status: "validated" }),
  m({ status: "suggested", billings: 1500, segment: "Memory" }),
  m({ status: "review", billings: 400, segment: "Analog" }),
  m({ status: "unmapped", billings: 0 }),
];
const s = summarise(sample);
assert.deepEqual([s.categories, s.validated, s.review, s.unmapped], [4, 1, 2, 1]);
assert.equal(
  lead(0.85, s),
  "85% of Avnet's billings map to a market category, and 25% of categories are validated. 2 mappings wait for review, covering $1.9B of billings; the most is in Memory.",
);
assert.equal(
  lead(0.85, summarise([m({})])),
  "85% of Avnet's billings map to a market category, and 100% of categories are validated. Nothing is waiting for review.",
);
// On the model the sentence is built from the same counts the KPIs show.
assert.ok(lead(MAPPED_SHARE, summarise(MAPPINGS)).startsWith("85% of Avnet's billings map to a market category"));

// Review order: billings first, then lower confidence.
const ordered = [
  m({ billings: 50, confidence: "High", name: "a" }),
  m({ billings: 50, confidence: "Low", name: "b" }),
  m({ billings: 90, name: "c" }),
].sort(reviewOrder);
assert.deepEqual(
  ordered.map((x) => x.name),
  ["c", "b", "a"],
);

// Search matches names, codes and PCC levels, not case-sensitive.
assert.ok(matches(m({}), "dram"));
assert.ok(matches(m({}), "tc 3dr"));
assert.ok(matches(m({}), "104-01"));
assert.ok(!matches(m({}), "nand"));

console.log("mapping read: all tests passed");
