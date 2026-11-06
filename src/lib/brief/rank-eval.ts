// Morning brief, phase B2: grade the story picks for the test profiles on the
// fixture days (normal, quiet, heavy). Offline and free: ranking is rule-based.
// rank.test.ts runs it under `pnpm test`; run it directly to read the picks too.
//
//   npx tsx src/lib/brief/rank-eval.ts           fixture days
//   npx tsx src/lib/brief/rank-eval.ts --live    also today's saved corpus (rules only)
//
// Rules checked on every brief: every story is in the user's scope and in the
// right chapter; no story twice; nothing below the floor or from an earlier brief
// as padding; the top three are the strongest; standard stays under 15 minutes and
// Quick under 5. Each case also names stories it must and must not pick. Read the
// picks too: the checks catch errors, not dull choices.
import type { Corpus } from "./corpus";
import { FIXTURES, type FixtureDay } from "./fixtures";
import { TEST_PROFILES, type BriefProfile } from "./profile";
import { CAP_SECONDS, MIN_SCORE, planBrief, QUICK_SECONDS, type BriefPlan, type ChapterId } from "./rank";

export interface Case {
  day: FixtureDay;
  profile: string;
  note: string;
  /** Story ids that must be picked, optionally in a given chapter ("micron-hbm-capacity" or "top:micron-hbm-capacity"). */
  must?: string[];
  mustNot?: string[];
  /** Spoken minutes, inclusive. */
  minutes?: [number, number];
  /** Stories that must go to the written brief only. */
  moreAtLeast?: number;
}

export const CASES: Case[] = [
  {
    day: "normal",
    profile: "memory-supplier-manager",
    note: "memory news leads; a top customer they don't serve is in Customers, not the top three",
    must: ["top:micron-hbm-capacity", "top:skhynix-nand-cut", "technologies:dram-spot-prices", "customers:gm-ev-delay", "market:sec-micron-8k"],
    mustNot: ["micron-old", "micron-yesterday", "top:gm-ev-delay", "nvidia-blackwell", "unrelated-low"],
  },
  {
    day: "normal",
    profile: "power-analog-seller",
    note: "suppliers and served automotive customers",
    must: ["top:onsemi-sic-tesla", "ti-sherman-fab", "adi-guidance", "customers:gm-ev-delay", "customers:ford-ev-battery", "market:sec-ti-10q"],
    mustNot: ["micron-hbm-capacity", "smartphone-shipments", "fr-ftz-unrelated"],
  },
  {
    day: "normal",
    profile: "embedded-industrial-quick",
    note: "Quick: short, and a top customer is ignored when they don't follow top customers",
    must: ["top:microchip-mcu-lead", "top:st-mcu-price", "customers:rockwell-orders", "customers:jabil-mexico"],
    mustNot: ["gm-ev-delay", "sec-microchip-old"],
    minutes: [1, 5],
  },
  {
    day: "normal",
    profile: "compute-strategy",
    note: "compute and foundry, a customer they don't serve as Worth knowing",
    must: ["top:amd-mi-series", "top:nvidia-blackwell", "suppliers:intel-ohio", "customers:aws-trainium", "customers:cisco-switch-asic", "market:fr-export-rule", "market:sec-nvidia-8k"],
    mustNot: ["micron-hbm-capacity", "apple-modem-memory"],
  },
  {
    day: "normal",
    profile: "ipe-quiet",
    note: "little in scope: a short brief, not padded with other people's news",
    mustNot: ["mlcc-prices", "nvidia-blackwell", "micron-hbm-capacity", "smartphone-shipments"],
    minutes: [0, 2],
  },
  { day: "quiet", profile: "memory-supplier-manager", note: "a quiet day gives an empty brief, not padding", minutes: [0, 0.5], mustNot: ["mlcc-prices", "smartphone-shipments"] },
  { day: "quiet", profile: "ipe-quiet", note: "the one story in scope", must: ["mlcc-prices"], minutes: [0, 2] },
  {
    day: "heavy",
    profile: "compute-strategy",
    note: "a heavy day runs long but stops at 15 minutes; the rest goes to the written brief",
    must: ["top:amd-mi-series", "customers:aws-trainium", "market:fr-export-rule"],
    minutes: [10, 15],
    moreAtLeast: 10,
  },
  { day: "heavy", profile: "memory-supplier-manager", note: "someone else's heavy day doesn't change this brief", mustNot: ["heavy-1", "heavy-2"], minutes: [0, 6] },
  { day: "heavy", profile: "embedded-industrial-quick", note: "Quick stays under 5 minutes", mustNot: ["heavy-1"], minutes: [0, 5] },
];

const profileOf = (id: string): BriefProfile => {
  const p = TEST_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`No test profile ${id}`);
  return p;
};

/** Rules every brief must keep, whatever the day. */
export function rules(plan: BriefPlan, p: BriefProfile, corpus: Corpus): string[] {
  const fails: string[] = [];
  const picks = plan.chapters.flatMap((c) => c.picks.map((x) => ({ ...x, chapter: c.id })));
  const ids = picks.map((x) => x.item.id);
  if (new Set(ids).size !== ids.length) fails.push("a story appears twice");
  const limit = p.length === "quick" ? QUICK_SECONDS : CAP_SECONDS;
  if (plan.seconds > limit) fails.push(`${(plan.seconds / 60).toFixed(1)} minutes is over the ${limit / 60}-minute limit`);
  for (const x of picks) {
    const i = x.item;
    const sup = i.suppliers.some((s) => p.suppliers.includes(s));
    const tech = i.segments.some((s) => p.technologies.includes(s));
    const cust = i.customers.some((c) => p.customers.includes(c as never) || (p.followTopCustomers && i.topCustomers.includes(c)));
    if (x.score < MIN_SCORE) fails.push(`below the floor: ${i.id}`);
    if (Date.parse(corpus.builtAt) - Date.parse(i.ingestedAt) > 20 * 3_600_000 && x.score < 9) fails.push(`from an earlier brief: ${i.id}`);
    const ok: Record<ChapterId, boolean> = {
      top: sup || tech || i.customers.some((c) => p.customers.includes(c as never)),
      suppliers: sup && i.kind === "news",
      customers: i.kind === "news" && (cust || (!!x.worthKnowing && tech)),
      technologies: tech && i.kind === "news",
      market: i.kind !== "news" && (sup || tech || cust || (i.kind === "regulatory" && i.relevance === "high")),
    };
    if (!ok[x.chapter]) fails.push(`out of scope for ${x.chapter}: ${i.id}`);
  }
  const top = plan.chapters.find((c) => c.id === "top")?.picks ?? [];
  if (top.length > 3) fails.push(`${top.length} top stories`);
  const weakestTop = Math.min(...top.map((x) => x.score));
  const strongerLater = picks.filter((x) => x.chapter !== "top" && x.item.kind !== "filing" && x.score > weakestTop && (x.item.suppliers.some((s) => p.suppliers.includes(s)) || x.item.segments.some((s) => p.technologies.includes(s))));
  if (top.length && strongerLater.length) fails.push(`stronger than a top story: ${strongerLater.map((x) => x.item.id).join(", ")}`);
  return fails;
}

export function grade(c: Case, plan: BriefPlan, corpus: Corpus): string[] {
  const p = profileOf(c.profile);
  const fails = rules(plan, p, corpus);
  const where = new Map(plan.chapters.flatMap((ch) => ch.picks.map((x) => [x.item.id, ch.id] as const)));
  for (const m of c.must ?? []) {
    const [chapter, id] = m.includes(":") ? m.split(":") : [undefined, m];
    if (!where.has(id)) fails.push(`missing ${id}`);
    else if (chapter && where.get(id) !== chapter) fails.push(`${id} is in ${where.get(id)}, not ${chapter}`);
  }
  for (const m of c.mustNot ?? []) {
    const [chapter, id] = m.includes(":") ? m.split(":") : [undefined, m];
    if (where.has(id) && (!chapter || where.get(id) === chapter)) fails.push(`should not pick ${m}`);
  }
  const min = plan.seconds / 60;
  if (c.minutes && (min < c.minutes[0] || min > c.minutes[1])) fails.push(`${min.toFixed(1)} minutes, expected ${c.minutes[0]} to ${c.minutes[1]}`);
  if (c.moreAtLeast !== undefined && plan.more.length < c.moreAtLeast) fails.push(`only ${plan.more.length} stories left for the written brief`);
  return fails;
}

/** Every case on the fixtures: each case's failures, empty when it passes. */
export function runEval(): { c: Case; plan: BriefPlan; fails: string[] }[] {
  return CASES.map((c) => {
    const plan = planBrief(FIXTURES[c.day], profileOf(c.profile));
    return { c, plan, fails: grade(c, plan, FIXTURES[c.day]) };
  });
}

function print(plan: BriefPlan) {
  console.log(`  ${(plan.seconds / 60).toFixed(1)} min; ${plan.more.length} more in the written brief`);
  for (const ch of plan.chapters) {
    console.log(`  ${ch.title}`);
    for (const x of ch.picks) console.log(`    ${x.score.toFixed(1).padStart(4)} ${x.worthKnowing ? "[worth knowing] " : ""}${x.item.title}`);
  }
}

async function main() {
  const results = runEval();
  for (const { c, plan, fails } of results) {
    console.log(`\n${fails.length ? "FAIL" : "pass"} ${c.day}, ${c.profile} (${c.note})`);
    print(plan);
    for (const f of fails) console.log(`  ! ${f}`);
  }
  const passed = results.filter((r) => !r.fails.length).length;
  console.log(`\n${passed} of ${results.length} passed`);

  if (process.argv.includes("--live")) {
    const { getCorpus } = await import("./corpus");
    const corpus = await getCorpus();
    if (!corpus) console.log("\nNo corpus saved for today. Build one with: npx tsx scripts/build-corpus.ts");
    else
      for (const p of TEST_PROFILES) {
        const plan = planBrief(corpus, p);
        const fails = rules(plan, p, corpus);
        console.log(`\n${fails.length ? "FAIL" : "pass"} live ${corpus.date}, ${p.id}`);
        print(plan);
        for (const f of fails) console.log(`  ! ${f}`);
      }
  }
  if (passed < results.length) process.exitCode = 1;
}

if (require.main === module) main();
