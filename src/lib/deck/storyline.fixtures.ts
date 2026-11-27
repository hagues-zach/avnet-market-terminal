// Decks for the storyline tests and eval (Add to deck, Phase 3), from the
// commentary fixtures: one in an order that reads badly (Avnet's detail before
// the market it sits in) and one already in a good order, where the right
// answer is little or no change. Companies and roles only; no people.
import type Anthropic from "@anthropic-ai/sdk";
import { growthMargin, marginTrend, newsStory, rankedBars, shareTiles, tamFunnel } from "./commentary.fixtures";
import type { StorylineInput, StorylineOutput } from "./storyline";
import type { TrayItem } from "./tray";

/** A storyline input whose items are whole tray items, so tests can put them back on a tray. */
export type TrayDeck = Omit<StorylineInput, "items"> & { items: TrayItem[] };
const deck = (items: TrayItem[], audience = "Supplier", title = "Microchip supplier review"): TrayDeck => ({ title, audience, items });

/** Company detail first, the market last: a good answer moves the market to the front. */
export const badOrder = () => deck([marginTrend(), shareTiles(), newsStory(), tamFunnel(), rankedBars()]);
/** Market, competitors, Avnet, then the news: a good answer moves little or nothing. */
export const goodOrder = () => deck([tamFunnel(), rankedBars(), growthMargin(), marginTrend(), newsStory()], "Internal", "Avnet market review");

/** The canned answer's order: the market and the competitors first, then Avnet's own detail. */
export const MARKET = [tamFunnel().id, rankedBars().id];
export const DETAIL = [marginTrend().id, shareTiles().id];
/**
 * What the eval judges a reorder by: the market itself (the TAM funnel) before
 * every slide of Avnet's own detail. The competitors' ranking may go either side
 * of Avnet's share; both read well.
 */
export const JUDGE = { market: [tamFunnel().id], detail: DETAIL };

export function storylineDecks(): { name: string; input: TrayDeck; expect: "reorder" | "keep" }[] {
  return [
    { name: "Storyline: detail before the market", input: badOrder(), expect: "reorder" },
    { name: "Storyline: already in a good order", input: goodOrder(), expect: "keep" },
  ];
}

/** A canned, grounded answer: the market first for the bad deck, no change for the good one. */
export function goodStoryline(input: StorylineInput): StorylineOutput {
  const ids = input.items.filter((x) => x.included).map((x) => x.id);
  const rank = (id: string) => (MARKET.includes(id) ? 0 : id === growthMargin().id ? 1 : DETAIL.includes(id) ? 2 : 3);
  const order = [...ids].sort((a, b) => rank(a) - rank(b));
  const moves = order.filter((id, i) => ids[i] !== id).map((id) => ({ id, reason: MARKET.includes(id) ? "Lead with the market before Avnet's share of it" : "Avnet's detail follows the market it sits in" }));
  const sections = order[0] === tamFunnel().id ? [{ id: tamFunnel().id, title: "The market" }, ...(order.includes(marginTrend().id) ? [{ id: order.find((x) => DETAIL.includes(x))!, title: "Where Avnet stands" }] : [])] : [];
  return { order, moves, sections };
}

/** A client that answers with `answer` and records what it was sent. Never reaches the API. */
export function fakeStorylineClient(answer: StorylineOutput | null | (() => never), stop = "end_turn", seen: unknown[] = []): Anthropic {
  return {
    beta: {
      messages: {
        parse: async (params: unknown) => {
          seen.push(params);
          if (typeof answer === "function") answer();
          return { stop_reason: stop, usage: { input_tokens: 3000, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 900 }, parsed_output: answer };
        },
      },
    },
  } as unknown as Anthropic;
}
