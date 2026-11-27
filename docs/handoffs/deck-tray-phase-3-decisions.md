# Add to deck, Phase 3: decisions made without you

One line per decision, with the option not taken. Review findings I rejected are at the end.

## Setup

- `origin/main` has PR #70 merged (8acc4b6), so `claude/deck-storyline` branches from `origin/main` and the PR targets `main`. Not taken: stacking on `claude/deck-commentary`.
- The new branch was created tracking `origin/main`; I removed that upstream at once so a bare `git push` can never reach `main`, and push with `-u origin claude/deck-storyline`.
- Auto mode is on and this is a new task, which your global rules say to flag before continuing. You asked for an unattended run and said not to ask, so I went ahead and kept the risky part small: tests first, the dev server only to check the UI, and the brief's own guards (stop after two `preview_*` timeouts, stop on exit 137). Not taken: stopping to ask.
- The three live eval runs: a baseline after Milestone 2 (notes in, filler prompt not yet changed), one after the Milestone 3 prompt change, one final. The baseline sits after Milestone 2, not before Milestone 1, so the before and after differ only by the filler rules. Not taken: a baseline on the Phase 2 prompt, which couldn't measure notes and would mix two prompt changes into one comparison.

## Milestone 1: storyline order (`src/lib/deck/storyline.ts`)

- Ids in the structured output are plain strings, with the deck's ids listed in their description. The brief asked for a `z.enum` of the ids, but the SDK writes an enum inside an array only as a hint (the API doesn't enforce it), and then its own zod check throws on one unknown id, failing a whole answer whose order is fine (milestone 1 review, finding 1). The permutation check (`isPermutation`) is what holds Claude to the ids sent; unknown ids in moves and sections are ignored. Not taken: keeping `z.enum`. Phase 2's commentary call has the same issue, and Milestone 2 fixes it the same way.
- A reason is grounded against the moved slide and the slides either side of it in the new order, which is what "before" and "after" talk about. Not taken: matching slide titles named in the reason to find "the slides it mentions", which is fragile, or the whole deck, which is looser than the brief asks.
- A section title is grounded against the slides of its run (its slide up to the next section, or the end). Titles over six words are dropped, not cut, since a cut title reads wrong.
- At build time a saved section title is checked again against every included slide's evidence (`deckEvidenceOf`), in the review preview, the PDF and the PowerPoint. Not taken: the slide's own evidence only, which would drop a correct title that quotes a later slide in its run.
- Reasons are shown on the page only and never saved, so they're grounded once, in the call.
- A reason for a slide that didn't move is ignored, and only the first reason or section for a slide counts.
- The cache key includes each slide's saved Claude headline (when it still grounds), so a deck rewritten by Claude gets a fresh suggestion. A stored answer that isn't a permutation of the current slides, or has text over the limits, is a miss.
- A deck with fewer than two included slides gets a 400 from the route ("Include at least two slides") and the button is disabled. Not taken: a call that can only return the same order.
- The shared cap lives on `globalThis` (`deckCallCap()` in `call-cap.ts`), so the two route bundles share one budget even if Next.js loads the module twice. Not taken: a module-level constant, which two bundles could each instantiate.
- Applying goes through a new `arrange()` on the tray provider, which reads the saved tray, applies the change and writes once, the same read-change-write path `move()` uses. Undo after Apply is new ("Undo order"): Phase 2 had no Undo for reordering, so the page keeps the tray's order and section titles from before the apply and puts both back.
- `applyOrder` keeps left-out slides in their places and fills the included slots in Claude's order. If the included slides changed since the suggestion, it returns null and nothing moves; the proposal then says it can't be applied and offers only Dismiss.
- Section titles are applied only when the reader leaves "Add Claude's section titles" ticked (ticked by default when Claude gave any). Applying replaces every included slide's section with Claude's new ones, so old titles from an earlier suggestion don't linger.
- Clear on a slide also drops its section title, and Clear all drops every section (Undo puts them back). Each slide's section can also be removed on its own. Not taken: sections that survive Clear, which the brief's "dropped when the item is cleared" rules out.
- The section label is drawn in the template's top margin above the title placeholder (y 0.1 in, 8 pt bold capitals, muted grey), the same in the preview and the PowerPoint. Not taken: pushing the title down, which would fight the template's placeholder positions.
- The page's Claude block is now headed "Claude", with Write commentary and Suggest an order side by side, and the proposal shows under the buttons with its own live status line.
- Milestone 1 UI audit: all 15 findings fixed. Worth noting: a move by hand after Apply removes "Undo order", since undoing would also undo the hand moves (not taken: an Undo that says what it resets). Claude being off, learnt by either button, now turns off both. The two Undo buttons are "Undo clear" and "Undo order".
- Milestone 1 correctness review: all seven findings fixed. Applying an order now always removes the included slides' old section titles, adding Claude's new ones only when ticked (`applyStoryline` in `tray.ts`, tested). `arrange()` refuses a tray that wouldn't pass `TraySchema`. The list says when a saved section title won't ship. Reasons over 20 words are dropped. The SDK's parse errors get a plain message. "Undo order" works only while the included slides are still in Claude's order.


## Milestone 2: speaker notes

- Notes pages are written by `assemble.ts` on the template's own notes master (`notesMaster1.xml`, already linked from `presentation.xml`), because the assembler keeps only shapes, charts and images from pptxgenjs's scratch deck: `addNotes` would never reach the shipped file. Checked in Keynote: every content slide's presenter notes read back, with Claude's line last.
- The commentary call's slide ids are plain strings with the ids as a hint, as in Milestone 1. `toCommentary` already ignored ids it didn't send.
- Notes are capped at 160 words and 1,200 characters, cut at whole sentences.
- From Phase 3 on, commentary always has a `notes` key, empty when nothing held up. The page uses that to tell "written before notes existed" (no key) from "Claude's notes didn't hold up" (empty).
- A slide's commentary holds up only when its headline, sentence or a bullet does. Notes alone don't count (milestone 2 review, finding 1): otherwise a rewrite with only notes surviving would replace good on-slide commentary with the app's wording.
- Spoken notes reach for number words, so `groundNotes` also drops a sentence with a fraction, a multiple or a count above ten in words ("a quarter", "doubled", "twelve") that the slide doesn't state. Counts up to ten pass, as bare digits up to 10 already do. This applies to notes only. Not taken: the same check on headlines and bullets, which would change Phase 2's grounding (one Phase 2 fixture headline says "a quarter of"). See the report's open questions.
- A mock slide's notes get a line "This slide is on mock data, not Avnet's real results." before Claude's line, since the presenter reads the notes, not the footer.
- Control characters and lone surrogates are stripped from all text written into the PowerPoint (`xmlText` in `assemble.ts`, also used by `pptx.ts`), so a hand-edited tray can't make the file unreadable.
- The three-bullet limit (Milestone 3, item 2) is built here, since it lives in the same call: `bulletsMax()` in `tray.ts` gives three on a chart slide with a side panel and two or more key figures, otherwise four. The prompt marks those slides `bullets_max="3"`, `toCommentary` enforces it, and `slidePreview` enforces it again for trays saved in Phase 2.
- The speaker-notes disclosure's open state is held by the page, so it stays open while the reader steps through slides.
- `PrintDeck` is exported so the notes test can render it and check that no notes reach the PDF.
- Milestone 2 UI audit: all ten findings fixed. Milestone 2 correctness review: all six findings fixed.
- The browser checks after the first stop ran on this session's own dev server (the other session's server had stopped). The speaker-notes screenshot uses a fixture tray loaded into localStorage, so no Claude call; your tray was backed up first and put back byte for byte.

## Where the run stopped (usage limit, 2026-11-26)

- Milestone 1 is committed and pushed (eaf7c82, `claude/deck-storyline`). No PR yet.
- Milestone 2 (speaker notes) was built but uncommitted at that point. When the run resumed it was reviewed, fixed and committed.
- Milestone 2 decisions: notes pages are written by `assemble.ts` on the template's notes master, because the assembler drops pptxgenjs's own notes pages (`addNotes` would never reach the file). The commentary call's slide ids are plain strings with an id hint, the same fix as the storyline. Notes are capped at 160 words or 1,200 characters, cut at whole sentences.
- Browser check, live, against the dev server another session started on port 3002 (same folder): Suggest an order returned a valid five-slide order, a reason per move and two section titles. Focus went to the proposal. Apply reordered the tray, saved the titles, moved focus back to the button and flagged the summary as stale. The tray in localStorage was backed up first and put back afterwards. Screenshot: `docs/design/deck-tray/phase-3/1-suggested-order.jpg` (uncommitted).
- Not started: Milestone 3 (filler prompt, the eval's filler, storyline and notes checks, the three live eval runs), security review, the PR, Auto-fix, the report.
