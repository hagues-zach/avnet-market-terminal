// Ask the Terminal answerers: each reads the app's own data and returns an
// Answer with its sources and the page it came from. Server-only. Claude text is
// only ever read from the cache; nothing here calls Claude.
import { cachedCommentary } from "@/lib/ai/commentary";
import { readCache } from "@/lib/ai/cache";
import type { Angle } from "@/lib/ai/news-angles";
import { MEASURES, scorecard, tally, verdict, type Kind } from "@/lib/competitive/compare";
import { getCompanyNews } from "@/lib/data/live/company-news";
import { getCycle } from "@/lib/data/live/cycle";
import { getEarningsCalendar, getNextRelease } from "@/lib/data/live/earnings-calendar";
import { getCompanyEarnings, getPeerRows } from "@/lib/data/live/earnings";
import type { Company } from "@/lib/data/live/earnings-model";
import { getLiveNews } from "@/lib/data/live/news";
import type { LiveArticle } from "@/lib/data/live/shared";
import { getSignals, yearChange } from "@/lib/data/live/signals";
import { season } from "@/lib/earnings/season";
import { getCarriers } from "@/lib/line-cards/analysis";
import { PERFORMANCE } from "@/lib/shells/mock-avnet";
import { readsOf, sentence as economySentence, type Changes } from "@/lib/signals/read";
import { SIGNAL_KEYS, scoreSignals, sentence as supplySentence } from "@/lib/supply/read";
import { route, suggest } from "./route";
import {
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
  type Answer,
  type Story,
} from "./sentences";

const SEC = { status: "live" as const, label: "SEC filings" };
const thisYear = () => new Date().getUTCFullYear();

const failed = (question: string, subject: string, source: string, href: string, label: string): Answer => ({
  intent: "none",
  question,
  subject,
  text: `Couldn't load ${source} just now. Try again in a few minutes.`,
  sources: [],
  links: [{ href, label }],
  error: true,
});

async function company(question: string, c: Company): Promise<Answer> {
  const [rows, next, commentary] = await Promise.all([
    getPeerRows(),
    getNextRelease(c.slug).catch(() => null),
    cachedCommentary(c).catch(() => null),
  ]);
  const q = rows.find((r) => r.company.slug === c.slug)?.latest ?? null;
  const v = q?.values ?? {};
  return {
    intent: "company",
    question,
    subject: c.name,
    period: q ? quarterName(q.calendarLabel) : undefined,
    text: companySentence({
      name: c.name,
      quarter: q?.calendarLabel,
      revenue: v.revenue,
      growth: v.revenueYoY,
      grossMargin: v.grossMargin,
      next: next ?? undefined,
      thisYear: thisYear(),
    }),
    facts: [
      { label: "Revenue", values: [usd(v.revenue)] },
      { label: "Growth on a year ago", values: [pctOf(v.revenueYoY, true)] },
      { label: "Gross margin", values: [pctOf(v.grossMargin)] },
      { label: "Operating margin", values: [pctOf(v.operatingMargin)] },
      { label: "Next earnings", values: [next ? `${day(next.date, thisYear())}${next.status === "estimated" ? " (estimated)" : ""}` : "n/a"] },
    ],
    sources: [SEC],
    links: [
      { href: `/network/${c.slug}`, label: "Company Profile" },
      { href: `/tools/qbr?company=${c.slug}`, label: "Prepare a QBR" },
    ],
    claude: commentary
      ? { label: "From the latest earnings release, summarised by Claude", text: commentary.digest.headline, date: day(commentary.filed, thisYear()) }
      : undefined,
  };
}

const fmt = (kind: Kind, v?: number) =>
  v === undefined ? "n/a" : kind === "usd" ? usd(v) : kind === "growth" ? pctOf(v, true) : kind === "pct" ? pctOf(v) : String(Math.round(v));

async function arrow(question: string): Promise<Answer> {
  const [a, b] = await Promise.all([getCompanyEarnings("avnet"), getCompanyEarnings("arrow")]);
  const qa = new Map(a.quarters.map((q) => [q.calendarLabel, q]));
  const qb = new Map(b.quarters.map((q) => [q.calendarLabel, q]));
  const shared = [...qa.keys()].filter((l) => qb.has(l));
  const latest = shared.sort().at(-1);
  if (!latest) return failed(question, "Avnet against Arrow", "both companies' filings", "/competitive", "Avnet vs Arrow");
  const ago = latest.replace(/^CY(\d+)/, (_, y: string) => `CY${String(Number(y) - 1).padStart(y.length, "0")}`);
  const rows = scorecard(qa.get(latest)!, qb.get(latest)!, qa.get(ago), qb.get(ago));
  const count = tally(rows);
  const kinds = new Map(MEASURES.map((m) => [m.label, m.kind]));
  return {
    intent: "arrow",
    question,
    subject: "Avnet against Arrow",
    period: quarterName(latest),
    text: verdict(rows, quarterName(latest)),
    columns: ["Avnet", "Arrow", "Leads"],
    facts: rows
      .filter((r) => !r.caveat && (r.avnet !== undefined || r.arrow !== undefined))
      .map((r) => ({ label: r.label, values: [fmt(kinds.get(r.label)!, r.avnet), fmt(kinds.get(r.label)!, r.arrow), r.leads ?? "n/a"] })),
    note: `Leads are counted only where higher or lower is clearly better: Avnet ${count.avnet}, Arrow ${count.arrow} of ${count.counted}.`,
    sources: [SEC],
    links: [{ href: "/competitive", label: "Avnet vs Arrow" }],
  };
}

async function cycle(question: string): Promise<Answer> {
  const c = await getCycle();
  const p = c.supply.find((x) => x.label === c.latest);
  const at = (points: { label: string; growth?: number }[]) => points.find((x) => x.label === c.latest)?.growth;
  return {
    intent: "cycle",
    question,
    subject: "The cycle",
    period: quarterName(c.latest),
    text: cycleSentence({ phase: c.phase, quarter: c.latest, growth: p?.growth, reporting: p?.reporting }),
    facts: [
      { label: "Phase", values: [c.phase ?? "n/a"] },
      { label: "Supply-chain revenue on a year ago", values: [pctOf(p?.growth, true)] },
      { label: "Share of companies growing", values: [pctOf(p?.growing)] },
      { label: "Median inventory days", values: [p?.inventoryDays === undefined ? "n/a" : String(Math.round(p.inventoryDays))] },
      { label: "Avnet revenue on a year ago", values: [pctOf(at(c.avnet.points), true)] },
      { label: "Arrow revenue on a year ago", values: [pctOf(at(c.arrow.points), true)] },
    ],
    sources: [SEC],
    links: [{ href: "/cycle", label: "Market Cycle" }],
  };
}

async function signalsData() {
  const { signals } = await getSignals();
  return { signals, by: (key: string) => signals.find((s) => s.key === key) };
}

const WAY = { up: "rising", down: "falling", flat: "flat" } as const;

async function economy(question: string): Promise<Answer> {
  const { signals } = await signalsData();
  if (!signals.length) return failed(question, "The economy", "the public data sources", "/signals", "Economic Signals");
  const changes: Changes = Object.fromEntries(signals.map((s) => [s.key, yearChange(s)?.value]));
  const r = readsOf(changes);
  const row = (label: string, x: { verdict: string; way: keyof typeof WAY } | null) => ({
    label,
    values: [x ? `${x.verdict}, ${WAY[x.way]}` : "n/a"],
  });
  return {
    intent: "economy",
    question,
    subject: "The economy",
    period: "On a year ago",
    text: economySentence(changes, r),
    facts: [row("Demand", r.demand), row("Costs", r.costs), row("Financing", r.financing), row("The dollar", r.dollar)],
    sources: [{ status: "live", label: "Federal Reserve, BLS, IMF, Treasury, ECB" }],
    links: [{ href: "/signals", label: "Economic Signals" }],
  };
}

const DIRECTION = { tighter: "Tighter", looser: "Looser", flat: "Flat" } as const;
const SIGNAL_NAMES = { utilisation: "Fab utilisation", prices: "Chip prices", inventory: "Inventory in the chain" } as const;

async function supply(question: string): Promise<Answer> {
  const [{ by }, c] = await Promise.all([signalsData(), getCycle().catch(() => null)]);
  const util = by(SIGNAL_KEYS.utilisation);
  const prices = by(SIGNAL_KEYS.semiPrices);
  let inventoryChange: number | undefined;
  if (c?.latest) {
    const stage = (id: string) => c.stages.find((s) => s.id === id);
    const days = (label: string) => {
      const v = [stage("manufacturers"), stage("distributors")].map((s) => s?.points.find((p) => p.label === label)?.inventoryDays);
      return v.every((x) => x !== undefined) ? (v[0]! + v[1]!) / 2 : undefined;
    };
    const now = days(c.latest);
    const yearAgo = days(c.labels[c.labels.length - 5]);
    if (now !== undefined && yearAgo !== undefined) inventoryChange = now - yearAgo;
  }
  const scored = scoreSignals({
    utilisationChange: util ? yearChange(util)?.value : undefined,
    priceChange: prices ? yearChange(prices)?.value : undefined,
    inventoryChange,
  });
  return {
    intent: "supply",
    question,
    subject: "Supply",
    period: "On a year ago",
    text: supplySentence(scored),
    facts: scored.map((s) => ({ label: SIGNAL_NAMES[s.key], values: [s.direction ? DIRECTION[s.direction] : "n/a"] })),
    sources: [{ status: "live", label: "Federal Reserve, BLS, SEC filings" }],
    links: [{ href: "/supply-chain", label: "Supply Chain" }],
  };
}

async function earnings(question: string): Promise<Answer> {
  const [rows, cal] = await Promise.all([getPeerRows(), getEarningsCalendar()]);
  const s = season(rows, cal.events, cal.today);
  const upcoming = [...s.thisWeek, ...s.nextWeek].filter((e) => e.status === "estimated").slice(0, 5);
  return {
    intent: "earnings",
    question,
    subject: "Earnings season",
    period: quarterName(s.quarter),
    text: seasonSentence({
      quarter: s.quarter,
      reported: s.reported.length,
      total: s.total,
      medianGrowth: s.medianGrowth,
      next: upcoming.slice(0, 3).map((e) => ({ name: e.company.name, date: e.date })),
      thisYear: thisYear(),
    }),
    columns: ["Expected"],
    facts: upcoming.map((e) => ({ label: e.company.name, values: [`${day(e.date, thisYear())} (estimated)`] })),
    sources: [SEC],
    links: [{ href: "/earnings", label: "Quarterly Earnings" }],
  };
}

async function news(question: string, c?: Company, topic?: string): Promise<Answer> {
  let articles: LiveArticle[];
  if (c) articles = await getCompanyNews(c, 3);
  else {
    const { articles: all } = await getLiveNews();
    const words = (topic ?? "").split(" ").filter((w) => w.length > 2);
    const hit = (a: LiveArticle) => words.every((w) => `${a.title} ${a.summary}`.toLowerCase().includes(w));
    articles = all.filter((a) => a.kind !== "filing" && (!words.length || hit(a))).slice(0, 3);
  }
  const angles = await readCache<Angle>("news-angles-v1");
  const stories: Story[] = articles.map((a) => ({
    title: a.title,
    outlet: a.outlet,
    date: day(a.publishedAt.slice(0, 10), thisYear()),
    url: a.url,
    angle: angles[a.id]?.angle,
  }));
  const subject = c?.name ?? (topic ? topic : "the market");
  return {
    intent: "news",
    question,
    subject: c ? `News on ${c.name}` : topic ? `News on ${topic}` : "News",
    text: newsSentence(subject, stories.length),
    stories,
    sources: [{ status: "live", label: "Trade press, GDELT, SEC" }],
    links: c
      ? [
          { href: `/network/${c.slug}`, label: "Company Profile" },
          { href: "/news", label: "Market News" },
        ]
      : [{ href: "/news", label: "Market News" }],
    claude: stories.some((s) => s.angle) ? { label: "Why it matters, written by Claude when the story was first read", text: "" } : undefined,
  };
}

async function lineCard(question: string, name: string, c?: Company): Promise<Answer> {
  const r = await getCarriers(c?.name ?? name);
  const display = c?.name ?? name.replace(/\b\w/g, (m) => m.toUpperCase());
  return {
    intent: "linecard",
    question,
    subject: `Line cards for ${display}`,
    period: r.carriers[0] ? `Snapshots to ${day(r.carriers[0].date, thisYear())}` : undefined,
    text: lineCardSentence({ name: display, carriers: r.carriers.map((x) => x.name), tracked: r.tracked, hasHome: r.hasHome }),
    columns: ["Snapshot"],
    facts: r.carriers.map((x) => ({ label: x.name, values: [day(x.date, thisYear())] })),
    sources: [{ status: "live", label: "Distributor line cards" }],
    links: [{ href: "/line-cards", label: "Line Cards" }, ...(c ? [{ href: `/network/${c.slug}`, label: "Company Profile" }] : [])],
  };
}

function avnet(question: string): Answer {
  const latest = PERFORMANCE[PERFORMANCE.length - 1];
  const yearAgo = PERFORMANCE[PERFORMANCE.length - 5];
  return {
    intent: "avnet",
    question,
    subject: "Avnet's business",
    period: latest.quarter,
    text: avnetSentence({
      quarter: latest.quarter,
      billings: latest.billings,
      bookToBill: latest.bookToBill,
      backlog: latest.backlog,
      billingsYearAgo: yearAgo?.billings,
    }),
    facts: [
      { label: "Billings", values: [usd(latest.billings * 1e6)] },
      { label: "Bookings", values: [usd(latest.bookings * 1e6)] },
      { label: "Book-to-bill", values: [latest.bookToBill.toFixed(2)] },
      { label: "Backlog", values: [usd(latest.backlog * 1e6)] },
    ],
    sources: [{ status: "mock", label: "Mock" }],
    links: [{ href: "/performance", label: "Performance Tracker" }],
    hookups: ["billings", "bookings", "backlog"],
  };
}

/** Answer a typed question, or say what can be answered instead. */
export async function answer(question: string): Promise<Answer> {
  const r = route(question);
  if (!r) return { intent: "none", question, subject: "Not answered yet", text: CANT, sources: [], links: [], suggestions: suggest(question) };
  try {
    switch (r.intent) {
      case "company":
        return await company(question, r.company!);
      case "arrow":
        return await arrow(question);
      case "cycle":
        return await cycle(question);
      case "economy":
        return await economy(question);
      case "supply":
        return await supply(question);
      case "earnings":
        return await earnings(question);
      case "news":
        return await news(question, r.company, r.topic);
      case "linecard":
        return await lineCard(question, r.name ?? "", r.company);
      case "avnet":
        return avnet(question);
    }
  } catch {
    return failed(question, "Not answered", "the data for this answer", "/data-hookups", "What the app's data is");
  }
}
