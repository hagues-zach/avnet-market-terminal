// Builds today's morning brief corpus on this machine, without the site running,
// into the store in STORE_ADAPTER (local files by default). Reads the live news
// sources. With ANTHROPIC_API_KEY set it also rates unrated stories, the same
// cached call Market News makes (a few cents for a fresh batch); unset it to skip.
//
//   npx tsx scripts/build-corpus.ts

import { runCorpusJob } from "../src/lib/brief/corpus";

runCorpusJob()
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
