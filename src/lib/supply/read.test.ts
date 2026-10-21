// Supply Chain read. Run with: npx tsx src/lib/supply/read.test.ts
import assert from "node:assert/strict";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { LEAD_TIMES } from "@/lib/shells/mock-market";
import { CATEGORY_LINKS, firstSentence, readOf, scoreSignals, sentence, spoken, supplyStories } from "./read";

// Each signal against its threshold; inventory falling is tighter.
const tight = scoreSignals({ utilisationChange: 2.1, priceChange: 0.038, inventoryChange: -7 });
assert.deepEqual(
  tight.map((s) => s.direction),
  ["tighter", "tighter", "tighter"],
);
assert.equal(readOf(tight), "Tightening");
assert.equal(sentence(tight), "Supply is tightening. Fabs are running hotter, chip prices are rising and inventory in the chain is falling.");

const easing = scoreSignals({ utilisationChange: -1.5, priceChange: -0.03, inventoryChange: 1 });
assert.deepEqual(
  easing.map((s) => s.direction),
  ["looser", "looser", "flat"],
);
assert.equal(readOf(easing), "Easing");

// One tighter and one looser is mixed; so is a single signal.
assert.equal(readOf(scoreSignals({ utilisationChange: 2, priceChange: -0.05, inventoryChange: -5 })), "Mixed");
assert.equal(readOf(scoreSignals({ utilisationChange: 2 })), "Mixed");
// Within the threshold is flat; a missing signal is left out of the sentence.
const partial = scoreSignals({ utilisationChange: 0.4, priceChange: 0.01 });
assert.deepEqual(
  partial.map((s) => s.direction),
  ["flat", "flat", null],
);
assert.equal(sentence(partial), "Supply signals are mixed. Fab utilisation is steady and chip prices are flat.");

// Supply stories: matching words only, newest first, no filings.
const a = (title: string, publishedAt: string, kind: "news" | "filing" = "news") => ({
  id: title,
  kind,
  title,
  summary: "",
  outlet: "EE Times",
  url: "",
  publishedAt,
  segments: [],
  suppliers: [],
  endMarkets: [],
  regions: [],
});
const stories = supplyStories([
  a("MCU lead times stretch to 20 weeks", "2026-10-20T00:00:00Z"),
  a("New CEO at chipmaker", "2026-10-21T00:00:00Z"),
  a("DRAM makers raise prices again", "2026-10-21T01:00:00Z"),
  a("Allocation filing", "2026-10-21T02:00:00Z", "filing"),
]);
assert.deepEqual(
  stories.map((s) => s.title),
  ["DRAM makers raise prices again", "MCU lead times stretch to 20 weeks"],
);

// Every mock category has a link, and every linked supplier has a profile.
for (const l of LEAD_TIMES) assert.ok(CATEGORY_LINKS[l.category], `no link for ${l.category}`);
for (const { supplier } of Object.values(CATEGORY_LINKS))
  assert.ok(
    COMPANIES.some((c) => c.slug === supplier),
    `no company ${supplier}`,
  );

assert.equal(firstSentence("Lead times are stable at 12 weeks. Inventory fell."), "Lead times are stable at 12 weeks");
assert.equal(firstSentence(null), undefined);

// A digest's "not discussed" is not a quote.
assert.equal(spoken("The release does not discuss lead times."), undefined);
assert.equal(spoken("Management did not comment on inventory."), undefined);
assert.equal(spoken("Lead times are stable at 12 weeks."), "Lead times are stable at 12 weeks.");

console.log("supply read: all tests passed");
