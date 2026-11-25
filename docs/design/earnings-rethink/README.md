# Earnings rethink: move one-company content to profiles, give Earnings a new job

Status: built on branch `claude/earnings-into-profiles` (option A with the B leaderboard). Option C is not built. Mockups are from Google Stitch, project "Avnet Market Intelligence - Direction" (`18036872963696779556`), design system "Avnet Market Intelligence v2". **Figures, quotes, guidance, "questions to ask", market caps, consensus numbers and dates in the images were made up by the generator.** Judge layout and purpose only.

## Today

| | Earnings (`/earnings?company=x`) | Company profile (`/network/x`) |
|---|---|---|
| Headline sentence | Yes | "In brief" bullets instead |
| KPI tiles | 6 (revenue, growth, gross margin, op margin, EPS, FCF) | 4 (revenue, gross margin, op margin, inventory days) |
| Trend chart | 5 measures, 12 quarters | Revenue switch only |
| Peer group table | Yes, with group median | No |
| Quarterly detail + chart modal | Yes | No |
| Management commentary, revenue mix | Linked to the profile | Yes |
| Key facts, news, distribution, Avnet business | No | Yes |
| Season: filed counts, calendar, just reported | Yes (all companies) | No |

The first five rows describe one company, and they repeat or should live on the profile. Only the season block is about all companies. Market Cycle already has a cross-company **group** scorecard, so a new Earnings page should not repeat that either.

## Part 1: the merged company profile

Mockup: `1-profile-merged.png`

Everything about one company moves to its profile. US SEC filers get the full set; foreign filers and private companies keep what they show today.

- **Header:** the Earnings headline sentence under the title, with the quarter, filing link and next results date. "Switch company" search replaces the Earnings company picker.
- **Overview:** the 6 Earnings KPI tiles replace the profile's 4. The Earnings five-measure **Trend** card replaces the profile's revenue switch. "In brief" stays.
- **Financials:** the **Quarterly detail** table with the chart modal (Income statement, Working capital, Cash and capital).
- **Peers:** the peer group table, with the company highlighted and a "Compared with" group picker. The rail gets a small "Peers at a glance" (4 rows and the median).
- **Commentary, revenue mix, news, key facts, distribution, Avnet business:** unchanged.
- **Rail:** "Next results" (this company and Arrow) joins Key facts.

Section navigation: the mockup shows tabs (Overview, Financials, Peers, Management commentary, News). I'd build them as a **sticky section bar that scrolls to sections on one page**, not separate tab panels. That keeps the page server-rendered, searchable with the browser's find, and printable, and the Ask Terminal and deck tools can keep reading one page.

**Links:** `/earnings?company=x` redirects to `/network/x#financials`; the calendar and peer tables link to profiles. The "Full earnings view" button on the profile goes away.

**Fix while building (mockup drift):** no market cap or P/E (we have no source for them), no green text ("TIER-1 BROADLINE" chip, the green bullets in In brief), and the sidebar comes from `nav.ts`.

## Part 2: what Earnings is for, three options

### Option A: Season tracker (recommended)
Mockup: `2-earnings-a-season-tracker.png`

**Job:** "What's reporting this week, what just reported, and what do I need to know before I talk to them?" Weekly prep for sellers and PMs during earnings season.

- Season headline and 4 KPIs (from today's page).
- **This week and next:** a day-by-day agenda with each company's group and relationship to Avnet (supplier, customer, competitor), timing, and an expandable "What to watch": last quarter's figures and the guidance it gave.
- **Just reported:** a 10-day feed with one plain sentence per filing and three figure chips, linking to the profile.
- **Season by group:** filed x of y, median growth this quarter against last, share growing, inventory days change.

**Data:** almost all exists (`getEarningsCalendar`, `season`, `justReported`, `roleOf`, the peer rows, the guidance field in commentary digests). New work: the per-group season table, and the "What to watch" panel from the last quarter and guidance. The mockup's "questions to ask" would be new Claude-written text; drop it or add it later. "My accounts only" needs account ownership we don't have; leave it out.

### Option B: Leaderboard
Mockup: `3-earnings-b-leaderboard.png`

**Job:** "Where does each company stand on one measure, and who moved?"

- Measure picker (growth, margins, inventory days, FCF margin, revenue) and group chips.
- Ranked bar chart (Avnet green, Arrow blue, everyone else grey) with the median marked.
- Growth against margin scatter (three colours only, as DESIGN.md allows).
- Movers since last quarter.
- A full sortable table of every company with the median pinned (today's group table, widened to all companies).

**Data:** all exists (`getPeerRows`). Mostly UI work.

### Option C: What management is saying
Mockup: `4-earnings-c-commentary.png`

**Job:** "What are managements saying this season about demand, inventory, lead times, pricing and the channel?"

- A "season read" paragraph, then one card per topic with a tone tally (improving, steady, weakening) and three paraphrases with links to the release.
- Rail: mentions of distribution (Avnet and Arrow flagged) and guidance raised, held or lowered.

**Data:** heaviest. The commentary digests have the topics but no tone, and nothing summarises across companies. It needs a tone field per topic in the digest schema, a re-run of the cached digests, and a new cross-company summary step, with the cost and "check the release before quoting" caveats that come with it.

## Recommendation

Build **A** as the Earnings page, with **B's leaderboard as a second view** on the same page ("Season" | "Leaderboard"), replacing the current group table. Add **C** later as a third view once the digests carry tone. A and B reuse data we already load; C is a separate data project.

## Build order (after you pick)

1. Profile merge: move the KPI tiles, Trend, peer table and Quarterly detail onto `/network/[slug]` behind the section bar; redirect old Earnings company links.
2. Strip the one-company sections from `/earnings`.
3. The new Earnings page (the option you pick).
4. Checks: typecheck, tests, browser at 1440 and 1280, every old `/earnings?company=` link lands on the right profile.
