// The deck commentary and storyline eval (src/lib/deck/commentary-eval.ts).
// Offline by default: each real-shaped deck goes through writeDeckCommentary
// and writeStoryline with a fake client and a canned answer, one of them with
// planted mistakes, so the report's format and the grounding can be checked
// without a key. With --live, one real call per deck (about a cent a slide).
//
//   npx tsx scripts/deck-commentary-eval.ts
//   env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN npx tsx --env-file=.env.local scripts/deck-commentary-eval.ts --live
//
// The report: per deck, slides written, pieces dropped, the median headline
// length, long headlines, empty sections, filler bullets (no figure and no word
// from the slide's labels), the median words per note, slides whose notes were
// all dropped and note sentences dropped; then each storyline deck's order,
// whether it passed (market before Avnet's detail, or little change for a deck
// already in a good order), and what was dropped.

import { writeFileSync } from "node:fs";
import { aiConfigured } from "@/lib/ai/claude";
import { writeDeckCommentary, type DeckOutput } from "@/lib/deck/commentary";
import { checkDeck, checkStoryline, formatReports, formatStoryline } from "@/lib/deck/commentary-eval";
import { evalDecks, fakeClient, goodAnswer } from "@/lib/deck/commentary.fixtures";
import { writeStoryline } from "@/lib/deck/storyline";
import { fakeStorylineClient, goodStoryline, JUDGE, storylineDecks } from "@/lib/deck/storyline.fixtures";

async function main() {
  const live = process.argv.includes("--live");
  if (live && !aiConfigured()) {
    console.error("--live needs ANTHROPIC_API_KEY. Run without --live for the offline report.");
    process.exit(1);
  }
  // --save <file>: every raw answer as JSON, so a run can be scored again if the checks change.
  const saveAt = process.argv.indexOf("--save");
  const save = saveAt > 0 ? process.argv[saveAt + 1] : undefined;
  const raw: Record<string, unknown> = {};
  const reports = [];
  for (const [i, { name, input }] of evalDecks().entries()) {
    let client;
    if (!live) {
      const answer: DeckOutput = goodAnswer(input);
      // The last deck carries planted mistakes, so the report shows what grounding and the filler check catch.
      if (i === evalDecks().length - 1) {
        answer.slides[0] = { ...answer.slides[0], headline: "Distribution's share grew 3.2 points this year" };
        answer.slides[1] = { ...answer.slides[1], bullets: [...answer.slides[1].bullets, "Arrow's lead is $5.3B.", "We should watch this closely."] };
        answer.slides[2] = { ...answer.slides[2], notes: `${answer.slides[2].notes} Avnet's margin doubled since 2024.` };
        answer.summary.push("Avnet should reach 12.0% margin by 2027.");
      }
      client = fakeClient(answer);
    }
    const r = await writeDeckCommentary(input, client ? { client } : {});
    raw[name] = { raw: r.raw ?? null, dropped: r.dropped, usage: r.usage };
    reports.push(checkDeck(name, input, r));
  }
  const story = [];
  for (const { name, input, expect } of storylineDecks()) {
    const r = await writeStoryline(input, live ? {} : { client: fakeStorylineClient(goodStoryline(input)) });
    raw[name] = { order: r.order ?? null, reasons: r.reasons, sections: r.sections, dropped: r.dropped, usage: r.usage };
    story.push(checkStoryline(name, input, r, expect, JUDGE));
  }
  console.log(live ? "Live run\n" : "Offline run: canned answers, no API calls\n");
  console.log(formatReports(reports));
  console.log("");
  console.log(formatStoryline(story));
  const total = [...reports, ...story].reduce((a, r) => a + r.dollars, 0);
  console.log(`\nTotal: $${total.toFixed(3)}`);
  if (save) writeFileSync(save, JSON.stringify(raw, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
