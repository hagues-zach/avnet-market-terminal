// QBR Prep: grade Claude's talking points on eight briefs over the app's live data.
// Needs the dev server (npm run dev) and a funded ANTHROPIC_API_KEY; each brief
// goes through the dev-only /api/qbr-eval route, uncached. About 15 cents a run.
//
//   npx tsx src/lib/qbr/eval.ts
//
// Checks, all automatic: three to five points and questions survive; none was
// dropped for a figure the brief lacks; the focus is taken up first; mock figures
// are called mock; a customer review doesn't drift into line cards; the writing
// rules hold. Read the printed points too: the checks catch errors, not dull points.
import type { TalkingPoints, Usage } from "./talking-points";

interface Case {
  company: string;
  meeting: "supplier" | "customer";
  focus?: string;
  note: string;
}

const CASES: Case[] = [
  { company: "microchip", meeting: "supplier", note: "a supplier with a full brief" },
  { company: "microchip", meeting: "supplier", focus: "lead times", note: "the same brief with a focus" },
  { company: "onsemi", meeting: "supplier", focus: "design wins in automotive", note: "a focus the brief only partly covers" },
  { company: "lattice", meeting: "supplier", note: "Avnet's own line card unknown" },
  { company: "apple", meeting: "customer", note: "a customer account review" },
  { company: "ford", meeting: "customer", focus: "EV programs", note: "a customer with a focus" },
  { company: "bel-fuse", meeting: "supplier", note: "a smaller supplier with a thinner brief" },
  { company: "te-connectivity", meeting: "supplier", focus: "pricing in Japan", note: "a focus the brief can't answer" },
];

// Claude Sonnet 5.5, per million tokens: input, output, cache read, 5-minute cache write.
const PRICE = [2, 10, 0.2, 2.5];
const BASE = process.env.QBR_EVAL_URL ?? "http://localhost:3002";
const CANT = /\b(doesn't|does not|don't|do not|can't|cannot|isn't|is not|no data|nothing (?:in|on)|not (?:in|covered|cover|available))\b/i;

interface Result {
  result: TalkingPoints;
  usage: Usage;
  context: string;
  supplier: boolean;
  /** Whether the brief carried line cards: a supplier review while Line Cards is shown. */
  lineCards: boolean;
  ms: number;
}

const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;

function grade(c: Case, r: Result): string[] {
  const t = r.result;
  if (t.status !== "ok") return [`${t.status}: ${t.message}`];
  const fails: string[] = [];
  const items = [...t.points, ...t.questions];
  if (t.points.length < 3 || t.points.length > 5) fails.push(`${t.points.length} talking points`);
  if (t.questions.length < 3 || t.questions.length > 5) fails.push(`${t.questions.length} questions`);
  if (r.usage.dropped.length) fails.push(`dropped for figures not in the brief: ${r.usage.dropped.join(" | ")}`);
  if (c.focus) {
    const words = c.focus.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const takesUp = (s: string) => words.some((w) => s.toLowerCase().includes(w.replace(/s$/, ""))) || CANT.test(s);
    if (!takesUp(t.points[0]?.text ?? "")) fails.push("first talking point doesn't take up the focus");
    if (!takesUp(t.questions[0]?.text ?? "")) fails.push("first question doesn't take up the focus");
  }
  // Quoting one of Avnet's mock figures needs the word "mock"; an item that only points at our business doesn't.
  const business = r.context.match(/<business[^>]*>([\s\S]*?)<\/business>/)?.[1] ?? "";
  // Values only ("Backlog: $221.5M"), not labels ("Billings, last 12 months").
  const mockFigures = business.split("\n").flatMap((l) => l.split(": ")[1]?.match(/\d[\d,]*(?:\.\d+)?/g) ?? []);
  for (const i of items) {
    const all = `${i.text} ${"why" in i ? i.why : ""}`;
    if (mockFigures.some((n) => all.includes(n)) && !/\bmock\b/i.test(all)) fails.push(`mock figure not called mock: ${i.text}`);
  }
  if (!c.focus && items.some((i) => /\bfocus\b/i.test(i.text))) fails.push("mentions a focus when none was given");
  // "The brief" is fine: it is the document the reader has open. Talk about the prompt is not.
  if (items.some((i) => /\b(data provided|no focus|focus was given|the context|as instructed)\b/i.test(i.text))) fails.push("talks about its own process");
  if (!r.lineCards && items.some((i) => /line card|franchise/i.test(i.text)))
    fails.push(r.supplier ? "talks about line cards while Line Cards is hidden" : "a customer review talks about line cards");
  for (const i of items) {
    const all = `${i.text} ${"why" in i ? i.why : ""}`;
    if (/[/·]/.test(all)) fails.push(`slash or middle dot: ${i.text}`);
    if (/\*\*|^\s*[-*•]\s/m.test(all)) fails.push(`bold or bullet: ${i.text}`);
  }
  for (const p of t.points) if (sentences(p.text) > 3) fails.push(`long point (${sentences(p.text)} sentences)`);
  for (const q of t.questions) if (sentences(q.text) > 2 || sentences(q.why) > 2) fails.push(`long question: ${q.text}`);
  return fails;
}

async function main() {
  let passed = 0;
  let dollars = 0;
  let ms = 0;
  for (const c of CASES) {
    const res = await fetch(`${BASE}/api/qbr-eval`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company: c.company, meeting: c.meeting, focus: c.focus ?? "" }),
    });
    if (!res.ok) throw new Error(`${res.status} from ${BASE}/api/qbr-eval. Is the dev server running?`);
    const r = (await res.json()) as Result;
    const fails = grade(c, r);
    const u = r.usage;
    const d = (u.input * PRICE[0] + u.output * PRICE[1] + u.cacheRead * PRICE[2] + u.cacheWrite * PRICE[3]) / 1e6;
    dollars += d;
    ms += r.ms;
    if (!fails.length) passed += 1;
    console.log(`\n${fails.length ? "FAIL" : "pass"} ${c.company}, ${c.meeting}${c.focus ? `, focus "${c.focus}"` : ""} (${c.note})`);
    console.log(`  ${(d * 100).toFixed(2)}¢; ${(r.ms / 1000).toFixed(1)}s; ${u.input + u.cacheRead + u.cacheWrite} in, ${u.output} out`);
    r.result.points.forEach((p, i) => console.log(`  P${i + 1} [${p.section}] ${p.text}`));
    r.result.questions.forEach((q, i) => console.log(`  Q${i + 1} [${q.section}] ${q.text}\n       why: ${q.why}`));
    for (const f of fails) console.log(`  ! ${f}`);
  }
  console.log(`\n${passed} of ${CASES.length} passed; ${((dollars / CASES.length) * 100).toFixed(2)}¢ a brief; ${(ms / CASES.length / 1000).toFixed(1)}s a brief`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
