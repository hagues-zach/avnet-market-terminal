import { PROFILE, readPrivateContext, type PrivateContext } from "@/lib/avnet/profile";
import { tagArticle } from "@/lib/data/live/tagging";
import { articleSlug, type LiveArticle } from "@/lib/data/live/shared";
import { BRIEF_MODELS, evidenceOf, type ArticleBrief, type BriefModel, type BriefOutput, type BriefUsage } from "./news-brief";

// Opus 5.5 against Sonnet 5.5 on the Market News article brief. Three parts:
//
//   1. A sample of real stories with their feed text, taken once so both models
//      see the same input:      npx tsx --env-file=.env.local scripts/news-brief-eval.ts sample
//   2. Both models brief every story (spends money, about $2 to $4 for 30 stories;
//      needs ANTHROPIC_API_KEY):  npx tsx --env-file=.env.local scripts/news-brief-eval.ts run
//   3. Blind review at /dev/news-brief-eval (dev server only), then the totals:
//                                  npx tsx --env-file=.env.local scripts/news-brief-eval.ts report
//
// The sample and the run hold outlet text, so they stay in .cache/eval
// (gitignored). The checks below are pure and run offline in news-brief.test.ts
// against planted mistakes.
//
// Decision rule: Sonnet wins if it is within one vote of Opus in blind wins and
// fails no more checks; otherwise Opus. The winner becomes NEWS_BRIEF_MODEL.

export const EVAL_DIR = ".cache/eval";
export const SAMPLE_FILE = `${EVAL_DIR}/news-brief-sample.json`;
export const RUN_FILE = `${EVAL_DIR}/news-brief-run.json`;
export const VOTES_NS = "news-brief-eval-votes";

export interface SampleStory {
  article: LiveArticle;
  relevance?: string;
}

export interface Arm {
  brief: ArticleBrief | null;
  raw?: BriefOutput;
  usage: BriefUsage;
  dollars: number;
  ms: number;
  dropped: string[];
  fails: string[];
  message?: string;
}

export interface RunRow {
  slug: string;
  title: string;
  outlet: string;
  url: string;
  thin: boolean;
  relevance?: string;
  /** Which model is shown as A and which as B, fixed at run time so review is blind. */
  order: [BriefModel, BriefModel];
  arms: Record<BriefModel, Arm>;
}

export interface Run {
  ranAt: string;
  rows: RunRow[];
}

export type Pick = "A" | "B" | "tie";

export interface Vote {
  slug: string;
  pick: Pick;
  /** 1 to 5, how useful each "Why it matters to Avnet" is. */
  whyA?: number;
  whyB?: number;
  reason?: string;
  votedAt: string;
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

// What a concrete link to Avnet looks like: one of its businesses or regions, an end
// market or technology it pushes, a competitor, or a driver of its results.
const AVNET_LINK =
  /\b(Electronic Components|EC|Farnell|Americas|EMEA|Asia|data cent(?:er|re)s?|aerospace|defen[cs]e|industrial|automotive|transportation|networking|medical|healthcare|robotics|drones?|edge|embedded|IP&E|passives?|connectors?|memory|Arrow|Future Electronics|WPG|WT Micro\w*|Mouser|Digi-?Key|RS Group|RS Components|TTI|lead times?|pric(?:e|es|ing)|allocation|inventory|supply|shortage|design[- ](?:wins?|registrations?|in)|franchise|line card|lines? Avnet carries|if Avnet carries|tariffs?|export|trade rules?|demand)\b/i;
const MEMBERSHIP_CLAIM = /\b(?:is|are|as) (?:an?|one of) (?:top |key |major )?Avnet(?:'s)? (?:customers?|suppliers?|lines?)\b|\bAvnet(?:'s)? (?:top |key |major |largest )?(?:customer|supplier)s? (?:such as|like|including)\b/i;

const profileText = Object.values(PROFILE)
  .flat()
  .map((f) => f.text)
  .join("\n");

/** Companies named in the text that appear in neither the story nor the public profile. Pure. */
export function strayCompanies(text: string, evidence: string): string[] {
  const named = tagArticle(text);
  const known = tagArticle(`${evidence}\n${profileText}`);
  return [...named.suppliers, ...named.customers].filter((n) => !known.suppliers.includes(n) && !known.customers.includes(n));
}

/**
 * What's wrong with one model's brief of one story. Pure. `raw` is Claude's answer
 * before clean-up, so a dash it wrote still counts against it; `dropped` is what
 * grounding removed (a figure not in the story, or an Avnet internal metric).
 */
export function checkBrief(article: LiveArticle, brief: ArticleBrief | null, raw: BriefOutput | undefined, dropped: string[], priv?: PrivateContext): string[] {
  if (!brief) return ["no brief"];
  const fails: string[] = [];
  const evidence = evidenceOf(article);
  for (const d of dropped) fails.push(`dropped: ${d}`);
  if (words(brief.takeaway) > 30) fails.push(`takeaway is ${words(brief.takeaway)} words`);
  const minPoints = article.body ? 3 : 1;
  if (brief.keyPoints.length < minPoints || brief.keyPoints.length > 5) fails.push(`${brief.keyPoints.length} key points`);
  brief.keyPoints.forEach((p, i) => words(p) > 25 && fails.push(`key point ${i + 1} is ${words(p)} words`));

  const why = brief.whyItMatters;
  if (!why) fails.push("no why it matters");
  else {
    const n = sentences(why).length;
    const littleBearing = /\blittle (?:bearing|direct)\b|\bnot (?:much|directly)\b/i.test(why);
    if (n > 3 || (n < 2 && !littleBearing)) fails.push(`why it matters is ${n} sentences`);
    if (!AVNET_LINK.test(why) && !littleBearing) fails.push("why it matters names no concrete Avnet link");
    if (MEMBERSHIP_CLAIM.test(why)) fails.push("claims who is an Avnet customer or supplier");
    const stray = strayCompanies(why, evidence);
    if (stray.length) fails.push(`names companies not in the story: ${stray.join(", ")}`);
    const leaked = [...(priv?.topCustomers ?? []), ...(priv?.topSuppliers ?? [])].filter((n) => why.includes(n) && !evidence.includes(n));
    if (leaked.length) fails.push(`mentions internal names: ${leaked.join(", ")}`);
  }
  if (!brief.watchFor) fails.push("no what to watch");

  const rawText = raw ? [raw.takeaway, ...raw.keyPoints, raw.whyItMatters, raw.watchFor].join(" ") : "";
  if (/[—–]|\s-\s/.test(rawText)) fails.push("used dashes");
  return fails;
}

/** A mixed sample: high and medium, with and without feed text, news and regulatory. Pure apart from the shuffle seed. */
export function pickSample(articles: LiveArticle[], relevance: Record<string, string>, size = 30): SampleStory[] {
  const pool = articles.filter((a) => a.kind !== "filing" && (relevance[a.id] ? relevance[a.id] !== "low" : true));
  const groups = new Map<string, LiveArticle[]>();
  for (const a of pool) {
    const key = `${relevance[a.id] ?? "unrated"}|${a.body ? "text" : "thin"}|${a.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  // Round-robin across the groups so no one kind of story dominates.
  const out: LiveArticle[] = [];
  const lists = [...groups.values()];
  for (let i = 0; out.length < size && lists.some((l) => l.length > i); i++) for (const l of lists) if (l[i] && out.length < size) out.push(l[i]);
  return out.map((article) => ({ article, relevance: relevance[article.id] }));
}

/** Seeded A/B order per story, so a rerun keeps the same blinding. Pure. */
export function blindOrder(slug: string): [BriefModel, BriefModel] {
  const h = [...slug].reduce((t, c) => (t * 31 + c.charCodeAt(0)) >>> 0, 7);
  return h % 2 ? [BRIEF_MODELS[0], BRIEF_MODELS[1]] : [BRIEF_MODELS[1], BRIEF_MODELS[0]];
}

export interface ModelTotals {
  model: BriefModel;
  wins: number;
  ties: number;
  meanWhy?: number;
  storiesFailing: number;
  fails: number;
  dollarsPerBrief: number;
  secondsPerBrief: number;
}

/** Wins, check failures, cost and time per model, and the pick by the decision rule. Pure. */
export function tally(run: Run, votes: Vote[]): { totals: Record<BriefModel, ModelTotals>; votes: number; pick?: BriefModel; why: string } {
  const totals = Object.fromEntries(
    BRIEF_MODELS.map((m) => [m, { model: m, wins: 0, ties: 0, storiesFailing: 0, fails: 0, dollarsPerBrief: 0, secondsPerBrief: 0 } as ModelTotals]),
  ) as Record<BriefModel, ModelTotals>;
  const whyScores: Record<string, number[]> = {};
  const bySlug = new Map(run.rows.map((r) => [r.slug, r]));
  let counted = 0;
  for (const v of votes) {
    const row = bySlug.get(v.slug);
    if (!row) continue;
    counted += 1;
    const [a, b] = row.order;
    if (v.pick === "tie") (totals[a].ties += 1), (totals[b].ties += 1);
    else totals[v.pick === "A" ? a : b].wins += 1;
    if (v.whyA) (whyScores[a] ??= []).push(v.whyA);
    if (v.whyB) (whyScores[b] ??= []).push(v.whyB);
  }
  for (const m of BRIEF_MODELS) {
    const arms = run.rows.map((r) => r.arms[m]).filter(Boolean);
    const t = totals[m];
    t.fails = arms.reduce((n, a) => n + a.fails.length, 0);
    t.storiesFailing = arms.filter((a) => a.fails.length).length;
    t.dollarsPerBrief = arms.length ? arms.reduce((n, a) => n + a.dollars, 0) / arms.length : 0;
    t.secondsPerBrief = arms.length ? arms.reduce((n, a) => n + a.ms, 0) / arms.length / 1000 : 0;
    const s = whyScores[m];
    if (s?.length) t.meanWhy = s.reduce((x, y) => x + y, 0) / s.length;
  }
  if (!counted) return { totals, votes: 0, why: "No votes yet." };
  const opus = totals["claude-opus-5-5"];
  const sonnet = totals["claude-sonnet-5-5"];
  const sonnetHolds = sonnet.wins >= opus.wins - 1 && sonnet.storiesFailing <= opus.storiesFailing;
  return {
    totals,
    votes: counted,
    pick: sonnetHolds ? "claude-sonnet-5-5" : "claude-opus-5-5",
    why: sonnetHolds
      ? `Sonnet is within one win of Opus (${sonnet.wins} to ${opus.wins}) and fails checks on no more stories (${sonnet.storiesFailing} to ${opus.storiesFailing}), at about half the cost.`
      : `Opus leads on blind wins (${opus.wins} to ${sonnet.wins}) or fails checks on fewer stories (${opus.storiesFailing} to ${sonnet.storiesFailing}).`,
  };
}

export const rowSlug = (a: LiveArticle) => articleSlug(a);
export const privateContext = () => readPrivateContext();
