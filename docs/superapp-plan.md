# Avnet Superapp plan

Living plan for turning the Market Intelligence Terminal into a superapp for Avnet. Update the status boxes as work lands.

Last updated: 2026-10-13

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

| Pillar | Page | Route | Data |
|---|---|---|---|
| Knowledge | Market News | `/news` | Trade-press RSS, GDELT, SEC filings, Federal Register |
| Knowledge | Economic Signals | `/signals` | Federal Reserve, BLS, IMF, Treasury, NY Fed, ECB |
| Knowledge | Market Cycle | `/cycle` | Rolled up from SEC filings for 77 companies |
| Network | Company Profiles | `/network`, `/network/[slug]` | Pulls together the sources below per company |
| Network | Line Cards | `/line-cards` | Distributor manufacturer pages (3 collected) plus imported lists |
| Network | Quarterly Earnings | `/earnings` | SEC XBRL; revenue mix; estimated earnings calendar |
| Network | Avnet vs Arrow | `/competitive` | SEC XBRL plus segment and region history |
| Tools | none yet | | |

Hidden, still on mock data: Market Overview, TAM / SAM / SOM, Forecast & Scenario, Market Copilot, Export Center (see `src/lib/visibility.ts`).

## Foundations still missing

| Need | Why | Status |
|---|---|---|
| Accounts and profiles | "The logged-in user's business" needs sign-in and a profile (role, region, suppliers, accounts). Today there is one shared password. | Not started |
| Database | Nothing is stored. Line card snapshots, profiles, watchlists and saved briefs need it. | Decided: Supabase, **new project**, set up at step 2 (see below) |
| Line card data | TTI, Future and Newark are readable. Avnet, Arrow, Mouser, DigiKey, Master, Richardson RFPD and the ECIA directory block automated reading and need importing. | Partly done |
| Claude API | News synthesis, the digest and the tools call Claude. Running cost. | Not started |
| Treg | Lead enrichment, paid per call. | Not started |
| Anatomy skill | Open-source Claude Code skill for interactive 3D wireframes. Not installed yet. | Not started |
| `SEC_USER_AGENT` | Required for revenue mix and segment history; must be set in any deployed environment. | Set locally only |

### Database decision

- **Supabase, in a new project.** The existing production Supabase project is read-only by standing rule and must not be used.
- **Set it up at step 2, not step 1.** Step 1 only regroups pages and reads live public data, so it needs no storage. Line card snapshots are the first thing that must be stored, and their shape should drive the first tables.
- First tables to expect: `companies`, `line_card_snapshots`, `line_card_entries`, then `profiles`, `watchlists`, `briefs`.

## Build order

- [x] **Step 1. Pillar navigation and company profiles.** Built on branch `superapp-pillars-step-1`. The nav is grouped into Knowledge, Network and Tools, with planned pages shown as "Soon". `/network` is a directory of all 77 companies by relationship to Avnet (supplier, competitor, customer, ecosystem); `/network/[slug]` is a profile with rule-based "at a glance" facts, a financial snapshot, revenue mix, matching news and the next earnings date. Not yet on profiles: line card presence, management commentary, QBR prep.
- [ ] **Step 2. Line cards.** In progress on branch `line-cards-step-2`.
  - [x] Snapshot storage, as local JSON files under `data/line-cards/<distributor>/<date>.json`. `src/lib/line-cards/store.ts` is the whole storage surface, so moving to Supabase means reimplementing that one file.
  - [x] Collection for the three distributors whose sites can be read: TTI, Future Electronics, Newark (Farnell). First snapshots taken 2026-10-14 (UTC).
  - [x] Import form (paste a list or CSV) for every other distributor.
  - [x] `/line-cards`: coverage, overlap matrix, additions and removals, searchable supplier table. Line card presence on supplier profiles.
  - [x] Franchise moves: distribution agreements announced in the last 12 months, read from news headlines (Google News search feed). Covers the distributors whose sites are blocked, and flags agreements that ended.
  - [x] Supplier momentum: the 39 publicly reporting suppliers ranked by growth, with share sold through distribution, who carries them, and their latest announced agreement.
  - [x] Sub-brands rolled up into supplier families; "only here" count per distributor.
  - [ ] **Import Avnet's line card.** Until then there is no white-space view. Avnet, Arrow, Mouser and DigiKey block automated reading.
  - [ ] Import Arrow, Mouser and DigiKey.
  - [ ] Move storage to a new Supabase project (not yet created).
  - [ ] Improve name matching (sub-brands, parent companies) once Avnet's list shows where it fails.
- [ ] **Step 3. News "why it matters" and the supplier commentary digest.** Claude reads each story and each earnings press release (8-K exhibit) and writes the Avnet angle, guidance, and commentary on lead times, inventory and pricing.
- [ ] **Step 4. QBR prep.** The first tool, because it exercises all three pillars: pick a supplier or customer and get a brief built from its profile, news, the cycle and talking points.
- [ ] **Step 5. Anatomy explainer pilot.** Three part explainers (candidates: SiC MOSFET module, MLCC, a board-to-board connector), each with the sales angle and linked suppliers.
- [ ] **Step 6. Accounts and personalisation.** Sign-in, profiles, and personalised news and briefs.
- [ ] **Step 7. Pitch deck builder and lead generation.** Decks reuse the Avnet-branded deck skill and charts from Network; leads use Treg and tie to line-card white space.

Later candidates: education curriculum with quizzes, weekly state-of-the-market brief, cross-sell suggester, "ask the Terminal" assistant, partnership and M&A tracker, foreign peers, distribution channel tracker, geographic exposure view.

## Open questions

- Relationship labels are assigned by group. TD Synnex, Wesco and ScanSource are listed as competitors because they are distributors, though they mostly sell IT and electrical products. Should they be reclassified?

- Which distributors beyond Avnet and Arrow matter most for line cards?
- Where will this be deployed for sellers, and how do they sign in (Avnet single sign-on or separate accounts)?
- Budget ceiling for Claude and Treg usage.
- Which technologies should the first three explainers cover?

## Known limits of the current data

- Earnings figures are GAAP as filed; no adjusted figures, guidance or call transcripts.
- Earnings dates are estimates from last year's filing dates.
- Revenue mix categories are each company's own and are not comparable across companies.
- Foreign filers (TSMC, ASML, Samsung, Infineon, STMicroelectronics and others) are not in the SEC quarterly feed.
- News tagging is rule-based.
- Line cards, customer counts, design wins, lead times and pricing are not in any source used so far.
