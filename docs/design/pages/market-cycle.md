# Market Cycle: design brief (step 2.9)

## Who and why

`/cycle`, under Knowledge. It answers one question, "where are we in the semiconductor cycle?", from the SEC filings of 77 companies: suppliers, distributors, contract manufacturers and the customers who buy from them.

- **Leaders and strategy** want the call and the evidence behind it, for a quarterly review or a board slide: expanding or contracting, speeding up or slowing down, and how sure we are.
- **Supplier managers** want to know where inventory is piling up (manufacturers, distributors, contract manufacturers), because that decides allocation, pricing and lead times next.
- **Sellers** want one sentence to frame a customer or supplier conversation, and the demand read for the customer's end market (hyperscalers, devices, automotive, industrial).

Today the page leads with six equal tiles, then two charts, ten small multiples, a nine-column scorecard and a capex table, all at the same weight. The call itself is a small heading. Avnet does not appear at all, though Avnet is one of the distributors in the roll-up.

QBR Prep already quotes the cycle's phase in its brief. Start Here, Market Share, TAM and Avnet vs Arrow link here.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Where are we in the cycle? | The call: phase ("Expansion, slowing"), the quarter, and one sentence of evidence | `getCycle().phase`, `supply` | Live (a rule, labelled as one) |
| How did we get here? | Supply-chain revenue growth by quarter, last 8 quarters, each quarter marked with its phase | `supply[].growth` | Live |
| How broad is it? | Share of supply-chain companies growing; median company against the combined figure | `supply[].growing`, `medianGrowth` | Live |
| Where is inventory building? | Median inventory days for manufacturers, distributors and contract manufacturers, by quarter | `groups[].inventoryDays` | Live |
| Is end demand there? | Customer groups' growth, and combined hyperscaler capex by quarter with each hyperscaler's latest | `groups` (demand cohorts), `hyperscalerCapex`, `hyperscalers` | Live |
| Where does Avnet sit? | Avnet and Arrow inside the Distributors stage of the chain: revenue growth, inventory days, margin | `getCompanyEarnings("avnet")`, `("arrow")`, distributor group | Live (SEC filings) |
| What does Avnet's order book say? | Avnet book-to-bill and backlog by quarter, the leading signal the filings can't give | `PERFORMANCE` in `src/lib/shells/mock-avnet.ts` | **Mock**, hookup marker for bookings and backlog |
| Which groups lead and lag? | Scorecard of all 13 groups: growth with an 8-quarter spark, prior quarter, share growing, operating margin and inventory days with their change | `groups` | Live |

Everything except Avnet's order book is derived from SEC filings already used by Quarterly Earnings, with each fiscal quarter placed in the calendar quarter it mostly covers. The page is anchored on the latest quarter about two-thirds of supply-chain companies have reported; a group's figure is blank below that coverage.

## Links into the rest of the app

- Group names link to Quarterly Earnings filtered to that group; Arrow and hyperscaler names link to their Company Profiles.
- "Where Avnet sits" links to Performance Tracker (Avnet's own billings) and Avnet vs Arrow.
- QBR Prep keeps quoting the phase; the phrase it uses must match the call on this page.

## Layout rules

- Lead with the call, in words, with the quarter and coverage beside it. One highlight bar at most; this is a mid-density page, so a plain lead line is preferred.
- Four KPIs, not six: supply-chain growth, companies growing, distributor inventory days, hyperscaler capex.
- None of the market series are Avnet, so none are green. Avnet appears in green only in "Where Avnet sits", with Arrow in Dark Blue and the distributor median in grey.
- Group lines use the validated order (Dark Blue, Orange, Light Blue) with direct labels at the line end. Charts move to the shared `CHART` tokens: solid horizontal gridlines, 2px tooltip corners, no hard-coded hex (DESIGN.md fix 6).
- Growth bars are one colour with a zero line; negative quarters read by position and sign, not by a second colour.
- Inventory up is bad and growth up is good: changes are signed with arrows, coloured positive or negative, never colour alone.
- The phase is a rule, so the page says so once, in the method note, and names the rule.
- The scorecard replaces the ten small multiples (the spark moves into a column). Supply chain and customers are two labelled row groups.
- One caption for the method. No primary button.

## Taste review

Reading this as: an analysis page for Avnet leaders, supplier managers and sellers that has to state one judgement and show its evidence, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only.

Risks found and how the brief answers them:

- **Equal-weight tile wall.** Six identical KPI tiles above everything is the current page and the template default. Answer: the call leads in words; four KPIs follow as evidence.
- **The "cycle clock" cliché.** A circular four-quadrant dial with a needle is the obvious visual and hides the numbers. Answer: growth by quarter as plain bars with each quarter's phase written under it.
- **Small-multiple confetti.** Ten tiny charts with no axes read as decoration. Answer: one spark per row inside the scorecard, next to the number it explains.
- **Colour for good and bad on bars.** Red and blue bar fills behind table cells (the current scorecard) mix status colour into data. Answer: one neutral bar colour, signed changes in positive or negative text.
- **Green creeping onto market data.** The current page links hover to green and the old charts used Dark Green as a series. Answer: green only for Avnet in its own section.
- **Dashed gridlines, 6px tooltips, legend-only lines.** Answer: the `CHART` tokens and direct labels.
- **A mock number blending into a live page.** Avnet's book-to-bill is the only mock figure. Answer: its own block with the dashed marker, never inside a KPI tile.
- **The wall of method text.** Answer: one caption, and the scorecard's column notes move into header tooltips.

## Mockups

- `market-cycle-a-readout.png`: the call as a lead sentence, four KPIs, "How we got here" (growth bars with each quarter's phase) beside "Where Avnet sits" (Avnet, Arrow and the distributor median, then the mock order book), inventory lines and end demand side by side, then the full group scorecard with sparks.
- `market-cycle-b-chain.png`: the call, then the supply chain as five stages in one card, from customers back to equipment, each with growth, inventory days, margin and an 8-quarter spark, with Avnet and Arrow inside the distributor stage. Below: growth bars beside the mock order book, and the scorecard folded.

Stitch made up every figure in both. Drift to correct in the build: A adds a "Last model sync" date, an "Export CSV" button and tracks under the end-demand bars, colours one bar red and uses invented group names. B boxes the lead line, fills Avnet's row green, tints one spark bar red and adds mono-font labels ("[upstream]", "Internal feed", a sprint number). Both invent a top bar and sidebar.

B needs a mapping the data doesn't have yet: the app has 13 groups, and B's five stages would fold manufacturers, large players, AI and connectivity, memory and interconnect into one "Manufacturers" stage, and equipment and design software into one more. A shows the groups as they are.

## Decision

Built variant A with the supply chain from variant B added as its own section (chosen 2026-10-21: "Go with A but add a section where we can see the chain").

- **The call** leads in words: the phase in bold, then supply-chain growth this quarter against last quarter, with coverage and the median company underneath. The phase rule is named once, in the caption.
- **Four KPIs**: supply-chain revenue growth (change in points on the prior quarter), companies growing, distributor inventory days (change on a year ago, down is good) and combined hyperscaler capex.
- **The chain, from customers back to equipment** (full width): five stages, each with combined revenue growth and its change, median inventory days and their change, median operating margin, and eight quarters of growth as a spark. Avnet (green marker) and Arrow (Dark Blue marker) sit inside the Distributors stage from their own filings, linked to their profiles. The stages are defined in `STAGES` in `src/lib/data/live/cycle.ts`: Customers (hyperscalers, devices, automotive, industrial), Contract manufacturers, Distributors, Manufacturers (manufacturers, large players, AI and connectivity, memory, interconnect and passives) and Equipment & design (equipment and packaging, design software). A stage is its companies taken together, not an average of its groups. A test checks every group sits in exactly one stage.
- **How we got here** (8 columns): supply-chain growth by quarter as one-colour bars with values on top and each quarter's direction ("Accelerating", "Slowing") under its label; the full phase is in the tooltip.
- **Avnet's order book** (4 columns): book-to-bill against parity and backlog with its change, from the shared mock model behind the hookup marker for bookings and backlog. Because the chain now shows Avnet against Arrow, this panel no longer repeats that comparison; it links to Performance Tracker and Avnet vs Arrow.
- **Inventory in the chain** and **End demand** side by side: inventory lines for manufacturers, distributors and contract manufacturers labelled at the line end (labels pushed apart when they would collide); customer groups ranked by growth with grey trackless bars, then combined hyperscaler capex by quarter and each hyperscaler's latest change.
- **Group scorecard**: all 13 groups in two row bands (Supply chain, Customers), with growth, an eight-quarter spark, prior quarter, share growing, operating margin and inventory days with their changes on a year ago. It replaces the ten small multiples.
- The new charts are in `src/components/cycle/charts.tsx` on the shared `CHART` tokens (DESIGN.md fix 6 for this page); the spark is plain SVG in `spark.tsx`. `GroupLines` in `src/components/charts/cycle-charts.tsx` is shared with other pages and is left for their passes; the two charts only this page used (`QuarterBars`, `GrowthSpark`) are removed.

Corrections from the mockups: no export button or sync date, no red bars, Avnet's row marked with a square rather than a green fill, no boxed lead line. Changes that round to zero ("0d", "0.0 pts") show as flat, not with an arrow.

Checks: tests in `src/lib/data/live/cycle.test.ts` (phase rule, stage coverage) and typecheck pass. Audit: the only finding was a balanced wrap on the lead sentence. The page has links only, all reachable by Tab with the focus ring. Text contrast is 4.58:1 or better; the book-to-bill line is Avnet Green at 2.28:1, which DESIGN.md allows with its direct label. Baseline screenshots in `docs/design/baseline/cycle-1440.png` and `cycle-1280.png`, status 200 and no console errors. The baseline script reports 15 overflowing elements: they are SVG chart labels, which report half their width when centred, not real overflow.
