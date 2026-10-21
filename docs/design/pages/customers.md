# Customers & End Markets: design brief (step 2.14)

## Who and why

`/customers`, under Avnet performance. One question: **which end markets and customers are driving Avnet's growth, is customer demand behind it, and how concentrated is the business?**

- **Sellers** want to know which of their markets is moving and why, and a line to use with a customer: "industrial OEMs grew 2% last quarter, but our industrial billings are up 13%; some of that is restocking".
- **FAEs** want to see which end markets carry the design pipeline, so they know where new programmes are coming from, and to jump from a customer company to its profile before a visit.
- **Sales leaders** want the mix, the growth by market, the largest accounts, and how much of the business sits with the top 10 and top 100 customers.

Today the page is a shell: billings by end market as bars, four concentration KPIs and a five-row table of the largest customers, all mock, with nothing live and nothing saying which market is behind the growth.

PRD module 7. Performance Tracker shows billings by end market as one card among many; this page is the end-market view in full. Design Pipeline shows the pipeline by end market; Market Cycle shows the customer groups' revenue and inventory; Company Profile and QBR Prep cover one customer company at a time.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Which end market is driving growth? | The lead in words: the market that added the most billings, its growth and its share of the total | `VERTICALS`, `TTM_BILLINGS` in `src/lib/shells/mock-avnet.ts` | **Mock** (shared model), hookup marker under it |
| How big is each market, and how fast is it growing? | By end market: billings in the last 12 months, share, growth on a year ago, and the dollars each added to growth | `VERTICALS` | **Mock** |
| Is customer demand behind it? | Beside each market: revenue growth of the customer group that buys in it, and a word comparing the two ("Ahead of demand", "With demand", "Behind demand") | `getCycle()` groups, mapped by `MARKET_GROUP` (Design Pipeline) | **Live** (SEC filings); the comparison is a rule over mock and live, marked as such |
| Where is the next growth coming from? | Approved design pipeline per market, and pipeline against billings | `PIPELINE_BY_VERTICAL` | **Mock** (shared model) |
| How concentrated is the business? | Top 10 and top 100 customers' share of billings and its change, active customers, new customers | Customer master, billings | **Mock**, new in the shared model |
| Who are the largest accounts? | Ten largest customers by parent company: end market, region, billings, growth, backlog, approved pipeline. Names withheld ("Customer A") | Customer master, billings, backlog, DRMS | **Mock**, new in the shared model |
| How are the public customer companies doing? | The 23 customer companies in the app's filings (hyperscalers, devices and systems, automotive, industrial OEMs, contract manufacturers): latest quarter revenue, growth, inventory days, capex for hyperscalers; each links to its profile and to QBR Prep | `getPeerRows()` / `getCycle()` | **Live** (SEC filings) |

Supplier and customer names stay withheld in mock. The live public companies are never put next to the mock accounts: they sit in their own section, under their own heading, and no "Customer A" is ever matched to a real company.

### End markets to customer groups

The page reuses Design Pipeline's mapping (`MARKET_GROUP` in `src/app/(terminal)/design-pipeline/page.tsx`), moved into a shared module so both pages read one copy:

| Avnet end market | Customer group (live) |
|---|---|
| Data center & computing | Hyperscalers |
| Communications | Devices & systems |
| Consumer | Devices & systems |
| Automotive | Automotive |
| Industrial | Industrial OEMs |
| Aerospace & defense | none (n/a) |
| Medical | none (n/a) |

Contract manufacturers buy for every market, so they appear in the public companies list but not in the market comparison.

## The read (rule)

In a pure module, `src/lib/customers/read.ts`, with a tsx test:

- **Contribution to growth.** Each market's added billings is its billings in the last 12 months times `growth / (1 + growth)`. The lead names the market that added the most, its growth and its share: "Data center & computing added the most growth: billings up 34% on a year ago, a third of Avnet's growth from 15% of its billings."
- **Against demand.** Avnet's billings growth in a market minus its customer group's revenue growth. More than 5 points above reads "Ahead of demand", more than 5 below "Behind demand", otherwise "With demand"; no group reads "n/a". Avnet's growth is over the last 12 months, so the customer group's growth is the mean of its last four quarters on a year ago, not one quarter. Ahead and behind are neutral ink with an arrow: neither is good on its own (ahead can be share gains or restocking).
- **Concentration.** The top 10 share of billings and its change on a year ago, in words: "The top 10 customers are 18% of billings, up 0.9 points."

The shared model needs one fix to make the contributions add up: the end-market growth rates imply $2.73B of added billings against $2.85B in the total. Industrial growth moves from 11% to 13% so the parts add to the whole, and `mock-avnet.test.ts` checks it.

## Links into the rest of the app

- **Company Profile**: every public customer company links to `/network/[slug]`.
- **QBR Prep**: each public customer company has "Prepare a QBR", to `/tools/qbr?company=<slug>&meeting=customer`.
- **Design Pipeline**: the pipeline column links to Design Pipeline's end-market view.
- **Market Cycle**: the customer growth column and the public companies section link to `/cycle`.
- **Performance Tracker**: billings and backlog totals link back to it.

## Layout rules

- Lead with the answer in words. The lead rests on mock billings, so it carries a "Mock" chip and the hookup marker sits directly under it.
- The end-market table holds mock and live figures in one row, so each column header carries a "Mock" or "Live" DataChip.
- Avnet's billings are Avnet Green; customer group growth (the market, not Avnet) is Dark Blue. Bars are trackless, with direct end labels.
- Changes are signed with arrows. Avnet growth uses green or red; "ahead" or "behind demand" and concentration changes use neutral ink, since neither direction is plainly good.
- The largest accounts and the public companies are separate sections. No real name appears in the mock section.
- Charts on the shared `CHART` tokens; one caption for the method.
- No primary button. "Prepare a QBR" is a text link per row.

## Taste review

Reading this as: an operational end-market view for Avnet sellers, FAEs and sales leaders, mostly on mock internal data with live public demand beside it, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A donut of end markets.** The template answer for "mix", and it hides growth. Answer: ranked rows with trackless bars for billings, the growth and the dollars added beside them.
- **Mock and live blurred in one table.** The comparison with demand needs both in a row. Answer: a Mock or Live chip in every column header, and the verdict column says which inputs it uses.
- **Real customer names next to placeholders.** Stitch tends to fill "Customer A (Apple)". Answer: the mock accounts and the public companies are separate sections under separate headings.
- **A red-amber-green concentration gauge.** Concentration is a fact, not a status. Answer: two figures and their change in neutral ink, plus a one-line read.
- **Dual-axis "Avnet vs customers".** Two growth rates on one percentage axis is fine; dollars against percent is not. Answer: both as growth rates on one axis, Avnet green and the customer group dark blue.
- **Too many tiles.** Answer: four KPIs, then the end-market table.

## Mockups

- `customers-a-readout.png`: the lead with its mock chip and the marker under it, four KPIs, then "By end market" (a table with a chip in each column header: billings with a trackless green bar, share, growth, dollars added, live customer group growth, against demand, approved pipeline) beside "Avnet growth against customer demand" (a dot plot, Avnet green against the customer group in dark blue, on one percent axis). Then the ten largest customers (Customer A to J) beside concentration, then the public customer companies grouped by customer group, each with "Prepare a QBR".
- `customers-b-by-market.png`: the same lead, then a strip of seven end-market tabs with billings, growth and a green bar each. The selected market opens into one card with three columns: Avnet in this market (mock), customer demand (live, with an eight-quarter line chart) and the public customers in that market. Then the largest customers in that market beside concentration, then a full-width end market by region table.

Stitch made up every figure in both. Neither put real names beside the placeholders. Drift to correct in the build:

- **A's end-market table doesn't match its own lead or the shared model.** Automotive is the largest market at $7.8B and 31.6%, Communications is shrinking, and Data center & computing reads "With demand" with hyperscalers at +38%. The build takes every figure from `VERTICALS` and the live cycle.
- **A invents a customer group** ("Auto Tier 1", "Telco OEMs"); the app has four. It also gives hyperscalers inventory days, puts tickers beside company names, and adds a concentration verdict ("within targeted risk tolerances (<25% for top 10)") and a method note about POS and ERP records the app doesn't have.
- **B's Avnet line in the "Customer demand" card is mock inside a Live card.** The shared model has no Avnet billings by end market by quarter, so the line would need new mock data and a Mock chip of its own. B also nests cards inside cards (the verdict box, the concentration tiles), gives the concentration bars background tracks, and colours region growth green and red.
- Both draw card titles in all caps (sentence case in DESIGN.md), add "Refine filters" and "Export dataset" buttons, a "v2.4" badge, "names withheld under NDA", and invent the sidebar and top bar.

## Decision

Built variant A (chosen 2026-10-21). The rules live in `src/lib/customers/read.ts`, with tests in `read.test.ts`; `MARKET_GROUP` moved there from Design Pipeline, which now imports it.

- **The lead** in words from the rule above, with a "Mock" chip and the hookup marker (billings, customer master, backlog, DRMS) directly under it. Then four KPIs: billings in the last 12 months, the top 10 and top 100 customers' share of billings (changes in ink, since a rise in concentration is neither plainly good nor bad), and active customers with new customers' growth.
- **By end market**, full width: billings with a trackless Avnet Green bar, share, growth, billings added, customer growth (live), against demand and approved pipeline. Each column header carries a "Mock", "SEC" (live) or "Mock vs live" chip, stacked under the label so the chips don't widen the columns. Customer growth is the mean of the group's last four quarters on a year ago, so it covers the same span as Avnet's 12 months; aerospace and defence and medical have no customer group and show n/a. Pipeline figures link to Design Pipeline's end-market view (`/design-pipeline?view=market`).
- **Avnet growth against customer demand**: a dot plot on one percent axis, Avnet Green for Avnet (mock) and Dark Blue for its customers (live), with both values written in each row.
- **Largest customers** (Customer A to J, mock) beside the dot plot. The concentration sentence is its subtitle.
- **Customer companies in the public filings** (live, SEC): all 23 customer companies by group, with the latest quarter, revenue, growth, inventory days and, for hyperscalers, capex. Each name links to its Company Profile and each row has "Prepare a QBR" (`/tools/qbr?company=<slug>&meeting=customer`). No real company appears in the mock sections.

Changes from the mockup: A put the end-market table in eight columns beside the dot plot; it needs about 1,000px, so it takes the full width and the dot plot moves beside the largest customers. A's Concentration card repeated the two KPI tiles, so it is folded into the largest customers' subtitle. Every figure comes from the shared model or the filings, not from Stitch (A's table had Automotive as the largest market and data centre "with demand").

The shared model gains `CONCENTRATION` and `TOP_CUSTOMERS`, and Industrial growth moves from 11% to 13% so the end markets' added billings sum to the total; `mock-avnet.test.ts` checks both, and that the largest customers fit inside their markets' billings and pipeline.

Checks: tests and typecheck pass. Audit: every table scroll area is a focusable region, mixed tables label every column, pipeline links and "Prepare a QBR" links say what they open to screen readers, and the dot plot's values are in text beside it. Keyboard: Tab reaches the hookup marker, the tables and every link in order, with the focus ring visible. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/customers-1440.png` and `customers-1280.png`, status 200, no console errors, no overflow.
