import { readFileSync } from "node:fs";
import path from "node:path";

// What Claude knows about Avnet when it writes "Why it matters to Avnet" on an
// article page. Public facts only, each with its source and the date it was true,
// so a reviewer can check every line. Review it every quarter, after earnings:
// profile.test.ts fails once PROFILE_AS_OF is more than 120 days old.
//
// Private facts (real top customers and suppliers) never live in this public
// repo. They are read from data/private/avnet-context.json (gitignored) when it
// exists, and are used only to judge relevance: the prompt tells Claude never to
// say who is or isn't an Avnet customer or supplier. Server-only.

export interface Fact {
  text: string;
  /** URL of the filing, release or article the fact comes from. */
  source: string;
  /** YYYY-MM-DD: when the fact was published or true. */
  asOf: string;
}

export type Section = "business" | "customers" | "technologies" | "suppliers" | "recent" | "competitors" | "drivers";

export const SECTION_TITLES: Record<Section, string> = {
  business: "How Avnet is organised",
  customers: "Customer base and end markets",
  technologies: "Technologies and services Avnet pushes",
  suppliers: "Suppliers and line card",
  recent: "Recent initiatives, investments and new relationships",
  competitors: "Competitors",
  drivers: "What moves Avnet's results",
};

/** When the profile was last reviewed against Avnet's filings. */
export const PROFILE_AS_OF = "2026-11-24";
/** Recent items older than this drop out of the prompt. */
export const RECENT_MONTHS = 18;

const TEN_K = "https://www.sec.gov/Archives/edgar/data/8858/000110465926096346/avt-20260627x10k.htm";
const Q4_FY26 = "https://www.sec.gov/Archives/edgar/data/8858/000000885826000066/avt-20260805xex99d1.htm";
const Q1_FY27 = "https://ir.avnet.com/financial-information/quarterly-results";
const Q1_FY27_CALL = "https://www.fool.com/earnings/call-transcripts/2026/11/04/avnet-avt-q1-2027-earnings-call-transcript/";

export const PROFILE: Record<Section, Fact[]> = {
  business: [
    { text: "Global electronic component distributor and solutions provider, founded 1921, headquartered in Phoenix, serving customers in more than 140 countries.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Two operating groups: Electronic Components (EC), for high and medium volume customers, and Farnell, for lower volume customers who need parts fast to design, prototype and test, mostly through e-commerce. Both run in the Americas, EMEA and Asia.", source: TEN_K, asOf: "2026-06-27" },
    { text: "EC sales are mostly semiconductors (about 83%), then IP&E (interconnect, passive and electromechanical, about 15%). Farnell is mostly IP&E, semiconductors, single-board computers, test and measurement and MRO products.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Asia is the largest region by sales, about half of the total; EMEA and the Americas follow.", source: Q4_FY26, asOf: "2026-06-27" },
    { text: "EC sells design support (Avnet Design Solutions: reference designs, evaluation kits, FAEs, bill of materials help), supply chain services (procurement, warehousing, logistics, programming) and embedded and integrated solutions, including custom-built servers.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Demand creation matters: Avnet registers designs with suppliers early, and those design registrations are its pipeline of future sales.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
  ],
  customers: [
    { text: "Customers range from startups and mid-sized firms to enterprise OEMs, EMS providers and ODMs; Farnell serves engineers and entrepreneurs buying in small quantities.", source: TEN_K, asOf: "2026-06-27" },
    { text: "EC serves industrial, automotive, aerospace and defense, healthcare, telecommunications and networking customers, among others.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Strongest end markets in the September 2026 quarter: data center (hyperscale and new cloud), aerospace and defense, and networking; industrial and transportation strong in EMEA; data center and industrial strong in Asia.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Large OEMs increasingly use Avnet's supply chain services for supply resiliency.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
  ],
  technologies: [
    { text: "Data center and AI infrastructure: memory, power, connectors and passives for servers and networking, plus Avnet Integrated Solutions building purpose-built IT hardware.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Emerging areas management names: drones, robotics and edge intelligence (physical AI).", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Embedded computing, displays and single-board computers; IoT and industrial connectivity; test and measurement through Farnell.", source: TEN_K, asOf: "2026-06-27" },
  ],
  suppliers: [
    { text: "Avnet buys most products under franchised distribution agreements, which usually protect it against obsolescence and price erosion and allow returns if a line is cancelled (30 to 180 days' notice).", source: TEN_K, asOf: "2026-06-27" },
    { text: "One supplier was over 10% of Avnet's sales in fiscal 2026; the 10-K does not name it.", source: TEN_K, asOf: "2026-06-27" },
    { text: "A broad line card is a stated advantage: customers can buy almost everything from one distributor. Avnet's full line card is not loaded in this app, so whether it carries a given supplier is not known here.", source: TEN_K, asOf: "2026-06-27" },
  ],
  recent: [
    { text: "Record quarter to September 2026: sales about $10.7 billion, growth across every region; guided the December 2026 quarter higher again.", source: Q1_FY27, asOf: "2026-11-04" },
    { text: "Memory price increases drove about a third of the September quarter's growth; management expects price increases beyond memory in early 2027.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "\"Power of One\": combining Farnell's digital, high-service distribution with Avnet's global scale.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Raised the dividend about 6% and said it is looking at small tuck-in acquisitions; added debt and securitization capacity to fund working capital.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Avnet Silica extended its partnership with Teltonika Networks (industrial networking and IoT) across EMEA.", source: "https://www.newelectronics.co.uk/content/news/avnet-silica-extends-partnership-with-teltonika-networks-across-emea", asOf: "2026-10-26" },
    { text: "Avnet Silica signed a distribution agreement with LEM (current and voltage sensors for power electronics).", source: "https://www.newelectronics.co.uk/content/news/avnet-silica-signs-distribution-agreement-with-lem", asOf: "2026-09-21" },
    { text: "Avnet and Weston Robot launched an AI-powered autonomous inspection robot for industrial sites.", source: "https://www.tribuneindia.com/news/advertorial-disclaimer/avnet-and-weston-robot-bring-physical-ai-to-industrial-operations-with-autonomous-inspection-robot", asOf: "2026-08-05" },
    { text: "Avnet works with Liquid Instruments to take its test and measurement hardware to production.", source: "https://www.itnews.com.au/video/from-deep-tech-breakthrough-to-production-627615", asOf: "2026-08-04" },
    { text: "Avnet Silica and Thales offer secure eSIM to engineering teams.", source: "https://www.electronicsweekly.com/news/business/avnet-silica-and-thales-offer-secure-esim-to-engineering-teams-2026-03", asOf: "2026-03-04" },
  ],
  competitors: [
    { text: "For EC: Arrow Electronics, Future Electronics, WPG (World Peace Group) and WT Microelectronics. For Farnell: Mouser, DigiKey and RS Components (RS Group). Also smaller specialists such as TTI.", source: TEN_K, asOf: "2026-06-27" },
  ],
  drivers: [
    { text: "Component supply and lead times: supply tightened through the September 2026 quarter, with lead times extending across most semiconductors and IP&E and backlog delinquencies rising.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Pricing, especially memory; allocation; and how much inventory sits in the channel, which Avnet must carry to meet delivery needs.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
    { text: "Supplier decisions about distribution: franchise wins and losses, direct-selling moves, and new product introductions through distributors.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Trade rules, tariffs and export controls, given that about half of sales are in Asia.", source: TEN_K, asOf: "2026-06-27" },
    { text: "Demand at OEMs, EMS providers and ODMs in its end markets, and interest rates, since working capital is funded with debt.", source: Q1_FY27_CALL, asOf: "2026-11-04" },
  ],
};

/** Internal names that sharpen relevance. Never shown, never stated. */
export interface PrivateContext {
  topCustomers?: string[];
  topSuppliers?: string[];
  notes?: string[];
}

export const PRIVATE_CONTEXT_FILE = path.join(process.cwd(), "data", "private", "avnet-context.json");

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim()) : undefined);

export function readPrivateContext(file = PRIVATE_CONTEXT_FILE): PrivateContext | undefined {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const ctx: PrivateContext = { topCustomers: strings(raw.topCustomers), topSuppliers: strings(raw.topSuppliers), notes: strings(raw.notes) };
    return ctx.topCustomers?.length || ctx.topSuppliers?.length || ctx.notes?.length ? ctx : undefined;
  } catch {
    return undefined;
  }
}

const monthsBefore = (date: string, months: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
};

/**
 * The profile as one block of text for the system prompt. Stable for a given
 * profile and private file, so it is cached across every brief in a run. Pure
 * apart from its arguments.
 */
export function renderAvnetContext(opts: { profile?: Record<Section, Fact[]>; asOf?: string; privateContext?: PrivateContext } = {}): string {
  const profile = opts.profile ?? PROFILE;
  const cutoff = monthsBefore(opts.asOf ?? PROFILE_AS_OF, RECENT_MONTHS);
  const lines = [`<avnet_profile as_of="${opts.asOf ?? PROFILE_AS_OF}">`];
  for (const section of Object.keys(SECTION_TITLES) as Section[]) {
    const facts = profile[section].filter((f) => section !== "recent" || f.asOf >= cutoff);
    if (!facts.length) continue;
    lines.push(`## ${SECTION_TITLES[section]}`, ...facts.map((f) => `- ${f.text} (${f.asOf})`), "");
  }
  const p = opts.privateContext;
  if (p) {
    lines.push("## Internal (for judging relevance only; never state these)");
    if (p.topCustomers?.length) lines.push(`- Top customers: ${p.topCustomers.join(", ")}`);
    if (p.topSuppliers?.length) lines.push(`- Top suppliers: ${p.topSuppliers.join(", ")}`);
    for (const n of p.notes ?? []) lines.push(`- ${n}`);
    lines.push("");
  }
  lines.push("</avnet_profile>");
  return lines.join("\n");
}
