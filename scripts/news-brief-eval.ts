// Opus 5.5 against Sonnet 5.5 on the Market News article brief. See
// src/lib/ai/news-brief-eval.ts for what is checked and how the winner is picked.
//
//   npx tsx --env-file=.env.local scripts/news-brief-eval.ts sample [size]   free: snapshots the live feed
//   npx tsx --env-file=.env.local scripts/news-brief-eval.ts run              spends money: both models, every story
//   npx tsx --env-file=.env.local scripts/news-brief-eval.ts report           free: blind votes, checks, cost
//
// Review between run and report at http://localhost:3002/dev/news-brief-eval (pnpm dev).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BRIEF_MODELS, briefCost, systemBlocks, writeArticleBrief, type BriefModel } from "../src/lib/ai/news-brief";
import {
  blindOrder,
  checkBrief,
  EVAL_DIR,
  pickSample,
  privateContext,
  rowSlug,
  RUN_FILE,
  SAMPLE_FILE,
  tally,
  VOTES_NS,
  type Arm,
  type Run,
  type RunRow,
  type SampleStory,
  type Vote,
} from "../src/lib/ai/news-brief-eval";
import { aiConfigured } from "../src/lib/ai/claude";
import { getLiveNewsWithText } from "../src/lib/data/live/news";
import { store } from "../src/lib/store";

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

async function sample(size: number) {
  const { articles } = await getLiveNewsWithText();
  const angles = await store.getAll<{ relevance: string }>("news-angles-v1");
  const relevance = Object.fromEntries(Object.entries(angles).map(([id, a]) => [id, a.relevance]));
  const picked = pickSample(articles, relevance, size);
  mkdirSync(EVAL_DIR, { recursive: true });
  writeFileSync(SAMPLE_FILE, JSON.stringify(picked, null, 1));
  const withText = picked.filter((s) => s.article.body).length;
  console.log(`${picked.length} stories saved to ${SAMPLE_FILE}: ${withText} with feed text, ${picked.length - withText} headline and teaser only.`);
  if (!Object.keys(relevance).length) console.log("No stored relevance ratings, so the sample is unrated on-topic stories.");
}

async function run() {
  if (!aiConfigured()) throw new Error("Set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) first.");
  const stories = readJson<SampleStory[]>(SAMPLE_FILE);
  const priv = privateContext();
  const system = systemBlocks();
  const rows: RunRow[] = [];
  let spent = 0;
  for (const [i, { article, relevance }] of stories.entries()) {
    const arms = {} as Record<BriefModel, Arm>;
    for (const model of BRIEF_MODELS) {
      const started = Date.now();
      const r = await writeArticleBrief(article, { model, system });
      const dollars = briefCost(model, r.usage);
      spent += dollars;
      arms[model] = { brief: r.brief, raw: r.raw, usage: r.usage, dollars, ms: Date.now() - started, dropped: r.dropped, fails: checkBrief(article, r.brief, r.raw, r.dropped, priv), message: r.message };
    }
    const slug = rowSlug(article);
    rows.push({ slug, title: article.title, outlet: article.outlet, url: article.url, thin: !article.body, relevance, order: blindOrder(slug), arms });
    console.log(`${i + 1}/${stories.length} ${article.title.slice(0, 70)}  ($${spent.toFixed(3)} so far)`);
  }
  const out: Run = { ranAt: new Date().toISOString(), rows };
  writeFileSync(RUN_FILE, JSON.stringify(out, null, 1));
  console.log(`Saved ${rows.length} stories to ${RUN_FILE}; spent $${spent.toFixed(3)}. Review at /dev/news-brief-eval.`);
}

async function report() {
  const r = readJson<Run>(RUN_FILE);
  const votes = Object.values(await store.getAll<Vote>(VOTES_NS));
  const t = tally(r, votes);
  console.log(`${r.rows.length} stories, ${t.votes} blind votes\n`);
  console.log("model               wins  ties  why(1-5)  stories failing  fails  $/brief  s/brief");
  for (const m of BRIEF_MODELS) {
    const x = t.totals[m];
    console.log(
      `${m.padEnd(19)} ${String(x.wins).padStart(4)}  ${String(x.ties).padStart(4)}  ${(x.meanWhy?.toFixed(2) ?? "-").padStart(8)}  ${String(x.storiesFailing).padStart(15)}  ${String(x.fails).padStart(5)}  ${x.dollarsPerBrief.toFixed(4)}  ${x.secondsPerBrief.toFixed(1).padStart(7)}`,
    );
  }
  console.log(`\n${t.pick ? `Pick: ${t.pick}. ` : ""}${t.why}`);
  for (const row of r.rows)
    for (const m of BRIEF_MODELS) for (const f of row.arms[m].fails) console.log(`  ${m.replace("claude-", "")}  ${row.title.slice(0, 50)}: ${f}`);
}

const [cmd, arg] = process.argv.slice(2);
const job = cmd === "sample" ? sample(Number(arg) || 30) : cmd === "run" ? run() : cmd === "report" ? report() : Promise.reject(new Error("Usage: news-brief-eval.ts sample [size] | run | report"));
job.catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
