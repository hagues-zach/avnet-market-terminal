// Ask the Terminal routing: which answerer a typed question goes to, and the
// company or name it is about. Pure, so the page and the test read the same
// rules. Claude (step 3.2) will call the same answerers as tools.
import { COMPANIES, type Company } from "@/lib/data/live/earnings-model";
import { isHidden } from "@/lib/visibility";

export type Intent = "company" | "arrow" | "cycle" | "economy" | "supply" | "earnings" | "news" | "linecard" | "avnet";

export interface Routed {
  intent: Intent;
  company?: Company;
  /** A supplier name for line cards, when it isn't one of the app's companies. */
  name?: string;
  /** Words left for a news topic. */
  topic?: string;
}

export interface Answerer {
  intent: Intent;
  title: string;
  what: string;
  example: string;
  status: "live" | "mock";
}

// The page an answer reads from, where that page can be hidden (src/lib/visibility.ts).
const INTENT_PAGE: Partial<Record<Intent, string>> = { supply: "/supply-chain", linecard: "/line-cards" };

/** False for an answer whose page is hidden: it isn't listed, routed to or offered to Claude. */
export const intentShown = (intent: Intent) => !isHidden(INTENT_PAGE[intent] ?? "");

const ALL_ANSWERERS: Answerer[] = [
  {
    intent: "company",
    title: "Companies",
    what: "Revenue, growth, margins and next earnings for 77 companies",
    example: "How is Microchip doing?",
    status: "live",
  },
  {
    intent: "arrow",
    title: "Avnet against Arrow",
    what: "The scorecard verdict and the biggest gaps",
    example: "Are we ahead of Arrow?",
    status: "live",
  },
  { intent: "cycle", title: "The cycle", what: "The phase and supply-chain growth", example: "Where is the cycle?", status: "live" },
  { intent: "economy", title: "The economy", what: "Demand, costs, financing and the dollar", example: "What is the economy doing?", status: "live" },
  { intent: "supply", title: "Supply", what: "Whether component supply is tightening or easing", example: "Is supply tightening?", status: "live" },
  { intent: "earnings", title: "Earnings season", what: "Who has reported and who is next", example: "Who has reported?", status: "live" },
  { intent: "news", title: "News", what: "The latest stories on a company or topic", example: "What's the latest on onsemi?", status: "live" },
  { intent: "linecard", title: "Line cards", what: "Which collected distributors carry a supplier", example: "Who carries Lattice?", status: "live" },
  { intent: "avnet", title: "Avnet's business", what: "Billings, book-to-bill and backlog", example: "How is Avnet's business?", status: "mock" },
];

/** What can be asked, in the order the page lists it. Every example routes to its own intent (the test checks). */
export const ANSWERERS: Answerer[] = ALL_ANSWERERS.filter((a) => intentShown(a.intent));

// Words that can't name a company on their own (segments, generic words).
const GENERIC = new Set([
  "analog",
  "power",
  "digital",
  "advanced",
  "applied",
  "global",
  "general",
  "monolithic",
  "micro",
  "texas",
  "western",
  "universal",
  "benchmark",
]);
// Short names people use that the company names don't give.
const EXTRA: Record<string, string[]> = {
  "texas-instruments": ["ti"],
  "analog-devices": ["adi"],
  onsemi: ["on semi", "on semiconductor"],
  "monolithic-power": ["mps"],
  "te-connectivity": ["te connectivity"],
};
const SUFFIX =
  /\s+(inc|corp|corporation|technology|technologies|electronics|semiconductor|semiconductors|group|holdings|company|international|systems|devices|instruments)$/i;

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9&' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Names a company can be called by: its name, its slug in words, and its name without the corporate suffix. */
export function aliases(c: Company): string[] {
  const out = new Set([clean(c.name), clean(c.slug.replace(/-/g, " "))]);
  let short = clean(c.name);
  while (SUFFIX.test(short)) short = short.replace(SUFFIX, "");
  if (short.split(" ").length > 1 || (short.length >= 4 && !GENERIC.has(short))) out.add(short);
  for (const e of EXTRA[c.slug] ?? []) out.add(e);
  return [...out].filter((a) => a.length >= 2 && !GENERIC.has(a));
}

const INDEX = COMPANIES.flatMap((c) => aliases(c).map((a) => ({ a, c }))).sort((x, y) => y.a.length - x.a.length);

/** The company named in a question, longest name first, on word boundaries. */
export function findCompany(question: string): Company | undefined {
  const q = ` ${clean(question).replace(/'s\b/g, "")} `;
  return INDEX.find(({ a }) => q.includes(` ${a} `))?.c;
}

const has = (q: string, re: RegExp) => re.test(q);

// What a company question can ask and still get the company answer (its quarter,
// margins and next earnings). Anything else about a company ("its market share in
// China", "its biggest customers") is a question the rules can't answer, so it goes
// to Claude rather than getting the company's figures as if they answered it.
const OVERVIEW = new Set(
  (
    "how is are was were did does do doing done going the a an about tell me us on what whats what's latest last recent this " +
    "quarter quarterly results result revenue revenues sales growth growing margin margins gross operating earnings numbers figures " +
    "financials performance performing perform update overview look looking like company profile quick read give of for its their " +
    "next when report reports reporting it and"
  ).split(" "),
);

/** True when the question only names the company plus overview words. */
function overviewOnly(q: string, c: Company): boolean {
  let rest = ` ${q.replace(/'s\b/g, "")} `;
  for (const a of aliases(c)) rest = rest.split(` ${a} `).join(" ");
  return rest
    .split(" ")
    .filter(Boolean)
    .every((w) => OVERVIEW.has(w));
}

// Asking for judgement rather than a figure: these go to Claude, which can weigh
// several answerers' results, instead of getting one rule-written sentence.
const ANALYSIS =
  /\b(why|should|explain|talking points?|advise|advice|recommend|implications?|means?|worried|worry|risks?|impact|affect(s|ing)?|hurt(s|ing)?|help(s|ing)?|tell (a|my|the) (customer|client|team|boss))\b/;

const TOPICS: RegExp[] = [
  /\b(billings|bookings|backlog|book to bill|book-to-bill)\b/,
  /\b(earnings season|who (has )?reported|who reports|earnings calendar|reports next)\b/,
  /\b(cycle|upturn|downturn|expansion|contraction|recovery)\b/,
  /\b(supply|lead times?|shortages?|tight|tightening|easing|allocation)\b/,
  /\b(economy|economic|macro|rates?|inflation|dollar|currency|production)\b/,
  /\b(news|latest|headlines?|stories|story|happening|announced)\b/,
];

/** How many topics a question asks about: the topics above, plus Arrow or a company asked alongside one. */
function topicCount(q: string, company?: Company): number {
  // News on a company is one topic: the company is what the news is about.
  const topics = TOPICS.filter((re) => re.test(q)).length;
  const aboutNews = TOPICS[5].test(q);
  const arrowAsked = !aboutNews && /\barrow\b/.test(q);
  const companyAsked = !aboutNews && topics > 0 && company !== undefined && !["avnet", "arrow"].includes(company.slug);
  return topics + (arrowAsked ? 1 : 0) + (companyAsked ? 1 : 0);
}

/**
 * For a question Claude answers: "analysis" when it asks for judgement or spans two
 * topics (a stronger model, a fuller answer), otherwise "recall" (a fast model, a
 * few sentences of fact).
 */
export function depth(question: string): "recall" | "analysis" {
  const q = clean(question);
  return ANALYSIS.test(q) || topicCount(q, findCompany(question)) > 1 ? "analysis" : "recall";
}

/** The answerer a question goes to, or null for Claude. An answer whose page is hidden goes to Claude too. */
export function route(question: string): Routed | null {
  const r = rules(question);
  return r && intentShown(r.intent) ? r : null;
}

function rules(question: string): Routed | null {
  const q = clean(question);
  if (!q) return null;
  const company = findCompany(question);

  // The rules answer one topic with facts. Judgement, or two topics in one question
  // (a topic and a company, or Arrow and another topic), goes to Claude.
  if (ANALYSIS.test(q) || topicCount(q, company) > 1) return null;

  // Line cards: "who carries X", "is X on Avnet's line card". "Stock" here means
  // holding parts, not shares: "Avnet's stock price" and "Arrow's stock is up" don't count.
  const stockShares = has(q, /\bstocks?\s+(price|prices|market|markets|shares?|chart|value|valuation|performance|up|down|is|was)\b/);
  if (has(q, /\b(carr(y|ies)|line ?cards?|franchised?|distributes)\b/) || (!stockShares && has(q, /\bstocks?\b/))) {
    const after = q.match(/\b(?:carr(?:y|ies)|stocks?|distributes)\s+(.+?)\??$/)?.[1];
    const name = company?.name ?? after?.replace(/^(the|a)\s+/, "");
    if (name) return { intent: "linecard", company, name };
  }
  // Avnet against Arrow.
  const arrowNamed = /\barrow\b/.test(q);
  const us = /\b(we|us|our|avnet)\b/.test(q);
  if (arrowNamed && (us || has(q, /\b(ahead|behind|vs|versus|against|compare|compared|beat|beating|winning|losing|lead|leads)\b/)))
    return { intent: "arrow" };
  // News.
  if (has(q, /\b(news|latest|headlines?|stories|story|happening|announced)\b/)) {
    const topic = q
      .replace(
        /\b(what|whats|what's|is|are|the|on|about|for|any|latest|news|headlines?|stories|story|happening|announced|with|in|of|tell|me|show)\b/g,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
    return { intent: "news", company, topic: company ? undefined : topic || undefined };
  }
  // Avnet's own business (mock); "how is Avnet doing" stays the live company answer.
  if (has(q, /\b(billings|bookings|backlog|book to bill|book-to-bill)\b/) || (us && has(q, /\bbusiness\b/))) return { intent: "avnet" };
  if (!company && has(q, /\b(earnings season|who (has )?reported|reported|reporting|who reports|earnings calendar|reports next)\b/))
    return { intent: "earnings" };
  if (has(q, /\b(cycle|upturn|downturn|expansion|contraction|recovery)\b/)) return { intent: "cycle" };
  if (has(q, /\b(supply|lead times?|shortages?|tight|tightening|easing|allocation)\b/)) return { intent: "supply" };
  if (has(q, /\b(economy|economic|macro|rates?|inflation|dollar|currency|production)\b/)) return { intent: "economy" };
  if (company && overviewOnly(q, company)) return { intent: "company", company };
  return null;
}

/** Up to three answerers closest to an unanswered question, by shared words. */
export function suggest(question: string, n = 3): Answerer[] {
  const words = new Set(
    clean(question)
      .split(" ")
      .filter((w) => w.length > 3),
  );
  const score = (a: Answerer) =>
    clean(`${a.title} ${a.what} ${a.example}`)
      .split(" ")
      .filter((w) => words.has(w)).length;
  return ANSWERERS.map((a, i) => ({ a, s: score(a), i }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, n)
    .map((x) => x.a);
}
