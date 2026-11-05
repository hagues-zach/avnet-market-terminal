// Morning brief ranking (phase B2) and its fixture eval. Run with: npx tsx src/lib/brief/rank.test.ts
import assert from "node:assert/strict";
import { BUILT_AT, FIXTURES } from "./fixtures";
import { TEST_PROFILES } from "./profile";
import { planBrief, score } from "./rank";
import { rules, runEval } from "./rank-eval";

const memory = TEST_PROFILES.find((p) => p.id === "memory-supplier-manager")!;
const item = (id: string) => FIXTURES.normal.items.find((i) => i.id === id)!;

// Scores: the first supplier counts most, an earlier brief and a low rating push down.
const first = score(item("micron-hbm-capacity"), memory, BUILT_AT);
const third = score(item("samsung-ddr5"), memory, BUILT_AT);
assert.ok(first.score > third.score, "the first supplier and a high rating beat the third supplier");
assert.ok(first.reasons.some((r) => r.includes("supplier Micron")));
assert.ok(score(item("micron-yesterday"), memory, BUILT_AT).reasons.some((r) => r.includes("earlier brief")));
assert.ok(score(item("micron-old"), memory, BUILT_AT).score < 4, "old and rated low falls below the floor");

// Followed top customer they don't serve: counts, but less than a served one.
const power = TEST_PROFILES.find((p) => p.id === "power-analog-seller")!;
const gmForMemory = score(item("gm-ev-delay"), memory, BUILT_AT);
const gmForPower = score(item("gm-ev-delay"), power, BUILT_AT);
assert.ok(gmForPower.score > gmForMemory.score, "a served top customer counts more than a followed one");

// Every fixture case passes.
const results = runEval();
const failed = results.filter((r) => r.fails.length);
assert.deepEqual(
  failed.map((r) => `${r.c.day} ${r.c.profile}: ${r.fails.join("; ")}`),
  [],
  "every ranking eval case passes",
);

// And the rules catch a broken plan: a story out of scope, a repeat, an overlong brief.
const plan = planBrief(FIXTURES.normal, memory);
const broken = structuredClone(plan);
const stray = { item: item("nvidia-blackwell"), score: 12, reasons: [], seconds: 30 };
broken.chapters.find((c) => c.id === "technologies")!.picks.push(stray, stray);
broken.seconds = 16 * 60;
const caught = rules(broken, memory, FIXTURES.normal).join(" | ");
assert.match(caught, /out of scope for technologies: nvidia-blackwell/);
assert.match(caught, /appears twice/);
assert.match(caught, /over the 15-minute limit/);

console.log("brief ranking: ok");
