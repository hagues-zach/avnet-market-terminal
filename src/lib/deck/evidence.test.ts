// The deck's figure check: sign, unit, small numbers, years, dashes and cuts.
// Run with: npx tsx src/lib/deck/evidence.test.ts
import assert from "node:assert/strict";
import { cutWords, evidenceOf, figures, groundPiece, numberWords, tidy, ungroundedFigures, ungroundedWords } from "./evidence";

const ev = "Avnet margin −3.1%, revenue $1.62B, up +22.5% on 2025. Gap 0.4 points. Lead times 12 weeks. Share 4.4%, +0.3 pts. 1,950 units.";
const bad = (t: string) => ungroundedFigures(t, ev);

// What's read from text.
assert.deepEqual(figures("−3.1% and $1.62B and 2 points"), [
  { sign: "-", num: "3.1", unit: "%", text: "−3.1%" },
  { sign: "", num: "1.62", unit: "$B", text: "$1.62B" },
  { sign: "", num: "2", unit: "pts", text: "2 points" },
]);
assert.equal(figures("Q3-2026")[1].sign, "", "a hyphen inside a word isn't a minus");
assert.equal(figures("$1.62 billion")[0].unit, "$B");

// Grounded: the same figure, an unsigned one, the unit with or without the dollar.
assert.deepEqual(bad("Margin was −3.1% and revenue $1.62B."), []);
assert.deepEqual(bad("Margin fell 3.1% on revenue of 1.62B, up 22.5%."), []);
assert.deepEqual(bad("Revenue reached $1.62 billion."), []);
assert.deepEqual(bad("The gap is 0.4 points; share rose +0.3 pts to 4.4%."), []);
assert.deepEqual(bad("In 2025 and 2026, four of 6 lines and 12 weeks."), [], "years, small counts and grounded counts");
assert.deepEqual(bad("It shipped 1,950 units."), []);

// Not grounded: the wrong sign, the wrong unit, small figures with a unit, year-shaped figures that aren't years.
assert.deepEqual(bad("Margin grew +3.1%."), ["+3.1%"], "a fall called growth");
assert.deepEqual(bad("Sales fell −22.5%."), ["−22.5%"]);
assert.deepEqual(bad("Revenue was $1.62M."), ["$1.62M"], "millions for billions");
assert.deepEqual(bad("Margin is 8% on $9B."), ["8%", "$9B"], "small figures with a unit are checked");
assert.deepEqual(bad("A 3x lead, 2 points ahead."), ["3x", "2 points"]);
assert.deepEqual(bad("It shipped 2,050 units worth $2,050M."), ["2,050", "$2,050M"], "comma figures aren't years");
assert.deepEqual(bad("Down 12.5%."), ["12.5%"]);

// An en dash used as a minus keeps its sign through the dash rewrite, and is checked as one.
assert.equal(tidy("Margin fell to –3.1%"), "Margin fell to −3.1%");
assert.equal(groundPiece("Margin fell to –3.1%", ev), "Margin fell to −3.1%");
assert.equal(groundPiece("Margin rose to —22.5%", ev), "", "a minus the evidence doesn't have");
assert.equal(tidy("Up from 10.3%–10.8%"), "Up from 10.3% to 10.8%", "a range is still a range");
assert.equal(tidy("Margins held — Arrow leads"), "Margins held, Arrow leads");
assert.equal(tidy("- A bullet"), "A bullet");

// The dropped list says what and why.
const dropped: string[] = [];
assert.equal(groundPiece("Margin grew +3.1%", ev, dropped, "s1 headline"), "");
assert.deepEqual(dropped, ["s1 headline: Margin grew +3.1% [+3.1%]"]);

// Cuts land on a word and never leave part of a figure.
assert.equal(cutWords("short", 10), "short");
assert.equal(cutWords("Revenue grew to 12.45% in the quarter", 21), "Revenue grew to…");
assert.equal(cutWords("Avnet shipped 1,234,567 units", 22), "Avnet shipped…");
assert.ok(cutWords("word ".repeat(100), 240).length <= 240);

// Evidence is cut on a line, keeping the source.
const big = evidenceOf({ headline: "H", lines: Array.from({ length: 12 }, (_, i) => `${i} ${"x".repeat(290)} $1.625B`), source: "SEC filings" });
assert.ok(big.length <= 8000);
assert.match(big, /\nSource: SEC filings$/);
assert.ok(big.split("\n").every((l) => l === "Headline: H" || l.startsWith("Source") || l.endsWith("$1.625B")), "no line cut through a figure");

// Quantities in words: a fraction, multiple or count past ten the slide doesn't state is a converted figure.
assert.deepEqual(numberWords("A quarter of sales doubled, twice as fast, twelve weeks, a threefold rise."), ["a quarter", "doubled", "twice", "twelve", "threefold"]);
assert.deepEqual(numberWords("The two leaders and three regions."), [], "counts up to ten are wording, as bare digits up to 10 are");
assert.deepEqual(numberWords("Results for the second half, half-year figures, and the change on a quarter ago."), [], "periods aren't quantities");
assert.deepEqual(numberWords("The scaffold of a manifold plan will unfold."), [], "only real multiples end in -fold");
assert.deepEqual(ungroundedWords("Lead times halved to twelve weeks.", ev), ["halved", "twelve"]);
assert.deepEqual(ungroundedWords("Margins doubled.", "Margins doubled on the year."), [], "the slide's own words ground them");
// Every piece Claude writes goes through groundPiece, so headlines, bullets, summary lines, reasons and titles get it too.
const words: string[] = [];
assert.equal(groundPiece("Distribution serves a quarter of the market", "Distributors serve 24.0% of TAM.", words, "headline"), "");
assert.match(words[0], /headline: Distribution serves a quarter of the market \[a quarter\]/);
assert.equal(groundPiece("Distribution serves 24.0% of the market", "Distributors serve 24.0% of TAM."), "Distribution serves 24.0% of the market");
assert.equal(groundPiece("Arrow's revenue is double Avnet's.", ev), "", "a bullet with a multiple the slide doesn't state");
assert.equal(groundPiece("Growth slowed in the second half.", ev), "Growth slowed in the second half.");

console.log("evidence.test.ts: ok");
