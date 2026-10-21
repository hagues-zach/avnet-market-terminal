// Market News briefing rules. Run with: npx tsx src/lib/news/briefing.test.ts
import assert from "node:assert/strict";
import type { Angle } from "@/lib/ai/news-angles";
import type { ArticleKind, LiveArticle } from "@/lib/data/live/shared";
import { avnetExposure, dayGroup, entityOf, profiledCompanies, qbrHref, summarize, topics, topStories } from "./briefing";

const FETCHED = "2026-10-21T12:00:00Z";
const hoursAgo = (h: number) => new Date(Date.parse(FETCHED) - h * 3_600_000).toISOString();

let n = 0;
function story(hours: number, over: Partial<LiveArticle> = {}, kind: ArticleKind = "news"): LiveArticle {
  n += 1;
  return {
    id: `s${n}`,
    kind,
    title: `Story ${n}`,
    summary: "",
    outlet: "EE Times",
    url: `https://example.com/${n}`,
    publishedAt: hoursAgo(hours),
    segments: [],
    suppliers: [],
    endMarkets: [],
    regions: [],
    ...over,
  };
}
const rate = (pairs: [LiveArticle, Angle["relevance"]][]): Record<string, Angle> =>
  Object.fromEntries(pairs.map(([a, relevance]) => [a.id, { relevance, angle: "Why it matters." }]));

// Summary: last 24 hours only; high count waits for Claude.
{
  const a = story(2);
  const b = story(30);
  const f = story(5, {}, "filing");
  const r = story(6, {}, "regulatory");
  assert.deepEqual(summarize([a, b, f, r], FETCHED, null), {
    stories: 3,
    high: null,
    filings: 1,
    regulatory: 1,
  });
  assert.equal(
    summarize(
      [a, b, f, r],
      FETCHED,
      rate([
        [a, "high"],
        [b, "high"],
      ]),
    ).high,
    1,
  );
}

// Top stories: high relevance within 48 hours, newest first, no filings.
{
  const old = story(60);
  const newer = story(3);
  const older = story(20);
  const useful = story(1);
  const reg = story(10, {}, "regulatory");
  const byId = rate([
    [old, "high"],
    [newer, "high"],
    [older, "high"],
    [useful, "medium"],
    [reg, "high"],
  ]);
  const top = topStories([old, older, useful, reg, newer], FETCHED, byId);
  assert.equal(top.basis, "rated");
  assert.deepEqual(
    top.stories.map((s) => s.id),
    [newer.id, reg.id, older.id],
  );
}

// Top stories fall back to the latest news when nothing is rated high.
{
  const a = story(1);
  const b = story(4);
  const reg = story(2, {}, "regulatory");
  const top = topStories([b, reg, a], FETCHED, null);
  assert.equal(top.basis, "recent");
  assert.deepEqual(
    top.stories.map((s) => s.id),
    [a.id, b.id],
  );
  assert.equal(topStories([a], FETCHED, rate([[a, "low"]])).basis, "recent");
}

// Topics: the last 7 days only.
{
  const list = topics(
    [
      story(10, { segments: ["Memory"] }),
      story(30, { segments: ["Memory", "IP&E"] }),
      story(200, { segments: ["Memory"] }),
      story(250, { segments: ["Foundry & Equipment"] }),
      story(400, { segments: ["Memory"] }),
    ],
    FETCHED,
    "segments",
  );
  assert.deepEqual(list, [
    { name: "Memory", count: 2 },
    { name: "IP&E", count: 1 },
  ]);
}

// Exposure: mapped topics sum Avnet's mock segments; unmapped ones are null.
{
  const ana = avnetExposure("Analog & Power", "segments");
  assert.ok(ana && ana.billings > 0);
  assert.equal(avnetExposure("Foundry & Equipment", "segments"), null);
  assert.ok(avnetExposure("Automotive", "endMarkets"));
  assert.equal(avnetExposure("Energy", "endMarkets"), null);
}

// Links: supplier tags to profiles, Arrow's alias, and the QBR link.
{
  const a = story(1, {
    title: "Micron and Samsung raise DDR5 prices",
    suppliers: ["Micron", "Samsung", "Arrow"],
  });
  assert.deepEqual(
    profiledCompanies(a).map((c) => c.slug),
    ["micron", "arrow"],
  );
  assert.equal(entityOf(a), "arrow");
  assert.equal(entityOf(story(1, { suppliers: ["Arrow", "Avnet"] })), "avnet");
  const href = qbrHref(profiledCompanies(a)[0], {
    ...a,
    title: "x".repeat(300),
  });
  assert.ok(href.startsWith("/tools/qbr?company=micron&focus="));
  assert.equal(new URLSearchParams(href.split("?")[1]).get("focus")?.length, 200);
}

// Day groups by UTC calendar day.
{
  assert.equal(dayGroup("2026-10-21T00:05:00Z", FETCHED), "Today");
  assert.equal(dayGroup("2026-10-20T23:55:00Z", FETCHED), "Yesterday");
  assert.equal(dayGroup("2026-10-16T08:00:00Z", FETCHED), "Earlier this week");
  assert.equal(dayGroup("2026-10-10T08:00:00Z", FETCHED), "Older");
}

console.log("briefing: all tests passed");
