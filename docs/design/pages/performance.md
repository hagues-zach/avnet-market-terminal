# Performance Tracker: design brief (step 2.6)

## Who and why

Sales leaders and executives checking how Avnet is doing on its own numbers before comparing it with the market: is demand building, where is it coming from, and is anything slipping. Today that comes from a weekly billings pack and a separate bookings report. This page puts billings, bookings and backlog together, by quarter, region, supplier and end market.

The page sits under Avnet performance, first in the group. It links to Market Share (the same billings against the market) and Avnet vs Arrow.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| How big is the business, and is it growing? | Billings over the last 12 months and growth on a year ago | Billings | Mock |
| Is demand building? | Bookings against billings, and book-to-bill, by quarter | Bookings, billings | Mock |
| How much is already on order? | Backlog and its change | Backlog | Mock |
| Where is it coming from? | By region: billings, growth, book-to-bill, backlog | Billings, bookings, backlog, FX | Mock |
| How concentrated are we? | Supplier share of billings, and end markets | Billings by manufacturer and by customer vertical | Mock |
| Does this match what Avnet reports? | Avnet's reported revenue by quarter, by segment (Electronic Components, Farnell) and by region, from its 10-Q and 10-K | `getSegmentHistory("avnet")`, `getCompanyEarnings("avnet")` | Live |

### The shared mock model

Every Avnet figure on this page, and on Start Here, Market Share and TAM / SAM / SOM, now comes from one model in `src/lib/shells/mock-avnet.ts`. Breakdowns are shares of one total, so they add up: billings of $24.7B over the last 12 months, $21.0B of it mapped to a market segment, $16.4B of that in semiconductors (TAM's SOM). Region, supplier and end-market splits each add back to the total. When billings are hooked up, the model is replaced by queries and the pages keep agreeing.

## Layout rules

- Avnet's own series are green. A second Avnet series (bookings, or the prior year) is Dark Green `viz-avnet-2` or dashed green, per DESIGN.md. Reported revenue from SEC filings is a different source of the same company, so it is labelled, not recoloured.
- Book-to-bill is one line against a reference line at 1.0, on its own chart (never a second axis).
- Mock sections carry the hookup marker; the live section has a source chip naming SEC filings.
- Supplier names stay withheld in mock. A fifth supplier and the rest fold into "All others" in grey.
- No primary button.

## Taste review

Reading this as: an operating dashboard for leaders, answering "are we growing and is demand building" first. Dials: layout variance 3, motion 2, density 7. Risks: a wall of equal KPI tiles; a dual-axis billings and book-to-bill chart; bookings drawn in a second hue that reads as a competitor; mock numbers that disagree with other pages (now fixed by the shared model); the live reported revenue mistaken for internal billings.

## Mockups

- `performance-a-operating.png`: four KPI tiles, billings and bookings as paired bars beside a book-to-bill line, a region table, supplier and end-market bars, and Avnet's reported revenue.
- `performance-b-demand-story.png`: a one-sentence headline, billings, bookings and backlog each with a small trend, book-to-bill by region as small charts, a switchable breakdown table, and reported revenue.

Stitch made up every figure in both. A names real suppliers, which must stay withheld in mock. B boxes its small charts inside a card.

## Decision

Built variant A, the operating view. Four mock KPI tiles: billings over the last 12 months, book-to-bill with how many quarters it has stayed above 1, backlog, and design-approved billings. Billings and bookings are paired bars in green and Avnet's second green, with a small key in `ink-muted` text. The value labels on the bars collided, so the subtitle carries the latest figures. Book-to-bill is its own line against a dashed reference at 1.0, never a second axis. The region table sorts by billings, with a trackless green bar for share. Supplier bars are green with "All others" in grey; end-market bars are green with growth. "What Avnet reports" is live: Avnet's segment revenue (Electronic Components, Farnell) from its filings, with total revenue as the fallback when the filing documents can't be read.

The shared mock model (`src/lib/shells/mock-avnet.ts`) now feeds this page, Start Here, Market Share and TAM / SAM / SOM. Their baselines are refreshed: Start Here and Market Share now show 3.1% share of the mapped market, and TAM's SOM is $16.4B.

Open point: Avnet's reported revenue ($8.3B in its latest quarter) is about 26% above the mock billings ($6.58B). The card says so. The mock is not tuned to the live figure, so it can't be mistaken for real data.
