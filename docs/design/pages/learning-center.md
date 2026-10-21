# Learning Center: design brief (step 2.17)

## Who and why

`/learn`, under Knowledge. One question: **what do I need to know to use this app and to sell this technology, and where do I start?**

- **New sellers and FAEs** want a path through the app for their role, and short primers on the part families they sell: what the part is, where it's used, what to ask the customer, and who makes it.
- **Product managers and analysts** want the methods behind the numbers (market share, TAM, SAM and SOM, the code map) and what each data source is.
- **Everyone** wants a quick glossary lookup when a term on another page is unfamiliar.

Today the page is written content on the older components: a glossary, six method notes, five walkthrough titles marked "not recorded yet", and a guide per data source. It uses middle dots, "TAM / SAM / SOM" with slashes, and green text on hover. Nothing links the learning to the selling.

PRD section 8.1, and the superapp plan's Knowledge pillar and its third loop, "learning to selling": a technology module ends with which suppliers make the part and how their revenue is trending, with a way to build a pitch. DESIGN.md allows illustrations here (mono-weight line, black and green strokes, hard corners, green for 15 to 30% of the drawing, on white or Light Gray), made with Nano Banana. This is the one page where they belong.

## Questions and data

| Question | Section | Data | Status |
|---|---|---|---|
| Where do I start? | Learning paths by role: seller, FAE, product manager, sales leader. Four or five steps each, every step a page in the app or a primer | Written content | n/a |
| What is this part, and how do I sell it? | Technology primers: microcontrollers, SiC MOSFETs, MLCCs, connectors, FPGAs, power management ICs. Each: what it is, where it's used, questions to ask the customer, an illustration | Written content; Nano Banana illustrations | n/a |
| Who makes it, and are they growing? | In each primer: the suppliers in the app that make it, their latest revenue growth on a year ago, links to their Company Profiles, and a line on how many are growing | `getPeerRows()` (SEC filings) | **Live** |
| What does this term mean? | Glossary, searchable, A to Z | Written content | n/a |
| How is this number calculated? | Methods: market share, TAM, SAM and SOM, fourth quarters, the cycle label, earnings dates, AI summaries, the code map | Written content | n/a |
| Where does each number come from? | Data source guides from the hookups register: what it is, how often it refreshes, and whether it is live, mock or planned | `src/lib/hookups.ts` | Live register |
| Can I watch it? | Walkthroughs, shown as Planned | n/a | **Planned** |

Supplier lists are public facts about who makes the part; they say "suppliers in the app that make it", not "on Avnet's line card", because Avnet's line card isn't imported yet (Line Cards, step 2 of the superapp plan).

## The rules

In a pure module, `src/lib/learn/read.ts`, with a tsx test:

- **Maker trend.** For a primer's suppliers with a latest quarter: "4 of 5 makers grew revenue on a year ago; the median is +12%." Suppliers without a filing are named as not available.
- **Glossary search.** Matches term and definition, not case-sensitive; results grouped by first letter.

## Links into the rest of the app

- Every path step links to its page (Start Here, Market News, Company Profiles, QBR Prep, Market Share, Code Mapping and so on).
- Primer suppliers link to Company Profiles; each primer links to Pitch Deck Builder ("Build a pitch", a shell for now).
- Methods link to Market Share, TAM, SAM and SOM, Code Mapping and Market Cycle; source guides to Data Hookups.

## Layout rules

- Lead with the answer: one line on what's here, then the paths by role, as a switch.
- Primers as a grid of six, each with its illustration; the illustrations are the only images and sit on Light Gray.
- Supplier growth is the market, not Avnet, so it is ink with arrows (no green or red); no green in any chart.
- Glossary in two columns with a search above it; methods and source guides below.
- No em-dashes, no middle dots, no slashes ("TAM, SAM and SOM").
- Walkthroughs are one line with a Planned chip, not a list of dead items.
- No primary button; links are text.

## Illustrations (Nano Banana)

Six, one per primer, about $0.04 each, generated after the mockup is approved. Brief for each: a mono-weight line drawing of the part (a QFN microcontroller, a TO-247 SiC MOSFET, a row of MLCC chips, a board-to-board connector pair, an FPGA on a BGA package, a power management IC with an inductor), black lines with Avnet Green #41C363 for 15 to 30% of the drawing, hard corners, no text, no shading, no gradients, on white, 4:3. Stored in `public/learn/`. Never the slash mark; the A-Frame only if it fits naturally.

## Taste review

Reading this as: an onboarding and reference page for Avnet sellers, FAEs and product managers, in the calm, exact Carbon-flat language of DESIGN.md, with the one set of brand illustrations the app allows. Dials: layout variance 4 (the primer grid gives it a little more rhythm than a data page), motion 2, density 5 (it is read, not scanned). Light only. The skill targets landing pages; here it is used for the read, the dials and the risk review only, and DESIGN.md governs.

Risks found and how the brief answers them:

- **A wall of definitions.** The page today. Answer: start with paths by role and primers; the glossary is searchable and further down.
- **Course-platform clichés** (progress rings, badges, streaks, quizzes with confetti). Answer: none. Quizzes are a later step; nothing pretends to track progress.
- **Stock-photo or 3D-render illustrations.** Answer: brand line art only, six, consistent.
- **Dead links for unrecorded videos.** Answer: one line, Planned.
- **Implying Avnet carries a supplier.** Answer: "suppliers in the app that make it", until Avnet's line card is imported.

## Mockups

- `learning-center-a-paths.png`: a one-line lead, learning paths with a role switch and five steps in a row, the six primers as a 3 by 2 grid (illustration, one line, who makes it with growth, "Read the primer"), then glossary beside methods, a table of data sources, and one Planned line for walkthroughs.
- `learning-center-b-one-primer.png`: a rail of sections (paths by role, the six primers, glossary, methods, data sources, walkthroughs) beside one primer open as a reading page: a large illustration, what it is, where it's used, questions to ask the customer, who makes it (a table with growth and profile links, the maker trend line and the line-card note), "Build a pitch", related terms, and previous and next primer.

Stitch made up every figure, and most of the facts around them. Drift to correct in the build:

- **Suppliers the app doesn't have.** A lists STMicroelectronics, Infineon, Murata, Yageo, TDK, Taiyo Yuden, Molex and "Intel Altera" with growth figures; none file with the SEC in the app's set, so they can't carry live growth. The build lists only suppliers in `COMPANIES`, with live growth from their filings.
- **Invented methods and sources.** A rewrites the methods (point-of-sale billings, "second-derivative inflection in producer prices", Thomson Reuters earnings dates, "ISO 9001:2015") and the source list (London Metal Exchange, a live ECIA index, a "Supply chain velocity index"). The build keeps the app's own method notes and builds the source table from the hookups register. A's glossary definitions are rewritten too ("design registration: exclusive commercial margin protection"); the build keeps the app's.
- **Colour.** A colours supplier growth green and red; it's the market, so it stays ink with arrows. Both set card titles in all caps.
- **B** names product families per supplier ("EliteSiC", "mSiC") that the app can't check, nests related terms in boxes, and adds "See SiC in Market News", which Market News can't filter to yet.
- Both add "Print guide" and "Export notes" buttons, version badges, "Complete dictionary (142 terms)", "Curriculum release Q1 2027", and their own sidebars.

Stitch also drew a sample TO-247 illustration for B. It is close to the style asked for (black line, green accents, Light Gray), with dimension lines and a dotted die outline the brief doesn't need; the Nano Banana set will follow the brief.

## Decision

Built variant A as the overview at `/learn` and variant B's reading layout for each primer at `/learn/[primer]` (chosen 2026-10-21), with the six Nano Banana illustrations. Content lives in `src/lib/learn/content.ts`; the rules in `src/lib/learn/read.ts`, with tests in `read.test.ts`.

- **`/learn`**: one line on what's here; **Learning paths** with a role switch (seller, FAE, product manager, sales leader) and five linked steps each; **Technology primers** as a 3 by 2 grid (illustration, one line, who makes it with live revenue growth, "Read the primer"); **Glossary** with a search that matches terms and definitions, grouped A to Z, beside **How numbers are calculated**; **Where the numbers come from**, a table built from the hookups register with a Live, Mock or Planned chip per source; and **Walkthroughs** as one Planned line.
- **`/learn/[primer]`**: a rail of sections (paths, the six primers with the current one marked, reference) beside the primer: illustration, what it is, where it's used, five questions to ask the customer, **Who makes it** (a table of the suppliers in the app with their latest quarter and revenue growth, Prepare a QBR, and the maker trend line, e.g. "2 of 3 makers grew revenue on a year ago; the median is +9%."), "Build a pitch", related terms, and previous and next. An unknown primer is a 404.
- Makers are slugs in `COMPANIES` only: Microchip, NXP, Texas Instruments and Silicon Labs for microcontrollers; Wolfspeed, onsemi and Microchip for SiC; Vishay for MLCCs; Amphenol, TE Connectivity and Bel Fuse for connectors; Lattice, AMD and Microchip for FPGAs; Texas Instruments, Analog Devices, Monolithic Power, Power Integrations and onsemi for power management. Intel is left out of FPGAs because Altera is now run separately. Growth is market data, so it is ink with arrows.
- The illustrations are in `public/learn/`, 960px wide, cropped to 16:9 in the page. They cost about $0.51 for six (Nano Banana 2 at 1K, about $0.085 each), not the $0.04 each estimated above.

Corrections from the mockups: no suppliers the app has no filings for (A listed STMicroelectronics, Infineon, Murata and others), no invented methods or sources, no product family names, no green or red growth, no boxes around related terms. The hookups register lost its last slash ("TAM, SAM and SOM tables") and an en-dash ("Every 6 to 12 hours"), which changes those markers on other pages. The primer page is added to the baseline script's routes.

Checks: tests and typecheck pass; the test also checks every maker is in `COMPANIES`, every primer has its image, and no text has a slash, middle dot or em-dash. Audit: the role switch is a group of pressed buttons; the glossary search has a label, a name, autocomplete off, a placeholder ending in an ellipsis and a polite live count; the source table scrolls in a focusable region; images on the overview are decorative links hidden from screen readers next to the real links, and the primer image has alt text; the rail marks the current primer with `aria-current`. Search, the role switch and the 404 were tried in the browser. Baseline screenshots in `docs/design/baseline/learn-1440.png`, `learn-1280.png`, `learn-sic-mosfets-1440.png` and `learn-sic-mosfets-1280.png`, status 200, no console errors, no overflow.
