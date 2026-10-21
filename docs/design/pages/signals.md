# Economic Signals: design brief (step 2.15)

## Who and why

`/signals`, under Knowledge. One question: **is the economy around electronics helping or hurting demand, what is it doing to costs, and what changed this month?**

- **Sellers and FAEs** want one line for a customer conversation: "US chip production is up 20% on a year ago, but copper is up 45%, so expect pressure on connector and cable prices."
- **Sales leaders** want the backdrop for a forecast or a QBR: is industrial activity growing, are rates making customers delay projects, is the dollar helping or hurting overseas sales?
- **Product and supplier managers** want input costs (producer prices and metals) and the currencies of the main supplier countries.

Today the page is live but has no lead: six KPI tiles, two charts and five tables, built on the older components (shadowed cards, `text-muted`, em-dashes for missing values). The production chart draws "All industry" in dark green, which DESIGN.md keeps for Avnet's own second series, and its legend text is in the series colours.

PRD module 6 (knowledge). Supply Chain already reads utilisation, semiconductor producer prices and chain inventory as a supply read; this page is the wider economy, so it reads demand, costs, financing and currency, and links to Supply Chain for supply.

## Questions and data

Everything on the page is live. Avnet's own billings appear in one place only, if at all (see variant B), with a Mock chip.

| Question | Section | Data | Status |
|---|---|---|---|
| Is the economy around electronics growing? | The read: demand, from US production of semiconductors, of computer and electronic products, and of all industry, each on a year ago | `getSignals()` Federal Reserve G.17 | Live |
| Are input costs rising? | The read: costs, from producer prices for semiconductors, connectors and circuit boards, and copper, tin, nickel and aluminium | BLS PPI, IMF primary commodity prices | Live |
| Is money getting dearer? | The read: financing, from the 10-year Treasury yield and the federal funds rate, change on a year ago in points | US Treasury, New York Fed | Live |
| Is the dollar stronger? | The read: currency, from the euro, yen, yuan and won against the dollar | ECB reference rates | Live |
| How are production and capacity trending? | US production rebased to 100, and capacity utilisation for semiconductors and components | G.17 | Live |
| What does each indicator say in detail? | The indicator tables by group: latest, one month, one year, trend, as of, source | All five sources | Live |
| Does Avnet move with it? (B only) | Avnet billings beside semiconductor production, both indexed to 100 | `BILLINGS_BY_QUARTER` (mock), G.17 | **Mock** and Live, marked |

## The read (rule)

In a pure module, `src/lib/signals/read.ts`, with a tsx test. Four reads, each from live series on a year ago:

- **Demand.** Each production series up more than 2% is growing, down more than 2% shrinking, otherwise flat. Two or more growing with none shrinking reads "Growing"; the reverse "Shrinking"; anything else "Mixed".
- **Costs.** The three producer price series and four metals, each up more than 2% rising, down more than 2% falling. More than half rising reads "Rising"; more than half falling "Falling"; otherwise "Mixed". The lead names the largest mover.
- **Financing.** The 10-year yield's change on a year ago: up more than 0.25 points "Tighter", down more than 0.25 "Easier", otherwise "Steady".
- **Dollar.** The mean change of the four currencies per dollar: above +2% "Stronger", below −2% "Weaker", otherwise "Steady".

The lead is one sentence built from the reads, e.g. "US electronics production is growing, up 20% on a year ago, while input costs are rising, led by tin (+56%), and borrowing is dearer, with the 10-year yield up 1.1 points." Each read is a word with an arrow in neutral ink: a strong dollar or dearer money is not bad for everyone.

## Links into the rest of the app

- Supply Chain for the supply read (utilisation, chip prices, inventory); this page links there rather than repeating it.
- Market Cycle for customer and supplier revenue growth by group.
- Customers & End Markets for which markets the backdrop affects.
- Market News for the stories behind a move (rates, tariffs, metals).

## Layout rules

- Lead with the answer in words, then four read tiles, then the charts, then the detail tables.
- Charts on the shared `CHART` tokens with direct end labels pushed apart when they collide. No series is green (none is Avnet), except Avnet's own billings in B, with a Mock chip.
- Market series use Dark Blue, Orange and Light Blue; a single series is Dark Blue.
- Changes signed with arrows. Green or red only where the direction is clearly good or bad for the supply chain (production up, input costs up), as the page does today; rates and currency in neutral ink.
- No em-dashes: missing values read "n/a". Source and date as a caption, not "as of · source" with a middle dot in every row.
- One caption for the method. No primary button.

## Taste review

Reading this as: a live macro briefing for Avnet sellers, FAEs, sales leaders and product managers, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A wall of tiles and tables with no answer.** The page today. Answer: the lead in words and four reads before any number.
- **A red-amber-green "economy health" gauge.** It would say rising rates or a strong dollar are bad for everyone. Answer: words with arrows in ink, and the series behind each read.
- **Twenty sparklines in a column.** Answer: keep them, one colour, in the detail tables, but grouped and below the reads; no sparkline in the read tiles.
- **Green for a market series.** Answer: no green unless the series is Avnet's.
- **Duplicating Supply Chain.** Answer: utilisation and chip prices appear as evidence here, but the supply read lives on Supply Chain and is linked.

## Later: a proprietary index

To revisit (noted 2026-10-21): develop a proprietary index of leading and lagging indicators that support the semiconductor market, building on earlier work, the "Semiconductor Economic Coincident Index". Notes to follow. The four reads in this pass are simple rules and are not that index.

## Mockups

- `signals-a-readout.png`: the lead with a Live chip, four read tiles (demand, costs, financing, dollar), each a verdict word with an arrow and the series behind it; US production beside capacity utilisation (with a link to the supply read on Supply Chain); the indicator tables in one card with a tab per group; a row of links to related pages; one source caption.
- `signals-b-four-questions.png`: the same lead, then one full-width card per question ("Is demand growing?", "Are costs rising?", and so on), each split 5 to 7: the verdict, its figures and a "what to say" line on the left, a chart or table on the right. Demand adds Avnet billings (mock) against semiconductor production, indexed. Stitch's image stops after the second question; the other two are in its HTML.

Stitch made up the shape of every chart and several figures in both (A's utilisation ends at 79.4% against 76.5% live; the one-month metal changes are invented). Drift to correct in the build:

- **A** draws card titles in all caps, adds a red "4 alert" badge on the metals tab, a "78% historical average" line, and names London Metal Exchange cash prices as the metals source (the app reads IMF monthly averages). Line labels are in the series colours. The financing tile's source line is clipped.
- **B** numbers its sections "Question 01", "Question 02" (section-number eyebrows the taste review rules out), gives the cost bars background tracks, nests a "Takeaway brief" box inside its card, and adds "Macro briefing CY26 Q4" and "proprietary indices", which the app doesn't have.
- Both add "Refine filters" and "Export dataset" buttons, a version badge, and their own sidebars.

## Decision

Built variant A (chosen 2026-10-21). The rules live in `src/lib/signals/read.ts`, with tests in `read.test.ts`. Revisit later for the proprietary index (see "Later" above).

- **The lead** in words from the four reads, with a Live chip: "US chip production is growing, up 20% on a year ago, while input costs are rising, led by tin (+56%), and borrowing is dearer, with the 10-year yield up 1.1 points." The dollar joins the sentence only when it is stronger or weaker.
- **Four read tiles**: demand, costs (the four largest movers), financing (the 10-year yield and fed funds, with their levels) and the dollar, each a verdict word with an arrow in ink, the series behind it and its source. Changes keep the page's existing colour rule: production up is green, metals up are red, producer prices, rates and currencies stay ink.
- **US production** (rebased to 100, Dark Blue, Orange and Light Blue) beside **capacity utilization** (Dark Blue), on the shared `CHART` tokens with end labels pushed apart when they collide and round axis steps. No green: nothing here is Avnet. Utilization links to the supply read on Supply Chain.
- **All indicators** in one card with a switch per group (industry activity, producer prices, input metals, interest rates, currency): latest, one month, one year, a Dark Blue sparkline, as of and source in their own columns.
- A row of related links and one method caption naming the rules and sources.

Changes from the mockup: no red "alert" badge on the metals tab, no "historical average" line, and the metals source is the IMF's monthly averages, not London Metal Exchange cash prices. Middle dots and em-dashes are gone from the page and from the series details in `src/lib/data/live/signals.ts` (its cache key moved to `signals-v2` so the new details load). Tile labels are shortened ("Chip production", "10-year", "Fed funds") so nothing truncates at 1280px.

Checks: tests and typecheck pass. Audit: the group switch is a set of pressed buttons, the table's scroll area is a focusable region, sparklines are hidden from screen readers with their values in text, and loading states end in an ellipsis. The selected group isn't kept in the URL, as on the other pages with switches. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/signals-1440.png` and `signals-1280.png`, status 200, no console errors, no overflow.
