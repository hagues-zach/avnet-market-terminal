// Writes the tiered summaries for the stories today's briefs use (every test
// profile's picks, each story once) into the store, and prints what it spent.
// Spends money: about 1 to 2 cents per new story with ANTHROPIC_API_KEY set; stories
// already summarized are reused. Build the corpus first: npx tsx scripts/build-corpus.ts
//
//   npx tsx scripts/summarize-corpus.ts

import { getCorpus } from "../src/lib/brief/corpus";
import { TEST_PROFILES } from "../src/lib/brief/profile";
import { storiesFor, summarizeStories } from "../src/lib/brief/synthesis";

async function main() {
  const corpus = await getCorpus();
  if (!corpus) throw new Error("No corpus for today. Run: npx tsx scripts/build-corpus.ts");
  const stories = storiesFor(corpus, TEST_PROFILES);
  const r = await summarizeStories(stories);
  console.log(`${stories.length} stories; ${r.written} written now, ${Object.keys(r.byId).length - r.written} reused; $${r.dollars.toFixed(3)} spent`);
  for (const f of r.failed) console.log(`  failed ${f.id}: ${f.message}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
