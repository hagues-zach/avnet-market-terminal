# Data Hookups: design brief (step 2.18)

## Who and why

`/data-hookups`, under Setup. One question: **what is connected, what is still mock, what does each source need, and what do we connect next?**

- **The Avnet data team** wiring Databricks gold and silver tables into the app (phase 5). They want, per source, the exact tables, views and fields, the refresh, the mock module the connection replaces, and the pages it feeds.
- **Analysts** who need to know which numbers on a page they can quote. They want the status of every source and a way back to the pages that show it.
- **Product owners** deciding what to hook up next. They want the phase 5 order and, for each step, how many pages lose their mock marker when it lands.

Sellers are not the audience. The Learning Center already shows every source with its status in plain words ("Where the numbers come from"); this page is the technical view and links there instead of repeating it.

Today the page is four tables by pillar on the older components (`PageHeader`, `Card`, `shadow-card`, `text-muted`), with a status pill reading "Mock in place" and three count tiles. Its "used by" column is worked out from the shell specs and the legacy list, which no longer match the bespoke pages built since 2.6: Customers shows billings, customer master, backlog and DRMS, but its old spec lists only billings and customer master; Market Share shows the Gartner forecast, which its spec never listed; Start Here, Market News, Market Cycle, Company Profiles and QBR Prep show markers but have no spec route at all. Nothing on the page shows the phase 5 order.

PRD sections 10.3 and 8.1. Build plan phase 5 (5.2 to 5.9) is the order the data team will connect sources; decision 3 (query Databricks in place) answers 5.1.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| How much is connected? | Lead in words, then four KPIs: sources live, mock, planned, and pages that still show a marker | `HOOKUPS` in `src/lib/hookups.ts`; the page usage register | **Live** (the register is the app's own state) |
| What do we connect next? | The phase 5 order: steps 5.2 to 5.9, each with its sources, its status (connected, in progress, not started) and the pages that lose a marker when it lands; sources outside phase 5 listed once as "Not scheduled" | A small module mirroring the build plan's phase 5, checked against it by a test | **Live** |
| What does each source need? | The register: one table of all 25 sources, filterable by pillar and status, each row opening into tables and views, fields, refresh, the mock module to replace, notes, and the pages that use it | `HOOKUPS` | **Live**. Table names are from the PRD and not yet checked against the Databricks workspace; the page says so once |
| Which pages light up? | In each row and step: the pages using the source, linked. A page goes fully live only when every source on it is live | Page usage register (new) | **Live** |
| What is already live? | The four open data sources (SEC filings, news feeds, economic indicators, distributor line cards) with their refresh, in the same table | `HOOKUPS` | **Live** |
| What does a seller see? | One line linking to "Where the numbers come from" in the Learning Center | Link | n/a |

Nothing on this page is a mock figure. Every count is derived from the register, so the lead carries no Mock chip and no hookup marker. Mock appears only as a status word in the table, through `DataChip`.

## The usage map (the known problem)

Replace the spec-based "used by" with what each page actually shows:

- **`src/lib/data-hookups/pages.ts`**: one entry per page that shows a hookup marker: title, route, and the hookup ids its markers carry, read from the page's components (for example Customers: billings, customer master, backlog, DRMS; Code Mapping: code map, material master; Company Profiles and QBR Prep: billings, backlog, DRMS, quotes and customer master from `avnetBusinessMock`).
- **A test** that every id exists in `HOOKUPS`; that every page in `NAV` marked `mock` is listed and every listed page is in `NAV`; that the ids literally written in each page's `HookupMarker ids={[...]}` calls are all in its entry; and that the shell-spec pages (Pitch Deck Builder, Lead Finder) and the legacy-banner pages (Market Overview, Scenario Modeler, Ask the Terminal, Export Center) match the spec or legacy ids they render.
- **Remove** the `ROUTES` map and the spec and legacy loops from the page, and the legacy `/tam` entry, which no page renders any more.

## The rules

In a pure module, `src/lib/data-hookups/read.ts`, with a tsx test:

- **Lead.** "4 of 25 sources are live, all of them open data. 15 run on mock data and 6 are planned; 18 pages still show a mock marker. Next is step 5.2, the fiscal calendar and exchange rates; step 5.3, billings, bookings and backlog, reaches the most pages (13)." Counts come from the register, so the sentence changes when a status does.
- **Step status.** A phase 5 step is "Connected" when all its sources are live, "In progress" when some are, otherwise "Not started". "Next" is the first step in order that is not connected.
- **Reach.** For a step or a source: the pages that lose a marker (any of their sources clears) and the pages that become fully live (all of them do).
- **Content.** Every id in the order and the usage register exists; every step 5.2 to 5.9 in `docs/superapp-build-plan.md` has an entry; no visible text has a slash, a middle dot or an em-dash.

## Links into the rest of the app

- Every page name in a row or a step links to that page; each source name inside a hookup marker links to its row (`/data-hookups#<id>`), which opens it.
- "Where the numbers come from" in the Learning Center (`/learn#sources`), for the seller view.
- The phase 5 order names the build plan (`docs/superapp-build-plan.md`, phase 5), as text: the doc isn't served by the app.

## Layout rules

- Lead with the answer in words, then the KPIs, then what to connect next, then the register.
- Status chips are `DataChip` words (Live, Mock, Planned); step status is a neutral word chip. No coloured fills, no traffic lights, no progress rings.
- Any bar (sources live per step) is trackless; connection progress is Avnet's own, so Avnet Green.
- No working buttons for things that don't exist ("Connect", "Test connection", "Export"). Connecting happens in code; the page says how in one line.
- Table and view names in a monospace caption size, broken anywhere so they never widen the table.
- No slashes in visible text: the register's "CRD / MAD segmentation" becomes "CRD and MAD segmentation", and `pcc_level_1/2/3` is written out as three fields. No em-dashes; missing values read "n/a".
- Owners are roles ("Avnet data team"), never people.

## Taste review

Reading this as: an internal reference and planning page for the Avnet data team, analysts and product owners, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2, density 8 (a register is scanned like a spec sheet, and its readers are technical). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A schema dump with no answer.** The page today. Answer: the lead says how much is live and what comes next; the register sits below the order and opens a row at a time.
- **Integration-console theatre** (Connect buttons, health pulses, green "Connected" badges, sync timers). Answer: none. Status is a word from the register; nothing pretends to test a connection.
- **Duplicating the seller view.** Answer: one link to the Learning Center's table; this page adds tables, fields, mock modules and usage that sellers don't need.
- **A "used by" list that drifts.** The cause of the known problem. Answer: a usage register with a test that reads the pages' own marker ids.
- **Mono-type everywhere.** Answer: monospace only for table, view and field names, where it is the literal identifier.

## Mockups

- `data-hookups-a-connect-next.png`: the lead, four KPIs (live, mock, planned, pages with a mock marker), a full-width "Connect next" table with one row per phase 5 step (sources, status with "0 of N live", the pages that lose a marker, by name), the unscheduled sources in one line, then "The register" with pillar and status selects, a search and a row opened into tables and views, fields and refresh, and the pages it is used on.
- `data-hookups-b-workbench.png`: the lead, then a strip of eight step cells (5.2 to 5.9, each with "0 of N live" and how many pages it clears) that filters the register; below, the register (8 columns) with filters, a status switch and the same opened row, beside "Pages and their sources" (4 columns): each page, how many of its sources are live, their names, and an "Affected" word for pages the selected step touches.

Stitch kept to the 25 sources this time; it invented no sources, standards or indices. Drift to correct in the build:

- **Invented chrome.** A adds "As of Today 08:30 EST (Live)", a "Sales leader" role and "Enterprise Terminal" with Settings and Documentation in the sidebar; B adds "Viewing as: Data Lead", a green-dot "Live feed: 4 of 25 connected", a bell and Support. The shell comes from `nav.ts` and the app's top bar.
- **Slashes worked around badly.** Stitch rewrote `src/lib/hookups.ts` as "src.lib.hookups.ts" and "n/a" as "n.a" in A's HTML. The build keeps file paths as code identifiers in monospace, as the hookup marker already shows them, and keeps "n/a".
- **A** prints "Not started (marked Next)" as status text, sets step numbers in monospace, separates "0 of 2 live" with middle dots, puts the lead in a bordered card, and lists 13 page names in one cell, which makes the 5.3 row five lines tall.
- **B** has no KPI tiles; truncates the 5.3 cell to "Billings, bookings,..."; its status switch duplicates the status select and overflows the card ("Live 4" is clipped); its "AFFECTED" chips are all caps and push "0 of 4 live" onto two lines; it nests bordered boxes inside the opened row; and its pages list shows 6 of the 18 pages.
- Neither added buttons, version badges or coloured status fills. Both register sections run past the 2048px screenshot.

## Decision

Built variant B with variant A's four KPI tiles (chosen 2026-10-21). The rules live in `src/lib/data-hookups/read.ts`, the phase 5 order in `order.ts` and the page usage in `pages.ts`, with tests in `read.test.ts`.

- **The lead** in words, with no Mock chip: every figure is the register's own state. "4 of 25 sources are live, all of them open data. 15 run on mock data and 6 are planned; 18 pages still show a mock marker. Next is step 5.2, the fiscal calendar and exchange rates; step 5.3, billings, bookings and backlog, reaches the most pages (13)."
- **Four KPI tiles** from A: live, mock, planned, and pages with a mock marker (18 of the 24 in the navigation), each with a Live "Register" chip.
- **Connection order** from B: eight cells, 5.2 to 5.9, each with its live count, a trackless Avnet Green bar and the pages it reaches; the first step not connected carries a "Next" chip. Selecting a cell filters the register and marks its pages; selecting it again clears it. Sources outside phase 5 are listed under the strip.
- **Register**: all 25 sources with an All, Mock, Planned and Live switch whose counts follow the filters, a pillar select, a search over names, tables and fields, and Reset. Each row opens in place into three columns divided by hairlines: tables and views with the description; fields, refresh, the mock to replace and notes; the step and the pages it is used on. `/data-hookups#<id>` opens that row, and each source name in a hookup marker now links there.
- **Pages and their sources**: the 18 pages with a marker, closest to fully live first, each with how many of its sources are live and their names. When a step is selected, its pages are tinted and carry a "Step 5.x" chip, and the register's subtitle names the pages that step makes fully live.
- A closing caption says the table names are unchecked against Databricks and how to connect a source, and links to the Learning Center's "Where the numbers come from".

"Reaches" replaces the brief's "clears a marker": a marker with several sources only disappears when all of them are live, so a step reaches a page when it connects any source the page shows, and completes it when it connects the last.

**The usage map is fixed.** The spec-based "used by" is gone. `pages.ts` lists each page with the ids its markers show; the test reads each page's files and checks the ids written there match its entry both ways (literal, constant and ternary arrays), checks shell and legacy pages against their spec or banner, fails if any component draws a `HookupMarker` without being listed, and checks every id exists, every listed page is in the nav and every nav page marked mock is listed. A deliberate break (dropping DRMS from Customers) fails it. The unused legacy `/tam` entry is removed. The order test checks the steps match phase 5 in the build plan and that no source sits in two steps.

Corrections from the mockups: no invented top bar, role or sidebar items; no middle dots or monospace step numbers; no truncated step names; one status switch, not a switch and a select; no boxes nested in the opened row; all 18 pages listed. File paths and table names stay as code identifiers in monospace, with `translate="no"`. The register lost its last slashes ("CRD and MAD segmentation"; the PCC levels written out as three fields), which changes those markers on other pages.

Checks: tests and typecheck pass. Audit: the step cells and status switch are pressed buttons, rows toggle with `aria-expanded`, the search has a label, a name, autocomplete off and a placeholder ending in an ellipsis, the pillar select is labelled, the register subtitle is a polite live region, the table scrolls in a focusable region, an empty result offers a reset, identifiers are marked `translate="no"`, and headings run h1, h2, h3. Filters are not kept in the URL, as on the other pages; the row is. Keyboard: Tab reaches every control with the 2px green focus ring and Enter toggles a step. Contrast: no text on the page is below 4.5:1, including on the selected tint. No horizontal scroll or truncation at 1440px or 1280px. Baseline screenshots in `docs/design/baseline/data-hookups-1440.png` and `data-hookups-1280.png`, status 200, no console errors, no overflow.
