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
