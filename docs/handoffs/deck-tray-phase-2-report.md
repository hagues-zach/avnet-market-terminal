# Add to deck, Phase 2: report

PR: https://github.com/hagues-zach/avnet-market-terminal/pull/70, `claude/deck-commentary` into `main`. It's not merged. Auto-fix is on.
Decisions made without you: [deck-tray-phase-2-decisions.md](deck-tray-phase-2-decisions.md).

## What shipped

Three commits, one per milestone, each reviewed by a fresh agent and fixed before it was committed.

1. **Commentary module.** `src/lib/deck/commentary.ts` and `src/lib/deck/evidence.ts`.
   - One structured Sonnet call per deck (`claude-sonnet-5-5`). For each slide Claude writes a headline that makes the point, one sentence and two to four bullets. It also writes a three to five line executive summary.
   - Every piece is checked against the slide's own saved preview. Each figure has to be there with the same number, sign and unit. If the headline is dropped, it falls back to the reader's point, then the card's headline.
   - Answers are cached in `store` (`deck-commentary-v1`) by a hash of the inputs. Only complete answers are kept, and cache hits are validated.
   - The client can be injected, so tests and the eval never call the API.
2. **Slides and export.**
   - Commentary is saved on each tray item, next to the app's preview. It's applied when a slide is built and checked again every time.
   - An optional executive summary slide goes after the cover.
   - On panel slides, bullets go in a strip under the panels, drawn the same in the preview and the PowerPoint.
   - New route `POST /api/deck/tray/commentary` (handler in `src/lib/deck/commentary-route.ts`). It validates through the tray schema, caps uncached calls per process, and rewrites one slide without disturbing the rest of the cached answer.
   - The export ships the saved summary while it still matches the slides.
3. **Review page** (`/tools/deck/tray`).
   - Write commentary (a secondary button).
   - Clear all, with Undo.
   - One live status line, and a skeleton while Claude writes.
   - The executive summary as it will ship, or why it won't.
   - Per slide: Write again and Clear.
   - Notices when the reader's point or the audience changed after Claude wrote it.
   - When Claude is off, the page says so and the button is disabled.
   - Errors name what failed, with Try again.
   - The PDF print path uses the same deck.

Tests: 70 test files pass (`npx tsx scripts/test.ts`), plus `tsc --noEmit` and `cards-covered.test.ts`. New test files: `evidence`, `commentary`, `commentary-eval`, `call-cap`, and the two route tests. Run the offline eval with `npx tsx scripts/deck-commentary-eval.ts`.

The security review (the `security-review` skill) found nothing at confidence 7 or above.

## Not verified

- **Commentary has never run live.** On 2026-11-25 the API rejected the local key with "The Claude API key was rejected". The prompt, the real grounding drop rate, headline quality, latency and cost are all unmeasured. The live eval (`--live`) hasn't been run.
- **Not seen in a browser.** I didn't start a dev server, so there are no screenshots. Your global rules flag dev servers in an unattended auto-mode run, and I relied on tests instead. The new controls, the panel bullet strip on screen, the skeleton and focus moves are checked only by type checks and code review.
- **Structured output with a per-deck `z.enum` of slide ids**, through `zodOutputFormat`, is untested against the real API. The repo's other calls use fixed schemas.
- **The PowerPoint strip height** is estimated from character counts, the same as the existing layout code. Long bullets could wrap differently in PowerPoint than on screen.

## Open questions for you

1. **Unsigned figures.** "grew 3.1%" still grounds against a slide that shows "−3.1%", because the words carry the direction. Should a figure without a sign be refused when the slide's figure is negative? That would also drop correct lines like "fell 3.1%".
2. **The scatter's dot values.** Claude can quote Avnet's and Arrow's exact growth and margin from the scatter, but the slide doesn't print those numbers. Keep that, or limit Claude to figures the slide prints?
3. **Write commentary clears a slide's earlier commentary when the new answer drops it.** The message names the slides. Would you rather keep the old commentary, marked as from an earlier run?
4. **Changing the audience** only warns. Should commentary written for another audience be held back from the export?

## Decisions to confirm

- Branched from `main` (PR #69 merged). The two later commits on `claude/deck-tray` aren't in this PR.
- My own figure check (`src/lib/deck/evidence.ts`) instead of `ungrounded()`, which ignores sign and unit. QBR Prep still uses `ungrounded()`, so it has the same hole. See Suggested next steps.
- The cache key includes the title, so renaming the deck means a new call.
- The cap is 20 uncached calls per 10 minutes per server process.
- The executive summary is kept in its own localStorage key (`deck-summary-v1`), not in an item.
- The two-column talking-points slides keep their columns and get no bullets from Claude.

## Suggested next steps

1. Get a working key into `.env.local`, then run `npx tsx --env-file=.env.local scripts/deck-commentary-eval.ts --live` and read the drop and empty-section report. Tune the prompt if headlines fall back often.
2. Open `/tools/deck/tray` with a mixed tray: write commentary, rewrite one slide, clear it, ship a PowerPoint and a PDF, and check the strip under the panels. Clear the tray in localStorage afterwards.
3. Move QBR Prep's talking points onto the sign- and unit-aware check in `evidence.ts`.
4. Phase 3 (left out of scope here):
   - Claude suggests the storyline order.
   - Speaker notes. Claude's bullets would suit them, especially for two-column slides.
   - A server-side tray, so the summary and commentary aren't browser-only and the cap can be per user.
   - Role checks on who can spend Claude calls.
