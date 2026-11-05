// Tiered story summaries (phase B3) and their offline eval. Nothing here calls
// Claude: the call path runs against a fake client. Run with: npx tsx src/lib/brief/synthesis.test.ts
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import type { Store } from "@/lib/store/types";
import { FIXTURES } from "./fixtures";
import { TEST_PROFILES } from "./profile";
import { costOf, groundText, renderStory, storiesFor, summarizeStories, SUMMARY_NS, writeSummary, type StorySummary, type Usage } from "./synthesis";
import { estimateCost, grade, internalFigures, RECORDED, runOffline } from "./synthesis-eval";

function memoryStore(): Store & { data: Map<string, Map<string, unknown>> } {
  const data = new Map<string, Map<string, unknown>>();
  const ns = (n: string) => data.get(n) ?? data.set(n, new Map()).get(n)!;
  return {
    data,
    get: async <T>(n: string, k: string) => ns(n).get(k) as T | undefined,
    getAll: async <T>(n: string) => Object.fromEntries(ns(n)) as Record<string, T>,
    set: async (n, k, v) => void ns(n).set(k, v),
    setMany: async (n, entries) => void Object.entries(entries).forEach(([k, v]) => ns(n).set(k, v)),
  };
}

const item = (id: string) => FIXTURES.normal.items.find((i) => i.id === id)!;
const noUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, dropped: [] });

async function main() {
  // Grounding: a sentence with a figure the source lacks goes; one stating an Avnet internal metric goes even with a known figure.
  const dropped: string[] = [];
  const evidence = "Microchip said book-to-bill rose to 1.05.";
  assert.equal(groundText("Book-to-bill rose to 1.05. Prices rose 15%. Avnet's backlog on these lines tracks the 1.05 ratio.", evidence, dropped), "Book-to-bill rose to 1.05.");
  assert.equal(dropped.length, 2);
  assert.equal(groundText("Lead times — about 8–12 weeks.", "8 to 12 weeks", []), "Lead times, about 8 to 12 weeks.", "dashes are written out");

  // The offline eval passes, and its planted mistakes were caught by grounding, not by luck.
  const rows = runOffline();
  assert.deepEqual(rows.filter((r) => r.fails.length).map((r) => `${r.id}: ${r.fails.join("; ")}`), [], "every synthesis eval case passes");
  assert.equal(rows.reduce((t, r) => t + r.usage.dropped.length, 0), RECORDED.reduce((t, r) => t + r.expectDropped, 0));

  // The grader catches what grounding would have removed: grade the raw answer as if nothing were dropped.
  const internal = internalFigures();
  assert.ok(internal.has("8750"), "internal figures include Avnet's mock backlog");
  const raw = RECORDED.find((r) => r.id === "microchip-mcu-lead")!;
  const ungroundedSummary: StorySummary = {
    id: raw.id,
    title: item(raw.id).title,
    sources: [{ outlet: "EPS News", url: item(raw.id).url, publishedAt: item(raw.id).publishedAt }],
    tiers: raw.answer,
    writtenAt: "2026-11-05",
    model: "test",
  };
  const caught = grade(item(raw.id), ungroundedSummary, noUsage(), internal).join(" | ");
  assert.match(caught, /Avnet internal figures: 8750/);
  assert.match(caught, /states an Avnet internal metric/);
  const noLink = grade(item(raw.id), { ...ungroundedSummary, sources: [] }, noUsage(), internal).join(" | ");
  assert.match(noLink, /missing its source link/);

  // The prompt is the story only.
  const prompt = renderStory(item("microchip-mcu-lead"));
  assert.match(prompt, /<headline>Microchip says MCU lead times are back to normal<\/headline>/);
  assert.doesNotMatch(prompt, /8750|backlog/i);

  // The call path, against a fake client: usage is recorded and costed, the answer is grounded.
  const fake = {
    beta: {
      messages: {
        parse: async () => ({
          stop_reason: "end_turn",
          usage: { input_tokens: 600, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
          parsed_output: raw.answer,
        }),
      },
    },
  } as unknown as Anthropic;
  const live = await writeSummary(item(raw.id), fake);
  assert.ok(live.summary);
  assert.equal(live.usage.dropped.length, 2);
  assert.equal(costOf(live.usage), (600 * 4 + 500 * 20) / 1e6);
  const refused = await writeSummary(item(raw.id), { beta: { messages: { parse: async () => ({ stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } }) } } } as unknown as Anthropic);
  assert.equal(refused.summary, null);

  // Shared and stored: a story is written once; filings use the template; with Claude off only stored ones come back.
  const s = memoryStore();
  let calls = 0;
  const write: typeof writeSummary = async (i) => {
    calls += 1;
    const r = RECORDED.find((x) => x.id === i.id) ?? RECORDED[1];
    return writeSummary(i, { beta: { messages: { parse: async () => ({ stop_reason: "end_turn", usage: { input_tokens: 600, output_tokens: 500 }, parsed_output: r.answer }) } } } as unknown as Anthropic);
  };
  const stories = [item("micron-hbm-capacity"), item("sec-micron-8k"), item("ti-sherman-fab")];
  const first = await summarizeStories(stories, { store: s, write, on: true });
  assert.equal(first.written, 2);
  assert.equal(calls, 2, "the filing needs no call");
  assert.equal(first.byId["sec-micron-8k"].tiers.beginner.summary, "Micron filed an 8-K with the SEC: results of operations.");
  assert.ok(first.dollars > 0);
  const again = await summarizeStories(stories, { store: s, write, on: true });
  assert.equal(calls, 2, "stored summaries are reused across users and runs");
  assert.equal(again.written, 0);
  assert.deepEqual([...s.data.get(SUMMARY_NS)!.keys()].sort(), ["micron-hbm-capacity", "ti-sherman-fab"]);
  const off = await summarizeStories([item("onsemi-sic-tesla"), item("micron-hbm-capacity")], { store: s, write, on: false });
  assert.deepEqual(Object.keys(off.byId), ["micron-hbm-capacity"]);
  assert.equal(calls, 2);

  // The day's stories are the union of every brief's picks, each once.
  const day = storiesFor(FIXTURES.normal, TEST_PROFILES);
  assert.equal(new Set(day.map((i) => i.id)).size, day.length);
  assert.ok(day.some((i) => i.id === "micron-hbm-capacity") && day.some((i) => i.id === "microchip-mcu-lead"));

  // The estimate is in a sane range.
  const e = estimateCost();
  assert.ok(e.perStory > 0.002 && e.perStory < 0.05, `estimate ${e.perStory}`);

  console.log("brief synthesis: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
