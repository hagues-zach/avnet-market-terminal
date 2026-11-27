// The commentary route: the tray is checked before anything else, and with
// Claude off the answer says so and carries no commentary. No API calls: the
// key is cleared for this process. Run with: npx tsx src/app/api/deck/tray/commentary/route.test.ts
import assert from "node:assert/strict";
import { memoryStore } from "@/lib/ai/news-brief.fixtures";
import { COMMENTARY_NS, commentaryKey, writeDeckCommentary } from "@/lib/deck/commentary";
import { fakeClient, goodAnswer, marginTrend, newsStory, tamFunnel } from "@/lib/deck/commentary.fixtures";
import { BUSY, makeCommentaryPost } from "@/lib/deck/commentary-route";
import { audienceLabel } from "@/lib/deck/outline";
import { TraySchema } from "@/lib/deck/tray";

delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;

async function main() {
  const { POST } = await import("./route");
  const call = async (body: unknown) => {
    const res = await POST(new Request("http://localhost/api/deck/tray/commentary", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  };
  const items = [marginTrend(), newsStory()];

  let r = await call("{not json");
  assert.equal(r.status, 400);
  assert.equal(r.body.status, "failed");
  r = await call({ audience: "board", items });
  assert.equal(r.status, 400, "an audience the app doesn't have");
  r = await call({ audience: "supplier", items: [{ ...items[0], preview: { ...items[0].preview, headline: "x".repeat(241) } }] });
  assert.equal(r.status, 400, "a slide outside the tray's limits");
  r = await call({ audience: "supplier", items: [{ ...items[0], commentary: { headline: "x", bullets: ["1", "2", "3", "4", "5"], writtenAt: "2026-11-25" } }] });
  assert.equal(r.status, 400, "commentary outside its limits");
  r = await call({ audience: "supplier", items: items.map((x) => ({ ...x, included: false })) });
  assert.equal(r.status, 400, "no slides in the deck");
  r = await call({ audience: "supplier", items, rewrite: "card:not-in-deck" });
  assert.equal(r.status, 400, "rewriting a slide that isn't in the deck");
  r = await call("x".repeat(1_000_001));
  assert.equal(r.status, 413);

  // Claude off: said plainly, nothing written, the deck as it is.
  r = await call({ title: "Microchip supplier review", audience: "supplier", items });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "off");
  assert.deepEqual(r.body.slides, {});
  assert.match(r.body.message, /off/);

  /* ---------- Through the handler, with a fake writer and store ---------- */

  const store = memoryStore();
  let calls = 0;
  let allow = true;
  const answers: ((input: Parameters<typeof writeDeckCommentary>[0]) => ReturnType<typeof goodAnswer>)[] = [];
  const handler = makeCommentaryPost({
    store,
    on: true,
    takeCall: () => allow,
    write: async (input) => {
      calls++;
      const make = answers.shift() ?? goodAnswer;
      return writeDeckCommentary(input, { client: fakeClient(make(input)), now: () => "2026-11-25" });
    },
  });
  const deck = [tamFunnel(), marginTrend(), newsStory()];
  const send = async (body: unknown) => {
    const res = await handler(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  };
  const base = { title: "Microchip supplier review", audience: "supplier", items: deck };

  r = await send(base);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "ok");
  assert.equal(Object.keys(r.body.slides).length, 3);
  assert.equal(r.body.summary.lines.length >= 1, true);
  assert.equal("dropped" in r.body || "usage" in r.body || "raw" in r.body, false, "nothing internal goes to the browser");
  const first = r.body;
  r = await send(base);
  assert.equal(calls, 1, "the same deck: the stored answer, no call");
  allow = false;
  r = await send(base);
  assert.equal(r.status, 200, "a stored answer isn't capped");
  r = await send({ ...base, title: "Another title" });
  assert.equal(r.status, 429, "a miss over the cap waits");
  assert.equal(r.body.message, BUSY);
  assert.equal(calls, 1);
  r = await send({ ...base, rewrite: deck[1].id });
  assert.equal(r.status, 429, "so does a rewrite");
  allow = true;

  // A rewrite returns that slide only and changes only that slide in the stored answer.
  answers.push((input) => {
    const a = goodAnswer(input);
    return { ...a, slides: a.slides.map((x) => ({ ...x, bullets: [...x.bullets.slice(0, 1), "Both rose each quarter."] })) };
  });
  r = await send({ ...base, rewrite: deck[1].id });
  assert.equal(r.body.status, "ok");
  assert.deepEqual(Object.keys(r.body.slides), [deck[1].id]);
  const stored = (await store.get<{ slides: Record<string, { bullets: string[] }>; summary: unknown }>(COMMENTARY_NS, commentaryKey({ title: base.title, audience: audienceLabel("supplier"), items: TraySchema.parse(deck) })))!;
  assert.deepEqual(stored.slides[deck[0].id], first.slides[deck[0].id], "the slides the reader kept are unchanged");
  assert.deepEqual(stored.summary, first.summary, "and so is the summary");
  assert.deepEqual(stored.slides[deck[1].id].bullets, r.body.slides[deck[1].id].bullets);
  // A rewrite that doesn't hold up leaves the old one.
  answers.push((input) => ({ ...goodAnswer(input), slides: goodAnswer(input).slides.map((x) => (x.id === deck[1].id ? { ...x, headline: "Up 66.6%", text: "", bullets: [], notes: "" } : x)) }));
  r = await send({ ...base, rewrite: deck[1].id });
  assert.equal(r.body.status, "failed");
  assert.match(r.body.message, /old one stays/);
  // Notes on the cache paths: a hit returns the stored notes; a rewrite replaces that slide's notes only.
  const before = (await send(base)).body;
  assert.ok(before.slides[deck[0].id].notes, "a cache hit carries the stored notes");
  answers.push((input) => ({ ...goodAnswer(input), slides: goodAnswer(input).slides.map((x) => (x.id === deck[1].id ? { ...x, notes: "Arrow reached 11.2% in Q3 2026, so the gap held." } : x)) }));
  r = await send({ ...base, rewrite: deck[1].id });
  assert.equal(r.body.slides[deck[1].id].notes, "Arrow reached 11.2% in Q3 2026, so the gap held.");
  const after = (await send(base)).body;
  assert.equal(after.slides[deck[1].id].notes, "Arrow reached 11.2% in Q3 2026, so the gap held.", "the stored answer has the rewritten notes");
  assert.equal(after.slides[deck[0].id].notes, before.slides[deck[0].id].notes, "the other slides' notes stay put");
  // A rewrite whose on-slide pieces fail and whose notes pass still fails: the old commentary stays.
  answers.push((input) => ({ ...goodAnswer(input), slides: goodAnswer(input).slides.map((x) => (x.id === deck[1].id ? { ...x, headline: "Up 66.6%", text: "", bullets: [], notes: "The gap held all year." } : x)) }));
  r = await send({ ...base, rewrite: deck[1].id });
  assert.equal(r.body.status, "failed", "notes alone don't replace the slide's commentary");
  assert.match(r.body.message, /old one stays/);
  console.log("commentary route.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
