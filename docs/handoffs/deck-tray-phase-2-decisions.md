# Add to deck, Phase 2: decisions made without you

One line per decision, with the option not taken. Review findings I rejected are at the end.

## Setup

- Branched `claude/deck-commentary` from `origin/main`, which has PR #69 merged. The PR targets `main`. Not taken: stacking on `claude/deck-tray`. Its two later commits (dropping title-level Add to deck on the company profile and the Performance Tracker) aren't in `main` and aren't in this branch.
- Auto mode was on and this is a new task, which your global rules say to flag before continuing. You asked for an unattended run, so I went ahead and kept the risky part out: no dev server unless it was needed, tests first. Not taken: stopping to ask.
- One live check on 2026-11-25: `aiConfigured()` is true, and one minimal call returned "The Claude API key was rejected." Everything is built and tested against a fake client. The live eval was not run. Commentary has never run live.

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
- Rewriting one slide makes the same whole-deck call with the cache read skipped, so the new headline stays in step with the rest. Only that slide's result is kept, and the fresh answer replaces the cached one. Not taken: a separate one-slide call, which could drift from the summary.
- Only complete answers are cached: every slide has commentary and there's a summary. A partial answer still goes back to the page, with a message naming what's missing, and the next try calls Claude again. An answer where every slide was dropped counts as failed. A cache hit that no longer passes the tray schema is treated as a miss.
- Text is cut at a word boundary, and never through a figure. Evidence is cut on a whole line and always keeps its Source line.
- Repeated slide ids in the browser's tray are sent once. Not taken: a uniqueness check on `TraySchema`, which could reject a saved tray outright.
- Lengths are capped after grounding, so saved commentary always passes the tray schema. If one item fails, `parseTray` throws away the whole saved tray.

## Slides and export

- Commentary is stored on the item (`item.commentary`), next to the app's `preview`, and applied when the slide is built (`slidePreview`). The saved preview is never overwritten, so Clear brings the app's wording back exactly. Not taken: writing Claude's text into `item.preview`.
- Bullets on panel slides (TAM funnel, scatter, news story) are drawn in a strip under the panels, and the panels shrink to make room. This happens in both the PowerPoint and the on-screen preview. Before this, panel slides had no `lines` and drew none. Not taken: leaving bullets off panel slides, which make up most of the tray.
- The executive summary is saved separately (`deck-summary-v1` in localStorage) with the slide ids it covered. It isn't in any item, because it belongs to the deck. If the included slides change, the page says it's out of date. It only ships while it matches.
- The summary slide goes right after the cover, titled "Executive summary". It's marked as Claude's, and it carries the Mock data tag when any shipped slide is on mock data.

## Review page

- The browser has its own write route, `/api/deck/tray/commentary`. It validates the tray through the same schema as the export and takes the same 1 MB cap.

## Review findings rejected

- Milestone 1, finding 10 (the scatter's labelled points and medians are in the evidence even though the slide doesn't print the values): kept. They are the app's own figures for the dots the slide labels, and the medians are printed in the slide's sentence. Leaving them out would stop Claude from saying where Avnet sits, which is the point of the slide.
- Milestone 1, prompt injection through the reader's note steering wording without figures: accepted as a limit. The note is the reader's own brief for their own deck. The tag escaping and the system prompt keep it from acting as instructions, and its figures can't get through.
