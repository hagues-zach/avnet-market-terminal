// Speaker notes (Add to deck, Phase 3) and the three-bullet limit: notes are
// grounded sentence by sentence; v1 commentary without notes still parses and
// ships; notes reach the PowerPoint's notes pages with Claude's line and are
// checked again as the deck is built; the PDF's slides carry no notes; two-column
// slides get notes but no bullets; chart slides with two key figures get three
// bullets at most. Nothing here calls Claude. Run with: npx tsx src/lib/deck/notes.test.ts
import assert from "node:assert/strict";
import JSZip from "jszip";
import { COMMENTARY_NS, maxTokens, render, toCommentary, writeDeckCommentary, type DeckInput } from "./commentary";
import { fakeClient, goodAnswer, marginTrend, rankedBars, shareTiles, tamFunnel } from "./commentary.fixtures";
import { evidenceOf } from "./evidence";
import { linesInSide, planSlide, withChart } from "./layout";
import { buildDeck, notesLine } from "./pptx";
import { bulletsMax, CommentarySchema, groundNotes, parseTray, slideNotes, slidePreview, trayDeckSlides, type TrayItem } from "./tray";

const DAY = "2026-11-26";
const deck = (items: TrayItem[]): DeckInput => ({ title: "Microchip supplier review", audience: "Supplier", items });

const talking = (): TrayItem => ({
  id: "view:talking",
  kind: "view",
  title: "Talking points",
  from: { page: "QBR Prep", href: "/qbr" },
  addedAt: "2026-11-24T15:00:00.000Z",
  included: true,
  preview: {
    headline: "What to raise with Microchip",
    groups: [
      { title: "Talking points", lines: ["MCU lead times are back to 12 weeks.", "Restock expected in the March quarter."] },
      { title: "Questions to ask", lines: ["Which families come off allocation first?"] },
    ],
    source: "QBR Prep",
  },
});

async function main() {
  assert.equal(COMMENTARY_NS, "deck-commentary-v2", "the cache moved to v2 with notes");

  /* ---------- Grounding, sentence by sentence ---------- */

  const ev = evidenceOf(marginTrend().preview);
  const dropped: string[] = [];
  const g = groundNotes("Both margins rose. Avnet reached 10.8% in Q3 2026. Arrow will hit 12.5% next year. So the gap held.", ev, dropped, "notes");
  assert.equal(g, "Both margins rose. Avnet reached 10.8% in Q3 2026. So the gap held.", "the sentence with a made-up figure goes, the rest stay");
  assert.equal(dropped.length, 1);
  assert.match(dropped[0], /12\.5%/);
  assert.equal(groundNotes("Up 50% this year. Down 9.9% last.", ev), "", "nothing survives: no notes");
  const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} has five words.`).join(" ");
  assert.ok(groundNotes(long, ev).split(/\s+/).length <= 160, "notes are capped by whole sentences");

  const id = marginTrend().id;
  const one = (notes: string) => toCommentary(deck([marginTrend()]), { slides: [{ id, headline: "Margins recovered", text: "", bullets: ["Both rose."], notes }], summary: [] }, DAY, []).slides[id];
  assert.equal(one("Avnet reached 10.8% while Arrow reached 11.2%. The gap held.").notes, "Avnet reached 10.8% while Arrow reached 11.2%. The gap held.");
  assert.equal(one("Arrow will reach 15.0%.").notes, "", "a slide whose notes don't hold up has empty notes, not none: the page tells it from v1");
  assert.equal(slideNotes({ ...marginTrend(), commentary: one("Arrow will reach 15.0%.") }), undefined, "and nothing ships");
  // Notes alone don't make commentary: nothing on the slide held up, so the slide gets none.
  const notesOnly = toCommentary(deck([marginTrend()]), { slides: [{ id, headline: "Up 66.6%", text: "", bullets: [], notes: "The gap held all year." }], summary: [] }, DAY, []).slides[id];
  assert.equal(notesOnly, undefined);
  // Number words the slide doesn't state are converted figures: the sentence goes.
  const words: string[] = [];
  assert.equal(groundNotes("Arrow's margin is double Avnet's. Distribution serves a quarter of the market. The gap held.", ev, words), "The gap held.");
  assert.equal(words.length, 2);
  assert.match(words.join(), /\[double\]/);
  assert.equal(groundNotes("Lead times are back to twelve weeks.", "Lead times are 12 weeks."), "", "\"twelve\" in words isn't how the slide writes it");
  assert.equal(groundNotes("Draw the eye to the two leaders.", ev), "Draw the eye to the two leaders.", "a small count is wording, as bare digits up to 10 are");
  assert.equal(groundNotes("Restock comes in the March quarter.", "Distributors restock in the March quarter."), "Restock comes in the March quarter.", "\"quarter\" as a period isn't a number word");

  /* ---------- The prompt asks for notes, and for three bullets where room is short ---------- */

  const prompt = render(deck([marginTrend(), tamFunnel(), talking()]));
  assert.match(prompt, new RegExp(`<slide id="${id}" number="1" bullets_max="3">`), "a chart slide with two key figures asks for three bullets");
  assert.doesNotMatch(prompt, /<slide id="card:tam-opportunity"[^>]*bullets_max/, "a panels slide keeps four");

  /* ---------- Two-column slides get notes, not bullets ---------- */

  const twoCol = toCommentary(
    deck([talking()]),
    { slides: [{ id: "view:talking", headline: "Lead times are back to normal", text: "", bullets: ["A bullet"], notes: "Open with the 12 weeks: it is the news the room has waited for. Then ask about allocation." }], summary: [] },
    DAY,
    [],
  ).slides["view:talking"];
  assert.match(twoCol.notes!, /12 weeks/);
  const twoColSlide = slidePreview({ ...talking(), commentary: twoCol });
  assert.equal(twoColSlide.lines, undefined, "two-column slides still get no bullets from Claude");
  assert.ok(slideNotes({ ...talking(), commentary: twoCol }), "but they do get notes");

  /* ---------- The three-bullet limit ---------- */

  assert.equal(bulletsMax(marginTrend().preview), 3, "a chart slide with two key figures");
  assert.equal(planSlide(withChart(marginTrend().preview)).callouts.length >= 2, true);
  assert.equal(bulletsMax(tamFunnel().preview), 4);
  assert.ok(planSlide(withChart(rankedBars().preview)).table, "the ranked chart has a table beside it");
  assert.equal(bulletsMax(rankedBars().preview), 3, "a chart with a table beside it is as full as one with key figures");
  const { facts: _f, columns: _c, ...bare } = marginTrend().preview;
  assert.equal(bulletsMax(bare), 4, "a chart with nothing beside it");
  assert.equal(bulletsMax(shareTiles().preview), 4, "figure tiles without a chart");
  const four = toCommentary(deck([marginTrend()]), { slides: [{ id, headline: "h", text: "", bullets: ["Both rose.", "The gap held.", "Arrow leads.", "Avnet trails."], notes: "" }], summary: [] }, DAY, []).slides[id];
  assert.equal(four.bullets.length, 3, "Claude's fourth bullet is dropped");
  // A tray saved in Phase 2 with four bullets on that slide ships three.
  const saved = { ...marginTrend(), commentary: { headline: "h", bullets: ["Both rose.", "The gap held.", "Arrow leads.", "Avnet trails."], writtenAt: "2026-11-25" } };
  const built = slidePreview(saved);
  assert.equal(built.lines?.length, 3);
  // linesInSide is still the safety net: it decides side panel or strip for the three.
  assert.equal(typeof linesInSide(planSlide(withChart(built)), built.lines!), "boolean");

  /* ---------- Back-compat: v1 commentary without notes ---------- */

  const v1 = { headline: "Avnet's margin recovered, but Arrow still leads", text: "Avnet reached 10.8%.", bullets: ["Both rose."], writtenAt: "2026-11-25", headlineFrom: "claude" as const, audience: "Supplier" };
  assert.ok(CommentarySchema.safeParse(v1).success);
  const phase1 = [tamFunnel(), shareTiles()];
  const phase2 = [{ ...marginTrend(), commentary: v1 }, tamFunnel()];
  assert.equal(parseTray(JSON.stringify(phase1)).length, 2, "a Phase 1 tray parses");
  assert.equal(parseTray(JSON.stringify(phase2)).length, 2, "a Phase 2 tray parses");
  const v1Deck = trayDeckSlides(phase2, { title: "T", audience: "Supplier", date: "November 26, 2026" });
  assert.equal(v1Deck[1].preview.headline, v1.headline, "v1 commentary still ships");
  assert.equal(v1Deck[1].notes, undefined, "and has no notes");
  const v1Zip = await JSZip.loadAsync(await buildDeck("T", v1Deck));
  assert.equal(Object.keys(v1Zip.files).filter((f) => f.startsWith("ppt/notesSlides/")).length, 0, "no notes pages without notes");
  assert.ok(!CommentarySchema.safeParse({ ...v1, notes: "x".repeat(1201) }).success, "notes over their limit are refused");

  /* ---------- Notes in the PowerPoint ---------- */

  const r = await writeDeckCommentary(deck([marginTrend(), shareTiles(), talking()]), { client: fakeClient(goodAnswer(deck([marginTrend(), shareTiles()]))), now: () => DAY });
  assert.equal(r.status, "ok");
  assert.ok(r.slides[id].notes, "the canned answer's notes hold up");
  const tray: TrayItem[] = [
    { ...marginTrend(), commentary: r.slides[id] },
    // A forged sentence in saved notes: checked again as the deck is built.
    { ...shareTiles(), commentary: { ...r.slides["view:share"], notes: `${r.slides["view:share"].notes} Avnet will reach 9.9% share by 2027.` } },
    { ...talking(), commentary: { headline: "What to raise", bullets: [], notes: "Open with the 12 weeks.", writtenAt: DAY } },
  ];
  const slides = trayDeckSlides(tray, { title: "T", audience: "Supplier", date: "November 26, 2026" });
  assert.ok(slides[1].notes && slides[2].notes && slides[3].notes);
  assert.doesNotMatch(slides[2].notes!.text, /9\.9%/, "a forged figure in saved notes doesn't ship");
  assert.equal(slides[0].notes, undefined, "the cover has no notes");

  const zip = await JSZip.loadAsync(await buildDeck("T", slides));
  const notesParts = Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f)).sort();
  assert.deepEqual(notesParts, ["ppt/notesSlides/notesSlide2.xml", "ppt/notesSlides/notesSlide3.xml", "ppt/notesSlides/notesSlide4.xml"]);
  const n2 = await zip.file("ppt/notesSlides/notesSlide2.xml")!.async("string");
  assert.match(n2, /Avnet reached 10\.8%/);
  assert.match(n2, /<a:t>Notes written by Claude, November 26, 2026\. Check before presenting\.<\/a:t>/, "the last line says Claude wrote them");
  assert.equal(notesLine("November 26, 2026"), "Notes written by Claude, November 26, 2026. Check before presenting.");
  assert.match(n2, /<p:ph type="body" sz="quarter" idx="3"\/>/, "the notes sit in the notes master's body");
  const n2rels = await zip.file("ppt/notesSlides/_rels/notesSlide2.xml.rels")!.async("string");
  assert.match(n2rels, /Target="\.\.\/notesMasters\/notesMaster1\.xml"/);
  assert.match(n2rels, /Target="\.\.\/slides\/slide2\.xml"/);
  const s2rels = await zip.file("ppt/slides/_rels/slide2.xml.rels")!.async("string");
  assert.match(s2rels, /Type="[^"]+\/notesSlide" Target="\.\.\/notesSlides\/notesSlide2\.xml"/);
  const ids = [...s2rels.matchAll(/Id="(rId\d+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "every relationship on the slide has its own id");
  const types = await zip.file("[Content_Types].xml")!.async("string");
  assert.match(types, /PartName="\/ppt\/notesSlides\/notesSlide2\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.notesSlide\+xml"/);

  // A mock slide's notes say so, since the presenter reads the notes, not the footer.
  const n4 = await zip.file("ppt/notesSlides/notesSlide3.xml")!.async("string");
  assert.match(n4, /This slide is on mock data, not Avnet&apos;s real results\.|This slide is on mock data, not Avnet's real results\./, "the share slide is mock");
  assert.doesNotMatch(n2, /mock data/, "a live slide's notes don't");

  // Control characters (a hand-edited tray, or a stray byte from Claude) are stripped, so the file stays valid XML.
  const bad = await JSZip.loadAsync(await buildDeck("T", [{ ...slides[1], notes: { text: "Avnet reached 10.8%.\u0001\u0008 The gap held.\uD800", date: "November 26, 2026" } }]));
  const badXml = await bad.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
  assert.doesNotMatch(badXml, /[\u0000-\u0008\uD800-\uDFFF]/);
  assert.match(badXml, /Avnet reached 10\.8%\. The gap held\./);

  // The output budget scales with the deck, so a runaway answer stops early (the live eval saw one).
  const seen: { max_tokens: number }[] = [];
  await writeDeckCommentary(deck([marginTrend()]), { client: fakeClient(goodAnswer(deck([marginTrend()])), "end_turn", seen) });
  assert.equal(seen[0].max_tokens, maxTokens(1));
  assert.equal(maxTokens(1), 2400);
  assert.equal(maxTokens(25), 16000, "never past 16,000");

  /* ---------- The PDF has no notes ---------- */

  // The PDF is PrintDeck on the review page: rendered here, with notes on every slide, none of them in it.
  const { renderToStaticMarkup } = await import("react-dom/server");
  const React = await import("react");
  const { createElement } = React;
  // tsx compiles the page's JSX for the classic runtime, which reads React from the global scope.
  (globalThis as { React?: unknown }).React = React;
  const { PrintDeck } = await import("@/components/deck/tray-review");
  const html = renderToStaticMarkup(createElement(PrintDeck, { items: tray, title: "T", audience: "Supplier", onDone: () => {} }));
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
  assert.ok(html.includes(esc(slides[1].preview.headline)) && html.includes(esc(slides[2].preview.headline)), "the print deck rendered its slides");
  for (const d of slides) if (d.notes) assert.ok(!html.includes(d.notes.text.slice(0, 40).replace(/'/g, "&#x27;")) && !html.includes(d.notes.text.slice(0, 40)), "notes aren't in the PDF");
  assert.doesNotMatch(html, /Notes written by Claude/);

  console.log("notes.test.ts: ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
