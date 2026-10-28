# Avnet Superapp plan

Living plan for turning the Market Intelligence Terminal into a superapp for Avnet. Update the status boxes as work lands.

Last updated: 2026-10-27

> The page-by-page build plan, including design passes and data hookups, is in `docs/superapp-build-plan.md`; it has the current status of every step. This document is the strategy and the original build order. Product requirements are in the PRD ("AMI Superapp", Oct 15 2026).

## Who it is for

Avnet sellers and field application engineers (FAEs). Executives and customers are not the primary audience. Every feature should help someone prepare for, run, or follow up a conversation with a customer or a supplier.

## The three pillars

| Pillar | Purpose | Features |
|---|---|---|
| **Knowledge** | Understand the market and the technology | News with "why it matters to Avnet and to you"; weekly state-of-the-market brief; supplier commentary digest; 3D part explainers; semiconductor and IP&E education with learning paths and quizzes |
| **Network** | Understand the companies | Company profiles (suppliers, competitors, customers); line cards across distributors, tracked over time; quarterly earnings; head-to-head comparisons; partnership and M&A tracker |
| **Tools** | Turn the first two into action | QBR prep; one-page call brief; pitch deck builder; lead generation and enrichment; cross-sell suggester; "ask the Terminal" assistant; watchlists and alerts |

## The spine: what makes the pillars support each other

Three pillars alone do not connect. Every feature reads and writes the same four entities:

- **Suppliers** (and other companies: competitors, customers)
- **Technologies** (part families such as SiC MOSFETs, MLCCs, MCUs, connectors)
- **Customers** (accounts and end markets)
- **Markets** (segments, regions, the cycle)

The **company profile** is the hub. Most cross-pillar loops pass through it.

### Loops to design for

1. **News to action.** A story about a supplier links to its profile, which offers "add to my QBR". The QBR pulls in that supplier's earnings, channel share and the story.
2. **Gap to pitch.** A supplier missing from Avnet's line card links to the explainer for its technology, then to a lead list of customers who would buy it, then to a deck.
3. **Learning to selling.** A technology module ends with which line-card suppliers make the part and how their revenue is trending, with a button to build a customer pitch.

### Design rules

- A 3D explainer teaches the sale as well as the part: where it is used, questions to ask the customer, and which suppliers on Avnet's line card make it.
- Line cards are stored as dated snapshots, so the app can show additions, removals and white space.
- Any figure shown carries its source and period. Estimates are labelled as estimates.

## What exists today

Every PRD module and tool has a designed page; the navigation groups are in `docs/superapp-build-plan.md`. Avnet-specific and licensed figures are still mock, each marked with a hookup marker; the rest is live public data.

| Group | Pages |
|---|---|
| Start Here | Start Here, with a persona switch |
| Knowledge | Market News, Market Overview, Market Cycle, Economic Signals (with the cycle engine at `/signals/engine`), Learning Center |
| Network | Company Profiles, Quarterly Earnings, Avnet vs Arrow, Line Cards |
| Avnet performance | Performance Tracker, Market Share, TAM / SAM / SOM, Supply Chain, Design Pipeline, Customers & End Markets |
| Tools | QBR Prep (Claude talking points, print and PDF), Pitch Deck Builder (PowerPoint on the FY27 template; Export Center merged in), Lead Finder, Scenario Modeler, Code Mapping, Ask the Terminal (Claude with tools) |
| Setup | Data Hookups |

## Foundations still missing

| Need | Why | Status |
|---|---|---|
| Accounts and profiles | "The logged-in user's business" needs sign-in and a profile (role, region, suppliers, accounts). Today there is one shared password. | Not started |
| Database | Line card snapshots and AI results are saved through `src/lib/store`, on local files today. Profiles, watchlists and saved briefs need it too. | Adapters for Avnet's database (Databricks or Oracle) built; not yet run against a real one (see below) |
| Avnet internal data | Billings, pipeline, customers and the code map are mock. | Data layer and Databricks adapter on branch `avnet-data-layer`, not merged; views wait on the data team (`docs/data-contracts.md`) |
| Deployment | Sellers need it on Avnet infrastructure. | CI, tests and a container build done; sign-in not |
| Line card data | TTI, Future and Newark are readable. Avnet, Arrow, Mouser, DigiKey, Master, Richardson RFPD and the ECIA directory block automated reading and need importing. | Partly done |
| Claude API | News synthesis and the commentary digest call Claude; the tools will too. Running cost. Needs a key in every environment. | In use |
| Treg | Lead enrichment, paid per call. | Not started |
| Anatomy skill | Open-source Claude Code skill for interactive 3D wireframes. Not installed yet. | Not started |
| `SEC_USER_AGENT` | Required for revenue mix and segment history; must be set in any deployed environment. | Documented in `.env.example`; set locally only |

### Database decision

- **Avnet's provisioned database, Databricks or Oracle** (which one is not decided). This replaced the earlier plan for a new Supabase project. The existing production Supabase project stays read-only and is not used.
- Everything the app saves goes through one interface, `src/lib/store`, chosen by `STORE_ADAPTER` (`file`, `databricks` or `oracle`). Two tables: a key-value table for saved results and a snapshots table for line cards. See `docs/storage.md`.
- Avnet's own figures are not copied in: they are queried in place in Databricks through `src/lib/avnet`.
- Profiles, watchlists and briefs come with accounts.

## Build order

- [x] **Step 1. Pillar navigation and company profiles.** Built on branch `superapp-pillars-step-1`. The nav is grouped into Knowledge, Network and Tools, with planned pages shown as "Soon". `/network` is a directory of all 77 companies by relationship to Avnet (supplier, competitor, customer, ecosystem); `/network/[slug]` is a profile with rule-based "at a glance" facts, a financial snapshot, revenue mix, matching news and the next earnings date. Not yet on profiles: line card presence, management commentary, QBR prep.
- [ ] **Step 2. Line cards.** In progress on branch `line-cards-step-2`.
  - [x] Snapshot storage, as local JSON files under `data/line-cards/<distributor>/<date>.json`. `src/lib/line-cards/store.ts` now reads and writes through `snapshots` in `src/lib/store`, so the database adapters cover it.
  - [x] Collection for the three distributors whose sites can be read: TTI, Future Electronics, Newark (Farnell). First snapshots taken 2026-10-14 (UTC).
  - [x] Import form (paste a list or CSV) for every other distributor.
  - [x] `/line-cards`: coverage, overlap matrix, additions and removals, searchable supplier table. Line card presence on supplier profiles.
  - [x] Franchise moves: distribution agreements announced in the last 12 months, read from news headlines (Google News search feed). Covers the distributors whose sites are blocked, and flags agreements that ended.
  - [x] Supplier momentum: the 39 publicly reporting suppliers ranked by growth, with share sold through distribution, who carries them, and their latest announced agreement.
  - [x] Sub-brands rolled up into supplier families; "only here" count per distributor.
  - [ ] **Import Avnet's line card.** Until then there is no white-space view. Avnet, Arrow, Mouser and DigiKey block automated reading.
  - [ ] Import Arrow, Mouser and DigiKey.
  - [ ] Move storage to Avnet's database (adapters built; build plan 4.1).
  - [ ] Improve name matching (sub-brands, parent companies) once Avnet's list shows where it fails.
- [x] **Step 3. News "why it matters" and the supplier commentary digest.** Built on branch `news-synthesis-step-3`, using Claude (`claude-opus-5-5`) through the Anthropic SDK.
  - Market News: one sentence per story on why it matters to an Avnet seller or field engineer, a relevance rating, and a relevance filter. One request per refresh for new stories only.
  - Company profiles: "Management commentary", a digest of the latest earnings press release (the exhibit on the results 8-K) covering guidance, demand, inventory, lead times, pricing, the channel and end markets, plus points to raise in a conversation.
  - Results are saved through `src/lib/store` (local files under `.cache/ai` for now) so nothing is analysed twice. See `docs/storage.md` for moving it to a database.
  - Not yet personalised to the signed-in user; that needs accounts (step 6).
  - Needs `ANTHROPIC_API_KEY` (or `ANTHROPIC_AUTH_TOKEN`) in the environment; without it both features say AI is off.
- [x] **Step 4. QBR prep.** The first tool, because it exercises all three pillars: pick a supplier or customer and get a brief built from its profile, news, the cycle and talking points. Built in build plan 2.3 and 3.1: the brief from live public data, Claude's talking points and questions with sources, print and PDF. Avnet account numbers are mock.
- [ ] **Step 5. Anatomy explainer pilot.** Three part explainers (candidates: SiC MOSFET module, MLCC, a board-to-board connector), each with the sales angle and linked suppliers. The Learning Center (build plan 2.17) has six technology primers with illustrations, each ending with the suppliers that make the part; the interactive 3D explainers are not built.
- [ ] **Step 6. Accounts and personalisation.** Sign-in, profiles, and personalised news and briefs. Not started (build plan 4.2).
- [ ] **Step 7. Pitch deck builder and lead generation.**
  - [x] Pitch Deck Builder: slides from the app's own views, downloaded as an editable PowerPoint on the Avnet FY27 template (build plan 2.21 and 3.3).
  - [x] Lead Finder: public customer companies ranked on live reasons, linked to Profile, QBR and the deck (build plan 2.22).
  - [ ] Private companies and Treg enrichment; tie leads to line-card white space once Avnet's line card is imported (build plan 3.6).

Also built beyond the original order: Ask the Terminal (Claude with the app's data as tools), Scenario Modeler and Code Mapping pages, and the semiconductor cycle engine (`docs/cycle-engine.md`).

Later candidates: education curriculum with quizzes, weekly state-of-the-market brief, cross-sell suggester, partnership and M&A tracker, foreign peers, distribution channel tracker, geographic exposure view.

## Open questions

- Relationship labels are assigned by group. TD Synnex, Wesco and ScanSource are listed as competitors because they are distributors, though they mostly sell IT and electrical products. Should they be reclassified?

- Which distributors beyond Avnet and Arrow matter most for line cards?
- Where will this be deployed for sellers, and how do they sign in (Avnet single sign-on or separate accounts)? The app now builds as a container for Avnet infrastructure; the host and sign-in are still open.
- Databricks or Oracle for the app's own saved results?
- Budget ceiling for Claude and Treg usage.
- Which technologies should the first three explainers cover?

## Known limits of the current data

- Earnings figures are GAAP as filed; no adjusted figures, guidance or call transcripts.
- Earnings dates are estimates from last year's filing dates.
- Revenue mix categories are each company's own and are not comparable across companies.
- Foreign filers (TSMC, ASML, Samsung, Infineon, STMicroelectronics and others) are not in the SEC quarterly feed.
- News tagging is rule-based.
- Line cards, customer counts, design wins, lead times and pricing are not in any source used so far.
