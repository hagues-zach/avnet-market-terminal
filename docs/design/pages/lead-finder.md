# Lead Finder: design brief (step 2.22)

## Who and why

`/tools/leads`, under Tools. One question: **who should I call about this technology, and why now?**

- **Sellers and FAEs** with a technology or a supplier to sell: which customer companies build with it, which are growing, and what was said about them lately.
- **Sales leaders** looking for where a line could grow: the customer groups that use a technology and how fast they are moving.
- **Loop 2 of the superapp plan ("gap to pitch")** passes through here: a supplier missing from the line card, the explainer for its technology, a lead list, then a deck. Lead Finder is the lead list.

Today the page is a shell drawn from `LEADS_SPEC`: a search form with a "Find companies" button that does nothing, three mock prospects ("Prospect 1" hiring power engineers), an "Avnet customer?" column, and a Treg enrichment line marked "To build". Nothing is live, and nothing says why a company is on the list.

PRD personas 1 and 2; build plan step 3.6 makes it work in full ("search and ranking from public signals; Treg enrichment on request"). This pass designs the page so 3.6 has a layout to fill, and ranks what the app can already rank.

## What the app can rank today

The only companies the app has live data on are its 77 SEC filers; 23 of them are customer companies (five hyperscalers, five device and systems makers, three carmakers, five industrial OEMs, five contract manufacturers). Each has live revenue, growth on a year ago and inventory days from its filings, and its own news. The six Learning Center primers say where each technology is used, which maps to those customer groups.

So the page ranks **those 23 companies, for a technology**, on live signals, and is plain that private and mid-size prospects arrive with 3.6. Large public companies are real accounts for an Avnet seller (contract manufacturers above all), so the list is useful now, not a placeholder.

| Technology (primer) | Customer groups that use it |
|---|---|
| Microcontrollers | Automotive, Industrial OEMs, Devices and systems, Contract manufacturers |
| SiC MOSFETs | Automotive, Industrial OEMs, Contract manufacturers |
| MLCCs | All five |
| Connectors | All five |
| FPGAs | Hyperscalers, Devices and systems, Industrial OEMs, Contract manufacturers |
| Power management | All five |

Contract manufacturers build for every market, so they fit every technology.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Who should I call? | Lead in words: the top two or three companies for the technology and why ("For SiC MOSFETs, Sanmina, Tesla and Caterpillar lead: their markets use the part and revenue is up more than 20% on a year ago.") | The ranking below | **Live** |
| What am I looking for? | Inputs: technology (the six primers), customer group (all or one), and "only with news on it" | Primers, cohorts | Works now (filtering over the app's data) |
| Who, ranked, and why? | The lead list: company, group, revenue and growth (latest quarter), inventory days, the reasons it showed up in words, Avnet's billings with it, and actions | `getPeerRows()`, `getCompanyNews()`, `avnetBusinessMock()` | **Live** (SEC, news); Avnet's billings **Mock**, with a Mock chip in its column header and the hookup marker under the table |
| What was said lately? | For the selected lead: its latest stories that mention the technology or the company, with dates and outlets | `getCompanyNews()` | **Live** |
| What next? | Per lead: Company Profile, Prepare a QBR, Build a pitch (to the deck, with the technology) | Links | Works now |
| What about private companies, hiring and contacts? | One Planned line: Treg enrichment (paid per call) and public signals beyond SEC filers, step 3.6 | n/a | **Planned** |
| Where are the gaps on the line card? | A note that white space needs Avnet's own line card imported; until then a supplier in the URL picks its technology | Line card store | **Planned** (Avnet's line card isn't imported) |

## The ranking (rule)

In a pure module, `src/lib/leads/rank.ts`, with a tsx test:

- **Fit.** A company is on the list only when its customer group uses the technology (the table above).
- **Signals.** Each is a reason in words, from live data only: revenue up 10% or more on a year ago ("Revenue up 25.5% on a year ago"); a story in the last 30 days mentioning the technology ("In the news on SiC: Nov 3"); inventory days down on a year ago ("Inventory down to 53 days from 61", a sign it may restock). A missing figure is never a reason.
- **Order.** Most signals first, then faster growth, then name. The score is a count, shown as the reasons themselves, never as a "fit score" number or a High, Medium, Low chip.
- **Lead.** The top two or three in words, with the reasons they share; "No customer company in the app uses X" when none fit.
- **Content.** Every primer maps to at least one group; every company in the list is a customer company; every link routes; no visible text has a slash, a middle dot or an em-dash.

## Starting a lead list from elsewhere

The URL carries it: `/tools/leads?primer=sic-mosfets`, `/tools/leads?supplier=wolfspeed` (its technology from the primers' makers), `&group=automotive`. New links: the primer's "Who makes it" section gains "Find leads" beside "Build a pitch", and the supplier's Company Profile can follow in 3.6.

## Links into the rest of the app

- Every lead links to its Company Profile, to QBR Prep (`?company=<slug>&meeting=customer`) and to Pitch Deck Builder (`?company=<slug>&primer=<primer>&from=leads`).
- The technology links to its primer; the growth and inventory columns to Customers & End Markets and Market Cycle.
- The mock billings column's marker names billings and the customer master and links to Data Hookups.
- **Pitch Deck Builder's "A lead list" slide** (Planned for 2.22 today) becomes available when the deck has a technology: the top five leads with their reasons, live. To confirm at the review, since it changes the deck.

## Layout rules

- Lead with the answer in words; it rests on live data, so no Mock chip.
- The list is the primary visual: one table, full width, 40px comfortable rows (sellers scan it before calls).
- Reasons are words, not scores or coloured chips. Growth uses an arrow in neutral ink (growth isn't good or bad for us on its own).
- The mock column carries a Mock DataChip stacked under its header label; the live columns a Live chip; the hookup marker sits directly under the table.
- No "Find companies" button: the inputs filter in place. Enrichment appears once as a Planned chip.
- Company names are real because the companies are real and the data is live; nothing mock is attached to a placeholder name.
- No em-dashes or en-dashes, no slashes, "n/a" for missing values, dates as "Nov 5".

## Taste review

Reading this as: an internal prospecting tool for Avnet sellers and FAEs over the app's live company data, in the calm, exact Carbon-flat language of DESIGN.md. Dials: layout variance 3, motion 2 (filters update the list in place), density 6 (a ranked list read before a call). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **Invented prospects.** The shell's "Prospect 1, hiring power electronics engineers" is a signal the app doesn't have. Answer: only real companies with live reasons; private prospects are Planned.
- **A magic fit score.** "High, Medium" with no basis. Answer: the reasons are the ranking, in words.
- **A search button that does nothing.** Answer: inputs filter in place; nothing to submit.
- **Mock relationship data passed off as real.** Answer: Avnet's billings column is marked Mock in its header with the marker under the table.
- **A dead end.** Answer: every lead goes on to a profile, a QBR or a deck, with the technology carried along.

## Mockups

- `lead-finder-a-ranked-list.png`: the lead, one control row (technology with "Read the primer", customer group as a segmented switch, "Only with news on it", Reset), then "The lead list" as one full-width table: company and group, revenue, growth, inventory days (each with a Live chip under its header), "Why it showed up" in words, Avnet billings (Mock chip under its header) and Profile, QBR and Pitch links, with the hookup marker under the table and a source caption.
- `lead-finder-b-list-and-lead.png`: the lead, a control bar card, then a ranked list (rank, company, group, growth, a short reason) beside the selected lead: three figure tiles (revenue, growth, inventory days against a year ago), "Why it showed up" in sentences, "In the news" with three stories, "Avnet's business with Tesla" with its Mock chip and marker, and Company Profile, Prepare a QBR and Build a pitch; the Planned line for 3.6 at the foot.

Figures in the prompts are real, read from Customers & End Markets on Oct 21: each company's latest-quarter revenue, growth on a year ago and inventory days, and the groups that use SiC MOSFETs (13 companies). Illustrative only: Tesla's inventory a year ago (61 days), the three Tesla stories in B, and every Avnet billings and backlog figure (the build reads them from the shared mock model that Company Profile and QBR Prep use). The order in A follows my prompt, not the rule: Plexus (+28.1%) sits below Caterpillar (+24.0%); the build orders by the rule.

Drift to correct in the build:

- **Invented chrome.** Both rebuilt the sidebar: A with an "Avnet Intelligence, Market Analytics" header and a Support link; B with Market Share under Knowledge, Supply Chain under Network, Settings, and a "Data Freshness: Live" line with a green icon. The sidebar comes from `nav.ts`.
- **Invented labels.** B adds "Sorted by signal", colons after its control labels ("TECHNOLOGY:"), "MOCK" in capitals and its three buttons in capitals. A colours "Read the primer" blue.
- **A** wraps company names and groups onto two or three lines and puts a Live chip under "Company", which is a name, not a figure.
- **B** shows reasons only for some rows, and the selected lead's figure tiles sit inside the card (cards inside cards).
- Neither added a fit score, High or Low chips, a Search button, version labels, names of people or the slash mark.

**Recommendation:** B, with A's control row (the segmented customer group and "Read the primer") and A's "Where these come from" note. B answers "why now" for one company at a time: its reasons, its news and Avnet's business with it, each under its own heading, so the mock figures sit apart from the live ranking instead of in a column beside it. The list stays compact enough to scan, and the three actions carry the technology on to QBR Prep and the deck. A is better for scanning many companies at once; if you'd rather have that, its table works with the mock column marked as shown.

**Also for the review:** Pitch Deck Builder's "A lead list" slide is Planned for this step. Building it means the deck gains a slide with the top five leads for its technology, live. It changes another page, so it is yours to decide.

## Decision

Built variant B with A's control row and A's "Where these come from" note (chosen 2026-10-21), and Pitch Deck Builder's lead-list slide with it.

The ranking is in `src/lib/leads/rank.ts` (pure, tested in `rank.test.ts`): the five customer groups, which groups use each primer's technology, the words that put a story on the technology, the reasons, the order, the lead, the URL and its parsing. The data is in `data.ts` (server-only): each customer company's latest quarter from its filings, its stories from one read of the news feed, and Avnet's business with it from `avnetBusinessMock()`, so Lead Finder, Company Profile and QBR Prep show the same mock figures.

- **The lead**: "For SiC MOSFETs, Plexus, Tesla and Caterpillar lead: their markets use the part, revenue is up 24% or more on a year ago and inventory is down on a year ago." It follows the filters ("among carmakers") and says plainly when nothing matches.
- **The controls**: technology (with "Read the primer" on its label line), customer group as a switch of the groups that use it, "Only with news on it", Reset. They filter in place and update the URL without a reload; a new technology loads its list.
- **The ranked list**: rank, company, group, every reason in words, and growth in neutral ink with an arrow; a Live chip in its header and the source line at its foot.
- **The selected lead**: revenue, growth and inventory days against a year ago in one row (no cards inside the card), why it showed up (including where the primer says its market uses the part), its latest three stories with "On SiC MOSFETs" where they mention it, Avnet's business with it under a Mock chip with the hookup marker directly under, and Company Profile, Prepare a QBR and Build a pitch.
- **Where these come from** and **Not here yet**, with one Planned chip for private companies, hiring signals and contacts (step 3.6) and a note that line-card gaps need Avnet's line card imported.

Starting points: `?primer=…`, `?supplier=…` (its technology from the primers' makers, with "Showing SiC MOSFETs, which Wolfspeed makes."), `&group=…`, `&news=1`; unknown values are noted, never an error. The primer's "Who makes it" now has "Find leads" beside "Build a pitch". Build a pitch opens the deck with the company and the technology (`?company=tesla&primer=sic-mosfets&from=leads`): a customer pitch for Tesla on SiC MOSFETs, "Started from Lead Finder for Tesla."

**The deck's lead-list slide**, "Who buys it", replaces the Planned "A lead list". It is available whenever the deck has a technology (from a supplier's primer or a primer in the URL), goes in the supplier pitch after "Who carries it", and shows the top five from the same ranking: company and group, growth, and the reason beyond growth. It reads SEC filings and news, so it is Live. A supplier pitch for Microchip now reads "10 slides: six on live data and two on mock".

Seen in the live data on 2026-10-21: for SiC MOSFETs, 13 companies; Plexus, Tesla, Caterpillar and Benchmark Electronics lead on growth and lower inventory; Sanmina (+69.7%) comes fifth because its inventory isn't down on a year ago. For SiC MOSFETs and microcontrollers, no customer company's recent stories mention the technology by name, so the news reason is rare today; it is shown when it appears.

One fix outside the page: every call to `getCompanyNews()` re-reads the whole news feed. With 23 at once on a cold cache, a GDELT read timed out and the page's data never reached the browser, so the list didn't respond to clicks. `company-news.ts` now exports `newsFor()` (the same matching over a feed already read) and Lead Finder reads the feed once.

Corrections from the mockups: the sidebar from `nav.ts`, no "Sorted by signal", no colons after labels, buttons in sentence case, the figures in a row rather than tiles in the card, reasons on every row, real Avnet figures from the shared mock model, and the order from the rule.

Checks: tests and typecheck pass. Audit: the technology select has a label, a name and autocomplete off; the group switch is pressed buttons in a labelled group; the checkbox is wrapped in its label; the lead is a polite live region; the list's rows are buttons with `aria-current`; story links say they open the source; the loading text ends in an ellipsis; the empty state says why and offers Reset. Keyboard: Tab moves through the controls in order with the 2px green ring and Enter picks a group. Contrast: nothing below 4.5:1 (the marker's translucent tint skipped). At 1280px the controls fit on one row (after moving "Read the primer" onto the label line), with no horizontal scroll or truncation. Baseline screenshots in `docs/design/baseline/tools-leads-1440.png` and `tools-leads-1280.png`, with `tools-deck-*` updated for the new slide; status 200, no console errors, no overflow.
