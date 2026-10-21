# Line Cards: design brief (step 2.7)

## Who and why

Supplier business managers and product managers watching the franchise landscape: which suppliers competitors are signing, which suppliers are growing fast, and which of those Avnet does not carry. Strategy uses it to spot line-card gaps before a supplier review. Today this is pieced together from press releases and distributor websites.

The page sits under Network. Company Profiles link here for "who carries this supplier", and QBR Prep reads its moves and carriers.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Who signed whom recently? | Franchise moves, last 12 months, by distributor | `getMoves()` (news headlines) | Live |
| Which suppliers are growing, and who carries them? | Supplier momentum: growth, share sold through distribution, carriers, latest agreement | `getCompanyEarnings`, `getRevenueMix`, `getCarrierIndex` (SEC filings, snapshots) | Live |
| Where is Avnet missing? | Suppliers carried elsewhere but not by Avnet | Line-card snapshots | Blocked until Avnet's line card is imported |
| How do the line cards compare? | Coverage per distributor, overlap matrix, additions and removals since the last snapshot | Snapshots in `data/line-cards` (TTI, Future, Newark collected; others imported) | Live |
| How do I add a line card? | Import form and the Collect button | Server actions | Live |

There is no Avnet-internal number on this page, so nothing here is mock. The one gap is Avnet's own line card: Avnet's site blocks automated reading, so it has to be pasted in once.

## Layout rules

- Avnet Green only for Avnet (its row, its moves); Arrow in Dark Blue; other distributors grey. Never colour distributors by index.
- Carried / not carried reads as a word or icon plus text for screen readers, never colour alone. "Not on Avnet" is the one place a status colour is earned.
- Growth bars are one colour (grey for the market, since suppliers are not Avnet), with direction shown by the sign and arrow.
- The page leads with what changed and what matters (moves, momentum, gaps); the reference data (coverage, overlap, changes, import) comes after and can be collapsed.
- The method note is a caption, not a wall of small text.
- One primary action at most: "Collect" belongs to the data section, as a secondary button.

## Taste review

Reading this as: an intelligence page that is half briefing (who signed whom, who is growing) and half reference data (line-card snapshots). Dials: layout variance 3, motion 2, density 7. Risks: nine stacked cards of equal weight; a 9-column check-mark table that only works on wide screens; red crosses as the main visual; reference tables crowding out the briefing; the empty Avnet column making the whole page look broken.

## Mockups

- `line-cards-a-briefing.png`: a KPI row, "Who is signing" bars beside the franchise moves, supplier momentum with an "All | Not on Avnet" filter, then a "Line card data" section with coverage and folded panels.
- `line-cards-b-tabbed.png`: page tabs (Moves, Supplier momentum, Coverage, Import) with a growing-suppliers-not-on-Avnet table under Moves.

Stitch made up every figure, supplier and headline in both. A puts background tracks behind its bars, and B nests boxes inside cards.

## Decision

Built variant A on the existing live data. Four KPIs: agreements announced in 12 months and Avnet against Arrow (news), suppliers tracked (snapshots), and suppliers carried elsewhere but not by Avnet. Without Avnet's line card the last KPI shows "n/a" with a "Planned" chip. "Who is signing" is a list of selectable bars, Avnet and its own businesses in green, Arrow in Dark Blue and everyone else grey, and it filters the franchise moves beside it. Each move has a matching left rule, and "Ended" moves get a neutral chip. Supplier momentum is a sortable `DataTable`: growth with a grey trackless bar, share sold through distribution, Avnet as a word ("Carried", "Not carried", "Unknown"), and a "Carried by" list instead of one check-mark column per distributor. It has an "All | Not on Avnet" switch once Avnet's line card exists. The reference data sits under a "Line card data" heading: coverage (with "Collect today's snapshot" as a secondary button), then folded panels for who carries whom, overlap, additions and removals, and import. Import opens by default while Avnet's line card is missing.

Avnet's line card gets a clear empty state, as decided: one callout under the KPIs explains the gap and links to the import panel. The method note became one caption. The old components moved to the kit's tokens, with square controls and no green text.
