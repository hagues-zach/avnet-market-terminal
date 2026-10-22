# Market Overview: design brief (step 2.23)

## Who and why

`/overview`, under Knowledge. One question: **how big is the chip market, where is it heading, and what is driving it right now?**

- **Executives and strategy** want the state of the market in a sentence: its size, its growth, the forecast and whether the latest quarter agrees.
- **Product and supplier managers** want to see which product categories carry the growth, and how much of the market is growing without AI.
- **Sellers and FAEs** want the backdrop for a customer conversation: the direction of the market, the economy around it, and the stories worth mentioning.

Today the page is the last one without a design pass: the old layout behind the "Shell page" banner, with Title Case card titles, seven em-dashes, "Micro (MPU/MCU/DSP)", a market book-to-bill of 1.04 in green text on white (DESIGN.md fix 9), "WSTS" chips with the Live green dot though WSTS is mock in the register, a region donut whose legend is drawn in the series colours, five invented news items with ISO dates, red and green arrows on market figures, and Avnet's SOM repeated from TAM, SAM and SOM.

PRD module 1. It sits between three pages that already exist: TAM, SAM and SOM sizes Avnet's part of the market; Market Cycle reads the cycle from SEC filings; Economic Signals reads the economy. This page is the one-screen state of the market that links to all three.

## Status of the data

- **Published**: the WSTS figures already in the app (`src/lib/data/mock/tam.ts`, `forecast.ts`), the annual market, its product and region splits and the forecast vintages, typed in from WSTS releases. They carry their vintage in a neutral chip ("WSTS Autumn 2025"), as TAM, SAM and SOM does. The monthly WSTS files (licensed, build plan 5.5) replace them later.
- **Live**: supply-chain revenue by company group from SEC filings (`getCycle()`), the economic backdrop (`src/lib/signals`), and the news feed with cached "why it matters" lines.
- **Mock**: nothing on this page. Avnet's own part lives on TAM, SAM and SOM.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Where is the market? | Lead in words: size, growth, forecast, what carried it, and what the latest filings say | Below | Published and Live, each figure marked |
| The headline numbers | Four KPIs: world market 2025, growth on 2024, the 2026 forecast, supply-chain revenue growth in the latest quarter | WSTS Autumn 2025; `getCycle()` | Published; Live |
| What carried the growth? | By product category: size and growth, and the split between logic and memory (where AI spending lands) and everything else | `byProduct` | Published |
| Is it still happening? | This quarter in the filings: revenue growth by company group (memory and storage, AI and connectivity, large players, manufacturers, distributors, equipment), and whether each sped up or slowed | `getCycle()` groups | Live |
| Where is the forecast heading? | How the WSTS forecast for 2026 has moved across vintages (Spring 2024 to Autumn 2025) | `forecast.vintages` | Published |
| Where are the sales? | By region: size and growth | `byRegion` | Published |
| What is the economy doing? | The backdrop sentence and its four reads (demand, costs, financing, dollar) | `src/lib/signals` | Live |
| What is being said? | The latest market stories (forecasts, memory, supply, AI), with cached "why it matters" lines labelled as Claude's | `getLiveNews()`, news angles | Live |
| And Avnet? | One line linking to TAM, SAM and SOM, Market Share and Market Cycle | Links | n/a |

**Dropped**: the market book-to-bill (no public source; SIA stopped publishing it), the 2027 and 2028 forecast points (illustrative extrapolations in `forecast.ts`, not WSTS), the region donut, and Avnet's SOM KPIs (on TAM, SAM and SOM).

## The read (rule)

In a pure module, `src/lib/overview/read.ts`, with a tsx test:

- **The AI split.** Logic and memory against the rest: each group's size, the size a year before (size ÷ (1 + growth)) and so its growth. With today's figures: logic and memory, 66% of the market, grew 38%; the rest grew 4%. This is the "ex-AI" idea from the cycle engine plan (`docs/semis-cycle-engine-plan.md`), on published figures.
- **This quarter.** Each company group's growth on a year ago in the latest quarter and the change from the quarter before, as a word ("faster", "slower", "steady" within 2 points), neutral ink with an arrow.
- **Forecast drift.** The 2026 forecast's change from the oldest vintage to the newest, in words: "WSTS has raised its 2026 forecast by 42% since Spring 2024."
- **Lead.** "The chip market reached $772B in 2025, up 22.5%, and WSTS expects $976B in 2026. Logic and memory carried it: the rest of the market grew 4%. In Q2 2026 the supply chain's revenue grew 65.6%, led by memory and storage." Missing live figures read "n/a" and the sentence says what is missing.
- **One caveat.** The published category sizes and growth rates imply 24.0% growth for the whole market, against WSTS's headline 22.5% (rounding and revisions in WSTS's own tables). The page shows each figure as published and never derives the headline from the categories; the test checks the split's two groups add to the categories' total, not to the headline.
- **Content.** Every figure has a source and period; no visible text has a slash, a middle dot or an em-dash.

## Links into the rest of the app

- The KPIs and categories link to TAM, SAM and SOM; the live groups to Market Cycle; the backdrop to Economic Signals; the stories to Market News and their sources.
- "And Avnet?" links to TAM, SAM and SOM, Market Share and Performance Tracker.

## Layout rules

- Lead with the answer in words. It rests on published and live figures, so no Mock chip; each KPI carries its own chip (the vintage, or Live).
- No green anywhere in the data: this page is the market, not Avnet. Market bars in grey or Dark Blue, trackless, with end labels; the logic and memory group in Dark Blue and the rest in grey.
- Growth arrows in neutral ink: market growth isn't good or bad for Avnet on its own.
- Regions as a ranked bar list, not a donut.
- No "What Changed This Quarter" tiles in four colours: the live group table says what changed.
- No em-dashes or en-dashes, no slashes ("Micro (MPU, MCU, DSP)"), "n/a" for missing values, dates as "Oct 21".

## Taste review

Reading this as: an internal market briefing for Avnet executives, product managers and sellers, over published WSTS figures and live filings, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2 (nothing moves), density 6 (a briefing, read top to bottom). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A dashboard with no answer.** The page today: six KPIs and four tiles. Answer: the lead sentence says where the market is and what carries it.
- **Mock passed off as live.** "WSTS" chips with a Live dot. Answer: published figures carry their vintage in a neutral chip; live ones carry Live; nothing mock remains.
- **Invented news and figures.** Answer: live stories only; the market book-to-bill and the 2027 and 2028 points go.
- **AI hiding the rest.** A 22% headline hides a market growing 4% outside logic and memory. Answer: the split is a section, in the lead.
- **Green for the market.** Answer: no green; Avnet's part is a link to the pages that show it.

## Mockups

- `market-overview-a-briefing.png`: the lead, four KPIs (world market, growth, the 2026 forecast, supply-chain growth live), then "What carried the growth" (the logic and memory split as two bars, then the seven categories) beside "This quarter in the filings", then the forecast revisions beside the regions, then the backdrop beside the stories, and the line to TAM, SAM and SOM.
- `market-overview-b-chart-led.png`: the lead with no box, then one full-width chart, "The market by year", 2019 to the 2026 forecast as stacked columns (logic and memory in Dark Blue on everything else in grey, 2026 outlined as the forecast), with three figures under it; then three columns (this quarter in the filings, the forecast and the regions, the backdrop) and the stories full width.

Figures in the prompts are real: the published WSTS figures already in the app and the live SEC and signals reads from Oct 21. Illustrative only: the three stories (titles, outlets and dates) and the Claude line under the first in A.

**A data problem in B.** WSTS's split by category is in the app for 2025 only (and 2024, which follows from 2025's sizes and growth rates). The by-year split in `tam.ts` for 2019 to 2023 is modelled: 2025's shares bent by an invented memory-cycle factor. B's stacked columns would show modelled splits as if published. B's chart also doesn't match its own axis (the $412B column reaches past the $500B line) and uses a legend instead of direct labels.

Drift to correct in the build:

- **Invented chrome.** A adds Settings, Documentation and Help & Support to the sidebar and a green square before "AVNET"; B rebuilds the nav entirely ("Competitor Tracking", "Customer Network", "Tools", "Settings", "Help & Training"). The sidebar comes from `nav.ts`.
- **Invented captions.** A's KPIs say "Historical baseline" and "Prior year comp"; its region card adds "Semiconductor revenue distribution by global geography". A boxes the lead in a card and repeats "66%" and "34%" beside the bars.
- **B** puts the forecast's values in a sentence ("$687.0B, $760.0B, $760.7B, then $975.5B") where A's bars read better, and labels its chip just "WSTS" without the vintage.
- Neither drew green in the data, a donut, red or green text, or the slash mark.

**Recommendation:** B's layout, with an honest chart and A's split section. The chart shows the market by year as published totals in one colour (2019 to 2025, with 2026 outlined as the forecast), labelled at the column tops. A's "What carried the growth" (the 2025 split and the seven categories) sits under it beside "This quarter in the filings", then B's three-column row (the forecast as A's bars, the regions, the backdrop) and the stories. B's one strong chart answers "how big, and where is it heading" at a glance; A's split answers "what carried it" without inventing history. The by-year split can come back when the WSTS files are hooked up (5.5).

## Decision

Built the recommended mix (chosen 2026-10-22): B's layout with an honest chart, A's split section, and the split you asked for: **DRAM, Flash, MPUs, GPUs and AI accelerators** against everything else, instead of logic and memory.

That split is **mock**. WSTS's published figures in the app stop at logic, memory and micro; GPUs and AI accelerators sit inside logic and MPUs inside micro, and only WSTS Blue Book detail (DRAM, NAND Flash, MPU) and the Gartner forecast by device type (GPUs, AI accelerators) break them out. The five devices are synthetic figures in `AI_DEVICES` (`src/lib/shells/mock-market.ts`), marked Mock with the hookup marker naming WSTS and the Gartner forecast, and replaced when those are hooked up (build plan 5.5). They sit inside the published market: the test checks DRAM and Flash fit in memory, MPUs in micro, and GPUs and AI accelerators in logic, and that the two groups add to the published market in both years.

The rules are in `src/lib/overview/read.ts` (pure, tested in `read.test.ts`): the split, the pace word (faster, slower or steady within 2 points), the forecast drift sentence, and the lead.

- **The lead**, with a Mock chip and the marker under it because it rests partly on the split: "The chip market reached $772B in 2025, up 22.5%, and WSTS expects $976B in 2026. DRAM, Flash, MPUs, GPUs and AI accelerators carried it: the rest of the market grew 5%. In Q2 2026 the supply chain's revenue grew 65.6%, led by memory and storage."
- **The market by year**: published totals 2019 to 2025 in Dark Blue with labels on top, 2026 outlined and dashed as the forecast; under it, the world market and the forecast (published, with growth in neutral arrows) and supply-chain revenue for the latest quarter (Live).
- **What carried the growth** (Mock): the two groups as trackless bars (the AI devices in Dark Blue, the rest in grey), the five devices, the marker, then the seven WSTS categories as published with their vintage, and a note on why the split waits for WSTS detail and Gartner.
- **This quarter in the filings** (Live): each supply-chain group's growth and its pace against the quarter before; groups with no figure are left out.
- **Where the forecast is heading** (the 2026 forecast by vintage, the latest in Dark Blue), **where the sales are** (regions, grey bars with growth), and **the backdrop** (the Economic Signals read, Live).
- **What is being said** (Live): the latest four stories tagged memory, logic and processors, or foundry and equipment, with cached "why it matters" lines labelled as Claude's where they exist.
- A closing line to TAM, SAM and SOM, Market Share and Performance Tracker.

Retired with this step: the legacy banner and its register (`src/lib/shells/legacy.ts` and the `legacy` case in the usage register and its test), the shell renderer (`shell-page.tsx`, `data-hookup.tsx`, `cycle-charts.tsx`), the old `Card`, `PageHeader`, `KpiCard` and `SourceChip`, the book-to-bill gauge and the donut, and the old overview mock (`mock/overview.ts` and its types). The shell specs stay as the record of what each section answers; Start Here still reads its KPI spec. Every page in the app now runs on the current components.

Corrections from the mockups: the sidebar from `nav.ts`, no invented captions or subtitles, the lead unboxed, the chart's split dropped because it isn't published, the chart's labels in ink, and the vintage on every published chip.

Checks: tests and typecheck pass. Contrast: nothing below 4.5:1. Keyboard: the marker's Details and the two table regions are reachable in order with the 2px green ring. No horizontal scroll or truncation at 1280px; overflow 0. Baseline screenshots in `docs/design/baseline/overview-1440.png` and `overview-1280.png`, status 200, no console errors. In the in-app browser, with its pane hidden, the live sections stayed on their loading blocks: React reveals streamed sections on the next animation frame, which a hidden pane doesn't paint. Flushing React's reveal queue showed them, and the page streams them correctly (checked in the HTML and in headless Playwright).
