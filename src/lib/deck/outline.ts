// Pitch Deck Builder: what a slide is, where a deck starts and the outline for
// each audience. Pure, so the page, the builder and the test agree. A slide's
// status comes only from the hookups register: it is live when every source it
// reads is live, so it turns live with its hookups.
import { HOOKUPS, type Hookup } from "@/lib/hookups";
import { COMPANIES, roleOf, type Company } from "@/lib/data/live/earnings-model";
import { PRIMERS, type Primer } from "@/lib/learn/content";
import type { MarketView } from "@/lib/scenario/model";

export type Audience = "supplier" | "customer" | "internal";

export const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "supplier", label: "Supplier pitch" },
  { value: "customer", label: "Customer pitch" },
  { value: "internal", label: "Internal review" },
];

export type SlideId =
  | "cover"
  | "company"
  | "commentary"
  | "linecard"
  | "arrow"
  | "news"
  | "technology"
  | "cycle"
  | "economy"
  | "account"
  | "share"
  | "performance"
  | "supply"
  | "scenario"
  | "pipeline"
  | "leads"
  | "talking"
  | "sources";

export type Group = "Network" | "Knowledge" | "Avnet performance";
export const GROUPS: Group[] = ["Network", "Knowledge", "Avnet performance"];

export interface Slide {
  id: SlideId;
  title: string;
  /** The library column, as in the nav. Cover and sources have none: the rules add them. */
  group?: Group;
  /** The page it comes from. */
  from: string;
  /** Every source it reads, from src/lib/hookups.ts. */
  hookups: string[];
  /** A company, a primer, either (news is on a company or a technology), or a deck started from QBR Prep. */
  needs?: "company" | "primer" | "subject" | "qbr";
  /** The build plan step that makes it, for a slide whose page isn't built. */
  planned?: string;
}

export const SLIDES: Slide[] = [
  { id: "cover", title: "Cover", from: "This deck", hookups: [] },
  { id: "company", title: "Company at a glance", group: "Network", from: "Company Profiles", hookups: ["sec"], needs: "company" },
  { id: "commentary", title: "What management said", group: "Network", from: "Company Profiles", hookups: ["sec"], needs: "company" },
  { id: "linecard", title: "Who carries it", group: "Network", from: "Line Cards", hookups: ["line-cards"], needs: "company" },
  { id: "arrow", title: "Avnet against Arrow", group: "Network", from: "Avnet vs Arrow", hookups: ["sec"] },
  { id: "news", title: "Latest news", group: "Knowledge", from: "Market News", hookups: ["news"], needs: "subject" },
  { id: "technology", title: "The technology", group: "Knowledge", from: "Learning Center", hookups: [], needs: "primer" },
  { id: "cycle", title: "Where the cycle is", group: "Knowledge", from: "Market Cycle", hookups: ["sec"] },
  { id: "economy", title: "The economic backdrop", group: "Knowledge", from: "Economic Signals", hookups: ["macro"] },
  {
    id: "account",
    title: "Avnet's business with the account",
    group: "Avnet performance",
    from: "QBR Prep",
    hookups: ["billings", "backlog", "drms", "quotes", "customer-master"],
    needs: "company",
  },
  {
    id: "share",
    title: "Avnet's share of the segment",
    group: "Avnet performance",
    from: "Market Share",
    hookups: ["billings", "wsts", "gartner-forecast", "code-map"],
  },
  {
    id: "performance",
    title: "Avnet's business",
    group: "Avnet performance",
    from: "Performance Tracker",
    hookups: ["billings", "bookings", "backlog"],
  },
  { id: "supply", title: "Supply, tightening or easing", group: "Avnet performance", from: "Supply Chain", hookups: ["macro", "sec"] },
  {
    id: "scenario",
    title: "A scenario",
    group: "Avnet performance",
    from: "Scenario Modeler",
    hookups: ["billings", "wsts", "gartner-forecast", "ipe-forecast", "code-map"],
  },
  { id: "pipeline", title: "Design pipeline", group: "Avnet performance", from: "Design Pipeline", hookups: ["drms", "billings"] },
  { id: "leads", title: "Who buys it", group: "Network", from: "Lead Finder", hookups: ["sec", "news"], needs: "primer" },
  // Claude's talking points for the QBR the deck started from, read from QBR Prep's saved copy.
  { id: "talking", title: "Talking points and questions", group: "Network", from: "QBR Prep", hookups: ["sec"], needs: "qbr" },
  { id: "sources", title: "Sources", from: "This deck", hookups: [] },
];

export const slide = (id: SlideId): Slide => SLIDES.find((s) => s.id === id)!;
export const isSlideId = (v: string): v is SlideId => SLIDES.some((s) => s.id === v);
/** Cover and sources frame the deck; they aren't counted as content. */
export const isFrame = (id: SlideId) => id === "cover" || id === "sources";

export type SlideStatus = "live" | "mock" | "planned";

/** Live when every source it reads is live in the register, Mock when any one isn't. */
export function statusOf(s: Slide, register: Hookup[] = HOOKUPS): SlideStatus {
  if (s.planned) return "planned";
  return s.hookups.every((id) => register.find((h) => h.id === id)?.status === "live") ? "live" : "mock";
}

/* ---------- Where a deck starts ---------- */

export type From = "profile" | "qbr" | "learn" | "scenario" | "leads";

const FROM_PAGE: Record<From, string> = {
  profile: "Company Profile",
  qbr: "QBR Prep",
  learn: "the Learning Center",
  scenario: "Scenario Modeler",
  leads: "Lead Finder",
};

export interface ScenarioStart {
  years: number;
  view: MarketView;
  /** Share change in points for every segment (0.25 is a quarter point). */
  share: number;
}

export const DEFAULT_SCENARIO: ScenarioStart = { years: 2, view: "base", share: 0.25 };

export interface Start {
  audience: Audience;
  company?: Company;
  primer?: Primer;
  from?: From;
  /** A one-slide deck: one view exported on its own. */
  single?: SlideId;
  scenario: ScenarioStart;
  /** The QBR a deck started from (?from=qbr&meeting=supplier&focus=...), to find its talking points. */
  qbr?: { meeting: "supplier" | "customer"; focus: string };
  /** Anything in the URL that couldn't be used, said plainly. */
  notes: string[];
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** The technology a company makes, from the primers' makers. */
export const primerFor = (c?: Company): Primer | undefined => (c ? PRIMERS.find((p) => p.makers.includes(c.slug)) : undefined);

/** The audience a company implies: a supplier pitch for a supplier, a customer pitch for a customer. */
export function audienceFor(c?: Company): Audience {
  const role = c ? roleOf(c) : undefined;
  return role === "supplier" ? "supplier" : role === "customer" ? "customer" : "internal";
}

export const audienceLabel = (a: Audience) => AUDIENCES.find((x) => x.value === a)!.label;

export function parseStart(q: Params): Start {
  const notes: string[] = [];
  const slug = one(q.company);
  const company = slug ? COMPANIES.find((c) => c.slug === slug.toLowerCase()) : undefined;
  if (slug && !company) notes.push(`No company called "${slug}" in the app.`);
  const primerSlug = one(q.primer);
  const named = primerSlug ? PRIMERS.find((p) => p.slug === primerSlug.toLowerCase()) : undefined;
  if (primerSlug && !named) notes.push(`No primer called "${primerSlug}" in the Learning Center.`);
  const fromRaw = one(q.from);
  const from = fromRaw && fromRaw in FROM_PAGE ? (fromRaw as From) : undefined;
  const slideRaw = one(q.slide);
  const single = slideRaw && isSlideId(slideRaw) && !isFrame(slideRaw) ? slideRaw : undefined;
  if (slideRaw && !single) notes.push(`No slide called "${slideRaw}".`);

  const years = Number(one(q.horizon));
  const view = one(q.view);
  const share = Number(one(q.share));
  const scenario: ScenarioStart = {
    years: Number.isInteger(years) && years >= 1 && years <= 4 ? years : DEFAULT_SCENARIO.years,
    view: view === "base" || view === "upside" || view === "downside" ? view : DEFAULT_SCENARIO.view,
    share: Number.isFinite(share) && one(q.share) !== undefined && Math.abs(share) <= 2 ? share : DEFAULT_SCENARIO.share,
  };

  const asked = one(q.audience);
  const audience: Audience =
    asked === "supplier" || asked === "customer" || asked === "internal" ? asked : company ? audienceFor(company) : named ? "customer" : "internal";
  const meeting = one(q.meeting);
  const qbr =
    from === "qbr" && company
      ? {
          meeting: meeting === "supplier" || meeting === "customer" ? meeting : roleOf(company) === "customer" ? ("customer" as const) : ("supplier" as const),
          focus: (one(q.focus) ?? "").slice(0, 200),
        }
      : undefined;
  return { audience, company, primer: named ?? primerFor(company), from, single, scenario, qbr, notes };
}

/** "Started from QBR Prep for Microchip.", or null for a deck started here. */
export function startedFrom(s: Start): string | null {
  if (!s.from) return null;
  const about = s.from === "learn" ? s.primer?.name : s.from === "scenario" ? undefined : s.company?.name;
  return `Started from ${FROM_PAGE[s.from]}${about ? ` for ${about}` : ""}.`;
}

/** The URL for a start, so links into the deck and the page's own controls agree. */
export function deckHref(s: {
  audience?: Audience;
  company?: string;
  primer?: string;
  from?: From;
  slide?: SlideId;
  scenario?: ScenarioStart;
  qbr?: Start["qbr"];
}): string {
  const q = new URLSearchParams();
  if (s.company) q.set("company", s.company);
  if (s.primer) q.set("primer", s.primer);
  if (s.audience) q.set("audience", s.audience);
  if (s.slide) q.set("slide", s.slide);
  if (s.from) q.set("from", s.from);
  if (s.qbr) {
    q.set("meeting", s.qbr.meeting);
    if (s.qbr.focus) q.set("focus", s.qbr.focus);
  }
  if (s.scenario) {
    q.set("horizon", String(s.scenario.years));
    q.set("view", s.scenario.view);
    q.set("share", String(s.scenario.share));
  }
  const qs = q.toString();
  return qs ? `/tools/deck?${qs}` : "/tools/deck";
}

/* ---------- Outlines ---------- */

const ORDER: Record<Audience, SlideId[]> = {
  supplier: ["cover", "company", "commentary", "linecard", "leads", "share", "arrow", "pipeline", "cycle", "sources"],
  customer: ["cover", "company", "commentary", "technology", "news", "account", "supply", "sources"],
  internal: ["cover", "company", "cycle", "economy", "arrow", "performance", "share", "scenario", "sources"],
};

/** Whether a slide can be made for this start: its company or primer is known, and its page is built. */
export function available(id: SlideId, s: Pick<Start, "company" | "primer"> & Partial<Pick<Start, "from">>): boolean {
  const x = slide(id);
  if (x.planned) return false;
  if (x.needs === "qbr") return Boolean(s.company && s.from === "qbr");
  if (x.needs === "company") return Boolean(s.company);
  if (x.needs === "primer") return Boolean(s.primer);
  if (x.needs === "subject") return Boolean(s.company || s.primer);
  return true;
}

/** Why a slide can't be added, or null when it can. */
export function unavailableReason(id: SlideId, s: Pick<Start, "company" | "primer"> & Partial<Pick<Start, "from">>): string | null {
  const x = slide(id);
  if (x.planned) return `Arrives in step ${x.planned}`;
  if (available(id, s)) return null;
  if (x.needs === "qbr") return "Needs a deck started from QBR Prep";
  return x.needs === "primer" ? "Needs a company with a primer" : x.needs === "subject" ? "Needs a company or a technology" : "Needs a company";
}

/** The slides a start opens with, in order. One view on its own when the URL names a slide. */
export function outline(s: Start): SlideId[] {
  if (s.single && available(s.single, s)) return [s.single];
  const ids = ORDER[s.audience].filter((id) => available(id, s));
  // A deck from QBR Prep closes on the meeting's talking points, before the sources.
  return available("talking", s) ? [...ids.slice(0, -1), "talking", ...ids.slice(-1)] : ids;
}

/** Add a slide before the sources slide, or at the end. */
export function addSlide(ids: SlideId[], id: SlideId): SlideId[] {
  if (ids.includes(id)) return ids;
  const at = ids.indexOf("sources");
  return at < 0 ? [...ids, id] : [...ids.slice(0, at), id, ...ids.slice(at)];
}

/** Move a slide one place up (-1) or down (1). */
export function move(ids: SlideId[], id: SlideId, dir: -1 | 1): SlideId[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** The page a slide opens on. Cover and sources have none. */
export function hrefOf(id: SlideId, s: Pick<Start, "company" | "primer" | "scenario"> & Partial<Pick<Start, "qbr">>): string | null {
  const c = s.company?.slug;
  switch (id) {
    case "talking": {
      if (!c) return "/tools/qbr";
      const q = new URLSearchParams({ company: c });
      if (s.qbr) q.set("meeting", s.qbr.meeting);
      if (s.qbr?.focus) q.set("focus", s.qbr.focus);
      return `/tools/qbr?${q}`;
    }
    case "company":
    case "commentary":
      return c ? `/network/${c}` : "/network";
    case "linecard":
      return "/line-cards";
    case "arrow":
      return "/competitive";
    case "news":
      return "/news";
    case "technology":
      return s.primer ? `/learn/${s.primer.slug}` : "/learn";
    case "cycle":
      return "/cycle";
    case "economy":
      return "/signals";
    case "account":
      return c ? `/tools/qbr?company=${c}` : "/tools/qbr";
    case "share":
      return "/market-share";
    case "performance":
      return "/performance";
    case "supply":
      return "/supply-chain";
    case "scenario":
      return "/forecast";
    case "pipeline":
      return "/design-pipeline";
    case "leads":
      return s.primer ? `/tools/leads?primer=${s.primer.slug}` : "/tools/leads";
    default:
      return null;
  }
}

/* ---------- Words ---------- */

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** One to nine in words, 10 and up in numerals. */
export const count = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/** "a, b and c". */
export function list(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** What the deck is called: "A supplier pitch for Microchip", "An internal review". */
export function deckName(s: Pick<Start, "audience" | "company" | "primer">): string {
  if (s.audience === "internal") return s.company ? `An internal review with ${s.company.name}` : "An internal review";
  const kind = s.audience === "supplier" ? "A supplier pitch" : "A customer pitch";
  if (s.company) return `${kind} for ${s.company.name}`;
  return s.primer ? `${kind} on ${s.primer.name}` : kind;
}

/** The deck in words: how many slides, and how many are live, mock and planned. */
export function lead(s: Pick<Start, "audience" | "company" | "primer">, ids: SlideId[], register: Hookup[] = HOOKUPS): string {
  if (!ids.length) return `${deckName(s)}, with no slides yet. Add one from the library.`;
  const content = ids.filter((id) => !isFrame(id));
  const by = (st: SlideStatus) => content.filter((id) => statusOf(slide(id), register) === st).length;
  const parts = [
    by("live") && `${count(by("live"))} on live data`,
    by("mock") && `${count(by("mock"))} on mock`,
    by("planned") && `${count(by("planned"))} planned`,
  ].filter((x): x is string => Boolean(x));
  const frames = [ids.includes("cover") && "a cover", ids.includes("sources") && "sources"].filter((x): x is string => Boolean(x));
  if (ids.length === 1) {
    const only = slide(ids[0]);
    const on = content.length ? `, ${statusOf(only, register) === "live" ? "on live data" : "on mock data"}` : "";
    return `One slide: ${only.title}${on}.`;
  }
  const slides = `${count(ids.length)} slides`;
  const body = parts.length ? `: ${list(parts)}` : "";
  const framed = frames.length ? `${parts.length ? ", with" : ": just"} ${list(frames)}` : "";
  return `${deckName(s)} in ${slides}${body}${framed}.`;
}

/** "Company at a glance" headline from the latest growth. */
export function companyHeadline(name: string, growth?: number): string {
  if (growth === undefined || !Number.isFinite(growth)) return `${name} at a glance`;
  const g = Math.round(Math.abs(growth) * 100);
  return growth >= 0 ? `${name} grew ${g}% on a year ago` : `${name}'s revenue fell ${g}% on a year ago`;
}

/** A segment name as words: "Microcontrollers & processors" to "microcontrollers and processors". */
export const segmentWords = (s: string) => s.replace(/&/g, "and").toLowerCase();

/** The share headline: "Avnet holds 4.4% of microcontrollers and processors". */
export const shareHeadline = (segment: string, share: number) => `Avnet holds ${(share * 100).toFixed(1)}% of ${segmentWords(segment)}`;

/** The market segment each primer belongs to, in the shared model of Avnet. */
export const PRIMER_SEGMENT: Record<string, string> = {
  microcontrollers: "Microcontrollers & processors",
  "sic-mosfets": "Discretes & power",
  mlccs: "Passives",
  connectors: "Connectors",
  fpgas: "Logic & FPGA",
  "power-management": "Analog",
};

/* ---------- Previews ---------- */

/** What a slide shows: a headline, a sentence, its figures, and where they came from. */
export type SeriesWho = "avnet" | "arrow" | "company" | "market";

export interface Chart {
  /** bar: horizontal bars (a comparison); column: bars over time; line: a rate over time. */
  kind: "bar" | "column" | "line";
  format: "usd" | "pct";
  series: { name: string; who: SeriesWho; points: { label: string; value: number }[] }[];
}

export interface Preview {
  headline: string;
  text?: string;
  /** Column headers for multi-value figures (the first column is the label). */
  columns?: string[];
  facts?: { label: string; values: string[] }[];
  /** A chart drawn the same way in the preview and, natively, in the exported deck. */
  chart?: Chart;
  /** Short lines: stories, uses, sources. */
  lines?: string[];
  /** Side-by-side lists, each with its heading: talking points beside questions to ask. */
  groups?: { title: string; lines: string[] }[];
  /** Text Claude wrote earlier and the app cached. */
  claude?: { label: string; date?: string };
  source: string;
  period?: string;
  /** Mock sources to show in the marker under the preview (defaults to the slide's). */
  hookups?: string[];
  error?: boolean;
}

/** The sources slide: every content slide's source and period, mock ones said so. */
export function sourcesPreview(ids: SlideId[], previews: Partial<Record<SlideId, Preview>>, register: Hookup[] = HOOKUPS): Preview {
  const content = ids.filter((id) => !isFrame(id));
  const lines = content.map((id) => {
    const p = previews[id];
    const where = p ? `${p.source}${p.period ? `, ${p.period}` : ""}` : slide(id).from;
    const flag = statusOf(slide(id), register) === "mock" && !/mock/i.test(where) ? " (mock data)" : "";
    return `${slide(id).title}: ${where}${flag}`;
  });
  const mock = content.filter((id) => statusOf(slide(id), register) === "mock").length;
  return {
    headline: "Sources",
    text: mock
      ? `${count(mock)[0].toUpperCase()}${count(mock).slice(1)} of ${count(content.length)} slides ${mock === 1 ? "uses" : "use"} mock data until Avnet's sources are hooked up.`
      : "Every slide is on live data.",
    lines,
    source: "This deck",
  };
}
