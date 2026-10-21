# Supply Chain: design brief (step 2.12)

## Who and why

`/supply-chain`, under Avnet performance. One question: **is component supply tightening or easing, and what does that mean for Avnet's order book?**

- **Product and supplier managers** decide what to buy and when. They want lead times by category, where inventory is building in the chain, input costs, and what suppliers are saying about allocation.
- **Sales leaders** want to know when to tell customers to order early, and whether Avnet's backlog is building because demand is up or because lead times are stretching.
- **Sellers and FAEs** want one line to use with a customer: "lead times on MCUs are out four weeks since last quarter; place orders now".

Today the page is a shell: three mock sections (lead times by category, backlog, purchasing) with no live data, though the app already reads several live supply signals for other pages.

The PRD calls this module 5. Market Cycle has the chain's inventory, Economic Signals the production, utilisation and price series, Market News the stories; this page pulls the supply side of each together and adds Avnet's own buying.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Is supply tightening or easing? | The read: "Tightening", "Easing" or "Mixed", with the signals behind it, by a stated rule | Utilisation, producer prices, chain inventory (below) | Live (a rule) |
| How hard are fabs running? | Capacity utilisation, semiconductors and components, and its change on a year ago | `getSignals()` `util-semis` (Federal Reserve G.17) | Live |
| Are prices rising? | Producer prices for semiconductors, connectors and circuit boards, change on a year ago; input metals (copper, tin, nickel, aluminium) | `getSignals()` BLS PPI and IMF series | Live |
| Where is inventory building? | Median inventory days for manufacturers, distributors and contract manufacturers, by quarter | `getCycle()` groups | Live (SEC filings) |
| What are suppliers saying? | Lead times and inventory, from the latest earnings release of the largest suppliers in the app | `getCommentary()` (Claude) | Live; off without an API key |
| What's in the news? | Stories on lead times, shortages, allocation, capacity and pricing, with Claude's "why it matters" | `getLiveNews()`, `getNewsAngles()` | Live |
| How long are lead times? | Lead times by category in weeks and their change on a quarter ago | `LEAD_TIMES` in `src/lib/shells/mock-market.ts` | **Mock**, hookup marker (ECIA, Sourceability) |
| Is Avnet's backlog keeping up? | Avnet backlog and book-to-bill by quarter | `PERFORMANCE` in `src/lib/shells/mock-avnet.ts` | **Mock**, hookup marker (backlog, bookings) |
| What is Avnet buying? | Purchase orders by category, change on a quarter ago, against the category's lead time | Procurement (mock) | **Mock**, hookup marker (purchasing, material master) |

## The read (rule)

Three live signals, each scored tighter, looser or flat:

- capacity utilisation up more than one point on a year ago is tighter, down more than one point is looser;
- semiconductor producer prices up more than 2% on a year ago is tighter, down more than 2% is looser;
- the chain's inventory days (manufacturers and distributors) down more than three days on a year ago is tighter, up more than three days is looser.

Two or more tighter with none looser reads "Tightening"; the reverse reads "Easing"; anything else is "Mixed". The mock lead times are not counted, so the read does not change when they are replaced; once lead times are live they join the rule.

## Links into the rest of the app

- Inventory links to Market Cycle; utilisation, prices and metals to Economic Signals; stories to Market News.
- Supplier names link to their Company Profiles; "Add to QBR brief" lives there.
- Backlog links to Performance Tracker.

## Layout rules

- The read leads, in words, with its three signals beside it; then live evidence; then Avnet's mock order book and buying, grouped under one heading with the hookup markers.
- "Tighter" and "looser" are words with arrows, never colour alone. Red and green are not used for tighter or looser: neither is good for everyone (tight supply helps pricing and hurts availability). They use neutral ink.
- Nothing on the page is Avnet except backlog and purchasing, which carry Avnet Green as a series.
- Lead-time bars are one colour, trackless, with the change as a signed number.
- Charts on the shared `CHART` tokens, direct labels.
- One caption for the method, naming the rule.
- No primary button.

## Taste review

Reading this as: an operational read for Avnet product managers, supplier managers and sales leaders that has to say which way supply is moving and prove it, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only.

Risks found and how the brief answers them:

- **A traffic-light gauge.** A red-amber-green "supply risk" dial is the template answer, and it would treat tight supply as bad for everyone. Answer: the read in words with its three signals, neutral ink.
- **Mock data leading a live page.** The shell leads with mock lead times. Answer: live signals first; the mock order book and buying sit together under one heading with their markers.
- **A heat map of categories.** Colour-coded cells for lead times look busy and need a legend. Answer: one-colour trackless bars with the weeks and the signed change.
- **Too many small charts.** Utilisation, three price indexes, four metals and three inventory lines could become a dozen tiles. Answer: KPIs for the three signals, one prices chart with a switch, one inventory chart.
- **Claude text crowding out numbers.** Answer: one line on lead times and one on inventory per supplier, linked to the release.

## Mockups

- `supply-chain-a-read.png`: the read and its three signals as KPIs; inventory in the chain beside prices and inputs (with a producer prices or metals switch); what suppliers are saying beside supply news; then "Avnet's order book and buying" under one mock marker: lead times by category, backlog with book-to-bill, purchasing.
- `supply-chain-b-by-category.png`: the read with its signals in one strip; then one table by category (lead time, its change, producer price change, Avnet purchase orders and their change, a supplier quote); then inventory, Avnet backlog and input metals side by side; then suppliers and news in one card.

Stitch made up every figure, quote and headline in both. Drift to correct in the build: A sets the mock marker in a mono font and places it beside the heading rather than under it; B's table mixes mock lead times and purchase orders with live producer prices and Claude quotes in the same rows, and draws Avnet PO values as green underlined links. Both invent sidebars, source lines ("Avnet Global Sourcing Intelligence desk", "LME") and dates.

B's table is the more useful view for a product manager, but it puts mock and live figures in one row, which the brief rules out while lead times and purchasing are mock. It could follow once those are hooked up.

## Decision

Built variant A with the "By category" table from variant B (chosen 2026-10-21). The read and the category links live in `src/lib/supply/read.ts`, with tests in `read.test.ts`.

- **The read** leads in words from the rule above, e.g. "Supply signals are mixed. Fabs are running hotter, chip prices are falling and inventory in the chain is steady." Three signal tiles follow: capacity utilisation (Fed G.17), semiconductor producer prices (BLS) and inventory in the chain (the mean of the manufacturer and distributor stages from Market Cycle), each with its change on a year ago and "Tighter", "Looser" or "Steady" as a word with an arrow, in ink.
- **By category** (from B), right under the read: lead time with a trackless bar and its change, producer prices on a year ago, Avnet purchase orders and their change, and what the category's supplier said. Every mock column carries a "Mock" chip in its header and the hookup marker sits above the table, so mock and live figures can share a row without being confused. Passives and electromechanical show "n/a" for prices: there is no matching producer price series here (B gave electromechanical the circuit board index, which is a different product).
- **Inventory in the chain** beside **Prices and inputs** (producer prices or metals, indexed to 100 two years ago so they share a scale, each with its change on a year ago).
- **What suppliers are saying** (lead times and inventory from each category supplier's latest release, Claude) beside **Supply news** (stories on lead times, shortages, allocation, capacity and prices, with Claude's angle).
- **Avnet's order book** (mock, one hookup marker): backlog in Avnet Green and book-to-bill. Purchasing moved into the category table, so this section is backlog only.
- One caption states the rule and the sources.

Where a release is silent on a topic, Claude's digest says so ("The release does not discuss lead times"); that is treated as no quote rather than shown as one. Suppliers whose release is silent on both are named under the list; suppliers without a summary yet are named separately. Purchase orders for all eight categories now come from `PURCHASING` in `src/lib/shells/mock-market.ts`, which the old shell spec also reads.

The Anthropic account is out of credits, so only Microchip, Texas Instruments and AMD have release summaries today; the other five fill in on the next successful call, and each is then cached.

Checks: tests and typecheck pass. Audit: the table's scroll area is a focusable region, external links say where they open, and every mock column is labelled in its header. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/supply-chain-1440.png` and `supply-chain-1280.png`, status 200, no console errors, no overflow.
