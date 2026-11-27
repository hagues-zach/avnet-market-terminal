// The storyline route: the tray is checked before anything else, with Claude off
// the answer says so and suggests nothing, and uncached calls take from the same
// cap as the commentary route. No API calls: the key is cleared for this process.
// Run with: npx tsx src/app/api/deck/tray/storyline/route.test.ts
import assert from "node:assert/strict";
import { memoryStore } from "@/lib/ai/news-brief.fixtures";
import { callCap, deckCallCap } from "@/lib/deck/call-cap";
import { goodAnswer, marginTrend, tamFunnel, fakeClient } from "@/lib/deck/commentary.fixtures";
import { makeCommentaryPost } from "@/lib/deck/commentary-route";
import { writeDeckCommentary } from "@/lib/deck/commentary";
import { writeStoryline } from "@/lib/deck/storyline";
import { badOrder, fakeStorylineClient, goodStoryline } from "@/lib/deck/storyline.fixtures";
import { BUSY, makeStorylinePost } from "@/lib/deck/storyline-route";

delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;

async function main() {
  const { POST } = await import("./route");
  const call = async (body: unknown, handler = POST) => {
    const res = await handler(new Request("http://localhost/api/deck/tray/storyline", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  };
  const items = badOrder().items;
  const base = { title: "Microchip supplier review", audience: "supplier", items };

  let r = await call("{not json");
  assert.equal(r.status, 400);
  assert.equal(r.body.status, "failed");
  r = await call({ ...base, audience: "board" });
  assert.equal(r.status, 400, "an audience the app doesn't have");
  r = await call({ ...base, items: [{ ...items[0], preview: { ...items[0].preview, headline: "x".repeat(241) } }, items[1]] });
  assert.equal(r.status, 400, "a slide outside the tray's limits");
  r = await call({ ...base, items: [{ ...items[0], section: "one two three four five six seven" }, items[1]] });
  assert.equal(r.status, 400, "a section title outside its limits");
  r = await call({ ...base, items: [items[0], { ...items[1], included: false }] });
  assert.equal(r.status, 400, "one slide has no order to suggest");
  assert.match(r.body.message, /two slides/);
  r = await call({ ...base, items: [items[0], items[0]] });
  assert.equal(r.status, 400, "the same slide twice is still one slide");
  r = await call({ ...base, items: Array.from({ length: 26 }, (_, i) => ({ ...items[0], id: `x${i}` })) });
  assert.equal(r.status, 400, "more slides than a tray holds");
  r = await call("x".repeat(1_000_001));
  assert.equal(r.status, 413);
  const big = await POST(new Request("http://localhost/x", { method: "POST", headers: { "content-length": "2000000" }, body: "{}" }));
  assert.equal(big.status, 413, "content-length is checked first");

  // Claude off: said plainly, no order.
  r = await call(base);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "off");
  assert.equal(r.body.order, undefined);

  /* ---------- Through the handler, with a fake writer and store ---------- */

  const store = memoryStore();
  let calls = 0;
  let allow = true;
  const handler = makeStorylinePost({
    store,
    on: true,
    takeCall: () => allow,
    write: async (input) => {
      calls++;
      return writeStoryline(input, { client: fakeStorylineClient(goodStoryline(input)) });
    },
  });
  r = await call(base, handler);
  assert.equal(r.body.status, "ok");
  assert.equal(r.body.order[0], tamFunnel().id);
  assert.equal("dropped" in r.body || "usage" in r.body, false, "nothing internal goes to the browser");
  r = await call(base, handler);
  assert.equal(calls, 1, "the same deck: the stored answer, no call");
  allow = false;
  r = await call(base, handler);
  assert.equal(r.status, 200, "a stored answer isn't capped");
  r = await call({ ...base, title: "Another" }, handler);
  assert.equal(r.status, 429, "a miss over the cap waits");
  assert.equal(r.body.message, BUSY);
  assert.equal(calls, 1);

  /* ---------- One budget for both routes ---------- */

  assert.equal(deckCallCap(), deckCallCap(), "every route gets the same cap");
  const shared = callCap(2, 60_000);
  let made = 0;
  const commentary = makeCommentaryPost({
    store: memoryStore(),
    on: true,
    takeCall: shared,
    write: async (input) => (made++, writeDeckCommentary(input, { client: fakeClient(goodAnswer(input)) })),
  });
  const storyline = makeStorylinePost({ store: memoryStore(), on: true, takeCall: shared, write: async (input) => (made++, writeStoryline(input, { client: fakeStorylineClient(goodStoryline(input)) })) });
  const deck = { title: "T", audience: "internal", items: [tamFunnel(), marginTrend()] };
  assert.equal((await call(deck, commentary)).status, 200);
  assert.equal((await call(deck, storyline)).status, 200);
  const third = await call({ ...deck, title: "T2" }, storyline);
  assert.equal(third.status, 429, "the storyline waits once commentary has used the budget");
  const fourth = await call({ ...deck, title: "T2" }, commentary);
  assert.equal(fourth.status, 429, "and so does commentary");
  assert.equal(made, 2);
  console.log("storyline route.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
