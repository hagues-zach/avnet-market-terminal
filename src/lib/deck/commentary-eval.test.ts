// The deck commentary eval's checks, against planted mistakes. No API calls.
// Run with: npx tsx src/lib/deck/commentary-eval.test.ts
import assert from "node:assert/strict";
import { writeDeckCommentary } from "./commentary";
import { checkDeck, formatReports, HEADLINE_WORDS } from "./commentary-eval";
import { evalDecks, fakeClient, goodAnswer } from "./commentary.fixtures";

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
  answer.slides[2] = { ...answer.slides[2], headline: "Up 44.4%", text: "Down 9.9%.", bullets: ["17.7% better"] };
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
  console.log("commentary-eval.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
