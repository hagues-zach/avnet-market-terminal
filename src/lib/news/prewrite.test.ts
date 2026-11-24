// The prewrite job: only high and medium stories, newest first, stored ones
// skipped, the cap respected, failures counted. Nothing here calls Claude.
// Run with: npx tsx src/lib/news/prewrite.test.ts
import assert from "node:assert/strict";
import { BRIEF_NS, toBrief, type writeArticleBrief } from "@/lib/ai/news-brief";
import { memoryStore, story } from "@/lib/ai/news-brief.fixtures";
import { articleSlug } from "@/lib/data/live/shared";
import { pickStories, prewriteBriefs } from "./prewrite";

const at = (id: string, hour: number, kind: "news" | "filing" = "news") =>
  story({ id, url: `https://e.com/${id}`, kind, publishedAt: `2026-11-24T${String(hour).padStart(2, "0")}:00:00Z` });

async function main() {
  const articles = [at("old", 1), at("new", 9), at("mid", 5), at("low", 8), at("filing", 7, "filing"), at("unrated", 6)];
  const angles = {
    old: { relevance: "high" as const, angle: "" },
    new: { relevance: "medium" as const, angle: "" },
    mid: { relevance: "high" as const, angle: "" },
    low: { relevance: "low" as const, angle: "" },
    filing: { relevance: "high" as const, angle: "" },
  };

  // Pure pick: high and medium news only, newest first, capped.
  const p = pickStories(articles, angles, new Set([articleSlug(at("mid", 5))]), 1);
  assert.equal(p.eligible, 3);
  assert.equal(p.skipped, 1);
  assert.deepEqual(p.pick.map((a) => a.id), ["new"]);
  assert.equal(p.deferred, 1);

  // The job: writes what it picked, stores them, counts a failure, and reports cost.
  const s = memoryStore();
  const calls: string[] = [];
  const write: typeof writeArticleBrief = async (a) => {
    calls.push(a.id);
    const ok = a.id !== "old";
    return {
      brief: ok ? toBrief(a, { takeaway: "Microchip lead times are 12 weeks.", keyPoints: ["Lead times are 12 weeks."], whyItMatters: "Supply eases.", watchFor: "Peers." }, []) : null,
      usage: { input: 1000, output: 500, cacheRead: 0, cacheWrite: 0 },
      model: "claude-sonnet-5-5",
      dropped: [],
      message: ok ? undefined : "Claude declined to brief this story.",
    };
  };
  const r = await prewriteBriefs({ store: s, load: async () => ({ articles }), angles: async () => ({ byId: angles, status: "ok" }), write, on: true });
  assert.deepEqual(calls.sort(), ["mid", "new", "old"]);
  assert.equal(r.written, 2);
  assert.equal(r.failed.length, 1);
  assert.equal(r.failed[0].id, "old");
  assert.ok(r.dollars > 0);
  assert.equal(s.data.get(BRIEF_NS)?.size, 2);

  // A second run finds them stored and writes only the one that failed.
  calls.length = 0;
  const again = await prewriteBriefs({ store: s, load: async () => ({ articles }), angles: async () => ({ byId: angles, status: "ok" }), write, on: true });
  assert.deepEqual(calls, ["old"]);
  assert.equal(again.skipped, 2);

  // AI off: nothing is loaded or written.
  const off = await prewriteBriefs({ store: s, load: async () => assert.fail("should not load"), on: false });
  assert.equal(off.status, "off");

  console.log("prewrite: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
