# Avnet Superapp build plan

The working plan for turning the PRD into the finished app, one step at a time. It sits under the strategy in `docs/superapp-plan.md` and the product requirements in the PRD ("AMI Superapp", Google Doc, Oct 15 2026).

Last updated: 2026-10-27

## Where it stands

| Phase | Status |
|---|---|
| 0. Shells | Done |
| 1. Design foundation | Done |
| 2. Page design passes | Done, all 23 pages |
| 3. Make the tools work | 3.1 to 3.3 done; 3.4 to 3.6 open |
| 4. Foundations | 4.1 storage built for Avnet's database, not yet run against a real one (PR #48 adds the live check); 4.2 not started; 4.3 CI and container done, sign-in not |
| 5. Hook up real data | 5.1 decided; the Avnet data layer and Databricks adapter are on branch `avnet-data-layer`, not merged; 5.2 to 5.9 wait on the data team |

Next: run `pnpm check:store` on the Avnet machine, open a PR for `avnet-data-layer`, then choose between 3.4 to 3.6 and 4.2.

## How the PRD maps onto the app

The PRD's three pillars are **data** pillars (open, licensed, Avnet internal). The app's navigation is organised by **what people do**. Both are kept:

| Navigation group | Pages | PRD modules |
|---|---|---|
| Start Here | Start Here | 8.3 onboarding, persona 4 summary |
| Knowledge | Market News, Market Overview, Market Cycle, Economic Signals, Learning Center | 1, 6, 8.1 |
| Network | Company Profiles, Quarterly Earnings, Avnet vs Arrow, Line Cards | 3 (competitive context), persona 1 |
| Avnet performance | Performance Tracker, Market Share, TAM / SAM / SOM, Supply Chain, Design Pipeline, Customers & End Markets | 2, 3, 4, 5, 7, 8 |
| Tools | QBR Prep, Pitch Deck Builder, Lead Finder, Scenario Modeler, Code Mapping, Ask the Terminal, Export Center | 6 (code mapping), personas 1–5 |
| Setup | Data Hookups | 10.3, 8.1 data source guides |

Every number carries its data pillar: badges and the Data Hookups page say whether it is open, licensed, internal or derived, and whether it is live, mock or planned.

## Conventions already in place

- **Shell pages** are described as data in `src/lib/shells/specs.ts` and drawn by `src/components/shell/shell-page.tsx`. A design pass replaces a page's sections with bespoke components; the spec records what each section must answer.
- **Mock data** for anything Avnet-specific or licensed lives in `src/lib/shells/mock-*.ts` and the older `src/lib/data/mock/*`. It is synthetic. Supplier, customer and prospect names are withheld.
- **Hookup markers.** Every mock section shows a dashed yellow "Mock data. Hook up: …" bar that expands to the tables, fields and the file to replace. Mock pages carry a small yellow ring in the sidebar.
- **One register.** `src/lib/hookups.ts` lists every source with its status. Changing a status to `live` clears the markers everywhere it is used.

## Design toolchain

From the global toolkit. Each design step below names which of these it uses.

| Tool | Used for |
|---|---|
| awesome-design-md | Starting `DESIGN.md` from the closest real brand system |
| Taste skill (`design-taste-frontend`) | Design direction and anti-template review before each page |
| UI UX Pro Max | Type scale, spacing, density, chart and table rules, UX checks |
| Google Stitch | High-fidelity mockups of each page, from the shell spec |
| Image-to-Code | Building a page to match its approved mockup |
| 21st.dev Magic | Production components (tables, filters, command menu). **Needs its API key re-authorised first.** |
| Nano Banana 2 | Illustrations for the Learning Center, empty states and onboarding (about $0.04 per image) |
| web-design-guidelines | Audit after each page is built |
| Playwright CLI | Screenshots, click-throughs and regression checks |

Brand inputs already on disk: `~/avnet-repos/cellular-module-iot/assets/avnet-brand-guidelines.md` (palette, type, data-viz rule) and the PDFs in `~/avnet-repos/tam/brand/`.

## Phase 0. Shells (done)

- [x] Every PRD module and tool has a page in the navigation, grouped as above.
- [x] Ten new shell pages, five older mock pages unhidden with banners, Learning Center, Data Hookups.
- [x] Mock data for Avnet-specific figures, with a hookup marker on every mock section.

## Phase 1. Design foundation

Do these in order; every page pass in phase 2 depends on them.

Progress: 1.1 done (`DESIGN.md`). 1.2 done, pending your review (direction note and three Stitch reference screens in `docs/design/reference/`). 1.3 done: semantic tokens in `tailwind.config.ts` (existing classes unchanged), validated chart palette and shared chart tokens in `src/lib/colors.ts`. 1.4 done: Stitch design system "Avnet Market Intelligence v2" (`assets/12368506614593897195`, without the slash mark) in project `18036872963696779556`, created from `docs/design/stitch-design.md` (built by `node scripts/stitch-design-md.mjs`), tested with an Avnet vs Arrow screen. 1.5 done: component kit in `src/components/ui` and a new shell in `src/components/layout/app-*.tsx`, shown at `/design-kit` (screenshots in `docs/design/kit/`); old components stay until 1.6. 1.6 done: every page runs on the new shell (sidebar drawer below 1024px, skip link); `Card`, `PageHeader`, `KpiCard`, `SourceChip` and `DataHookup` keep their props but draw the new design; web-design-guidelines audit fixes applied; baseline screenshots of all 26 pages at 1440px and 1280px in `docs/design/baseline/` (rebuild with `scripts/baseline-screenshots.js`). Phase 1 is complete; chart-level fixes are listed in DESIGN.md for the phase 2 page passes.

| Step | Goal | Tools | Done when |
|---|---|---|---|
| 1.1 Brand to `DESIGN.md` | One design document from the Avnet guidelines, started from the closest brand in awesome-design-md | awesome-design-md, Avnet brand files | `DESIGN.md` in the project root, reviewed by you |
| 1.2 Direction | Decide density, tone and the look of a data-dense enterprise tool; decide dark mode yes or no | Taste skill, UI UX Pro Max | A short direction note added to `DESIGN.md` with three reference screens |
| 1.3 Tokens | Type scale, spacing, radii, elevation, chart palette and status colours as tokens; validate chart colours | UI UX Pro Max, dataviz validator | `tailwind.config.ts` tokens updated; palette passes the validator |
| 1.4 Design system in Stitch | Import `DESIGN.md` so every mockup starts on-brand | Stitch (`create_design_system_from_design_md`) | Stitch design system created |
| 1.5 Component kit | App shell (sidebar, top bar, page header), KPI tile, data table, chart card, filter bar, hookup marker, empty, loading and error states | Stitch, 21st.dev Magic, Image-to-Code | Components in `src/components/ui` with a gallery page |
| 1.6 Apply and baseline | Swap the shared shell and components in; audit; take baseline screenshots of every page | web-design-guidelines, Playwright | Audit clean; screenshots saved for regression |

## Phase 2. Page design passes

One step per page. Each uses the same recipe:

1. **Brief.** Start from the page's shell spec: who it is for, the questions it answers, its sections and data. Taste skill review of the brief.
2. **Mockup.** Stitch mockup on the design system; two variants for key pages.
3. **Review.** You pick or redirect.
4. **Build.** Image-to-Code against the approved mockup, replacing the shell sections. Hookup markers stay on anything still mock.
5. **Check.** web-design-guidelines audit, Playwright screenshots at desktop and laptop widths, keyboard and contrast check.

Order, by how often sellers and leaders will open the page:

- [x] 2.1 Start Here, including the persona switch (hybrid layout; brief and mockups in `docs/design/pages/`)
- [x] 2.2 Company Profile (dossier layout; brief and mockups in `docs/design/pages/`)
- [x] 2.3 QBR Prep (document-first layout with live sections; brief and mockups in `docs/design/pages/`)
- [x] 2.4 Market Share (scorecard layout with live Avnet against Arrow and growth against makers; brief and mockups in `docs/design/pages/`)
- [x] 2.5 TAM / SAM / SOM (funnel first with a category table and a live forecast check; brief and mockups in `docs/design/pages/`)
- [x] 2.6 Performance Tracker (operating view, live reported revenue; one shared mock model of Avnet now feeds every page; brief and mockups in `docs/design/pages/`)
- [x] 2.7 Line Cards (briefing then reference on live data; Avnet's line card still to import; brief and mockups in `docs/design/pages/`)
- [x] 2.8 Market News (briefing layout: Claude's top stories beside topics this week, with Avnet's mock billings per topic, then the filtered feed; links into Company Profile and QBR Prep; brief and mockups in `docs/design/pages/`)
- [x] 2.9 Market Cycle (readout layout: the call in words, the supply chain as five stages with Avnet and Arrow inside distribution, growth by quarter beside Avnet's mock order book, inventory and end demand, then the group scorecard; brief and mockups in `docs/design/pages/`)
- [x] 2.10 Avnet vs Arrow (the verdict, a full-width scorecard, each side's strengths with rule-written talking points, both managements' commentary, franchise moves and components against components, trends folded; all live; brief and mockups in `docs/design/pages/`)
- [x] 2.11 Quarterly Earnings (season first: who has filed, the calendar for all companies and who just reported; then one company with its trend, management commentary and its group with a median; all live; brief and mockups in `docs/design/pages/`)
- [x] 2.12 Supply Chain (a tightening or easing read over three live signals, a by-category table with mock lead times and purchasing beside live prices and supplier quotes, chain inventory, prices and metals, supplier commentary and supply news, Avnet's mock order book; brief and mockups in `docs/design/pages/`)
- [x] 2.13 Design Pipeline (funnel first, then the pipeline by supplier, segment or end market with a drill-down funnel per row and live customer growth by end market; the mock pipeline joins the shared model of Avnet; brief and mockups in `docs/design/pages/`)
- [x] 2.14 Customers & End Markets (the market that added the most growth in words, a full-width end-market table with mock billings beside live customer-group growth and an "against demand" read, a dot plot of the two, the ten largest accounts withheld, then the 23 public customer companies linking to Company Profile and QBR Prep; concentration and accounts join the shared model of Avnet; brief and mockups in `docs/design/pages/`)
- [x] 2.15 Economic Signals (readout layout, all live: the backdrop in words from four rule-written reads (demand, costs, financing, dollar), production beside utilisation, then every indicator in one card with a switch per group; the cycle engine behind a proprietary "Semiconductor Economic Coincident Index" is built on public data (Phases 0 to 4 and the Asian sources, PRs #44 and #45; see `docs/cycle-engine.md`) and shown at `/signals/engine`; redesigning this page around it is still to do (the engine plan's Phase 5); brief and mockups in `docs/design/pages/`)
- [x] 2.16 Code Mapping (workbench: coverage in words and four KPIs, a segment strip that filters, then one table of mappings switched between needs review, validated and not mapped, each row opening into its definition, reason and history; accept, edit and reject shown as planned for 3.5; the code map joins the shared model of Avnet; brief and mockups in `docs/design/pages/`)
- [x] 2.17 Learning Center, with Nano Banana illustrations (paths by role, six technology primers with brand line illustrations, each opening into a reading page that ends with the suppliers in the app that make the part and their live growth, then a searchable glossary, the methods and every data source; brief and mockups in `docs/design/pages/`)
- [x] 2.18 Data Hookups (the register in words with four KPIs, the phase 5 order as a strip of steps that filters the register, each source opening into its tables, fields, mock to replace and pages, beside every page with a marker and how close it is to live; "used on" now comes from a page usage register checked against each page's markers; all live from `src/lib/hookups.ts`; brief and mockups in `docs/design/pages/`)
- [x] 2.19 Scenario Modeler (the scenario in words, four KPIs, one control bar with horizon, market view, share presets and goal seek, then the model by segment with growth and share editable in each row, billings to the horizon against holding share, a bridge of market and share, and a reality check against what Avnet, Arrow and the supply chain reported (live); base growth is a mock per-segment forecast standing in for WSTS, Gartner and the IP&E forecast, swapped when 5.5 lands; brief and mockups in `docs/design/pages/`)
- [x] 2.20 Ask the Terminal (a question in the URL goes to one of nine answerers over the app's own data: companies, Avnet against Arrow, the cycle, the economy, supply, the earnings season, news, line cards, and Avnet's business as mock; each answer is a sentence, its figures, sources and the page, quoting cached Claude text where it exists, and anything else says what it can answer instead; the answerers become Claude's tools in 3.2; brief and mockups in `docs/design/pages/`)
- [x] 2.21 Pitch Deck Builder and Export Center (merge) (one page at `/tools/deck`, `/export` redirects there and Export Center left the nav: the deck in words, the outline beside a 16:9 preview of the selected slide, what a finished export needs with export Planned for 3.3, then the slide library; every slide is a view the app already has, Live or Mock from the hookups register, previewed through the Ask the Terminal answerers and the shared mock model; decks start from a company, QBR Prep, a primer, a scenario or one view, carried in the URL; brief and mockups in `docs/design/pages/`)
- [x] 2.22 Lead Finder (list and lead: the 23 public customer companies whose market uses a technology, ranked on live reasons in words (growth, news on the technology, inventory down), beside the selected company with its news, Avnet's mock business with it and Profile, QBR and pitch; filters in the URL, starting from a primer or a supplier; private companies and enrichment Planned for 3.6; Pitch Deck Builder's "Who buys it" slide now live from the same ranking; brief and mockups in `docs/design/pages/`)
- [x] 2.23 Market Overview (the market by year as published WSTS totals with the 2026 forecast outlined, then what carried the growth: DRAM, Flash, MPUs, GPUs and AI accelerators against the rest as mock until WSTS detail and the Gartner forecast are hooked up, beside the WSTS categories as published and this quarter's growth by company group (live); the forecast by vintage, regions, the economic backdrop and the latest market stories; retires the legacy banner, the shell renderer and the old components, so every page now runs on the current kit; brief and mockups in `docs/design/pages/`)

## Phase 3. Make the tools work

Functional builds that do not need internal data.

- [x] 3.1 QBR Prep: ~~assemble the brief from live public data (profile, commentary, news, line cards, cycle)~~ (done in 2.3) and have Claude write talking points and questions for the meeting and its focus, with sources. Avnet account numbers stay mock. Claude Sonnet 5.5 writes three to five points and questions from the brief itself (`src/lib/qbr/talking-points.ts`), each linked to the section it rests on; items with a figure the brief lacks are dropped; kept per company, meeting and focus until a new filing or week. Eval: 8 of 8 briefs at about 1.3 cents and 13 to 18 seconds each, streamed after the rest of the brief (`src/lib/qbr/eval.ts`). The brief prints and saves as PDF in the look of the Avnet FY27 template (PR #41).
- [x] 3.2 Ask the Terminal: Claude with tools over the app's live data, answering with sources. Questions the rules route keep their rule answer (with "Ask Claude instead"); the rest go to Claude, whose tools are the nine answerers. Sources, page links and hookup markers come from the answerers that ran, each answerer's figures show under Claude's sentences, and answers are kept per question per day (`src/lib/ask/claude.ts`, `src/lib/ask/compose.ts`). Facts go to Claude Haiku 5.5, judgement and multi-topic questions to Claude Sonnet 5.5: 19 of 20 on the eval at 0.31 cents a question on average (`src/lib/ask/eval.ts`); off until `ANTHROPIC_API_KEY` is set and funded.
- [x] 3.3 Pitch Deck Builder: export chosen views as Avnet-branded slides from the Avnet template. "Download PowerPoint" builds an editable .pptx on the server (`/api/deck/export`, `src/lib/deck/pptx.ts`, pptxgenjs) from the same previews as the screen, on the Avnet FY27 template (`assets/brand/avnet-template-fy27.pptx` through `src/lib/brand/pptx`, PR #42; no slash mark), native charts (Avnet against Arrow, the company's revenue over eight quarters, supply-chain growth), "Mock data" in the footer of mock slides, and a sources slide. Decks from QBR Prep carry Claude's saved talking points and questions, written on the spot if none are saved yet (PR #43).
- [ ] 3.4 Scenario Modeler: real what-if maths over the market data (growth and share targets).
- [ ] 3.5 Code Mapping: AI-suggested mappings with accept, edit and reject, and a change history.
- [ ] 3.6 Lead Finder: search and ranking from public signals; Treg enrichment on request.

## Phase 4. Foundations

- [ ] 4.1 Database. Avnet's provisioned database, Databricks or Oracle (which one is not decided); this replaces the earlier plan for a new Supabase project. See `docs/storage.md`.
  - [x] One storage interface, `src/lib/store`, for saved AI results and line card snapshots, chosen by `STORE_ADAPTER` (PR #43).
  - [x] Databricks and Oracle adapters with table scripts in `db/migrations/` (PR #47). Tested against fakes only.
  - [ ] Live check against the real database: `pnpm check:store` (PR #48, open), then run it on the Avnet machine.
  - [ ] Briefs and mappings, once 3.5 and 4.2 need them saved.
- [ ] 4.2 Accounts and personas. Sign-in, a profile per user (role, region, suppliers, accounts) driving Start Here and personalised news. Not started.
- [ ] 4.3 Deployment.
  - [x] Verifiable and deployable on Avnet infrastructure: `pnpm test`, `scripts/ci.sh` and a GitHub workflow (with an Azure Pipelines snippet in the README), a Dockerfile on Next's standalone output, and every environment variable documented in `.env.example` (PR #46). Fonts self-hosted so builds need no internet (PR #49).
  - [ ] Password gate (`SITE_PASSWORD`) replaced by sign-in, with 4.2.
  - [ ] A shared store across replicas: the file adapter keeps one copy per container until 4.1 is live.

## Phase 5. Hook up real data

With the Avnet data team, following the PRD roadmap. Each step turns markers off on the pages listed in Data Hookups.

- [x] 5.1 Decide the connection: query Databricks gold tables in place; no copy into the app's database (PRD open question 10, decided 2026-10-20).
- [ ] 5.1b The Avnet data layer, on branch `avnet-data-layer` (not merged, no PR yet). Every Avnet figure is read through `src/lib/avnet` (`getAvnet()`), chosen by `AVNET_DATA` (`mock` or `databricks`); typed contracts per dataset, a contract suite, a Databricks adapter reading `terminal_*` views, and draft view definitions for the data team in `db/databricks/views`. Figures are unchanged on the mock. See `docs/data-contracts.md`. Each step below becomes building its view and switching the dataset off the mock.
- [ ] 5.2 Avnet fiscal calendar and exchange rates.
- [ ] 5.3 Billings, bookings and backlog → Performance Tracker, Start Here, QBR Prep.
- [ ] 5.4 Material master and the code map → Code Mapping, Market Share.
- [ ] 5.5 WSTS, Gartner and the IP&E forecast → Market Overview, TAM / SAM / SOM, Market Share.
- [ ] 5.6 Design registrations → Design Pipeline, QBR Prep.
- [ ] 5.7 Customer master → Customers & End Markets, Lead Finder.
- [ ] 5.8 Lead times and purchasing → Supply Chain.
- [ ] 5.9 Earnings call transcripts → commentary and sentiment.

## Decisions (answered 2026-10-20)

1. **Design tools.** The full toolchain above. 21st.dev Magic stays off, and components are built by hand.
2. **Dark mode.** Light only for now. Every colour is a semantic token, so a dark theme can be added later without a rework.
3. **Where internal data lives.** Query Databricks in place. Billings never leave Databricks; the app caches only short-lived aggregates. This answers 5.1.
4. **Navigation.** Keep "Avnet performance" as a nav group and Start Here as everyone's home page.
5. **Where the app saves its own results** (by 2026-10-26). Avnet's provisioned database, Databricks or Oracle, behind one storage interface, instead of a new Supabase project. This changes 4.1.
