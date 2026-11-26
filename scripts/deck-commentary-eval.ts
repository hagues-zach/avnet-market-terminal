// The deck commentary eval (src/lib/deck/commentary-eval.ts). Offline by default:
// each real-shaped deck goes through writeDeckCommentary with a fake client and a
// canned answer, one of them with planted mistakes, so the report's format and
// the grounding can be checked without a key. With --live, one real call per deck.
//
//   npx tsx scripts/deck-commentary-eval.ts
//   npx tsx --env-file=.env.local scripts/deck-commentary-eval.ts --live

import { aiConfigured } from "@/lib/ai/claude";
import { writeDeckCommentary, type DeckOutput } from "@/lib/deck/commentary";
import { checkDeck, formatReports } from "@/lib/deck/commentary-eval";
import { evalDecks, fakeClient, goodAnswer } from "@/lib/deck/commentary.fixtures";

async function main() {
  const live = process.argv.includes("--live");
  if (live && !aiConfigured()) {
    console.error("--live needs ANTHROPIC_API_KEY. Run without --live for the offline report.");
    process.exit(1);
  }
  const reports = [];
  for (const [i, { name, input }] of evalDecks().entries()) {
    let client;
    if (!live) {
      const answer: DeckOutput = goodAnswer(input);
      // The last deck carries planted mistakes, so the report shows what grounding catches.
      if (i === evalDecks().length - 1) {
        answer.slides[0] = { ...answer.slides[0], headline: "Distribution's share grew 3.2 points this year" };
        answer.slides[1] = { ...answer.slides[1], bullets: [...answer.slides[1].bullets, "Arrow's lead is $5.3B."] };
        answer.summary.push("Avnet should reach 12.0% margin by 2027.");
      }
      client = fakeClient(answer);
    }
    const r = await writeDeckCommentary(input, client ? { client } : {});
    reports.push(checkDeck(name, input, r));
  }
  console.log(live ? "Live run\n" : "Offline run: canned answers, no API calls\n");
  console.log(formatReports(reports));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
