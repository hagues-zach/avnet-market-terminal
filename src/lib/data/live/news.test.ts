// GDELT outage handling in Market News. Run with: npx tsx src/lib/data/live/news.test.ts
import assert from "node:assert/strict";
import { REVALIDATE_SECONDS } from "./shared";
import { getLiveNews } from "./news";

let gdeltCalls = 0;
let gdeltUp = false;
const originalNow = Date.now;
let now = originalNow();
Date.now = () => now;

// Every source fails fast except GDELT when it is up, so only GDELT's calls matter here.
globalThis.fetch = (async (input: string | URL | Request) => {
  if (!String(input).includes("gdeltproject.org")) throw new Error("offline");
  gdeltCalls += 1;
  if (!gdeltUp) throw new Error("timed out");
  return new Response(JSON.stringify({ articles: [] }));
}) as typeof fetch;

const gdeltOk = async () => (await getLiveNews()).sources.find((s) => s.outlet === "GDELT")?.ok;

async function main() {
  assert.equal(await gdeltOk(), false, "a failed call reports GDELT as down");
  assert.equal(gdeltCalls, 1);

  assert.equal(await gdeltOk(), false, "still down while it is skipped");
  assert.equal(gdeltCalls, 1, "a recent failure skips the call");

  now += REVALIDATE_SECONDS * 1000 - 1;
  await getLiveNews();
  assert.equal(gdeltCalls, 1, "skipped right up to the end of the window");

  gdeltUp = true;
  now += 1;
  assert.equal(await gdeltOk(), true, "tried again once the window ends");
  assert.equal(gdeltCalls, 2);

  await getLiveNews();
  assert.equal(gdeltCalls, 3, "a success doesn't start a skip window");

  Date.now = originalNow;
  console.log("news: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
