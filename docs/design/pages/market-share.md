# Market Share: design brief (step 2.4)

## Who and why

Product managers, strategy and executives who need to know whether Avnet is winning or losing ground, and where. Supplier business managers use the supplier view before a line review. Today share is worked out by hand in spreadsheets: billings from one system, market sizes from WSTS or Gartner, and a code map nobody else can see. This page puts the estimate, its inputs and how much to trust it in one place.

The page sits under Avnet performance in the nav. It links out to TAM / SAM / SOM (market sizes), Code Mapping (how billings join to segments) and Company Profiles (suppliers and Arrow).

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Are we gaining or losing share overall? | Headline: share of mapped market and its change on a year ago | Billings ÷ WSTS / Gartner market size, through the code map | Mock, with the hookup marker |
| Are we growing faster than Arrow? | Avnet against Arrow: each one's share of the two companies' combined revenue, by quarter | `getCompanyEarnings("avnet")`, `getCompanyEarnings("arrow")` (SEC filings) | Live |
| Are we growing faster than our suppliers? | Avnet's revenue growth against the manufacturer group's combined growth | `getCycle()` groups, Avnet earnings | Live |
| Where are we strong or weak? | Share by segment, supplier or region, with change and mapping confidence | Billings, market sizes, code map | Mock |
| How has share moved? | Share over eight quarters | Same | Mock |
| Where is the white space? | Large markets where Avnet's share is low | TAM / SAM / SOM, code map | Mock |
| How much should I trust this? | Mapping confidence per row and a short method note | Code map coverage | Mock |

The live sections answer the share question with what is public today (two distributors' reported revenue and the supplier group's growth). They are a proxy, said as such, and never mixed into the mock share figures.

## Layout rules

- Avnet in Green, Arrow in Dark Blue, the supplier group in Orange. Share bars in a table use one colour (Avnet Green, since the bar is Avnet's share), with no background track.
- One way to switch the breakdown (segment, supplier, region) at the top of the breakdown, not three tables.
- Every mock section carries the hookup marker; the live comparison has a source chip naming SEC filings.
- No primary button is needed; the page is for reading. Export goes in the page title's secondary actions if anywhere.
- Confidence reads as words (High, Medium, Low), not colour alone.

## Taste review

Reading this as: an analysis page for planners, answering "where are we winning" in one screen. Dials: layout variance 3, motion 2, density 7 (a table is the core). Risks: a page of four unrelated charts with no headline; share figures that look precise when the code map is half built; a scatter plot that needs a legend to read; mixing the live peer proxy into the mock share as if they were one number.

## Mockups

- `market-share-a-scorecard.png`: KPI row, the breakdown table as the core, then share over time and white space.
- `market-share-b-share-map.png`: a headline line, a share-against-market-size scatter with "Biggest moves", then the table and a live Avnet against Arrow chart.

Stitch made up every figure and segment name in both. Both also drift from the rules: A has green "High" chips, and B has bar tracks and scatter labels that collide.

## Decision

Built variant A, the scorecard, with B's live Avnet against Arrow chart added. The KPI row has two mock tiles (share of mapped market, mapped billings) and two live ones from SEC filings: Avnet's share of Avnet plus Arrow revenue, and Avnet's revenue growth over the component makers' combined growth. The breakdown table switches between segment, supplier and region, with each view's own denominator and source line. Share is a trackless Avnet bar, change is a `Delta` in points, and confidence is a word. Share over time (mock) and white space (mock, grey bars) share one hookup marker. The live row has Avnet against Arrow (green and dark blue, labelled at the line ends) and growth against the makers (Avnet green against a grey benchmark line). The live loaders live in `src/lib/share/peers.ts`. They are a proxy for share, kept apart from the mock figures. Start Here's share tile now reads the same mock trend, so the two pages agree.
