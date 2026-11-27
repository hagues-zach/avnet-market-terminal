// Real-shaped trays for the deck commentary tests and eval: each slide is built
// by the same builders the cards use (src/lib/deck/slides.ts), with figures of
// the size the app shows. Companies and roles only; no people.
import type Anthropic from "@anthropic-ai/sdk";
import type { DeckInput, DeckOutput } from "./commentary";
import { comparisonSlide, panelsSlide, seriesSlide } from "./slides";
import type { TrayItem } from "./tray";

const item = (id: string, title: string, page: string, href: string, preview: TrayItem["preview"], over: Partial<TrayItem> = {}): TrayItem => ({
  id,
  kind: "chart",
  title,
  from: { page, href },
  addedAt: "2026-11-24T15:00:00.000Z",
  preview,
  included: true,
  ...over,
});

export const tamFunnel = (): TrayItem =>
  item(
    "card:tam-opportunity",
    "The opportunity in 2026",
    "TAM",
    "/tam",
    panelsSlide({
      key: "tam:opportunity",
      title: "The opportunity in 2026",
      text: "The world market, the part sold through distribution, and the part Avnet bills.",
      panels: [
        {
          kicker: "TAM, total market",
          next: true,
          tag: "WSTS Autumn 2026",
          figure: { value: "$772.2B", note: "World semiconductor sales,", change: "+22.5%", tone: "good", period: "on 2025" },
          bar: { share: 1, color: "#8A9099", label: "$860.4B forecast for 2027" },
        },
        {
          kicker: "SAM, served by distribution",
          next: true,
          tag: "Mock",
          tagMock: true,
          figure: { value: "$185.3B", note: "The part of the market sold through distributors" },
          bar: { share: 0.24, color: "#8A9099", label: "24.0% of TAM" },
        },
        {
          kicker: "SOM, Avnet",
          tag: "Mock",
          tagMock: true,
          figure: { value: "$16.4B", note: "Avnet billings in the served market" },
          bar: { share: 0.089, color: "#41C363", label: "8.9% of SAM" },
        },
      ],
      source: "WSTS Autumn 2026; mock model of Avnet",
      period: "2026",
      hookups: ["billings"],
    }).preview,
  );

export const rankedBars = (): TrayItem =>
  item(
    "card:earnings-leaderboard-distributors",
    "Revenue, last four quarters: Distributors",
    "Earnings",
    "/earnings",
    comparisonSlide({
      key: "earnings:leaderboard-distributors",
      title: "Revenue, last four quarters: Distributors",
      unit: "usd",
      measure: "Revenue, last four quarters",
      items: [
        { name: "Avnet", value: 22.8e9 },
        { name: "Arrow", value: 28.1e9 },
        { name: "WPG Holdings", value: 25.4e9 },
        { name: "WT Microelectronics", value: 21.9e9 },
        { name: "Future Electronics", value: 6.2e9 },
      ],
      source: "SEC filings and company reports",
      period: "four quarters to Q3 2026",
    }).preview,
  );

export const growthMargin = (): TrayItem =>
  item(
    "card:earnings-growth-against-margin-semis",
    "Growth against margin: Semiconductor makers",
    "Earnings",
    "/earnings",
    panelsSlide({
      key: "earnings:growth-against-margin-semis",
      title: "Growth against margin: Semiconductor makers",
      text: "Revenue growth on a year ago against operating margin. Medians: growth +8.4%, margin 21.3%.",
      panels: [
        {
          scatter: {
            x: { label: "Revenue growth on a year ago", format: "growth", min: -0.2, max: 0.6 },
            y: { label: "Operating margin", format: "pct", min: -0.05, max: 0.5 },
            points: [
              { x: 0.031, y: 0.034, color: "#41C363", strong: true, label: "Avnet" },
              { x: 0.052, y: 0.041, color: "#1F6FEB", strong: true, label: "Arrow" },
              { x: 0.12, y: 0.28, color: "#8A9099" },
              { x: 0.084, y: 0.213, color: "#8A9099" },
              { x: -0.06, y: 0.15, color: "#8A9099" },
              { x: 0.41, y: 0.44, color: "#8A9099" },
            ],
            medians: { x: 0.084, y: 0.213 },
            note: "2 companies are off the scale. Dashed lines are the medians.",
          },
        },
      ],
      source: "SEC filings, GAAP as reported",
    }).preview,
  );

export const newsStory = (): TrayItem =>
  item(
    "card:news-story-microchip-lead-times",
    "Story: Microchip says MCU lead times are back to 12 weeks",
    "Market News",
    "/news/microchip-lead-times",
    panelsSlide({
      key: "news:story:microchip-lead-times",
      title: "Microchip says MCU lead times are back to 12 weeks",
      text: "Microchip expects distributors to restock microcontrollers in the March quarter as lead times normalise.",
      panels: [
        {
          title: "Summary",
          paragraphs: [
            { text: "Microchip says microcontroller lead times have fallen to 12 weeks." },
            { text: "It expects distributors to restock in the March quarter." },
            { text: "It ties the recovery to industrial demand in Europe." },
          ],
        },
        { title: "Why it matters to Avnet", paragraphs: [{ text: "Shorter lead times ease allocation for industrial customers, and a restock means more channel inventory to plan for." }] },
      ],
      source: "EE Times, November 20, 2026",
      claude: "Summary by Claude from EE Times's feed",
    }).preview,
    { kind: "view" },
  );

export const marginTrend = (): TrayItem =>
  item(
    "chart:avnet-vs-arrow-scorecard:gross-margin:trend",
    "Avnet vs Arrow: Gross margin",
    "Avnet vs Arrow",
    "/competitive",
    seriesSlide({
      key: "competitive:gross-margin",
      title: "Gross margin",
      text: "Arrow's gross margin is 0.4 points above Avnet's.",
      unit: "pct",
      periods: ["Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"],
      series: [
        { name: "Avnet", values: [0.103, 0.105, 0.106, 0.108] },
        { name: "Arrow", values: [0.109, 0.11, 0.111, 0.112] },
      ],
      source: "SEC filings, GAAP as reported",
      period: "Q3 2026",
    }).preview,
    { note: "Margins recovered, but Arrow still leads" },
  );

export const shareTiles = (): TrayItem =>
  item(
    "view:share",
    "Avnet's share of analog",
    "Market Share",
    "/market-share",
    {
      headline: "Avnet holds 4.4% of analog",
      facts: [
        { label: "Avnet share of analog", values: ["4.4%"] },
        { label: "Change on a year ago", values: ["+0.3 pts"] },
        { label: "Analog market", values: ["$84.1B"] },
      ],
      source: "Mock model of Avnet",
      period: "2026",
      hookups: ["billings"],
    },
    { kind: "view" },
  );

/** Five decks for the eval: the four single-slide shapes, and a mixed deck of six. */
export function evalDecks(): { name: string; input: DeckInput }[] {
  const deck = (items: TrayItem[], audience = "Internal", title = "Avnet market review"): DeckInput => ({ title, audience, items });
  return [
    { name: "TAM funnel", input: deck([tamFunnel()]) },
    { name: "Ranked bar chart", input: deck([rankedBars()], "Supplier", "Distributor landscape") },
    { name: "Growth against margin scatter", input: deck([growthMargin()]) },
    { name: "News story", input: deck([newsStory()], "Customer", "Industrial MCU supply") },
    {
      name: "Mixed six-slide deck",
      input: deck([tamFunnel(), rankedBars(), growthMargin(), marginTrend(), shareTiles(), newsStory()], "Supplier", "Microchip supplier review"),
    },
  ];
}

/** A grounded answer for a deck: figures copied from each slide, so nothing is dropped. */
export function goodAnswer(input: DeckInput): DeckOutput {
  const canned: Record<string, { headline: string; text: string; bullets: string[]; notes: string }> = {
    "card:tam-opportunity": {
      headline: "Distribution serves a quarter of a fast-growing chip market",
      text: "World semiconductor sales reached $772.2B, up +22.5% on 2025, with $860.4B forecast for 2027.",
      bullets: ["Distributors serve 24.0% of TAM, a mock estimate.", "Avnet bills 8.9% of SAM on the mock model.", "Growth leaves room to take share."],
      notes: "Start with the size of the prize. World semiconductor sales reached $772.2B this year, and the forecast for 2027 is $860.4B. Distribution serves 24.0% of that, and on the mock model Avnet bills 8.9% of what distributors serve. The point to land is room to grow: the market is rising quickly, and a small gain in share is worth a lot. Ask the room where they see the next design wins.",
    },
    "card:earnings-leaderboard-distributors": {
      headline: "Arrow and WPG lead distributor revenue, with Avnet close behind",
      text: "Arrow took $28.1B over the last four quarters against Avnet's $22.8B.",
      bullets: ["WPG Holdings sits second at $25.4B.", "WT Microelectronics follows at $21.9B.", "The top four are within reach of each other."],
      notes: "This is the field we compete in. Arrow leads on revenue over the last four quarters at $28.1B, with WPG Holdings second at $25.4B and Avnet at $22.8B. The top four are close enough that one strong year moves the ranking. Draw the eye to the gap between Avnet and the two leaders, then move on to what drives it.",
    },
    "card:earnings-growth-against-margin-semis": {
      headline: "Distributors trail chipmakers on growth and margin",
      text: "Avnet grew +3.1% at a 3.4% operating margin, below the medians of +8.4% and 21.3%.",
      bullets: ["Arrow sits close to Avnet at +5.2% growth.", "Chipmakers earn far richer margins than the channel."],
      notes: "Here the chip makers sit far above the channel on both growth and margin. Avnet grew +3.1% at a 3.4% operating margin, below the medians of +8.4% and 21.3%. That is normal for a distributor, so the story is the gap to Arrow rather than to the chip makers. Point out where Arrow sits, close to Avnet, and keep the comparison inside the channel.",
    },
    "card:news-story-microchip-lead-times": {
      headline: "Microchip's shorter lead times point to a channel restock",
      text: "Microchip says microcontroller lead times are back to 12 weeks.",
      bullets: ["Distributors are expected to restock in the March quarter.", "Industrial demand in Europe drives the recovery."],
      notes: "Microchip says its microcontroller lead times are back to 12 weeks. That matters because shorter lead times end the allocation squeeze for industrial customers. It also expects distributors to restock in the March quarter, so channel inventory will rise. Ask the audience how their own lead times compare and whether they plan to build stock ahead of that restock.",
    },
    "chart:avnet-vs-arrow-scorecard:gross-margin:trend": {
      headline: "Avnet's margin recovered, but Arrow still leads",
      text: "Avnet reached 10.8% in Q3 2026 against Arrow's 11.2%.",
      bullets: ["Both improved each quarter.", "The gap held at 0.4 points."],
      notes: "Both distributors improved gross margin every quarter this year. Avnet reached 10.8% in Q3 2026, but Arrow reached 11.2%, so the gap held. The recovery is real, but it is not closing the distance to our closest competitor. Use this slide to set up the question of mix: which product lines are carrying Arrow's lead, and where can Avnet price better?",
    },
    "view:share": {
      headline: "Avnet holds a small but growing share of analog",
      text: "Avnet's mock share of analog is 4.4%, up +0.3 pts on a year ago.",
      bullets: ["The analog market is $84.1B.", "Figures are mock until billings are connected."],
      notes: "Avnet's share of analog is 4.4% on the mock model, up +0.3 pts on a year ago. The analog market is $84.1B, so each point of share is a large number. These figures stay mock until billings are connected, so present them as direction rather than results. The question to leave with the room is which analog suppliers give the most room to grow.",
    },
  };
  const shipped = input.items.filter((x) => x.included);
  const slides = shipped.map((x) => ({ id: x.id, ...(canned[x.id] ?? { headline: x.preview.headline, text: "", bullets: [], notes: "" }) }));
  // Three to five lines, from the slides' own grounded sentences, so the summary agrees with them.
  const pool = slides.flatMap((x) => [x.text, ...x.bullets]).filter(Boolean);
  const summary = slides.length >= 3 ? slides.map((x) => x.text).filter(Boolean).slice(0, 5) : pool.slice(0, 3);
  return { slides, summary };
}

/** A client that answers with `answer` and records what it was sent. Never reaches the API. */
export function fakeClient(answer: DeckOutput | null | (() => never), stop = "end_turn", seen: unknown[] = []): Anthropic {
  return {
    beta: {
      messages: {
        parse: async (params: unknown) => {
          seen.push(params);
          if (typeof answer === "function") answer();
          return { stop_reason: stop, usage: { input_tokens: 4000, output_tokens: 900, cache_read_input_tokens: 0, cache_creation_input_tokens: 1200 }, parsed_output: answer };
        },
      },
    },
  } as unknown as Anthropic;
}
