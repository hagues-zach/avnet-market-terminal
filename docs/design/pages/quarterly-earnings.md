# Quarterly Earnings: design brief (step 2.11)

## Who and why

`/earnings`, under Network. One reporting framework, the same line items, for all 77 SEC filers in the app: distributors, chipmakers, interconnect and passives makers, equipment, contract manufacturers and the customers who buy from them. The page does two jobs:

- **The earnings season.** Who reports this week, who has just reported, and how the results so far compare. Leaders and supplier managers follow it in the weeks after each quarter closes.
- **One company's results.** A seller before a customer meeting, or a supplier manager before a line review, wants the latest quarter in one screen: revenue and growth, margins, inventory, cash, what management said, and how that compares with the company's group.

Today it opens with a filter card of 14 group chips and a company select, then six equal tiles, five charts at the same weight, a 22-row detail table, revenue mix, a calendar and a 77-row table. The season, which is what changes week to week, is at the bottom. The selected company's commentary lives only on its Company Profile.

Company Profile covers one company in depth and links here for the full history. Market Cycle rolls these same filings up by group. QBR Prep reads the latest quarter.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Where is the season? | Season line and KPIs: companies reported for the latest calendar quarter, median revenue growth of those reported, releases this week, the next for Avnet and Arrow | `getEarningsCalendar()`, `getPeerRows()` | Live (dates estimated) |
| Who reports soon, who just did? | Calendar: due, this week, next week, reported in the last two weeks | `getEarningsCalendar()` | Live (estimates from last year's dates) |
| How did this company do? | Company results: revenue, growth, gross and operating margin, EPS, inventory days, free cash flow, each against a year ago | `getCompanyEarnings(slug)` | Live |
| How is it trending? | One chart with a measure switch (revenue, growth, margins, working capital, cash flow), eight to twelve quarters | Same | Live |
| What did management say? | Commentary: headline, guidance, demand, inventory, lead times, pricing, from the latest earnings release | `getCommentary(slug)` (Claude) | Live; off without an API key |
| Where does revenue come from? | Revenue mix by segment, region, customer | `getRevenueMix(slug)` | Live |
| How does it compare with its group? | Group table: the company's group (or all) by latest quarter, sortable, with the group median as a row | `getPeerRows()` | Live |
| Every line item? | Quarterly detail, eight quarters, folded | `getCompanyEarnings(slug)` | Live |

There is no Avnet-internal figure here, so nothing is mock. Avnet's own business with a company stays on the Company Profile, behind its hookup marker.

## Links into the rest of the app

- The company name links to its Company Profile, which offers "Add to QBR brief".
- Group names link to Market Cycle.
- Avnet and Arrow link to Avnet vs Arrow.
- Calendar and table rows open that company on this page (the URL holds `company` and `group`).

## Layout rules

- The season comes first (it changes weekly); the selected company second; the full detail last and folded.
- One company picker: a searchable select with the group beside it, not a wall of chips.
- Avnet Green only when Avnet is the company shown (its series, its row marker); every other company is Dark Blue. Arrow is always Dark Blue.
- Estimated dates say "estimated" in words; no yellow dashed chips (those mean mock data).
- One chart with a switch, not five equal charts. Charts move to the shared `CHART` tokens; the shared earnings charts used by Company Profile stay as they are.
- Changes on a year ago carry a sign and an arrow, coloured by whether the direction is good, never colour alone.
- Commentary is labelled as written by Claude, with a link to the release. No tone scores.
- The method note is one caption.
- No primary button.

## Taste review

Reading this as: a working page for Avnet leaders, sellers and supplier managers that has to follow the earnings season and open one company's results quickly, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 7. Light only.

Risks found and how the brief answers them:

- **Chip wall as navigation.** Fourteen group chips plus a select before any content. Answer: one company picker with the group beside it, in the page header.
- **Six equal tiles, five equal charts.** Equal weight says nothing about what matters. Answer: KPIs as evidence under a one-line result, one chart with a switch.
- **A 77-row table at full height.** Answer: show the company's group by default, sortable, with the median as a reference row; "All" is one switch away.
- **Yellow dashed "Estimate" chips.** In this app yellow dashed means mock data. Answer: the word "estimated" in plain text.
- **Two pages saying the same thing.** Company Profile already has KPIs and a revenue chart. Answer: this page is about the quarter and the season; the profile is about the company and Avnet's business with it. Each links to the other.
- **Commentary as a wall of text.** Answer: headline plus six short topics, missing topics marked as not covered.

## Mockups

- `quarterly-earnings-a-season.png`: the season first (a lead line, four KPIs, then a calendar card with "Reporting soon" by week beside "Just reported" with growth and margin), then one company (a picker bar, a lead line, six KPIs, a trend chart with a measure switch beside "What management said", the group table with a median row, the quarterly detail folded).
- `quarterly-earnings-b-workspace.png`: the company first, with the picker in the header: a lead line, one "Results" card holding six figures and the trend chart, "What management said" in two columns and revenue mix, beside a rail with the season (reported so far with a progress line), reporting soon, just reported, and the company's group ranked by growth.

Stitch made up every figure, date and commentary line in both. Drift to correct in the build: A sets "estimated" in italics and colours growth in the "Just reported" table green and red (that column is a value, not a change); B colours company links blue, puts the headline in quotation marks, highlights the selected company's rows green (green means Avnet), and its ranked bars use a black bar for the selected company. Both invent the sidebar and top bar, and A invents a ticker and a "Tier 1 suppliers" caption.

## Decision

Built variant A, season first (chosen 2026-10-21). The season rules live in `src/lib/earnings/season.ts`, with tests in `season.test.ts`.

- **The season** leads: "CY26 Q3 season: 5 of 77 companies have filed the quarter, with median revenue growth of +29.6%." The season is the last calendar quarter to have ended, and a company counts once its 10-Q or 10-K for that quarter is filed. Four KPIs: filed the quarter, median growth of those filed, releases this week (with any overdue), and the next date for Avnet with Arrow's beside it.
- **Earnings calendar**, all companies whatever the group: "Reporting soon" (expected by now, this week, next week) with date, company, group, timing and "estimated" in words, beside "Just reported" (earnings 8-Ks in the last two weeks) with growth and operating margin once the 10-Q is in, and "10-Q not filed yet" before that. Both lists scroll inside the panel on a busy week and can be focused to scroll from the keyboard. Avnet carries its green marker; the selected company is bold.
- **One company**: a picker bar (the company, grouped by group, and "Compared with" its group or all 77; both in the URL), a one-sentence result, six KPIs with their change on a year ago, then **Trend** (one chart with a Revenue, Growth, Margins, Working capital, Cash flow switch, 12 fiscal quarters) beside **What management said** (Claude's digest of the latest earnings release: headline and six topics, each clipped to three lines with the full text in a tooltip).
- **The group table**: the company's group (or all) on each company's latest quarter, sortable, sorted by growth, with the group median under it.
- **Revenue mix** (unchanged) and the **quarterly detail**, folded.
- The default group is now the company's own; Market Cycle's group links still open the group they name. The old filter card, peer table and calendar components are removed. The new trend chart is on the shared `CHART` tokens; the shared earnings charts Company Profile uses are untouched.

Corrections from the mockup: "estimated" is plain text, growth values in "Just reported" are ink (they are values, not changes), and there is no invented ticker or "Tier 1" caption.

Changes from the brief: the calendar is not filtered by the group. Filtered to distributors it showed four releases and an empty "Just reported", which hid the season.

Checks: tests and typecheck pass. Audit fixes: the scrolling lists are focusable regions; external links say they open SEC EDGAR. Keyboard: the picker selects and the measure switch work from the keyboard. Contrast uses the same tokens as the other passes. Baseline screenshots in `docs/design/baseline/earnings-1440.png` and `earnings-1280.png`, status 200, no console errors, no overflow.
