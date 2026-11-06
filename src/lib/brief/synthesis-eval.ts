// Morning brief, phase B3: grade the tiered story summaries. Offline by default:
// recorded answers, written to look like Claude's and with planted mistakes (a
// figure not in the source, Avnet internal figures), go through the same
// grounding step as live answers. synthesis.test.ts runs it under `pnpm test`.
//
//   npx tsx src/lib/brief/synthesis-eval.ts          recorded answers, free
//   npx tsx src/lib/brief/synthesis-eval.ts --live   real calls to Claude for the same stories
//
// --live spends money (about 2 cents a story, six stories) and needs
// ANTHROPIC_API_KEY; ask the budget owner first. It prints the measured cost.
//
// Checks: every figure in every tier is in the story's headline or snippet; no
// Avnet internal figure appears (any figure from Avnet's internal datasets that
// the source doesn't contain), and no sentence states an Avnet internal metric;
// the prompt itself carries none; each tier has a summary and a one-line version
// within the word caps; beginner defines its acronyms; every summary links its
// source; the writing rules hold; and the planted mistakes were dropped. Read the
// text too: the checks catch errors, not flat writing.
import { mockInputs } from "@/lib/avnet/mock";
import { numbers, ungrounded } from "@/lib/qbr/grounded";
import type { CorpusItem } from "./corpus";
import { FIXTURES } from "./fixtures";
import { TECH_TIERS, TEST_PROFILES } from "./profile";
import { costOf, evidenceOf, filingSummary, MAX_WORDS, renderStory, storiesFor, SYSTEM, toSummary, writeSummary, type StorySummary, type SynthesisOutput, type Usage } from "./synthesis";

interface Recorded {
  id: string;
  note: string;
  /** How many sentences the grounding step must drop (the planted mistakes). */
  expectDropped: number;
  answer: SynthesisOutput;
}

export const RECORDED: Recorded[] = [
  {
    id: "micron-hbm-capacity",
    note: "a figure the source lacks, planted in advanced",
    expectDropped: 1,
    answer: {
      beginner: {
        summary:
          "Micron is adding factory space in Idaho for high-bandwidth memory, or HBM, the stacked memory chips that sit beside AI processors. EE Times reports that HBM lead times stay above 30 weeks, so buyers should plan orders early. Prices for DRAM, the dynamic random-access memory in most computers, are rising too.",
        line: "Micron is adding memory capacity in Idaho, and HBM lead times stay above 30 weeks.",
      },
      intermediate: {
        summary: "Micron is adding HBM capacity in Idaho while DRAM contract prices rise. EE Times reports HBM lead times stay above 30 weeks, so allocation stays tight for AI server builds.",
        line: "Micron adds HBM capacity in Idaho, with HBM lead times above 30 weeks.",
      },
      advanced: {
        summary: "Micron is adding HBM capacity in Idaho as DRAM contract pricing firms. HBM lead times stay above 30 weeks, per EE Times, so expect allocation to persist. Contract prices rose 15% in October.",
        line: "Micron adds Idaho HBM capacity as HBM lead times hold above 30 weeks.",
      },
    },
  },
  {
    id: "ti-sherman-fab",
    note: "a clean story with a percentage",
    expectDropped: 0,
    answer: {
      beginner: {
        summary:
          "Texas Instruments has started making chips at its new factory in Sherman. It makes analog chips, the parts that handle power and real-world signals, on 300mm wafers, the large silicon discs chips are cut from. TI says that cuts the cost per chip by about 40% against 200mm wafers.",
        line: "Texas Instruments has started making analog chips at its new Sherman factory.",
      },
      intermediate: {
        summary: "Texas Instruments started production at its Sherman 300mm analog fab. TI says 300mm wafers cut the cost per chip by about 40% against 200mm, which supports its pricing in analog.",
        line: "TI's Sherman 300mm analog fab is in production, at about 40% lower cost per chip.",
      },
      advanced: {
        summary: "TI's Sherman 300mm analog fab is in production. TI puts the cost per chip at about 40% below 200mm, which widens its cost lead over analog rivals still on 200mm and adds internal capacity.",
        line: "Sherman 300mm is producing; TI cites about 40% lower cost per chip than 200mm.",
      },
    },
  },
  {
    id: "onsemi-sic-tesla",
    note: "acronyms the beginner tier must define",
    expectDropped: 0,
    answer: {
      beginner: {
        summary:
          "onsemi signed a multi-year deal to supply Tesla with power modules made from silicon carbide, or SiC, a material that wastes less energy than ordinary silicon. The modules use MOSFETs, a kind of power transistor, and go into the traction inverters that drive electric car motors. Supply starts in the second half of 2027.",
        line: "onsemi will supply Tesla with silicon carbide power modules from the second half of 2027.",
      },
      intermediate: {
        summary: "onsemi signed a multi-year deal to supply Tesla with SiC MOSFET modules for traction inverters, starting in the second half of 2027. It locks in SiC capacity for one of the largest EV buyers.",
        line: "onsemi wins a multi-year Tesla deal for SiC MOSFET modules from the second half of 2027.",
      },
      advanced: {
        summary: "onsemi won a multi-year SiC MOSFET module award for Tesla traction inverters, with supply from the second half of 2027. It ties up SiC module capacity and strengthens onsemi against other SiC suppliers in EV traction.",
        line: "onsemi wins Tesla traction inverter SiC MOSFET modules from the second half of 2027.",
      },
    },
  },
  {
    id: "microchip-mcu-lead",
    note: "two planted Avnet internal figures, one of them a figure the source also has",
    expectDropped: 2,
    answer: {
      beginner: {
        summary:
          "Microchip says lead times on most microcontrollers, or MCUs, the small computers inside everyday products, are now 8 to 12 weeks. Its book-to-bill ratio, orders received against products shipped, rose to 1.05, so orders now run slightly ahead of shipments.",
        line: "Microchip says most microcontrollers now ship in 8 to 12 weeks.",
      },
      intermediate: {
        summary: "Microchip says MCU lead times are back to 8 to 12 weeks on most parts and book-to-bill rose to 1.05. Avnet's MCU backlog stands at $8,750 million.",
        line: "Microchip MCU lead times are back to 8 to 12 weeks, with book-to-bill at 1.05.",
      },
      advanced: {
        summary: "Microchip puts lead times on most MCUs at 8 to 12 weeks, with book-to-bill at 1.05, a sign the inventory correction is over. Avnet's book-to-bill on Microchip lines matched the 1.05 ratio.",
        line: "Microchip MCU lead times are 8 to 12 weeks and book-to-bill is 1.05.",
      },
    },
  },
  {
    id: "gm-ev-delay",
    note: "a thin story: short is right",
    expectDropped: 0,
    answer: {
      beginner: { summary: "General Motors is delaying two electric vehicle, or EV, programs to 2028, electrek.co reports.", line: "General Motors is delaying two EV programs to 2028." },
      intermediate: { summary: "General Motors pushed two EV programs out to 2028, per electrek.co, which defers component demand on those platforms.", line: "GM delays two EV programs to 2028." },
      advanced: { summary: "General Motors moved two EV programs to 2028, per electrek.co, pushing out component demand tied to those platforms.", line: "GM pushes two EV programs to 2028." },
    },
  },
  {
    id: "fr-export-rule",
    note: "a federal rule",
    expectDropped: 0,
    answer: {
      beginner: {
        summary: "The Federal Register published new export controls on advanced computing items and the equipment used to make semiconductors. Orders that include those items may need a license check before they ship.",
        line: "New export controls cover advanced computing items and chipmaking equipment.",
      },
      intermediate: {
        summary: "New export controls in the Federal Register cover advanced computing items and semiconductor manufacturing equipment. Expect license reviews on affected orders.",
        line: "New export controls on advanced computing items and chipmaking equipment.",
      },
      advanced: {
        summary: "The Federal Register carries new export controls on advanced computing items and semiconductor manufacturing equipment, which can add license reviews and delay affected shipments.",
        line: "New export controls on advanced computing and fab equipment.",
      },
    },
  },
];

/** Acronyms the beginner tier must explain, and the words that count as the explanation. */
const GLOSSARY: Record<string, RegExp> = {
  HBM: /high-bandwidth memory/i,
  DRAM: /dynamic random-access memory/i,
  NAND: /flash memory/i,
  SiC: /silicon carbide/i,
  GaN: /gallium nitride/i,
  MOSFET: /transistor/i,
  MCU: /microcontroller/i,
  EV: /electric (vehicle|car)/i,
  GPU: /graphics (processor|chip)/i,
  CoWoS: /packaging/i,
  SEC: /Securities and Exchange Commission|filed .* with the SEC/i,
};

/** Every figure in Avnet's internal datasets, as text would write it: raw, in billions, and fractions as percentages. */
export function internalFigures(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      out.add(String(v));
      if (Math.abs(v) >= 1000) out.add((v / 1000).toFixed(2).replace(/\.?0+$/, ""));
      if (Math.abs(v) < 1 && v !== 0) out.add((v * 100).toFixed(1).replace(/\.0$/, ""));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(mockInputs());
  // Figures that read as words or years, not data.
  return new Set([...out].filter((n) => (Number(n) > 10 || n.includes(".")) && !/^(19|20)\d\d$/.test(n)));
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const sentenceCount = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean).length;

/** What is wrong with one story's summary. Pure. */
export function grade(item: CorpusItem, s: StorySummary | null, usage: Usage, internal: Set<string>, expectDropped?: number): string[] {
  if (!s) return ["no summary"];
  const fails: string[] = [];
  const evidence = evidenceOf(item);
  const sourceNumbers = new Set(numbers(evidence));
  // The published date is metadata, not a figure.
  const prompt = renderStory(item).replace(/<published>.*<\/published>/, "");
  const leakedIntoPrompt = numbers(prompt).filter((n) => internal.has(n) && !sourceNumbers.has(n) && !numbers(item.angle ?? "").includes(n));
  if (leakedIntoPrompt.length) fails.push(`the prompt carries internal figures: ${leakedIntoPrompt.join(", ")}`);
  if (!s.sources.length || s.sources[0].url !== item.url) fails.push("missing its source link");
  for (const tier of TECH_TIERS) {
    const t = s.tiers[tier];
    for (const [kind, text] of [["summary", t.summary], ["line", t.line]] as const) {
      if (!text) fails.push(`${tier} ${kind} is empty`);
      const bad = ungrounded(text, evidence);
      if (bad.length) fails.push(`${tier} ${kind}: figures not in the source: ${bad.join(", ")}`);
      const leaked = numbers(text).filter((n) => internal.has(n) && !sourceNumbers.has(n));
      if (leaked.length) fails.push(`${tier} ${kind}: Avnet internal figures: ${leaked.join(", ")}`);
      if (/\bAvnet(?:'s)?\b[^.]*\b(billings|bookings|backlog|book-to-bill|inventory|margin|market share|design registrations?)\b/i.test(text)) fails.push(`${tier} ${kind}: states an Avnet internal metric`);
      if (/[/·—–]|\*\*|https?:|^\s*[-*•]\s/m.test(text)) fails.push(`${tier} ${kind}: breaks a writing rule: ${text}`);
      if (/\b(this (story|brief|article)|the story says|as an AI)\b/i.test(text)) fails.push(`${tier} ${kind}: talks about itself`);
    }
    if (words(t.summary) > MAX_WORDS.summary) fails.push(`${tier} summary is ${words(t.summary)} words`);
    if (words(t.line) > MAX_WORDS.line) fails.push(`${tier} line is ${words(t.line)} words`);
    if (sentenceCount(t.line) > 1) fails.push(`${tier} line is more than one sentence`);
  }
  for (const [acronym, expansion] of Object.entries(GLOSSARY)) {
    const b = s.tiers.beginner.summary;
    if (new RegExp(`\\b${acronym}s?\\b`).test(b) && !expansion.test(b)) fails.push(`beginner uses ${acronym} without explaining it`);
  }
  if (expectDropped !== undefined && usage.dropped.length !== expectDropped)
    fails.push(`dropped ${usage.dropped.length} sentences, expected ${expectDropped}: ${usage.dropped.join(" | ") || "none"}`);
  return fails;
}

/** Summaries for the fixture stories that have a recorded answer, and every filing: what a listening test can use for free. */
export function fixtureSummaries(): Record<string, StorySummary> {
  const out: Record<string, StorySummary> = {};
  for (const item of FIXTURES.normal.items) {
    const rec = RECORDED.find((r) => r.id === item.id);
    const s = item.kind === "filing" ? filingSummary(item, "2026-11-05") : rec ? toSummary(item, rec.answer, "2026-11-05", []) : null;
    if (s) out[item.id] = s;
  }
  return out;
}

const itemOf = (id: string) => {
  const i = FIXTURES.normal.items.find((x) => x.id === id);
  if (!i) throw new Error(`No fixture story ${id}`);
  return i;
};

export interface EvalRow {
  id: string;
  note: string;
  summary: StorySummary | null;
  usage: Usage;
  fails: string[];
}

/** Every recorded answer through the grounding step, plus a filing's template. Free. */
export function runOffline(): EvalRow[] {
  const internal = internalFigures();
  const rows = RECORDED.map((r): EvalRow => {
    const item = itemOf(r.id);
    const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, dropped: [] };
    const summary = toSummary(item, r.answer, "2026-11-05", usage.dropped);
    return { id: r.id, note: r.note, summary, usage, fails: grade(item, summary, usage, internal, r.expectDropped) };
  });
  const filing = itemOf("sec-micron-8k");
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, dropped: [] };
  const summary = filingSummary(filing, "2026-11-05");
  rows.push({ id: filing.id, note: "a filing, from a template without Claude", summary, usage, fails: grade(filing, summary, usage, internal, 0) });
  return rows;
}

/**
 * The cost per story before any live call, from the prompt's length and the
 * recorded answers' length (about 4 characters a token) plus an allowance for
 * thinking at low effort. A planning figure; --live measures the real one.
 */
export function estimateCost(): { perStory: number; storiesToday: number; perMonthAt40: number; inputTokens: number; outputTokens: number } {
  const THINKING_ALLOWANCE = 300;
  const inputs = RECORDED.map((r) => (SYSTEM.length + renderStory(itemOf(r.id)).length) / 4);
  const outputs = RECORDED.map((r) => JSON.stringify(r.answer).length / 4 + THINKING_ALLOWANCE);
  const inputTokens = Math.round(inputs.reduce((a, b) => a + b, 0) / inputs.length);
  const outputTokens = Math.round(outputs.reduce((a, b) => a + b, 0) / outputs.length);
  const perStory = costOf({ input: inputTokens, output: outputTokens, cacheRead: 0, cacheWrite: 0 });
  const storiesToday = storiesFor(FIXTURES.normal, TEST_PROFILES).filter((i) => i.kind !== "filing").length;
  return { perStory, storiesToday, perMonthAt40: perStory * 40 * 22, inputTokens, outputTokens };
}

function print(rows: EvalRow[]) {
  for (const r of rows) {
    console.log(`\n${r.fails.length ? "FAIL" : "pass"} ${r.id} (${r.note})`);
    if (r.usage.input) console.log(`  ${(costOf(r.usage) * 100).toFixed(2)}¢; ${r.usage.input + r.usage.cacheRead + r.usage.cacheWrite} in, ${r.usage.output} out`);
    for (const t of TECH_TIERS) if (r.summary) console.log(`  [${t}] ${r.summary.tiers[t].summary}\n  [${t} line] ${r.summary.tiers[t].line}`);
    for (const d of r.usage.dropped) console.log(`  dropped: ${d}`);
    for (const f of r.fails) console.log(`  ! ${f}`);
  }
  const passed = rows.filter((r) => !r.fails.length).length;
  console.log(`\n${passed} of ${rows.length} passed`);
  return passed === rows.length;
}

async function main() {
  const ok = print(runOffline());
  const e = estimateCost();
  console.log(
    `\nEstimated cost: ${(e.perStory * 100).toFixed(2)}¢ a story (about ${e.inputTokens} tokens in, ${e.outputTokens} out). ` +
      `The test profiles' briefs share ${e.storiesToday} stories on the normal fixture day; at the plan's 40 stories a day, about $${e.perMonthAt40.toFixed(0)} a month for any number of users.`,
  );
  if (!ok) process.exitCode = 1;

  if (process.argv.includes("--live")) {
    const internal = internalFigures();
    const rows: EvalRow[] = [];
    for (const r of RECORDED) {
      const item = itemOf(r.id);
      const { summary, usage, message } = await writeSummary(item);
      rows.push({ id: r.id, note: `live${message ? `: ${message}` : ""}`, summary, usage, fails: grade(item, summary, usage, internal) });
    }
    console.log("\n--- Live ---");
    const liveOk = print(rows);
    const dollars = rows.reduce((t, r) => t + costOf(r.usage), 0);
    console.log(`Measured: ${((dollars / rows.length) * 100).toFixed(2)}¢ a story, $${dollars.toFixed(3)} for the run.`);
    if (!liveOk) process.exitCode = 1;
  }
}

if (require.main === module) main();
