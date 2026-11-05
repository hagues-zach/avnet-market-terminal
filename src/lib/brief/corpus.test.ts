// The morning brief's daily corpus (phase B1). Run with: npx tsx src/lib/brief/corpus.test.ts
import assert from "node:assert/strict";
import type { Angles } from "@/lib/ai/news-angles";
import type { LiveArticle, LiveNews } from "@/lib/data/live/shared";
import { tagArticle } from "@/lib/data/live/tagging";
import type { Store } from "@/lib/store/types";
import { buildCorpus, CORPUS_NS, easternDate, getCorpus, runCorpusJob, type Corpus } from "./corpus";
import { parseTopCustomers, topCustomers } from "./top-customers";

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

const article = (id: string, title: string, over: Partial<LiveArticle> = {}): LiveArticle => ({
  id,
  kind: "news",
  title,
  summary: "",
  outlet: "EE Times",
  url: id,
  publishedAt: "2026-11-05T01:00:00.000Z",
  ...tagArticle(title),
  ...over,
});

const news = (articles: LiveArticle[], fetchedAt = "2026-11-05T07:00:00.000Z"): LiveNews => ({
  articles,
  sources: [
    { outlet: "EE Times", ok: true, count: articles.length },
    { outlet: "GDELT", ok: false, count: 0 },
  ],
  fetchedAt,
});

const off = async (): Promise<Angles> => ({ byId: {}, status: "off" });

async function main() {
  // Eastern briefing day: 03:00 UTC on Nov 5 is still Nov 4 in New York.
  assert.equal(easternDate(new Date("2026-11-05T03:00:00Z")), "2026-11-04");
  assert.equal(easternDate(new Date("2026-11-05T07:00:00Z")), "2026-11-05");
  assert.equal(easternDate(new Date("2026-07-01T03:30:00Z")), "2026-06-30", "summer time too");

  // Top customers: matched to the universe's spelling; unknown names are reported, not flagged.
  const parsed = parseTopCustomers([" apple", "Jabil", "Acme Widgets", ""]);
  assert.deepEqual([...parsed.top], ["Apple", "Jabil"]);
  assert.deepEqual(parsed.unknown, ["Acme Widgets"]);
  assert.deepEqual([...topCustomers("Ford,Tesla", "/nonexistent")], ["Ford", "Tesla"], "the variable wins");
  assert.equal(topCustomers("", "/nonexistent").size, 0, "nothing flagged without a list");

  // Building: stamps, customer facet, top-customer flag, ratings, dedup.
  const a = article("https://eetimes.com/a", "Apple orders more modems from Qualcomm");
  const b = article("https://eetimes.com/b", "Jabil expands in Mexico");
  const dupe = article("https://www.eetimes.com/a/", "Apple orders more modems (repost)");
  const now = new Date("2026-11-05T07:05:00Z");
  const c = buildCorpus({
    news: news([a, b, dupe]),
    now,
    topCustomers: new Set(["Apple"]),
    angles: { [a.id]: { relevance: "high", angle: "Modem demand at Apple." } },
    anglesStatus: "partial",
  });
  assert.equal(c.date, "2026-11-05");
  assert.equal(c.builtAt, now.toISOString());
  assert.equal(c.fetchedAt, "2026-11-05T07:00:00.000Z");
  assert.equal(c.items.length, 2, "the same URL in another form is a duplicate");
  assert.deepEqual(c.items[0].customers, ["Apple"]);
  assert.deepEqual(c.items[0].topCustomers, ["Apple"]);
  assert.deepEqual(c.items[1].topCustomers, [], "Jabil is a customer but not flagged top");
  assert.equal(c.items[0].relevance, "high");
  assert.equal(c.items[1].relevance, undefined);
  assert.equal(c.items[0].sourceId, a.id);
  assert.ok(c.items.every((i) => i.ingestedAt === now.toISOString() && i.publishedAt));
  assert.equal(c.angles, "partial");

  // First-seen stamps carry over from earlier corpora.
  const earlier = { ...c, items: c.items.map((i) => ({ ...i, ingestedAt: "2026-11-04T07:05:00.000Z" })) } as Corpus;
  const next = buildCorpus({ news: news([a, article("https://eetimes.com/c", "Ford delays EV")]), now, previous: [earlier] });
  assert.equal(next.items[0].ingestedAt, "2026-11-04T07:05:00.000Z", "seen yesterday keeps yesterday's stamp");
  assert.equal(next.items[1].ingestedAt, now.toISOString(), "new today is stamped today");

  // The job: saves by Eastern day, counts what is new since the last briefing day, keeps stamps on a rerun.
  const s = memoryStore();
  const r1 = await runCorpusJob({ now: new Date("2026-11-04T07:00:00Z"), fetchNews: async () => news([a]), rate: off, store: s, topCustomers: new Set() });
  assert.deepEqual(r1, { date: "2026-11-04", items: 1, newItems: 1, topCustomerItems: 0, sourcesDown: ["GDELT"], angles: "off" });

  const day2 = new Date("2026-11-05T07:00:00Z");
  const r2 = await runCorpusJob({ now: day2, fetchNews: async () => news([a, b]), rate: off, store: s, topCustomers: new Set(["Apple"]) });
  assert.equal(r2.items, 2);
  assert.equal(r2.newItems, 1, "only b is new since yesterday");
  assert.equal(r2.topCustomerItems, 1);
  const saved = await getCorpus("2026-11-05", s);
  assert.equal(saved?.items.find((i) => i.id === a.id)?.ingestedAt, "2026-11-04T07:00:00.000Z");

  const rerun = new Date("2026-11-05T08:00:00Z");
  await runCorpusJob({ now: rerun, fetchNews: async () => news([a, b]), rate: off, store: s, topCustomers: new Set() });
  const again = await getCorpus("2026-11-05", s);
  assert.equal(again?.builtAt, rerun.toISOString(), "a rerun replaces the day's corpus");
  assert.equal(again?.items.find((i) => i.id === b.id)?.ingestedAt, day2.toISOString(), "and keeps first-seen stamps");
  assert.deepEqual([...s.data.get(CORPUS_NS)!.keys()].sort(), ["2026-11-04", "2026-11-05"]);
  assert.equal(await getCorpus("2026-11-06", s), null, "no corpus before the job runs");

  console.log("brief corpus: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
