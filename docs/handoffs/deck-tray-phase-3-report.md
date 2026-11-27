# Add to deck, Phase 3: report

PR: https://github.com/hagues-zach/avnet-market-terminal/pull/71, `claude/deck-storyline` into `main` (PR #70 was merged, so this isn't stacked). It's not merged. Auto-fix is on, and CI passed when the PR opened.

Other documents:

- Decisions made without you: [deck-tray-phase-3-decisions.md](deck-tray-phase-3-decisions.md).
- The live eval runs: [deck-tray-phase-3-eval.md](deck-tray-phase-3-eval.md).
- The server-side tray design note: [../design/deck-tray/server-tray.md](../design/deck-tray/server-tray.md).

## What shipped

Three commits, one per milestone. Each got a fresh correctness review before it was committed, and Milestones 1 and 2 also got a UI audit against DESIGN.md and the Web Interface Guidelines. Every finding was fixed or answered in the decisions log. The `security-review` skill found nothing on the branch.

1. **Storyline order** (`eaf7c82`). `src/lib/deck/storyline.ts`, `POST /api/deck/tray/storyline`.
   - Claude suggests an order, with a reason for each slide it moves and optional section titles of at most six words.
   - The order must be a permutation of exactly the slides sent, or the whole answer fails.
   - Reasons and titles are grounded against the slides they speak about. A reason or title that fails is dropped; its move still stands.
   - The review page shows the proposal before anything moves. Apply (with Undo) or Dismiss.
   - Section titles are saved on the item and drawn above the headline in the preview, the PowerPoint and the PDF, and checked again whenever a slide is built.
   - The route shares one call cap with commentary.
2. **Speaker notes** (`997b551`).
   - 50 to 120 words per slide, two-column slides included.
   - Notes are grounded sentence by sentence. Number words the slide doesn't state ("a quarter", "doubled") count as figures.
   - They're written into real PowerPoint notes pages, ending with Claude's line. Mock slides' notes say they're mock.
   - The PDF has none.
   - On the review page they sit in a "Speaker notes" disclosure. Phase 2 commentary still parses and ships.
   - Chart slides with two or more key figures, or a table, beside the chart get three bullets at most.
3. **Phase 2 rough edges** (`f5fb30d`).
   - A filler-focused prompt.
   - The eval's filler check, storyline decks and notes stats.
   - Three live eval runs.
   - The prompt is now part of both cache keys.
   - The output budget scales with the deck.

Tests: 73 test files pass (`npx tsx scripts/test.ts`), plus `tsc --noEmit` and `cards-covered.test.ts`. New files: `storyline.test.ts`, `storyline/route.test.ts`, `notes.test.ts`. The commentary, eval and route tests were extended.

## What ran live

The key came from `.env.local` with the shell's key unset. Total spend was about $0.30, plus up to $0.16 for one failed call the SDK doesn't report usage for.

- **Live eval, three runs.** The details are in the eval doc.
  - Note length is the clearest change: one note over 120 words before the prompt change, none after.
  - Filler and long headlines fell by one each, which is within noise for single samples.
  - The new "don't describe the chart" rule still slipped once per run.
  - Run 3 had one failure: a runaway answer on the one-slide TAM deck. After that, `max_tokens` scales with the deck. That change hasn't run live.
- **Suggest an order, clicked once** on your real five-slide tray (the Phase 2 live-run tray). It came back with a valid order, four reasons and two section titles. I applied it to check the page, then put your tray back exactly. It had been backed up in localStorage first.
- **Keynote** opened an exported deck. Section labels sat above the headlines, and the presenter notes on every content slide read back with Claude's line.

## Open questions for you

1. **Number words in headlines and bullets.**
   - The number-word check ("a quarter", "doubled", "twelve") runs on notes only.
   - The same conversion can happen in headlines. Phase 2's own fixture says "Distribution serves a quarter of a fast-growing chip market" where the slide shows 24.0%.
   - Should headlines, sentences and bullets get the same check? It would drop some lines that read well today.
2. **The filler check counts any label word.** A generic line that uses one passes, such as "watch share closely" on a share slide. Is that strict enough for the eval, or do you want it to look for advice phrasing too?
3. **Section titles go with Clear.** Clear on a slide also removes its section title, because the brief says a section is dropped when the item is cleared. Would you rather titles stay until removed on their own (there is a Remove for that)?
4. **Undo order.** It disappears once you move a slide by hand, so it can't silently undo your own moves. Is that right, or should it stay and say what it resets?

## Decisions to confirm

- **Slide ids in Claude's answers are plain strings, not `z.enum`.** This applies to both the storyline and commentary calls. The SDK can't enforce an enum inside an array, and it throws on one unknown id, which would lose a whole answer whose order was fine.
- **Notes pages are written by the template assembler.** `addNotes` wouldn't survive the assembly step.
- **A reason is grounded against its slide and its new neighbours.** A section title is grounded against its run of slides.
- **The storyline eval's pass criterion was narrowed after the baseline.** It now asks only for the TAM before Avnet's own detail, and the doc labels the baseline "re-scored".
- **Commentary holds up only when something on the slide holds up.** Notes alone don't count, so a rewrite can't replace good on-slide commentary with nothing.

## Not verified

- **The scaled `max_tokens` hasn't run live.** That's the change made after run 3's runaway answer.
- **The PowerPoint hasn't been opened in PowerPoint itself.** Keynote and an XML read only.
- **The PDF hasn't been printed live.** The test renders the print deck and checks that no notes are in it.
- **The Farnell-as-a-region fix is in the prompt but unmeasured.** No eval fixture has the Performance Tracker's region slide.
- **Some page actions weren't clicked in the browser:** Undo order, Remove section, and a rewrite of one slide with notes. They're covered by tests.

## Suggested next steps

1. Open an exported deck in PowerPoint and check the notes pages and section labels.
2. Write commentary once on a tray that includes the Performance Tracker's region slide, to see whether the "call each row what the slide calls it" rule fixed Farnell.
3. Add that region slide as an eval fixture, and save raw answers (`--save`) on every live run so the checks can be re-scored.
4. Decide on open question 1, and if yes, move the number-word check into `groundPiece` so it applies everywhere.
5. When SSO lands, build the server-side tray and per-user cap from the design note.
