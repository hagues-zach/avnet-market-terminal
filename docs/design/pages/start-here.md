# Start Here: design brief (step 2.1)

## Who and why

Everyone's home page. People open it first thing, or between meetings, to learn three things in under a minute: how Avnet is doing, where the market is, and what changed this week that matters for their job. Then they jump to the page that helps them act.

## The persona switch

There are no accounts yet (plan step 6), so the role is picked on the page, kept in the URL (`/start?role=sales`) so a link opens the same view, and remembered in the browser for next time. Five roles from the PRD, plus a neutral default:

| Role | Leads with | Start with |
|---|---|---|
| Everyone (default) | Cycle and what changed | One page per role |
| Supplier or product manager | Line card moves, supplier news, earnings from suppliers | Company Profiles, Line Cards, Market Share, Design Pipeline |
| Sales leader or regional VP | Avnet performance, customer and end-market news | Performance Tracker, Customers & End Markets, QBR Prep |
| Strategy and corporate development | Cycle, market size, Arrow | TAM / SAM / SOM, Scenario Modeler, Market Cycle |
| Executive | Avnet performance, cycle, Arrow | Market Cycle, Avnet vs Arrow, Performance Tracker |
| Analyst | Filings, data status | Code Mapping, Data Hookups, Ask the Terminal |

The role changes order and emphasis, never the numbers.

## Questions the page answers, and with what data

| Question | Section | Data | Status |
|---|---|---|---|
| Where is the market? | Highlight bar: the cycle phase in one sentence | `getCycle()` phase and latest quarter | Live |
| How is Avnet doing this quarter? | KPI row: billings, book-to-bill, backlog, share of mapped market | Mock until billings, bookings, backlog and the code map are hooked up | Mock, with the hookup marker |
| What changed this week that matters to me? | "What changed this week": one ranked list of news (with Claude's angle), franchise moves and earnings releases | `getLiveNews()` + `getNewsAngles()`, `getMoves()`, `getEarningsCalendar()` | Live |
| Who reports soon? | "Reporting this week": companies with releases in the next seven days | `getEarningsCalendar()` | Live |
| Where do I go next? | "Start with": three or four pages for the chosen role, each with one line on why | Static | n/a |

## Layout

Page title and subtitle, with the role switch on the right → highlight bar (live cycle message) → KPI row (mock, marker underneath) → 8/4 split: "What changed this week" (left) and "Start with" plus "Reporting this week" (right).

## Rules for this page

- Avnet figures stay mock and say so. No chart of mock billings on the home page.
- One highlight bar, carrying a live fact, not a mock one.
- Every list item shows its source and date. The feed shows at most eight items, with a link to Market News.
- If Claude is off, items show without angles; if a feed fails, the section says which source failed.
- No slash mark. Sentence-case card titles. One primary button at most (none needed here).

## Taste review

Reading this as: an internal briefing page for Avnet staff, calm and exact, on the Carbon-derived system in `DESIGN.md`. Dials: layout variance 3, motion 2, density 6 (slightly airier than data pages, since this is a summary). Risks to avoid: a wall of equal cards, decorative charts of mock data, eyebrow labels on every section, persona tiles that look like marketing.
