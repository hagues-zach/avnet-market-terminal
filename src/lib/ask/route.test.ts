// Ask the Terminal routing and sentences. Run with: npx tsx src/lib/ask/route.test.ts
import assert from "node:assert/strict";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { cacheKey, compose } from "./compose";
import { ANSWERERS, aliases, depth, findCompany, route, suggest } from "./route";
import {
  type Answer,
  CANT,
  avnetSentence,
  companySentence,
  cycleSentence,
  day,
  lineCardSentence,
  newsSentence,
  pctOf,
  quarterName,
  seasonSentence,
  usd,
} from "./sentences";

const slug = (q: string) => route(q)?.company?.slug;
const intent = (q: string) => route(q)?.intent;

// Every example on the page routes to its own answerer.
for (const a of ANSWERERS) assert.equal(intent(a.example), a.intent, a.example);
assert.equal(new Set(ANSWERERS.map((a) => a.intent)).size, ANSWERERS.length);

// Companies by name, short name and the extra aliases; longest name wins.
assert.equal(slug("How is Microchip doing?"), "microchip");
assert.equal(slug("how is analog devices doing"), "analog-devices");
assert.equal(slug("How is TI doing?"), "texas-instruments");
assert.equal(slug("on semi margins"), "onsemi");
assert.equal(findCompany("Arrow Electronics revenue")?.slug, "arrow");
assert.equal(findCompany("analog sales are up"), undefined, "a segment word is not a company");
assert.equal(findCompany("benchmark it against the market"), undefined, "a generic word is not a company");
for (const c of COMPANIES) assert.ok(aliases(c).length > 0, c.slug);
for (const c of COMPANIES) assert.equal(findCompany(`How is ${c.name} doing?`)?.slug, c.slug, c.name);

// "How is Avnet doing" is the live company answer; Avnet's business is the mock one.
assert.equal(intent("How is Avnet doing?"), "company");
assert.equal(intent("How is Avnet's business?"), "avnet");
assert.equal(intent("What's our backlog?"), "avnet");
// Arrow alone is a company; Arrow against us is the comparison.
assert.equal(intent("How is Arrow doing?"), "company");
assert.equal(intent("Avnet vs Arrow"), "arrow");
assert.equal(intent("Is Arrow beating us?"), "arrow");
// News on a company keeps the company; news on a topic keeps the words.
assert.deepEqual(route("What's the latest on Arrow?"), { intent: "news", company: COMPANIES.find((c) => c.slug === "arrow"), topic: undefined });
assert.equal(route("memory news")?.topic, "memory");
// Line cards for suppliers the app doesn't profile keep the name.
assert.deepEqual(route("Who carries Murata?"), { intent: "linecard", company: undefined, name: "murata" });
assert.equal(intent("Is Lattice on the line cards?"), "linecard");
// Earnings season only without a company; with one it's the company answer.
assert.equal(intent("Who has reported this quarter?"), "earnings");
assert.equal(intent("When does Microchip report?"), "company");
// Unknown questions get suggestions that themselves route.
assert.equal(route("What will tariffs do to Q4 margins?"), null);
assert.equal(route("   "), null);
const s = suggest("What will tariffs do to Q4 margins?");
assert.equal(s.length, 3);
for (const a of s) assert.equal(intent(a.example), a.intent);

// Sentences, with missing figures said plainly.
assert.equal(quarterName("CY26 Q2"), "Q2 2026");
assert.equal(usd(1_214_000_000), "$1.21B");
assert.equal(usd(850_000_000), "$850M");
assert.equal(usd(undefined), "n/a");
assert.equal(pctOf(0.1844, true), "+18.4%");
assert.equal(pctOf(-0.03, true), "−3.0%");
assert.equal(day("2026-11-05", 2026), "Nov 5");
assert.equal(day("2027-01-30", 2026), "Jan 30, 2027");
assert.equal(
  companySentence({
    name: "Microchip",
    quarter: "CY26 Q2",
    revenue: 1.214e9,
    growth: 0.184,
    grossMargin: 0.569,
    next: { date: "2026-11-05", status: "estimated" },
    thisYear: 2026,
  }),
  "Microchip's revenue was $1.21B in Q2 2026, up 18.4% on a year ago, with a 56.9% gross margin. It reports next around Nov 5 (estimated).",
);
assert.equal(
  companySentence({ name: "Credo", quarter: "CY26 Q2", revenue: 2.1e8 }),
  "Credo's revenue was $210M in Q2 2026, with no year-ago quarter to compare.",
);
assert.equal(companySentence({ name: "Sandisk" }), "Sandisk has no quarterly revenue in its SEC filings yet.");
assert.match(
  companySentence({ name: "X", revenue: 1e9, next: { date: "2026-10-01", status: "due" }, thisYear: 2026 }),
  /expected on Oct 1 and aren't filed yet\.$/,
);
assert.equal(
  cycleSentence({ phase: "Expansion, slowing", quarter: "CY26 Q2", growth: 0.31, reporting: 59 }),
  "In Q2 2026 the semiconductor cycle is expanding, but more slowly than the quarter before. Supply-chain revenue was up 31.0% on a year ago across 59 companies.",
);
assert.equal(cycleSentence({ phase: null }), "There aren't enough quarters reported yet to call the cycle.");
assert.equal(
  avnetSentence({ quarter: "FY27 Q1", billings: 6580, bookToBill: 1.09, backlog: 10600, billingsYearAgo: 5790 }),
  "Avnet's billings were $6.58B in FY27 Q1, up 13.6% on a year ago, with a book-to-bill of 1.09 and $10.60B of backlog.",
);
assert.equal(
  seasonSentence({
    quarter: "CY26 Q3",
    reported: 21,
    total: 77,
    medianGrowth: 0.08,
    next: [{ name: "Microchip", date: "2026-11-05" }],
    thisYear: 2026,
  }),
  "21 of 77 companies have reported Q3 2026; the median grew 8.0% on a year ago. Next: Microchip (Nov 5).",
);
assert.equal(
  lineCardSentence({ name: "Lattice", carriers: ["TTI", "Newark"], tracked: 3, hasHome: false }),
  "TTI and Newark list Lattice, 2 of the 3 distributors collected. Avnet's own line card isn't imported yet, so Avnet isn't in the check.",
);
assert.match(lineCardSentence({ name: "Murata", carriers: [], tracked: 3, hasHome: true }), /^None of the 3 distributors collected lists Murata\.$/);
assert.equal(newsSentence("onsemi", 0), "There is no recent story on onsemi in the feeds the app reads.");

// No slash, middle dot or em-dash in any text the page shows.
const visible = [
  CANT,
  ...ANSWERERS.flatMap((a) => [a.title, a.what, a.example]),
  companySentence({ name: "A", quarter: "CY26 Q2", revenue: 1e9, growth: 0.1, grossMargin: 0.4, next: { date: "2026-11-05", status: "reported" } }),
  cycleSentence({ phase: "Contraction, deepening", quarter: "CY26 Q2", growth: -0.1, reporting: 50 }),
  lineCardSentence({ name: "B", carriers: ["TTI"], tracked: 1, hasHome: false }),
];
for (const t of visible) assert.ok(!/[/·—–]/.test(t), t);

// Questions that name a company but ask something the rules can't answer go to Claude,
// not to the company's figures; "stock" as in shares is not a line card question.
for (const q of [
  "What will Avnet's stock price be?",
  "Is Arrow's stock up?",
  "What is Avnet's market share in China?",
  "Who are Avnet's ten biggest customers in Germany?",
  "Should I be worried about Microchip's margins?",
  "How did Texas Instruments and Analog Devices compare last quarter?",
])
  assert.equal(route(q), null, q);
for (const [q, slug] of [
  ["How is Microchip doing?", "microchip"],
  ["Microchip", "microchip"],
  ["onsemi results", "onsemi"],
  ["When does TI report next?", "texas-instruments"],
  ["What were Nvidia's margins last quarter?", "nvidia"],
] as const)
  assert.equal(route(q)?.company?.slug, slug, q);
assert.equal(route("Who stocks Lattice?")?.intent, "linecard");

// Two topics, or judgement, go to Claude as analysis; a fact Claude looks up is recall.
for (const q of [
  "Is supply tightening and how is Microchip doing?",
  "Where is the cycle and how are we doing against Arrow?",
  "What should I tell a customer worried about chip prices and lead times?",
  "Give me talking points for an onsemi QBR",
  "Why is Avnet growing faster than Arrow?",
]) {
  assert.equal(route(q), null, q);
  assert.equal(depth(q), "analysis", q);
}
for (const q of ["Which chip makers report earnings next?", "Anything new on Nvidia this week?", "What will Avnet's stock price be?", "What's the weather in Phoenix?"])
  assert.equal(depth(q), "recall", q);
assert.equal(route("What's the latest on Arrow?")?.intent, "news", "news on a company is one topic");

// Step 3.2: a Claude answer takes its sources, links and markers from the answerers that ran.
const part = (over: Partial<Answer>): Answer => ({ intent: "cycle", question: "q", subject: "S", text: "t", sources: [], links: [], ...over });
const sec = { status: "live" as const, label: "SEC filings" };
const mockSrc = { status: "mock" as const, label: "Mock" };
const both = compose("Is supply tightening and how is Avnet's business?", "Supply is easing — Avnet's backlog is mock.", [
  part({ intent: "supply", subject: "Supply", period: "On a year ago", sources: [sec], links: [{ href: "/supply-chain", label: "Supply Chain" }] }),
  part({ intent: "avnet", subject: "Avnet's business", period: "Q2 FY26", sources: [mockSrc], links: [{ href: "/performance", label: "Performance Tracker" }], hookups: ["billings", "backlog"] }),
  part({ intent: "cycle", subject: "The cycle", period: "On a year ago", sources: [sec], links: [{ href: "/supply-chain", label: "Supply Chain" }], hookups: ["backlog"] }),
]);
assert.equal(both.intent, "claude");
assert.equal(both.subject, "Supply, Avnet's business and the cycle");
assert.equal(both.period, undefined, "mixed periods are left to each part");
assert.deepEqual(both.sources, [sec, mockSrc]);
assert.deepEqual(both.links.map((l) => l.href), ["/supply-chain", "/performance"]);
assert.deepEqual(both.hookups, ["billings", "backlog"]);
assert.equal(both.parts?.length, 3);
assert.ok(!/[—–]/.test(both.text), "Claude's dashes are rewritten");
assert.equal(compose("q", "t", [part({ period: "Q2 2026" })]).period, "Q2 2026");
const none = compose("Who will win the World Cup?", "The app's data doesn't cover that.", []);
assert.equal(none.sources.length, 0);
assert.equal(none.suggestions?.length, 3);
assert.equal(cacheKey("  Is supply   tightening?? ", "2026-10-23"), cacheKey("is supply tightening", "2026-10-23"));
assert.notEqual(cacheKey("is supply tightening", "2026-10-23"), cacheKey("is supply tightening", "2026-10-24"));

console.log("ask route: ok");
