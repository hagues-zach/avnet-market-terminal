// Article briefs: the prompt, grounding, the write path against a fake client,
// store-first reads, and the Opus vs Sonnet eval's checks and tally. Nothing here
// calls Claude. Run with: npx tsx src/lib/ai/news-brief.test.ts
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { articleSlug } from "@/lib/data/live/shared";
import { memoryStore, story } from "./news-brief.fixtures";
import {
  BRIEF_NS,
  briefCost,
  briefModel,
  getArticleBrief,
  getStoredArticle,
  render,
  storedRecord,
  systemBlocks,
  toBrief,
  writeArticleBrief,
  type BriefOutput,
  type StoredArticle,
} from "./news-brief";
import { blindOrder, checkBrief, pickSample, strayCompanies, tally, type Run } from "./news-brief-eval";

const GOOD: BriefOutput = {
  takeaway: "Microchip says microcontroller lead times are down to 12 weeks and expects distributors to restock next quarter.",
  keyPoints: [
    "Microchip says microcontroller lead times have fallen to 12 weeks.",
    "It expects distributors to restock in the March quarter.",
    "It ties the recovery to industrial demand in Europe.",
  ],
  whyItMatters:
    "Shorter MCU lead times ease allocation for industrial customers, which Avnet's Electronic Components business serves in EMEA. If Avnet carries the line, a restock means more channel inventory to plan for in the March quarter.",
  watchFor: "Whether other MCU makers report the same lead times.",
};

const fakeClient = (answer: BriefOutput | undefined, stop = "end_turn", seen: unknown[] = []) =>
  ({
    beta: {
      messages: {
        parse: async (params: unknown) => {
          seen.push(params);
          return { stop_reason: stop, usage: { input_tokens: 900, output_tokens: 300, cache_read_input_tokens: 1500, cache_creation_input_tokens: 0 }, parsed_output: answer };
        },
      },
    },
  }) as unknown as Anthropic;

async function main() {
  // The model: NEWS_BRIEF_MODEL when it names a known model, the app default otherwise.
  assert.equal(briefModel("claude-sonnet-5-5"), "claude-sonnet-5-5");
  assert.equal(briefModel("gpt-9"), "claude-opus-5-5");
  assert.equal(briefModel(undefined), "claude-opus-5-5");
  assert.ok(Math.abs(briefCost("claude-sonnet-5-5", { input: 1e6, output: 0, cacheRead: 0, cacheWrite: 0 }) - 2) < 1e-9);

  // The prompt: the story with its tags; the profile rides in a cached system block.
  const prompt = render(story());
  assert.match(prompt, /<suppliers>Microchip<\/suppliers>/);
  assert.match(prompt, /<end_markets>Industrial<\/end_markets>/);
  assert.match(prompt, /<text>\nMicrochip Technology said/);
  assert.doesNotMatch(render(story({ body: undefined })), /<text>/);
  const blocks = systemBlocks("<avnet_profile>test</avnet_profile>");
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[1].cache_control, { type: "ephemeral" });
  assert.match(systemBlocks()[1].text, /Electronic Components/);

  // Grounding: a figure not in the story and an Avnet internal metric are dropped, the rest kept.
  const dropped: string[] = [];
  const b = toBrief(story(), { ...GOOD, whyItMatters: `${GOOD.whyItMatters} Prices could rise 15%. Avnet's backlog on these lines is 12 weeks deep.` }, dropped);
  assert.ok(b);
  assert.equal(b.whyItMatters, GOOD.whyItMatters);
  assert.equal(dropped.length, 2);
  assert.equal(toBrief(story(), { ...GOOD, takeaway: "Lead times fell 40%." }, []), null, "no brief when the takeaway fails");
  assert.equal(toBrief(story({ body: undefined }), GOOD, [])?.thin, true);

  // The write path: usage recorded, the profile sent as system blocks, refusals and cut-offs reported.
  const seen: { system: unknown; model: string }[] = [];
  const ok = await writeArticleBrief(story(), { client: fakeClient(GOOD, "end_turn", seen), model: "claude-sonnet-5-5", system: blocks });
  assert.ok(ok.brief);
  assert.equal(ok.model, "claude-sonnet-5-5");
  assert.equal(ok.usage.cacheRead, 1500);
  assert.equal(seen[0].model, "claude-sonnet-5-5");
  assert.deepEqual(seen[0].system, blocks);
  assert.match((await writeArticleBrief(story(), { client: fakeClient(undefined, "refusal"), system: blocks })).message ?? "", /declined/);
  assert.match((await writeArticleBrief(story(), { client: fakeClient(GOOD, "max_tokens"), system: blocks })).message ?? "", /cut off/);

  // Store first: a stored brief is returned without writing; otherwise one is written and stored under v2.
  const s = memoryStore();
  let writes = 0;
  const write: typeof writeArticleBrief = async (a) => {
    writes += 1;
    return { brief: toBrief(a, GOOD, []), usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }, model: "claude-opus-5-5", dropped: [] };
  };
  const first = await getArticleBrief(story(), { store: s, write, on: true });
  assert.equal(first.status, "ok");
  const saved = s.data.get(BRIEF_NS)?.get(articleSlug(story())) as StoredArticle;
  assert.equal(saved.model, "claude-opus-5-5");
  assert.equal("body" in saved.article, false, "feed text is never stored");
  await getArticleBrief(story(), { store: s, write, on: true });
  assert.equal(writes, 1, "the second read comes from the store");
  assert.equal((await getArticleBrief(story({ url: "https://example.com/other", id: "https://example.com/other" }), { store: s, write, on: false })).status, "off");

  // A brief from before v2 still opens.
  const legacy = memoryStore();
  await legacy.set("news-briefs-v1", "oldslug", storedRecord(story(), toBrief(story(), GOOD, [])!, "claude-opus-5-5"));
  assert.ok(await getStoredArticle("oldslug", legacy));

  // Eval checks: a good brief passes; planted mistakes are caught.
  assert.deepEqual(checkBrief(story(), toBrief(story(), GOOD, []), GOOD, []), []);
  const noLink = { ...GOOD, whyItMatters: "This is interesting news. Readers should keep an eye on it." };
  assert.ok(checkBrief(story(), toBrief(story(), noLink, []), noLink, []).includes("why it matters names no concrete Avnet link"));
  const claim = { ...GOOD, whyItMatters: "Microchip is a key Avnet supplier, so this matters. Lead times ease for industrial customers." };
  assert.ok(checkBrief(story(), toBrief(story(), claim, []), claim, []).includes("claims who is an Avnet customer or supplier"));
  const dashed = { ...GOOD, watchFor: "Watch Microchip — and its peers." };
  assert.ok(checkBrief(story(), toBrief(story(), dashed, []), dashed, []).includes("used dashes"));
  assert.deepEqual(strayCompanies("Microchip and Infineon both cut lead times.", "Microchip cut lead times."), ["Infineon"]);
  const leak = { ...GOOD, whyItMatters: `${GOOD.whyItMatters} Acme Robotics will want to know.` };
  assert.ok(checkBrief(story(), toBrief(story(), leak, []), leak, [], { topCustomers: ["Acme Robotics"] }).some((f) => f.startsWith("mentions internal names")));

  // Sampling skips filings and low relevance, and mixes kinds of story.
  const pool = [
    story({ id: "a", url: "https://e.com/a" }),
    story({ id: "b", url: "https://e.com/b", body: undefined }),
    story({ id: "c", url: "https://e.com/c", kind: "filing" }),
    story({ id: "d", url: "https://e.com/d" }),
  ];
  const picked = pickSample(pool, { a: "high", b: "medium", c: "high", d: "low" }, 5).map((p) => p.article.id);
  assert.deepEqual(picked.sort(), ["a", "b"]);

  // Blinding is stable per story; the tally applies the decision rule.
  assert.deepEqual(blindOrder("abc"), blindOrder("abc"));
  const arm = (fails: string[] = []) => ({ brief: null, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, dollars: 0.02, ms: 3000, dropped: [], fails });
  const run: Run = {
    ranAt: "2026-11-24",
    rows: ["s1", "s2", "s3"].map((slug) => ({
      slug,
      title: slug,
      outlet: "x",
      url: "u",
      thin: false,
      order: ["claude-opus-5-5", "claude-sonnet-5-5"] as const as ["claude-opus-5-5", "claude-sonnet-5-5"],
      arms: { "claude-opus-5-5": arm(), "claude-sonnet-5-5": arm() },
    })),
  };
  const votes = (picks: ("A" | "B" | "tie")[]) => picks.map((pick, i) => ({ slug: `s${i + 1}`, pick, votedAt: "t" }));
  assert.equal(tally(run, votes(["A", "B", "tie"])).pick, "claude-sonnet-5-5", "a tie on wins goes to the cheaper model");
  assert.equal(tally(run, votes(["A", "A", "A"])).pick, "claude-opus-5-5");
  run.rows[0].arms["claude-sonnet-5-5"].fails = ["no brief"];
  assert.equal(tally(run, votes(["A", "B", "tie"])).pick, "claude-opus-5-5", "more failing stories rules Sonnet out");
  assert.equal(tally(run, []).pick, undefined);

  console.log("news-brief: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
