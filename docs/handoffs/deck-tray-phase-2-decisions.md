# Add to deck, Phase 2: decisions made without you

One line per decision, with the option not taken. Review findings I rejected are at the end.

## Setup

- Branched `claude/deck-commentary` from `origin/main`, which has PR #69 merged. The PR targets `main`. Not taken: stacking on `claude/deck-tray`. Its two later commits (dropping title-level Add to deck on the company profile and the Performance Tracker) aren't in `main` and aren't in this branch.
- Auto mode was on and this is a new task, which your global rules say to flag before continuing. You asked for an unattended run, so I went ahead and kept the risky part out: no dev server unless it was needed, tests first. Not taken: stopping to ask.
- One live check on 2026-11-25: `aiConfigured()` is true, and one minimal call returned "The Claude API key was rejected." Everything is built and tested against a fake client. The live eval was not run then. Update 2026-11-26: that key had expired. With a new key the live eval and the review page both ran; see the report's Live run section.

## Commentary module (`src/lib/deck/commentary.ts`)

- Model `DECK_MODEL = "claude-sonnet-5-5"`, the same string as `QBR_MODEL`, declared in the module. Not taken: importing it from `src/lib/qbr/talking-points.ts`, which would load QBR Prep's brief-gathering code into the deck route and its tests.
- Cache namespace `deck-commentary-v1`. `commentary-v1` already belongs to management commentary in `src/lib/ai/commentary.ts`.
- The output lists slides as an array of `{ id, headline, text, bullets }`, with `id` held to the deck's slide ids. Not taken: a JSON object keyed by id, which structured outputs handle less reliably. The result is still keyed by slide id once it's parsed.
- Evidence for a slide is its saved `Preview` rendered as text, with chart points written as the slide writes them (`formatFigure`: "$1.62B", "22.5%"). Claude can only quote a figure the way the slide shows it. A rounded or derived figure ("$1.6B", "up 12%") gets dropped. Not taken: allowing tolerance for rounding.
- The reader's note is in the prompt as the brief for the headline, but it is not evidence. A figure that only appears in the note can't reach Claude's text. Not taken: counting the note as evidence. If Claude's headline is dropped, the note still becomes the title, as it does today, because it's the reader's own words.
- Grounding uses a deck-specific check (`src/lib/deck/evidence.ts`), not `ungrounded()` itself. Each figure has to be on the slide with the same number, sign and unit. A small number is only exempt when it's a bare count of one to ten, and a year only when it's a bare four-digit 19xx or 20xx. An en dash right before a digit counts as a minus. Not taken: `ungrounded()` as it is. The milestone 1 review showed it reduces figures to bare digits, so "+3.1%" grounded against "−3.1%" and "$1.62M" against "$1.62B". QBR's use of it is unchanged.
- One hole is left on purpose: an unsigned figure matches either sign, so "grew 3.1%" still grounds against "−3.1%". The words carry the direction, and matching only same-signed figures would drop every "fell 3.1%". Not taken: dropping unsigned figures when the slide's figure is negative.
- Saved commentary and the saved summary are checked against the slide again every time a slide is built (`slidePreview`, `summaryPreview`). This happens in the review page, the PDF and the PowerPoint. A forged or stale figure in the browser's copy, or a slide re-added after its data moved, can't ship a figure the slide doesn't show.
- Grounding works per piece: headline, sentence, each bullet, each summary line. A dropped sentence falls back to the card's own sentence. Dropped bullets fall back to the card's own lines when none survive. The headline falls back to the reader's note, then the card's headline.
- Two-column talking-point slides (`groups`) keep their columns. Claude's bullets aren't drawn there because the columns already are the bullets. Claude still writes those slides' headline and sentence.
- Rewriting one slide makes the same whole-deck call with the cache read skipped, so the new headline stays in step with the rest. Only that slide's result is returned and stored: it goes into the cached answer, and the other slides and the summary stay as the reader saw them. Nothing is stored when no answer was cached before. Not taken: replacing the whole cached answer. The milestone 2 review showed that would quietly swap in slides the reader never reviewed. Also not taken: a separate one-slide call, which could drift from the summary.
- Only complete answers are cached: every slide has commentary and there's a summary. A partial answer still goes back to the page, with a message naming what's missing, and the next try calls Claude again. An answer where every slide was dropped counts as failed. A cache hit that no longer passes the tray schema is treated as a miss.
- Text is cut at a word boundary, and never through a figure. Evidence is cut on a whole line and always keeps its Source line.
- Repeated slide ids in the browser's tray are sent once. Not taken: a uniqueness check on `TraySchema`, which could reject a saved tray outright.
- Lengths are capped after grounding, so saved commentary always passes the tray schema. If one item fails, `parseTray` throws away the whole saved tray.

## Slides and export

- Commentary is stored on the item (`item.commentary`), next to the app's `preview`, and applied when the slide is built (`slidePreview`). The saved preview is never overwritten, so Clear brings the app's wording back exactly. Not taken: writing Claude's text into `item.preview`.
- Bullets on panel slides (TAM funnel, scatter, news story) are drawn in a strip under the panels, and the panels shrink to make room. This happens in both the PowerPoint and the on-screen preview. Before this, panel slides had no `lines` and drew none. Not taken: leaving bullets off panel slides, which make up most of the tray.
- The executive summary is saved separately (`deck-summary-v1` in localStorage) with the slide ids it covered. It isn't in any item, because it belongs to the deck. If the included slides change, the page says it's out of date. It only ships while it matches.
- The summary slide goes right after the cover, titled "Executive summary". It's marked as Claude's, and it carries the Mock data tag when any shipped slide is on mock data.

- `writtenAt` on commentary and on the summary must be YYYY-MM-DD. Anything else is refused by the schema, and `writtenDate` prints nothing for it. Without this, a forged date could put any text, figures included, into the "written by Claude" line.
- The commentary route's contract: 400 or 413 for a bad request, 429 when the cap is hit, otherwise 200 with `status` ("ok", "off", "failed") and a `message`. The page reads `status`. Not taken: 502 for a failed Claude call, because the page shows the same message either way.
- Cap: 20 uncached Claude calls per 10 minutes per server process, counted inside the write, so a cache hit never counts. It covers both new decks and rewrites (`src/lib/deck/call-cap.ts`). Not taken: a cap per user, since there is no sign-in yet (Phase 3).
- Request size is checked as bytes, from `content-length` first, on both routes.

## Review page

- The browser has its own write route, `/api/deck/tray/commentary`. Its handler is `src/lib/deck/commentary-route.ts`, so tests can pass in a fake writer and store. It validates the tray through the same schema as the export and takes the same 1 MB cap.

- **Write commentary** runs on the slides included at the moment it's clicked. Each of those takes Claude's new commentary. A slide Claude's answer dropped loses its earlier commentary, since the new summary was written without it, and the message names it. Slides left out keep theirs. Not taken: keeping old commentary beside a new summary it doesn't match.
- Commentary and the summary record the audience they were written for. If the reader switches audience, the page says so beside each one and still ships it. Not taken: refusing to ship it. The figures are still checked, and the wording is the reader's call.
- A headline that fell back to the reader's point records that (`headlineFrom`), so it follows the point if the reader edits it later.
- The summary records when each slide was added. A slide removed and added again with newer figures makes it stale. The summary is also cleared when the tray empties.
- Saving reports `saved`, `unsaved` (the browser kept it for this tab only) or `refused`. The summary is only stored if the tray it belongs with was stored too.
- **Clear all** uses the destructive button style and offers **Undo** in the status line. Not taken: a confirm dialog, which adds a step every time when Undo covers the mistake.
- When the server says Claude is off, **Write commentary** stays disabled until the page reloads, with the message saying why.
- There's one live region for commentary, always mounted. A slide's message shows under that slide and is announced once, from the region.

## Review findings rejected

- Milestone 1, finding 10 (the scatter's labelled points and medians are in the evidence even though the slide doesn't print the values): kept. They are the app's own figures for the dots the slide labels, and the medians are printed in the slide's sentence. Leaving them out would stop Claude from saying where Avnet sits, which is the point of the slide.
- Milestone 1, prompt injection through the reader's note steering wording without figures: accepted as a limit. The note is the reader's own brief for their own deck. The tag escaping and the system prompt keep it from acting as instructions, and its figures can't get through.
- Milestone 2, missing test that the preview and the PowerPoint place the panel-bullet strip at the same height: partly addressed. Both now take the height from one function (`bulletsHeight`), and the preview sets the strip with the PowerPoint's line height and spacing, clipped to that height. There's no pixel-level comparison test, because the preview is a React component and the test suite has no DOM.
- Milestone 3 UI audit, finding 10b (a skeleton over the preview while one slide is written again): not done. The status line says Claude is writing, the slide's row and preview carry `aria-busy`, and the old wording stays readable until the new one arrives.
- Milestone 3 UI audit, finding 11a (the summary goes stale when a slide's commentary is written again or cleared): rejected. The summary is grounded in the slides' figures, not their commentary, and it's checked against those figures every time it's built. Rewording a slide doesn't make it wrong.
- Milestone 3 UI audit, the LoadingBlock's extra `role="status"`: fixed differently. The commentary skeleton is now its own `aria-hidden` shape, and the one status line describes it.
