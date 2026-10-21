# TAM / SAM / SOM: design brief (step 2.5)

## Who and why

Strategy, executives and product managers sizing the opportunity: how big the semiconductor market is, how much of it flows through distribution, and how much of that Avnet wins. They use it for planning, board material and to decide where to push. Today the same three numbers are rebuilt in slides each quarter from WSTS releases and internal billings.

The page sits under Avnet performance. It feeds Market Share (the denominator) and the Scenario Modeler, and links to both.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| How big is the market, and how fast is it growing? | TAM, with growth and next year's forecast | WSTS Autumn 2025 (published, static in `src/lib/data/mock/tam.ts`) | Published |
| How much of it can Avnet serve? | SAM: the distribution-served slice | Modelled at 18% of TAM; real value from ECIA channel size and the code map | Mock |
| How much does Avnet win? | SOM: Avnet billings in the served market, and its share of SAM | Billings joined through the code map | Mock |
| How has each moved over time? | TAM, SAM and SOM by year, 2019 to the 2026 forecast | Same | Published TAM, mock SAM / SOM |
| Where is the market growing? | Product categories: size, growth, share of TAM | WSTS by product | Published |
| Which regions and end markets? | Region and end-market sizes and growth | WSTS regions; SIA 2024 end-market mix | Published |
| Is the forecast holding up? | Live check: what component makers reported this quarter against the WSTS growth rate | `getCycle()` (SEC filings) | Live |

## Layout rules

- TAM, SAM and SOM differ by 50 times, so they never share one linear axis. Show the funnel as steps, and each one's trend on its own scale or indexed.
- Published figures carry their vintage ("WSTS Autumn 2025"). Mock figures carry the hookup marker. The methodology note uses a `DataChip`, not yellow text (DESIGN.md fix 11).
- Market categories are not Avnet, so they are never green. Bars for one series are one colour (fix 8). Seven categories are too many for coloured series: use a ranked table or bars, not a seven-colour stacked area or treemap.
- Chart legends, where any remain, use `ink-muted` text (fix 10).
- No primary button.

## Taste review

Reading this as: a planning page for strategy and leaders, answering "how big, how much can we serve, how much do we win" in one glance. Dials: layout variance 3, motion 2, density 6. Risks: six KPIs of equal weight with no story; an area chart where SOM is a sliver; the same product mix drawn twice (stacked area and treemap); published and mock numbers side by side without telling them apart.

## Mockups

- `tam-a-funnel.png`: the TAM, SAM and SOM steps, three small trend charts each on its own scale, a market-only category table, a forecast check, and region and end-market bars.
- `tam-b-segment-led.png`: a KPI row, a category table with served and Avnet columns, and one chart with the market and Avnet on a shared axis.

Stitch made up every figure in both. B's shared axis flattens Avnet's line, which is the problem this brief rules out.

## Decision

Built variant A with B's category table. The page opens with the funnel: TAM (published, with its vintage), SAM and SOM (mock). Each step's bar shows it as a share of the step before, and Avnet's bar is the only green. Three small charts follow, each on its own scale, solid to 2025 and dashed for the 2026 forecast. The category table has the published size, growth and share of TAM, then mock columns for the served slice and Avnet's SOM. The mock weights are in `src/lib/tam/categories.ts`, scaled so the categories add up to the page's SAM and SOM. Below it sit the live forecast check (supply-chain companies' reported growth from `getCycle()` against the WSTS forecast), then region and end-market bars in one grey. A plain method note uses chips instead of yellow text. Published sources get a neutral chip, not the green "live" dot.

This closes DESIGN.md fixes 8, 10 and 11: the four old TAM charts (`tam-trend`, `product-stacked-area`, `endmarket-bars`, `product-treemap`) are deleted. Fix 9 (the book-to-bill gauge) stays with Market Overview's pass.

Open point: the mock SOM here ($13.3B a year) does not match the mapped billings on Market Share ($6.8B) or the yearly billings on the shell pages. All three are mock. They will agree once real billings are hooked up, but until then they can confuse a reviewer.
