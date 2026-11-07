// Lead Times & Signals adapter. Run with: npx tsx src/lib/data/live/lead-times.test.ts
import assert from "node:assert/strict";
import type { LiveArticle } from "./shared";
import { tagArticle } from "./tagging";
import {
  getLeadTimes,
  feedArticles,
  isLeadTimeStory,
  leadSentence,
  leadStories,
  leadWay,
  parseFredMonthly,
  parseGdelt,
  parseGscpiRows,
  parseSourceabilityList,
  quotedWeeks,
  segmentReads,
  yearAgo,
  type LeadIndicator,
  type LeadSources,
} from "./lead-times";

const NOW = Date.parse("2026-11-06T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

function article(title: string, summary = "", publishedAt = daysAgo(1), url = `https://example.com/${encodeURIComponent(title)}`): LiveArticle {
  return { id: url, kind: "news", title, summary, outlet: "EE Times", url, publishedAt, ...tagArticle(`${title}\n${summary}`) };
}

// ---- Screening ----
assert.ok(isLeadTimeStory("DRAM lead times stretch to 52 weeks as AI servers soak up supply"));
assert.ok(isLeadTimeStory("MLCC makers put customers on allocation"), "allocation in a tagged segment");
assert.ok(isLeadTimeStory("Distributors warn of component shortages into 2027"), "untagged but about components");
assert.ok(!isLeadTimeStory("Nvidia beats estimates on data-center demand"), "no lead-time language");
assert.ok(!isLeadTimeStory("Hospital staffing shortages ease in the Midwest"), "lead-time language but not components");
assert.ok(!isLeadTimeStory("Power chip startup navigates industry talent shortages"), "a talent shortage is not a supply shortage");

// ---- Direction ----
assert.equal(leadWay("DRAM lead times stretch to 52 weeks"), "longer");
assert.equal(leadWay("Passive lead times ease as inventory normalizes"), "easing");
assert.equal(leadWay("MCU lead times hold steady"), null, "no direction word");
assert.equal(leadWay("Lead times: what buyers should know", "Analysts expect lead times to shorten next quarter"), "easing", "falls back to the snippet");
assert.equal(leadWay("Memory tightens while analog eases"), null, "mixed headline");

// ---- Weeks ----
assert.deepEqual(quotedWeeks("STMicro MCUs at 52 weeks"), { low: 52, high: 52, text: "52 weeks" });
assert.deepEqual(quotedWeeks("NAND lead times of 24-52 weeks"), { low: 24, high: 52, text: "24-52 weeks" });
assert.deepEqual(quotedWeeks("MLCC from 16 to 20 weeks"), { low: 16, high: 20, text: "16-20 weeks" });
assert.deepEqual(quotedWeeks("a 12-week lead time"), { low: 12, high: 12, text: "12 weeks" });
assert.equal(quotedWeeks("over 300 weeks"), null, "implausible");
assert.equal(quotedWeeks("lead times rising"), null);

// ---- Stories: screening, dedup, age ----
const lists = [
  [
    article("DRAM lead times stretch to 52 weeks as AI servers soak up supply", "", daysAgo(1), "https://a.com/1"),
    article("Nvidia beats estimates", "", daysAgo(1), "https://a.com/2"),
    article("Memory makers raise prices again, allocation spreads", "", daysAgo(3), "https://a.com/3"),
    article("Old news: DRAM shortage", "", daysAgo(45), "https://a.com/4"),
  ],
  [article("DRAM lead times stretch to 52 weeks as AI servers soak up supply", "", daysAgo(1), "https://gdelt.example/1")],
];
const stories = leadStories(lists, NOW);
assert.deepEqual(
  stories.map((s) => s.url),
  ["https://a.com/1", "https://a.com/3"],
  "drops off-topic, stale and duplicate-title stories; newest first",
);
assert.deepEqual(stories[0].weeks, { low: 52, high: 52, text: "52 weeks" });
assert.ok(stories[0].segments.includes("Memory"));

// ---- Segment reads ----
const reads = segmentReads(stories, ["Memory", "IP&E"]);
assert.equal(reads[0].verdict, "longer");
assert.equal(reads[0].longer, 2);
assert.equal(reads[0].quoted?.weeks.text, "52 weeks");
assert.equal(reads[0].latest?.url, "https://a.com/1");
assert.equal(reads[1].verdict, "quiet");
assert.equal(reads[1].stories, 0);
const mixed = segmentReads(
  leadStories([[article("DRAM lead times lengthen", "", daysAgo(1), "https://m/1"), article("NAND lead times ease", "", daysAgo(2), "https://m/2")]], NOW),
  ["Memory"],
);
assert.equal(mixed[0].verdict, "mixed", "one each way is mixed, not a trend");
const thin = segmentReads(leadStories([[article("DRAM lead times lengthen", "", daysAgo(1), "https://t/1")]], NOW), ["Memory"]);
assert.equal(thin[0].verdict, "thin", "one story is too few to call");

// ---- GDELT ----
const gdelt = parseGdelt(
  JSON.stringify({
    articles: [
      { url: "https://x.com/a", title: "Chip  shortage  hits automakers", seendate: "20261101T080000Z", domain: "x.com" },
      { url: "ftp://bad", title: "skip", seendate: "20261101T080000Z" },
      { url: "https://x.com/b", title: "no date" },
    ],
  }),
);
assert.equal(gdelt.length, 1);
assert.equal(gdelt[0].title, "Chip shortage hits automakers");
assert.equal(gdelt[0].publishedAt, "2026-11-01T08:00:00.000Z");
assert.throws(() => parseGdelt("Please limit requests"), "rate-limit text is a failure, not an empty list");

// ---- Feeds ----
const feed = feedArticles(
  "Supply Chain Dive",
  `<rss><channel><item><title>Apple boosts purchase commitments amid memory crunch</title><link>https://scd.example/a</link><pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate><description>DRAM supply is tight.</description></item><item><title>No date</title><link>https://scd.example/b</link></item></channel></rss>`,
);
assert.equal(feed.length, 1, "items without a date are dropped");
assert.ok(feed[0].segments.includes("Memory"));
assert.equal(feed[0].publishedAt.slice(0, 10), "2026-11-04");

// ---- GSCPI ----
const gscpi = parseGscpiRows([["Date", "GSCPI"], [], ["31-Sep-2026", 1.36], ["31-Oct-2026", 1.26], [46022, 0.5], ["bad", 2]]);
assert.deepEqual(gscpi, [
  { date: "2025-12", value: 0.5 },
  { date: "2026-09", value: 1.36 },
  { date: "2026-10", value: 1.26 },
]);
assert.throws(() => parseGscpiRows([["Date", "GSCPI"]]));

// ---- FRED ----
assert.deepEqual(parseFredMonthly("observation_date,A34SUO\n2026-08-01,160859\n2026-09-01,.\n2026-10-01,162406\n"), [
  { date: "2026-08", value: 160859 },
  { date: "2026-10", value: 162406 },
]);
assert.throws(() => parseFredMonthly("<!DOCTYPE html><script></script>"), "a bot-screen page is a failure");

// ---- Sourceability list ----
const html = `<h1>Lead Time Reports</h1>
<a href="/post/q2-2026-lead-time-report-highlights" class="card"><div class="mini-headline-small">7.14.26</div><div class="under-trending-heading">Q2 2026 Lead Time Report Highlights</div><div class="cta-text">Read the article</div></a>
<a href="/post/q3-2026-lead-time-report-highlights" class="card"><div class="mini-headline-small">10.14.26</div><div class="under-trending-heading">Q3 2026 Lead Time Report Highlights</div></a>
<a href="/post/q3-2026-lead-time-report-highlights">dup</a>
<a href="/post/some-other-news"><div>4.1.26</div><div>Other</div></a>`;
const reports = parseSourceabilityList(html);
assert.deepEqual(
  reports.map((r) => [r.title, r.date, r.url]),
  [
    ["Q3 2026 Lead Time Report Highlights", "2026-10-14", "https://sourceability.com/post/q3-2026-lead-time-report-highlights"],
    ["Q2 2026 Lead Time Report Highlights", "2026-07-14", "https://sourceability.com/post/q2-2026-lead-time-report-highlights"],
  ],
);

// ---- The sentence ----
const ind = (key: string, values: number[], unit: LeadIndicator["unit"] = "sd"): LeadIndicator => ({
  key,
  label: key,
  detail: "",
  reading: "",
  unit,
  source: "",
  sourceUrl: "",
  points: values.map((value, i) => ({ date: `2025-${String(i + 1).padStart(2, "0")}`, value })),
});
assert.equal(leadSentence(reads, [ind("gscpi", [0.2, 1.26])]), "Lead-time news points longer in Memory. Global supply-chain pressure is above normal (+1.26).");
assert.equal(leadSentence(segmentReads([], ["Memory"]), []), "Little lead-time news in the last month.");
assert.equal(yearAgo(ind("x", Array.from({ length: 13 }, (_, i) => i))), 12);
assert.equal(yearAgo(ind("x", [1, 2])), undefined);
assert.ok(Math.abs(yearAgo(ind("x", [...Array(12).fill(100), 110], "usd-millions"))! - 0.1) < 1e-9);

// ---- Failure isolation ----
async function main() {
  const down = () => Promise.reject(new Error("offline"));
  const sources: LeadSources = {
    news: async () => lists[0],
    supplyChain: async () => [article("Apple boosts purchase commitments amid memory crunch", "", daysAgo(2), "https://scd/1")],
    gdelt: down,
    sourceability: down,
    indicators: [
      { outlet: "GSCPI", load: async () => [ind("gscpi", [1, 2])] },
      { outlet: "Census", load: down },
    ],
  };
  const out = await getLeadTimes(sources, NOW);
  assert.equal(out.stories.length, 3, "stories survive GDELT being down");
  assert.equal(out.indicators.length, 1, "one series down leaves the others");
  assert.ok(out.reports.some((r) => r.publisher === "ECIA"), "fixed links are always there");
  assert.deepEqual(
    out.sources.map((s) => [s.outlet, s.ok, s.count]),
    [
      ["Market News feeds", true, 2],
      ["Supply Chain Dive", true, 1],
      ["GDELT", false, 0],
      ["Sourceability", false, 0],
      ["GSCPI", true, 1],
      ["Census", false, 0],
    ],
  );

  const allDown = await getLeadTimes({ news: down, supplyChain: down, gdelt: down, sourceability: down, indicators: [{ outlet: "GSCPI", load: down }] }, NOW);
  assert.equal(allDown.stories.length, 0);
  assert.equal(allDown.segments.every((s) => s.verdict === "quiet"), true);
  assert.ok(allDown.sources.every((s) => !s.ok));

  console.log("lead-times: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
