# Scenario Modeler: design brief (step 2.19)

## Who and why

`/forecast`, under Tools. One question: **if the market grows like this and Avnet's share moves like that, where do Avnet's billings land, and is that believable?**

- **Strategy and corporate development** test market views against Avnet's plan: what a weaker or stronger market does to billings, and how much share it takes to make up the difference.
- **Sales leaders and regional VPs** set targets. They want the reverse question too: what share gain does a billings goal need, and in which segments.
- **Product and supplier business managers** want their segment's line: its market, its growth assumption, Avnet's share and what moving it is worth.
- **Executives** want the answer in a sentence and how much of it rests on the market rather than on Avnet.

Today the page is the oldest mock page left: the older components (`PageHeader`, `Card`, `KpiCard`, the legacy banner), a WSTS fan chart with Bull, Base and Bear buttons, a vintage revision chart and a three-row scenario table. It colours Bull green and Bear red (green is Avnet's only), uses a middle dot, an en-dash in the CAGR label and an em-dash in a card title, and models only the world market, never Avnet. Nothing can be changed except the scenario button, and its note says sensitivity "wires in a later phase".

PRD persona 3 tools and phase 4. Build plan step 3.4 makes the maths "real" over market data; this pass designs the page so 3.4 has a layout to fill.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Where does Avnet land? | Lead in words: billings at the horizon under the scenario against holding share, with a Mock chip and the hookup marker under it | The model below | **Mock** |
| How big, and how fast? | Four KPIs: billings at the horizon, growth a year (CAGR), share of the mapped market at the horizon, and the gap to the base case | The model | **Mock** |
| What am I assuming? | Inputs: horizon (FY28 by default, one to four years), a market view (WSTS base, upside, downside), and a share change in points per segment, with presets (hold share, gain half a point everywhere) | `SEGMENT_BILLINGS` (shared model), the WSTS forecast spread | **Mock**; inputs work |
| How much is market and how much is Avnet? | A bridge: billings today, plus market growth, plus share change, equals the scenario | The model | **Mock** |
| Which segments carry it? | Segment table: market today, growth assumed, Avnet share now and at the horizon, billings at the horizon, change | `SEGMENT_BILLINGS`, `SHARE_BY_SEGMENT` | **Mock** |
| What does a goal take? | Goal seek: enter a billings target and get the share gain it needs, spread in proportion to each segment's market | The model | **Mock** |
| Is it believable? | Reality check: the scenario's growth a year against Avnet's and Arrow's reported revenue growth and the supply chain's, from SEC filings, and the WSTS forecast and how it has been revised | `getCycle()` (SEC); `getForecast()` (WSTS) | **Live** (SEC) and **Mock** (WSTS), each column marked |
| Can I keep or share it? | Save, compare and send to Pitch Deck Builder, shown once as Planned | n/a | **Planned** (needs the database, step 4.1) |

The inputs work now: the maths is plain arithmetic over the shared mock model, so nothing is faked by letting them move. Step 3.4 replaces the mock market sizes and growth with WSTS, Gartner and the IP&E forecast, and adds saving. Where the reality check sets a live figure beside a mock one, each column carries its own DataChip.

## The model

In a pure module, `src/lib/scenario/model.ts`, with a tsx test:

- **Projection.** For each segment: market at the horizon = market today × (1 + growth) ^ years; share at the horizon = share today + the share change; billings = market × share. The total is the sum of segments, so it adds back to the shared model's mapped billings at year zero.
- **Market views.** Base uses each segment's forecast growth (see the decision below). Upside and downside widen it by the WSTS forecast spread for the horizon (the same spread the current fan chart uses), applied to every segment.
- **Bridge.** Market effect = billings at today's share on the horizon market, minus billings today; share effect = the rest. They add up to the change exactly.
- **Goal seek.** The share gain in points, the same in every segment, that reaches a billings target; "n/a" when it would need a negative share or more than the whole market.
- **Lead.** "Under the base market and a half-point share gain, Avnet's mapped billings reach $X by FY28, $Y more than holding share. The market adds $A and share adds $B." With "n/a" for anything missing.
- **Content.** Every segment matches the shared model; no visible text has a slash, a middle dot or an em-dash.

## Links into the rest of the app

- Each segment links to its row on Market Share, and the market sizes to TAM, SAM and SOM.
- The reality check links to Market Cycle (supply-chain growth) and Avnet vs Arrow.
- The hookup marker names WSTS, the Gartner forecast, the IP&E forecast, billings and the code map, and links to Data Hookups.
- Pitch Deck Builder, as the Planned "send to deck".

## Layout rules

- Lead with the answer in words; Mock chip and marker directly under it.
- Avnet's billings are Avnet's own: the scenario in Avnet Green, the base case in Dark Green or dashed. The market, when charted, is Dark Blue or grey, never green; if Avnet and the market share a chart, both are indexed to 100.
- No Bull and Bear colours. Market views are words (Base, Upside, Downside) in neutral chips; deltas use arrows, green or red only for Avnet's billings against the base, where up is clearly good.
- Bridge and segment bars are trackless with direct end labels pushed apart when they collide.
- Inputs are real controls with labels: number inputs or sliders with their value shown, one Reset. No primary button: nothing needs submitting.
- Save, compare and send to deck appear once as a Planned chip, not as buttons.
- No em-dashes or en-dashes ("FY26 to FY28", "a year"); "n/a" for missing values; no slashes.

## Taste review

Reading this as: an internal what-if tool for Avnet strategy, sales leaders and product managers, on mock Avnet figures with a live reality check, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2 (results update in place; nothing animates on its own), density 7. Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A fan chart with no answer.** The page today. Answer: the lead says where Avnet lands and why; the chart supports it.
- **Bull green, bear red.** Answer: market views are words; green is only Avnet's billings.
- **False precision.** Mock inputs produce exact-looking dollars. Answer: billings rounded to $0.1B, a Mock chip on every result, and the method in one caption.
- **A control panel with no story.** Answer: presets first, per-segment edits second, and the bridge saying how much is market and how much is Avnet.
- **Fake save and export buttons.** Answer: one Planned chip naming step 4.1.
- **Unbelievable scenarios.** Answer: the reality check against what Avnet, Arrow and the supply chain actually reported.

## Mockups

- `scenario-modeler-a-assumptions-rail.png`: inputs in a left rail (horizon, market view, share presets, a stepper per segment, goal seek, Reset, the Planned line) beside the results: the lead with its Mock chip and marker, four KPIs, "Billings to the horizon" (scenario green, hold share dashed dark green, end labels), the bridge, and a segment table.
- `scenario-modeler-b-segment-model.png`: the lead and marker, four KPIs, one control bar (horizon, market view, share change for every segment, Reset), then "The model, by segment": all ten segments with growth and share change editable in the row and a total, then the bridge beside "Is it believable?", the Planned line and the method caption.

The figures in the prompts came from the shared model, but the reality-check values (Avnet +8.2%, Arrow +5.1%, supply chain +18.0%, WSTS +26.3%) were placeholders; the build reads them live from SEC filings and the WSTS mock. Drift to correct in the build:

- **A person's name.** B's top bar shows "J. Vance (Global Sales)". Users are roles, never names; the shell comes from the app.
- **Invented figures and sources.** A adds "+3.2% vs consensus", "Source: Internal projection model", "As of Oct 2026 baseline" and "Net movement +$6.5B (+31.0%)"; B adds "STATUS: LIVE FEED (Q3 DATA)" and "Incremental delta". A shows "Live as of Oct 20, 2026" and "Viewing as: Sales leader".
- **B's rows don't add up.** Its segment rows are a half-point gain (they sum to $29.8B) while the total says $27.5B. The build computes rows and total from one model, and the test checks they agree.
- **Tracks and colours.** Both draw bars on grey tracks (forbidden); A colours the market bar light blue and B paints Avnet's reported revenue grey. Avnet's bars are green, Arrow's Dark Blue, the rest grey, all trackless. B's change column turns negative values red, which is fine only because up is clearly good for Avnet's billings.
- **A** numbers and truncates the segment names in its narrow rail ("2. Microcontroll...", "3. Logic and F..."), wraps "+0.25 pts" onto two lines in its steppers, puts an info icon in the mock marker and the Mock chip on its own line under the lead, and its segment table runs past the screenshot.
- **B** fills the selected segments in solid black (the kit uses the sunken fill and a bold label), puts the Mock chip before the lead, and shows a total growth column that mixes a rate with a share.
- Neither added Save or Export buttons or Bull and Bear colours.

## Decision

Built variant B with A's billings chart and A's goal seek (chosen 2026-10-21), with the inputs working now on mock data. The maths is in `src/lib/scenario/model.ts`, with tests in `model.test.ts`.

**Base growth is the forecast.** The base case uses forecast market growth for each segment and each year ahead, standing in for WSTS and Gartner (semiconductor segments) and the IP&E forecast (connectors, passives, electromechanical). It lives in the shared model as `SEGMENT_FORECAST`, with the upside and downside band as `FORECAST_SPREAD` (5%, 9%, 13% and 17% for one to four years), in `src/lib/shells/mock-market.ts`. Both are mock and marked so. When the forecasts are hooked up (build plan 5.5), they replace those two exports and nothing on the page changes. Last year's market growth (Memory at +35%) is no longer used to project forward.

- **The lead** in words with a Mock chip and the hookup marker (billings, WSTS, the Gartner forecast, the IP&E forecast, the code map) under it: "With the base market and a quarter-point share gain, Avnet's mapped billings reach $26.5B in two years, $2.1B more than holding share. The market adds $3.4B and share adds $2.1B." It follows every input, including "growth edited in some segments" and "share changed by segment".
- **Four KPI tiles**: billings at the horizon, growth a year, share of the mapped market, and the gap to holding share.
- **One control bar**: horizon (one to four years), market view (Base, Upside, Downside), share change for every segment (Hold, +0.25 pts, +0.5 pts), and goal seek from A: a billings target in $B gives the same share gain in every segment that reaches it, with "Use it" to apply it, or "out of reach". One Reset.
- **The model, by segment**: all ten segments with growth a year and share change editable in the row (an edited growth is marked; clearing it goes back to the forecast), share and billings at the horizon, and the change with a trackless Avnet Green bar. The total row reads "+0.25 each" (or "Varies") for share change, because the mapped market's share moves less than each segment's when faster markets carry lower shares.
- **Billings to the horizon** from A, by fiscal quarter: the scenario in Avnet Green and holding share in Dark Green dashed, labelled at their ends and pushed apart when close; then **Where the change comes from** as a floating bridge (today, market, share, scenario; the market part in grey); then **Is it believable?**: the scenario's growth a year (Mock) against Avnet's and Arrow's reported revenue growth and the supply chain's combined growth for the latest calendar quarter (Live, SEC filings), and the WSTS forecast for next year (Mock), each row with its own chip. It loads after the page and says so if SEC data fails.
- Save, compare and send to Pitch Deck Builder appear once as Planned (step 4.1), then one method caption linking to Market Share and TAM, SAM and SOM.

The page leaves the legacy banner: the old fan chart, the vintage revisions chart and their components (`fan-chart.tsx`, `vintage-bars.tsx`) are removed, as is the legacy `/forecast` entry. Data Hookups' usage register now lists the page's own marker. The revision history of the WSTS forecast is not shown; the reality check keeps the forecast for next year.

Corrections from the mockups: no person's name or invented status in the chrome, no consensus figure or invented source, rows and total from one model (the test checks they add up and that today's billings equal the shared model's mapped billings), trackless bars, Avnet green for Avnet only, untruncated segment names, and the Mock chip after the lead.

Checks: tests and typecheck pass. Audit: every input has a label or `aria-label`, a name and autocomplete off; the goal seek's placeholder ends in an ellipsis and its result is a polite live region, as is the lead; the presets and switches are pressed buttons in labelled groups; the table scrolls in a focusable region. Every control was tried in the browser (horizon, view, presets, a growth edit, goal seek and Use it, Reset). Keyboard: Tab reaches every control with the 2px green focus ring and Enter selects. Contrast: nothing below 4.5:1 outside the shared hookup marker, whose 6% yellow tint the check misreads as solid. At 1280px the segment table fits without scrolling after narrowing the inputs and moving "pts" beside them. Baseline screenshots in `docs/design/baseline/forecast-1440.png` and `forecast-1280.png`, status 200, no console errors, no overflow.
