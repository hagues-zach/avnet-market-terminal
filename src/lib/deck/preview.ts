// Pitch Deck Builder previews: each slide's headline, sentence, figures and chart,
// from the Ask the Terminal answerers (live) and the shared mock model of Avnet.
// The same previews fill the exported PowerPoint (src/lib/deck/pptx.ts), so the
// screen and the file agree. Server-only. Claude text is read from what the app
// saved, except talking points: when QBR Prep's copy is missing (each serverless
// instance has its own disk), they are written here, as QBR Prep would.
import { answer } from "@/lib/ask/answer";
import { day, quarterName, type Answer } from "@/lib/ask/sentences";
import { getCompanyEarnings } from "@/lib/data/live/earnings";
import { getCycle } from "@/lib/data/live/cycle";
import { aiConfigured } from "@/lib/ai/claude";
import { gatherBrief } from "@/lib/qbr/gather";
import { cachedTalkingPoints, getTalkingPoints, type TalkingPoints } from "@/lib/qbr/talking-points";
import { getLeads } from "@/lib/leads/data";
import { groupLabel, inSentence, lead as leadsLead, techName } from "@/lib/leads/rank";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { avnetBusiness } from "@/components/network/company-profile";
import { getAvnet } from "@/lib/avnet";
import { fmtM } from "@/lib/avnet/format";
import { lead as scenarioLead, money, pct, project, type Assumptions } from "@/lib/scenario/model";
import {
  PRIMER_SEGMENT,
  SLIDES,
  audienceLabel,
  available,
  companyHeadline,
  count,
  segmentWords,
  shareHeadline,
  slide,
  type Chart,
  type Preview,
  type SlideId,
  type Start,
} from "./outline";

const thisYear = () => new Date().getFullYear();
/** Today in the server's own time zone, as YYYY-MM-DD. */
const today = () => new Date().toLocaleDateString("en-CA");
const MOCK_SOURCE = "Mock model of Avnet";

/** "+47.7%" to 0.477; anything else undefined. */
const pctValue = (v?: string) => {
  const m = v?.replace("−", "-").match(/^([+-]?\d+(?:\.\d+)?)%$/);
  return m ? Number(m[1]) / 100 : undefined;
};

/** The first sentence, without its full stop, and the rest. */
function split(text: string): { first: string; rest?: string } {
  const i = text.search(/\.\s/);
  if (i < 0) return { first: text.replace(/\.$/, "") };
  return { first: text.slice(0, i), rest: text.slice(i + 2).trim() || undefined };
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** An answer as a preview: the first sentence as the headline unless one is given. */
function fromAnswer(a: Answer, headline?: string): Preview {
  const { first, rest } = split(a.text);
  return {
    headline: headline ?? capital(first.replace(/^In [A-Z0-9 ]+ /, "")),
    text: headline ? a.text : rest,
    columns: a.columns,
    facts: a.facts?.slice(0, 5),
    source: a.sources.map((s) => (s.status === "mock" ? MOCK_SOURCE : s.label)).join(", ") || "n/a",
    period: a.period,
    hookups: a.hookups,
    error: a.error,
  };
}

/** The company's revenue over its last eight quarters, as columns. */
async function revenueChart(slug: string, name: string): Promise<Chart | undefined> {
  const quarters = (await getCompanyEarnings(slug)).quarters.filter((q) => q.values.revenue !== undefined).slice(-8);
  if (quarters.length < 2) return undefined;
  return {
    kind: "column",
    format: "usd",
    series: [{ name: `${name} revenue`, who: "company", points: quarters.map((q) => ({ label: quarterName(q.calendarLabel), value: q.values.revenue! })) }],
  };
}

/** Supply-chain revenue growth on a year ago, by quarter, as a line. */
async function cycleChart(): Promise<Chart | undefined> {
  const points = (await getCycle()).supply.filter((p) => p.growth !== undefined).slice(-8);
  if (points.length < 2) return undefined;
  return {
    kind: "line",
    format: "pct",
    series: [{ name: "Supply-chain revenue growth on a year ago", who: "market", points: points.map((p) => ({ label: quarterName(p.label), value: p.growth! })) }],
  };
}

/**
 * The talking points slide: QBR Prep's saved points, or on a miss, points written
 * now from the same brief (Claude Sonnet, about 15 seconds and a cent and a half).
 * With `write` false a miss only says so.
 */
async function talking(s: Start, write: boolean): Promise<Preview> {
  const q = s.qbr!;
  const name = s.company!.name;
  const filed = (await getCompanyEarnings(s.company!.slug)).latestFiling?.filed;
  let t: TalkingPoints | null = await cachedTalkingPoints(s.company!.slug, q.meeting, q.focus, filed);
  if (!t && write && aiConfigured()) {
    const setup = { company: s.company!, meeting: q.meeting, date: null, focus: q.focus };
    t = await getTalkingPoints(await gatherBrief(setup), setup).catch(() => null);
  }
  if (!t || t.status !== "ok")
    return {
      headline: `Talking points for ${name}`,
      text: "No talking points are saved for this meeting yet. Open QBR Prep for it to have Claude write them; the export leaves this slide out until then.",
      source: "QBR Prep",
      error: true,
    };
  return {
    headline: q.focus ? `Talking points for ${name}, on ${q.focus}` : `Talking points for ${name}`,
    // Three of each fit a slide; the full set stays on QBR Prep.
    groups: [
      { title: "Talking points", lines: t.points.slice(0, 3).map((x) => x.text) },
      { title: "Questions to ask", lines: t.questions.slice(0, 3).map((x) => x.text) },
    ],
    claude: { label: "Written by Claude for QBR Prep from the brief", date: t.writtenAt ? day(t.writtenAt, thisYear()) : undefined },
    source: "QBR Prep, written by Claude",
    period: t.writtenAt ? day(t.writtenAt, thisYear()) : undefined,
  };
}

async function build(id: SlideId, s: Start, company: () => Promise<Answer>, write: boolean): Promise<Preview> {
  const name = s.company?.name;
  const avnet = await getAvnet();
  const avnetLabel = avnet.status === "mock" ? MOCK_SOURCE : "Avnet data";
  switch (id) {
    case "cover":
      return {
        headline: s.company ? `${s.company.name} and Avnet` : s.primer ? `${s.primer.name} and Avnet` : "Avnet market review",
        text: `${audienceLabel(s.audience)}, ${day(today(), thisYear())}`,
        source: "This deck",
      };
    case "company": {
      const a = await company();
      const growth = pctValue(a.facts?.find((f) => f.label === "Growth on a year ago")?.values[0]);
      return { ...fromAnswer(a, companyHeadline(name!, growth)), chart: await revenueChart(s.company!.slug, name!).catch(() => undefined) };
    }
    case "commentary": {
      const a = await company();
      if (!a.claude)
        return {
          headline: "What management said",
          text: `No summary of ${name}'s latest earnings release is cached yet. It appears here once the profile has read it.`,
          source: "Latest earnings release",
          error: a.error,
        };
      return {
        headline: "What management said",
        text: a.claude.text,
        claude: { label: "From the latest earnings release, summarised by Claude", date: a.claude.date },
        source: "Earnings release, summarised by Claude",
        period: a.claude.date,
      };
    }
    case "linecard": {
      const a = await answer(`Who carries ${name}?`);
      const n = a.facts?.length ?? 0;
      return fromAnswer(
        a,
        n
          ? `${capital(count(n))} collected ${n === 1 ? "distributor lists" : "distributors list"} ${name}`
          : `No collected distributor lists ${name}`,
      );
    }
    case "news": {
      const subject = name ?? s.primer!.name;
      const a = await answer(`What's the latest on ${subject}?`);
      if (a.intent !== "news") return { headline: `The latest on ${subject}`, text: "No news answer for this subject yet.", source: "Market News" };
      return {
        ...fromAnswer(a, `The latest on ${subject}`),
        text: a.text,
        facts: undefined,
        lines: a.stories?.slice(0, 3).map((x) => `${x.title} (${x.outlet}, ${x.date})`),
      };
    }
    case "arrow": {
      const a = await answer("Are we ahead of Arrow?");
      const p = fromAnswer(a);
      const g = a.facts?.find((f) => f.label === "Revenue growth YoY");
      const av = pctValue(g?.values[0]);
      const ar = pctValue(g?.values[1]);
      return {
        ...p,
        facts: a.facts?.slice(0, 4),
        chart:
          av !== undefined && ar !== undefined
            ? {
                kind: "bar",
                format: "pct",
                series: [
                  { name: "Avnet", who: "avnet", points: [{ label: "Revenue growth on a year ago", value: av }] },
                  { name: "Arrow", who: "arrow", points: [{ label: "Revenue growth on a year ago", value: ar }] },
                ],
              }
            : undefined,
      };
    }
    case "cycle":
      return { ...fromAnswer(await answer("Where is the cycle?")), chart: await cycleChart().catch(() => undefined) };
    case "economy":
      return fromAnswer(await answer("What is the economy doing?"));
    case "supply":
      return fromAnswer(await answer("Is supply tightening?"));
    case "performance":
      return fromAnswer(await answer("How is Avnet's business?"));
    case "technology": {
      const p = s.primer!;
      const makers = p.makers.map((m) => COMPANIES.find((c) => c.slug === m)?.name).filter((x): x is string => Boolean(x));
      return {
        headline: p.name,
        text: p.summary,
        facts: [{ label: "Makers in the app", values: [makers.join(", ") || "n/a"] }],
        lines: p.uses.slice(0, 3).map((u) => u.name),
        source: "Learning Center",
      };
    }
    case "account": {
      const b = await avnetBusiness(s.company!);
      return {
        headline: `Avnet's business with ${name}`,
        text: b.supplier ? `${name} as a supplier to Avnet.` : `${name} as an Avnet customer.`,
        facts: b.rows.map((r) => ({ label: r.label, values: [r.value] })),
        source: avnetLabel,
        period: "Last 12 months",
        hookups: b.hookups,
      };
    }
    case "share": {
      const segment = s.primer ? PRIMER_SEGMENT[s.primer.slug] : undefined;
      const row = avnet.segmentBillings.find((r) => r.segment === segment);
      if (!row) {
        const market = avnet.segmentBillings.reduce((a, r) => a + r.market, 0);
        const billings = avnet.segmentBillings.reduce((a, r) => a + r.billings, 0);
        return {
          headline: `Avnet holds ${((billings / market) * 100).toFixed(1)}% of its mapped markets`,
          text: `Across the ten segments the code map joins to the market, a $${(market / 1000).toFixed(0)}B market.`,
          facts: avnet.segmentBillings.slice()
            .sort((x, y) => y.billings - x.billings)
            .slice(0, 4)
            .map((r) => ({ label: r.segment, values: [`${(r.share * 100).toFixed(1)}%`] })),
          source: avnetLabel,
          period: "Last 12 months",
        };
      }
      const pts = row.shareChange * 100;
      return {
        headline: shareHeadline(row.segment, row.share),
        text: `A $${(row.market / 1000).toFixed(0)}B market for ${segmentWords(row.segment)}. Avnet's share is ${pts >= 0 ? "up" : "down"} ${Math.abs(pts).toFixed(1)} points on a year ago.`,
        facts: [
          { label: "Market size", values: [`$${(row.market / 1000).toFixed(0)}B`] },
          { label: "Avnet share", values: [`${(row.share * 100).toFixed(1)}%`] },
          { label: "Change on a year ago", values: [`${pts >= 0 ? "+" : "−"}${Math.abs(pts).toFixed(1)} pts`] },
          { label: "Mapping confidence", values: [row.confidence] },
        ],
        source: avnetLabel,
        period: "Last 12 months",
      };
    }
    case "scenario": {
      const segments = avnet.segmentBillings.map((r) => ({
        segment: r.segment,
        market: r.market,
        share: r.share,
        billings: r.billings,
        forecast: avnet.segmentForecast[r.segment],
      }));
      const a: Assumptions = {
        years: s.scenario.years,
        view: s.scenario.view,
        growth: {},
        shareChange: Object.fromEntries(segments.map((x) => [x.segment, s.scenario.share])),
      };
      const p = project(segments, a, avnet.forecastSpread);
      return {
        headline: `Avnet's mapped billings reach ${money(p.billingsAt)} in ${s.scenario.years === 1 ? "a year" : `${count(s.scenario.years)} years`}`,
        text: scenarioLead(p, a),
        facts: [
          { label: "Billings today", values: [money(p.billings)] },
          { label: "Billings at the horizon", values: [money(p.billingsAt)] },
          { label: "Growth a year", values: [pct(p.cagr, 1, true)] },
          { label: "Against holding share", values: [money(p.billingsAt - p.holdAt, true)] },
        ],
        source: avnetLabel,
        period: `${capital(count(s.scenario.years))} ${s.scenario.years === 1 ? "year" : "years"} ahead`,
      };
    }
    case "pipeline":
      return {
        headline: `${fmtM(avnet.approvedPipeline)} of approved designs not yet billing`,
        text: `Avnet's design registrations across every supplier. Approved designs take about ${avnet.monthsToBilling} months to start billing.`,
        facts: [
          { label: "New registrations this quarter", values: [avnet.newRegistrations.thisQuarter.toLocaleString("en-US")] },
          { label: "Approval rate", values: [`${(avnet.approvalRate.now * 100).toFixed(0)}%`] },
          { label: "Months to first billing", values: [String(avnet.monthsToBilling)] },
        ],
        source: avnetLabel,
        period: "Latest quarter",
      };
    case "leads": {
      const p = s.primer!;
      const top = (await getLeads(p)).slice(0, 5);
      return {
        headline: `Who buys ${techName(p)}`,
        text: leadsLead(top, p),
        columns: ["Company", "Growth", "Why"],
        facts: top.map((l) => ({
          label: `${l.company.name}, ${inSentence(groupLabel(l.group))}`,
          values: [l.growth === undefined ? "n/a" : pct(l.growth, 1, true), (l.reasons.find((r) => r.kind !== "growth") ?? l.reasons[0]).text],
        })),
        source: "SEC filings, Market News",
        period: top[0]?.quarter,
      };
    }
    case "talking":
      return talking(s, write);
    case "sources":
      // The sources slide is drawn from the outline in the browser.
      return { headline: slide(id).title, source: "This deck" };
  }
}

const failed = (id: SlideId): Preview => ({ headline: slide(id).title, text: `Couldn't load ${slide(id).from} just now.`, source: slide(id).from, error: true });

/**
 * A preview for every slide this start can make, keyed by slide. A failed slide says so.
 * With `writeTalking` false, talking points are only read from what's saved, so the
 * page isn't held up by Claude; it shows talkingPreview() for that slide instead.
 */
export async function previewsFor(s: Start, { writeTalking = true } = {}): Promise<Partial<Record<SlideId, Preview>>> {
  let companyAnswer: Promise<Answer> | undefined;
  const company = () => (companyAnswer ??= answer(`How is ${s.company!.name} doing?`));
  const ids = SLIDES.map((x) => x.id).filter((id) => id !== "sources" && (id === "cover" || available(id, s)));
  const done = await Promise.all(
    ids.map(async (id) => {
      try {
        return [id, await build(id, s, company, writeTalking)] as const;
      } catch {
        return [id, failed(id)] as const;
      }
    }),
  );
  return Object.fromEntries(done);
}

/** The talking points slide on its own, written by Claude on a miss; undefined when the deck has no such slide. */
export function talkingPreview(s: Start): Promise<Preview> | undefined {
  if (!available("talking", s)) return undefined;
  return talking(s, true).catch(() => failed("talking"));
}
