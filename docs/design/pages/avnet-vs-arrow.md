# Avnet vs Arrow: design brief (step 2.10)

## Who and why

`/competitive`, under Network. Avnet against its closest competitor, Arrow Electronics, from both companies' SEC filings, lined up on calendar quarters (Avnet's fiscal year ends in June, Arrow's in December).

- **Leaders and strategy** want the scoreboard after each earnings round: who grew faster, who made more on each dollar, who carries more inventory, and whether the gap is opening or closing.
- **Sellers and supplier managers** want what to say when a customer or supplier brings up Arrow: where Avnet is stronger, where Arrow is, what Arrow's management just said about demand, pricing and lead times, and which suppliers Arrow has signed or lost.

Today the page opens with a 13-row table where a small dot marks the stronger figure, then four equal charts, a segments table, three more charts and a regions table, ending in a paragraph of caveats. There is no verdict, and nothing on what either management said or on franchise moves, though the app has both.

Avnet's own Company Profile links here, as do Market Share and Market Cycle. Arrow's Company Profile and QBR Prep (for a supplier review where Arrow is the rival) are the natural next steps.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Who is ahead this quarter? | The verdict: one sentence on growth and profitability, then "Avnet leads on" and "Arrow leads on" lists of measures | `getCompanyEarnings("avnet")`, `("arrow")` | Live (a rule over the scorecard) |
| By how much, on each measure? | Scorecard: Avnet, Arrow, the gap, who leads, and the gap's change on a year ago | Same | Live |
| Is the gap opening or closing? | Trends: revenue growth, gross margin, operating margin, inventory days, 8 quarters, Avnet and Arrow lines | Same | Live |
| Like for like? | Components against components: Avnet Electronic Components against Arrow Global Components (revenue, growth, margins), and Avnet's share of the two combined | `getSegmentHistory()` | Live |
| Where do they sell? | Regional mix: Americas, EMEA, Asia, revenue, share and growth for each | `getSegmentHistory()` regions | Live |
| What did each management say? | Commentary side by side: headline, then demand, inventory, lead times, pricing and the channel, from each company's latest earnings release | `getCommentary()` (Claude) | Live; off without an API key |
| Who signed whom? | Franchise moves in the last 12 months, Avnet's and Arrow's, with agreements ended | `getMoves()` | Live (news headlines) |
| When do they report next? | Next earnings date for each, marked estimated | `getNextRelease()` | Live (estimated) |

There is no Avnet-internal figure on this page, so nothing is mock. The things sellers would most like (win and loss against Arrow in accounts, share by supplier, pricing) are not in filings; the caption says so once.

## Links into the rest of the app

- Company names link to their Company Profiles; Arrow's profile offers "Add to QBR brief".
- Franchise moves link to Line Cards.
- Each commentary column links to the earnings release it was read from.
- Market Share and Market Cycle link here; this page links back to Market Share for share against the market.

## Layout rules

- Avnet Green for Avnet and Dark Blue for Arrow, everywhere, including legends and markers. No other colours in the comparison charts.
- Who leads is a word ("Avnet", "Arrow", "Even"), never a dot or a colour alone. Rows where neither direction is better (revenue, debt, receivable and payable days) say "n/a" and why, in a tooltip.
- Lines labelled at their end; no legend boxes. Charts on the shared `CHART` tokens.
- The verdict is a rule over the scorecard (which company leads on more of the measures where a direction is better); the caption names the rule.
- Commentary is labelled as written by Claude from each press release, with a link to the release. No tone scores.
- The method note is one caption; the Arrow receivables caveat moves to a tooltip on the rows it affects.
- No primary button. "Open Arrow's profile" is a secondary action.

## Taste review

Reading this as: a two-company comparison page for Avnet leaders, sellers and supplier managers that has to say who is ahead and why, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only.

Risks found and how the brief answers them:

- **The "vs" boxing poster.** Two big facing hero cards with logos and a giant VS is the obvious template and says nothing. Answer: a one-line verdict in words, then the evidence.
- **Green as "winner".** Colouring the leading figure green would mean "good" and "Avnet" at once. Answer: green only ever marks Avnet; who leads is a word.
- **Chart grid confetti.** Seven equal charts in a grid at the same weight. Answer: four trends as a compact set, sharing a quarter axis, with the latest values in the labels; components as one section.
- **Hidden caveats.** The Arrow receivables caveat buried at the end of a paragraph. Answer: on the rows it affects, as a tooltip and an "n/a" in the lead column.
- **Mirrored tables that can't be read across.** A butterfly table forces the eye left and right. Answer: one row per measure, Avnet and Arrow in adjacent columns.
- **Claude text as the loudest thing.** Two long commentary columns can swamp the numbers. Answer: the headline plus four short topics each, folded beyond that.

## Mockups

- `avnet-vs-arrow-a-scoreboard.png`: the verdict, a scorecard (Avnet, Arrow, gap, who leads, gap a year ago) beside "Who leads" lists, four trend charts in a row, then components against components, regional mix, what each management said, and franchise moves.
- `avnet-vs-arrow-b-talking-points.png`: the verdict, then "Where Avnet is stronger" and "Where Arrow is stronger", three measures each with both figures, a sentence to use with a customer and a small trend; then both managements' commentary side by side, franchise moves beside components, and the full scorecard folded.

Stitch made up every figure, commentary line and agreement in both. Drift to correct in the build: A colours the latest values in the trend charts green and blue (values stay in ink) and adds legend keys; B lists receivable days as an Avnet strength (the brief marks it not comparable because of Arrow's gross reporting), puts commentary in quotation marks as if quoted, and adds labels ("CY26 Q2 deltas", "transcript synthesis"). Both invent a sidebar, a top bar and a version label.

B's sentences ("Avnet is growing about twice as fast as Arrow") would be written by a rule from the figures, not by Claude, so they stay exact.

## Decision

Built from both variants (chosen 2026-10-21): A's scorecard at full width with no "Who leads" card, then the rest of B. The rules live in `src/lib/competitive/compare.ts`, with tests in `compare.test.ts`.

- **The verdict** leads in words, built by a rule from who leads on revenue growth and on operating margin ("Avnet grew faster in CY26 Q2, Arrow kept the higher margins."). Under it, each company's fiscal quarter and end date, and the next results dates (estimated).
- **Scorecard** (full width): all 13 measures with Avnet, Arrow, the gap, who leads and the gap a year ago. The subtitle counts the measures each side leads on. The leading figure is bold, never coloured. Revenue and debt lead nowhere. Receivable days, payable days and the cash cycle show both figures but no gap or leader, with the reason (Arrow reports some sales net while carrying receivables and payables gross) behind an info icon.
- **Where Avnet is stronger / Where Arrow is stronger** (two columns): every measure each side leads, biggest relative edge first. Each has both figures, an eight-quarter two-line spark and one sentence written by a rule from the figures ("Arrow carries 13 days less inventory than Avnet, measured against cost of sales. The gap has narrowed from 31 days a year ago."). No sentence is written by Claude, so each is exact.
- **What Arrow's management said last quarter**, with Avnet's beside it: each company's headline, then demand, inventory, lead times and pricing from its latest earnings release, labelled as written by Claude, with a link to the release. Topics the release doesn't cover say so.
- **Franchise moves, last 12 months** (5 columns): Avnet's (including Farnell, Silica and EBV) and Arrow's agreements from news headlines, with a marker for each side and an "Ended" chip, linked to Line Cards.
- **Components against components** (7 columns): Avnet Electronic Components against Arrow Global Components, revenue and segment operating margin as two lines each, labelled at the end.
- **Trends and regional mix**, folded: the four whole-company trends and the regional table. The scorecard is now at the top, so it is not repeated in the fold.
- Each section streams on its own, so the scorecard shows before the commentary and segment reads finish. The charts are new (`charts.tsx`, `pair-spark.tsx`) on the shared `CHART` tokens; this page no longer uses the shared `GroupLines`.

Corrections from the mockups: receivable days are not shown as an Avnet strength, commentary is not set in quotation marks, the trend charts' values are ink rather than series colour, and there are no legend keys, version labels or invented navigation.

Checks: tests and typecheck pass. Audit: the commentary labels became headings; the info icons carry their reason as screen-reader text. Contrast uses the same tokens as the other passes (text 4.58:1 or better). Baseline screenshots in `docs/design/baseline/competitive-1440.png` and `competitive-1280.png`, status 200, no console errors, no overflow.
