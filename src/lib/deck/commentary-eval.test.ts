// The deck commentary eval's checks, against planted mistakes. No API calls.
// Run with: npx tsx src/lib/deck/commentary-eval.test.ts
import assert from "node:assert/strict";
import { writeDeckCommentary } from "./commentary";
import { checkDeck, checkStoryline, formatReports, formatStoryline, HEADLINE_WORDS, isFiller, labelWords } from "./commentary-eval";
import { evalDecks, fakeClient, goodAnswer, marginTrend, newsStory, rankedBars, shareTiles, tamFunnel } from "./commentary.fixtures";
import { writeStoryline } from "./storyline";
import { badOrder, DETAIL, fakeStorylineClient, goodOrder, goodStoryline, JUDGE, MARKET } from "./storyline.fixtures";

async function main() {
  const decks = evalDecks();
  assert.deepEqual(
    decks.map((d) => d.name),
    ["TAM funnel", "Ranked bar chart", "Growth against margin scatter", "News story", "Mixed six-slide deck"],
  );
  assert.equal(decks[4].input.items.length, 6);

  // The canned answers are clean: nothing dropped, nothing empty, every slide written.
  for (const { name, input } of decks) {
    const r = checkDeck(name, input, await writeDeckCommentary(input, { client: fakeClient(goodAnswer(input)) }));
    assert.equal(r.status, "ok", name);
    assert.equal(r.written, r.slides, name);
    assert.deepEqual(r.dropped, [], name);
    assert.deepEqual(r.empty, [], name);
    assert.deepEqual(r.longHeadlines, [], name);
  }

  // Planted: a made-up figure in a headline, a long headline, a slide with nothing, thin bullets, a short summary.
  const { input } = decks[4];
  const answer = goodAnswer(input);
  answer.slides[0].headline = "Distribution's share grew 3.2 points this year";
  answer.slides[1].headline = "Arrow and WPG lead distributor revenue while Avnet sits close behind them and the rest trail far back";
  answer.slides[2] = { ...answer.slides[2], headline: "Up 44.4%", text: "Down 9.9%.", bullets: ["17.7% better"], notes: "" };
  answer.slides[3].bullets = ["Both improved each quarter."];
  answer.summary = ["Arrow leads at $28.1B."];
  const r = checkDeck("planted", input, await writeDeckCommentary(input, { client: fakeClient(answer) }));
  assert.equal(r.written, 5);
  assert.ok(r.dropped.some((d) => /headline.*3\.2/.test(d)));
  assert.equal(r.dropped.length, 4, "one headline, the empty slide's three pieces, nothing else");
  assert.equal(r.longHeadlines.length, 1);
  assert.ok(r.headlineWords.some((n) => n > HEADLINE_WORDS));
  assert.ok(r.empty.includes("card:earnings-growth-against-margin-semis: no commentary"));
  assert.ok(r.empty.includes("chart:avnet-vs-arrow-scorecard:gross-margin:trend: 1 bullet"));
  assert.ok(r.empty.includes("summary: 1 line"));
  assert.deepEqual(r.fallbacks, ["card:tam-opportunity"], "the dropped headline fell back to the card's");
  assert.ok(r.dollars > 0);

  const text = formatReports([r]);
  assert.match(text, /^Deck\s+Status/);
  assert.match(text, /planted\s+ok\s+5\/6/);
  assert.match(text, /planted  empty: summary: 1 line/);
  /* ---------- Filler ---------- */

  const regions = labelWords(rankedBars().preview, rankedBars().title);
  assert.ok(regions.has("arrow") && regions.has("revenue"), "series names and the card's title are labels");
  assert.ok(isFiller("Our closest competitor is growing fast, so we should watch share closely.", regions), "generic advice is filler");
  assert.ok(!isFiller("Arrow leads the group.", regions), "a row's name isn't");
  assert.ok(!isFiller("The leader took $28.1B.", regions), "a figure isn't");
  assert.ok(isFiller("The top two are close.", regions), "a small count alone doesn't make it a figure");
  assert.ok(!isFiller("Lead times have fallen for microcontrollers.", labelWords(newsStory().preview, newsStory().title)), "a news story's own text counts");
  assert.ok(labelWords(marginTrend().preview).has("arrow"));
  assert.ok(!labelWords(marginTrend().preview).has("avnet"), "Avnet is on every slide, so it names nothing");
  // What the review found getting through.
  const share = labelWords({ headline: "Avnet holds 4.4% of analog", facts: [{ label: "Avnet share of analog", values: ["4.4%"] }], source: "x" }, "Avnet's share of analog");
  assert.ok(isFiller("Avnet has room to grow here.", share), "naming Avnet isn't naming something on the slide");
  assert.ok(isFiller("Avnet should keep watching this into 2027.", share), "a year isn't a figure");
  assert.ok(!isFiller("Avnet's share of analog leads its peers.", share), "\"analog\" is on the slide");
  const story = labelWords(newsStory().preview, newsStory().title);
  assert.ok(isFiller("This matters for suppliers and why it is worth more attention.", story), "function words don't count, even on a text slide");
  assert.ok(labelWords(tamFunnel().preview).has("distribution"), "panel kickers are labels");

  /* ---------- Notes in the report ---------- */

  const mixed = decks[4].input;
  const planted = goodAnswer(mixed);
  planted.slides[0] = { ...planted.slides[0], notes: "Arrow will reach 99.9% share. Nothing else to say about 77.7%." };
  planted.slides[1] = { ...planted.slides[1], notes: `${planted.slides[1].notes} It doubled since 2020.` };
  const notesReport = checkDeck("notes", mixed, await writeDeckCommentary(mixed, { client: fakeClient(planted) }));
  assert.deepEqual(notesReport.notesDropped, ["card:tam-opportunity"], "a slide whose notes all failed");
  assert.equal(notesReport.noteSentencesDropped, 3);
  assert.equal(notesReport.noteWords.length, 5);
  assert.ok(notesReport.noteWords.every((n) => n >= 40 && n <= 120));
  assert.match(formatReports([notesReport]), /notes  notes dropped: card:tam-opportunity/);

  /* ---------- The storyline ---------- */

  const bad = badOrder();
  const sr = checkStoryline("bad", bad, await writeStoryline(bad, { client: fakeStorylineClient(goodStoryline(bad)) }), "reorder", { market: MARKET, detail: DETAIL });
  assert.ok(sr.pass && sr.moved === 5);
  const kept = checkStoryline("kept", bad, await writeStoryline(bad, { client: fakeStorylineClient({ order: bad.items.map((x) => x.id), moves: [], sections: [] }) }), "reorder", { market: MARKET, detail: DETAIL });
  assert.ok(!kept.pass, "leaving the market last fails the reorder deck");
  const good = goodOrder();
  const shuffled = [...good.items.map((x) => x.id)].reverse();
  const churn = checkStoryline("churn", good, await writeStoryline(good, { client: fakeStorylineClient({ order: shuffled, moves: [], sections: [] }) }), "keep", { market: MARKET, detail: DETAIL });
  assert.ok(!churn.pass, "reshuffling a deck already in a good order fails");
  const broken = checkStoryline("broken", good, await writeStoryline(good, { client: fakeStorylineClient({ order: shuffled.slice(1), moves: [], sections: [] }) }), "keep", { market: MARKET, detail: DETAIL });
  assert.equal(broken.status, "failed");
  assert.ok(!broken.pass);
  assert.match(formatStoryline([sr, churn]), /bad\s+ok\s+reorder\s+5/);

  // The criterion the script uses (JUDGE): the TAM funnel before Avnet's own detail.
  const order = (xs: string[]) => fakeStorylineClient({ order: xs, moves: [], sections: [] });
  const ids = (...xs: { id: string }[]) => xs.map((x) => x.id);
  const run1 = ids(tamFunnel(), shareTiles(), rankedBars(), marginTrend(), newsStory());
  assert.ok(checkStoryline("run 1", bad, await writeStoryline(bad, { client: order(run1) }), "reorder", JUDGE).pass, "run 1's order passes the narrowed criterion");
  const tamAfterShare = ids(shareTiles(), tamFunnel(), rankedBars(), marginTrend(), newsStory());
  assert.ok(!checkStoryline("late TAM", bad, await writeStoryline(bad, { client: order(tamAfterShare) }), "reorder", JUDGE).pass, "the TAM after Avnet's share fails it");

  console.log("commentary-eval.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
