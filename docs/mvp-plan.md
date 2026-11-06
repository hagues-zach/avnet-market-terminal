# MVP plan

The plan for shipping a tight MVP of the terminal and moving everything else onto a public roadmap. It narrows `docs/superapp-build-plan.md`: where the two disagree, this file wins until the MVP ships. The per-user morning brief has its own plan in `docs/morning-brief-plan.md`.

Last updated: 2026-11-06

**Guiding principle:** stop adding features before users see the app. Ship the MVP, put the rest on the roadmap page, and widen only after the pilot proves it.

## Dates

| Date | What |
|---|---|
| 2026-11-05 | This plan |
| 2026-11-23 | The repo moves to the Avnet-provisioned machine; development continues there with GitHub Copilot. Setup and the list of what still needs a live check: `docs/avnet-machine-setup.md`. Copilot's conventions: `.github/copilot-instructions.md`. |
| 2027-01 | Pilot dry run with the six pilot users |
| **2027-02-01** | **MVP launch (FY27 Q3)** |

Avnet fiscal quarters (from `src/lib/avnet`): FY27 Q3 is January to March 2027, FY27 Q4 April to June 2027, FY28 Q1 July to September 2027, FY28 Q2 October to December 2027. The target of about 500 users by the end of calendar 2027 lands at the end of FY28 Q2.

## Decisions (2026-11-05)

1. **Where data lives.** Avnet internal data (billings, bookings, backlog, inventory, design registrations, customer master) is read from **Databricks** in place. Everything else goes in **Oracle**: third-party market data (WSTS, Gartner, the news corpus), user profiles, roles and brief history. This changes 5.5 in the build plan, which had WSTS and Gartner coming from Databricks.
2. **Row-level security on both sides.** Oracle holds each user's profile, preferences and brief history, scoped so a user reads only their own; market data in Oracle is open to every signed-in user. Avnet internal data is scoped by Databricks row-level security.
3. **Sign-in is Avnet SSO.** It replaces `SITE_PASSWORD` (4.2 and 4.3 in the build plan).
4. **Internal data is hidden until row-level security is proven.** At launch only the two global users (the pilot's two senior stakeholders) see Avnet internal pages and figures. Everyone else sees market pages only, until scoped row-level security is deployed and tested with a set of test users.
5. **Americas companies.** Earnings and company reporting cover US-headquartered SEC filers (8-K, 10-K, 10-Q). Earnings tables, rankings and the morning brief use US SEC filers only. Non-US companies (WPG, WT Micro, RS Group, Taiwan filers) still open in Company Profiles with a **Beta** label. Full Europe and Asia coverage is on the roadmap.
9. **Lead Times & Signals is a new page** in the Market hub, beside Economic Signals, built from public lead-time data (for example ECIA and Sourceability), visible to every user.
10. **SOM is internal.** Everyone sees TAM and SAM; SOM (Avnet's share) shows only for global users until scoped access ships.
11. **Ask the Terminal stays** in the top bar. Its tools that read Avnet internal data answer only for global users.
6. **Morning brief.** In-app only, built ahead of time and ready by **6:00 am Eastern**, Google Cloud Text-to-Speech for audio, X ingestion deferred to the roadmap. Details in `docs/morning-brief-plan.md`.
7. **Pitch Deck Builder** learns from the owner's hand-built slides so its output looks like the owner made it. The FY27 template's layouts (cover, body and the others) are currently the wrong ones; the owner will supply the right ones when this step starts, after the move to the Avnet machine.
8. **The roadmap** is a typed file in the repo, changed through PRs, and drawn on a simple page that users can see. It uses Avnet fiscal quarters and lists roadmap items only.

## Pilot group

Six Avnet users. Names stay out of this repo because it is public; the owner has the list.

| # | Role in the pilot | Access at launch |
|---|---|---|
| 1 | Key stakeholder, senior supplier-management leader. Power user. | Global internal + market |
| 2 | Second stakeholder, global VP whose work sits close to #1's. Power user. | Global internal + market |
| 3 | Strategy and market-intelligence director. Expert reviewer of brief quality. | Market only |
| 4 | Senior supplier manager with a wide network. Champions the wider rollout and gives candid feedback. | Market only |
| 5 | Market expert, ex-supplier. Source of ideas. | Market only |
| 6 | Supplier manager. Tests their supplier's data once supplier-scoped access exists. | Market only, then supplier-scoped |

Users 3 to 6 move to scoped internal access when scoped row-level security ships (roadmap, FY27 Q4).

## MVP scope

### Navigation after the cut

| Hub | Visible tabs | Hidden |
|---|---|---|
| Start Here | Start Here (role-curated: market-only users see no Avnet figures) | |
| News | Market News with the morning brief | |
| Market | Overview, Cycle, **TAM / SAM / SOM** (moved here; SOM for global users only), Economic Signals, **Lead Times & Signals** (new) | Cycle engine (`/signals/engine`); Learning Center (already hidden) |
| Companies | Profiles, Earnings, Avnet vs Arrow | Line Cards (already hidden) |
| Avnet performance | Performance, Market Share, Design Pipeline, Customers (global users only at launch) | Scenario Modeler (`/forecast`); Supply Chain (already hidden) |
| Tools | Pitch Deck Builder | QBR Prep (roadmap); Lead Finder (already hidden) |
| Setup | Data Hookups, Code Mapping (kept for the owner's reference) | |
| Top bar | Ask the Terminal (internal-data tools for global users only) | |
| Footer | **Roadmap** (new) | |

Mechanics: `HIDDEN_PATHS` in `src/lib/visibility.ts` hides a page everywhere and keeps its code. Tab order and hubs live in `src/components/layout/nav.ts`. Note that `src/components/signals/signals-view.tsx` links to `/signals/engine` with a plain `<Link>`, so that link needs the `isHidden` check when the engine is hidden.

Role gating (internal pages visible only to global users) is new: `HIDDEN_PATHS` hides pages from everyone, so a second, per-role check is needed once SSO gives the app a user and role. Until SSO lands there is no way to tell users apart, which makes SSO the first step on the critical path.

### The six MVP items

1. **Market News: per-user morning brief.** See `docs/morning-brief-plan.md`.
2. **Market: forecasts and cycle view.** Keep as is. WSTS and Gartner forecasts tied to the quarterly TAM, including macro, paired with public earnings to show the cycle. TAM / SAM / SOM moves into this hub. Users size the whole market or their slice of it. SOM is Avnet's own share, so the SOM figures show for global users only.
3. **Companies: Americas earnings.** US-headquartered SEC filers with clean 8-K / 10-K schema. Non-US companies carry a Beta label. Avnet vs Arrow stays (public data).
4. **Market: Lead Times & Signals.** A new page in the Market hub beside Economic Signals, from public lead-time data, visible to everyone. Which public sources, and how often they update, is settled when the page is built.
5. **Avnet performance.** Performance, Market Share, Design Pipeline, Customers. Data: billings and book-to-bill first. First priority is accurate **global** data for the two global users. No regional, supplier or customer-scoped rollout until scoped row-level security is built.
6. **Pitch Deck Builder** (the only MVP tool). Audience templates: supplier, customer, internal. Built on the correct FY27 template layouts and the owner's hand-built example slides as ground truth. The existing export (`/api/deck/export`, `src/lib/deck/pptx.ts`, `src/lib/brand/pptx`) is the base. Self-serve, so the owner stops building decks by hand.

## Work plan

Ordered by what blocks what. Items marked **(external)** need someone outside the repo and should be requested first, because they have the longest lead times.

### Step 0. Ask for access now (external)

- [ ] Avnet SSO: an app registration in Avnet's identity provider (Entra ID) for the terminal, with redirect URLs for the Avnet host.
- [ ] Oracle: a schema for the app, credentials, and permission to create row-level security policies.
- [ ] Databricks: a decision with the data team on how row-level security knows the end user (open question 1 below), and the billings and book-to-bill views (build plan 5.3; view shapes in `docs/data-contracts.md`).
- [ ] Hosting on Avnet infrastructure with a scheduled job that can run before 6:00 am Eastern.
- [ ] Google Cloud project with Text-to-Speech enabled and billing, and a funded `ANTHROPIC_API_KEY` on Avnet's account.

### Step 1. Cut to the MVP (this machine, before 2026-11-23)

- [x] Hide the Cycle engine (`/signals/engine`), Scenario Modeler (`/forecast`) and QBR Prep (`/tools/qbr`) through `HIDDEN_PATHS`, and drop the links that led to them (PR 54).
- [x] Move TAM / SAM / SOM to the Market hub (`src/components/layout/nav.ts`, PR 54).
- [ ] Add Lead Times & Signals: a new tab in the Market hub after Economic signals, from public lead-time data (decision 9, MVP item 4). Not in the nav yet; a page is being built on a separate branch, so check open PRs before starting.
- [x] Beta label on non-US companies in Company Profiles; Quarterly Earnings, the earnings season and Ask the Terminal's season answer limited to US 10-Q and 10-K filers (`US_FILERS` in `src/lib/data/live/earnings-model.ts`, PR 54).
- [x] Roadmap page at `/roadmap`, linked from the sidebar footer, drawn from the typed file `src/lib/roadmap/items.ts` (PR 54). Edit that file to move items.

### Step 2. Morning brief without accounts (this machine)

The shared daily corpus, tiered synthesis and Google TTS can be built and evaluated on the file store with hard-coded test profiles before SSO exists. See phases B1 to B4 in `docs/morning-brief-plan.md`.

- [x] B1 to B4 built (PR 55): corpus job, ranking for test profiles, tiered Claude summaries, Google TTS with stitched clips.
- [ ] Run the summaries live once spending is approved: `npx tsx src/lib/brief/synthesis-eval.ts --live`.
- [ ] Recheck stitched audio on a full 10-minute brief and a Chirp 3 HD voice (it was judged on a 1.5-minute brief only).

Both checks are described in `docs/avnet-machine-setup.md`, section 4.

### Step 3. Accounts, roles and row-level security (Avnet machine)

Needs the Step 0 access. Nothing here exists in the code yet.

- [ ] SSO sign-in with Avnet's Entra ID replaces `SITE_PASSWORD` (the password gate lives in the middleware and `/login`). The app then knows each user and their role.
- [ ] Oracle: run `db/migrations/oracle/001_store.sql`, set `STORE_ADAPTER=oracle` and run `pnpm check:store oracle`; the adapter has only been tested against a fake. Then add users, roles and profiles tables with row-level security so a user reads only their own row (decision 2).
- [ ] Two roles at launch: `global` (internal + market) and `market` (market only). `HIDDEN_PATHS` hides pages from everyone, so add a second, per-role check beside it: Avnet performance pages, SOM on TAM / SAM / SOM, Avnet figures on Start Here and in the Pitch Deck Builder, and Ask the Terminal's internal-data tools answer only for `global` (decisions 4, 10, 11).
- [ ] Databricks: billings and book-to-bill live for global users (build plan 5.3). Set `AVNET_DATA=databricks`, keep unpublished datasets on mock with `AVNET_MOCK_DATASETS`, and pass `AVNET_DATA=databricks npx tsx scripts/check-avnet-data.ts` first.

### Step 4. Brief onboarding and pilot (Avnet machine, December to January)

Needs Step 3's users and roles. Phases B5 to B7 in `docs/morning-brief-plan.md` give the detail.

- [ ] Onboarding (B6): suppliers, customers, technologies, tech tier, voice with live samples, brief length. Profiles are stored in Oracle and replace the hard-coded test profiles in `src/lib/brief/profile.ts`.
- [ ] Brief built for each pilot user by 6:00 am Eastern: the corpus job (`.github/workflows/brief-corpus.yml`, 07:00 UTC) followed by per-user ranking, summaries and audio, on a scheduler that can reach the Avnet host.
- [ ] Pitch Deck Builder rebuilt on the correct FY27 layouts and the owner's example slides (decision 7). The owner supplies both when this starts; the export to build on is `/api/deck/export`, `src/lib/deck/pptx.ts` and `src/lib/brand/pptx`.
- [ ] Pilot dry run in January with the six pilot users; fix what it finds; launch 2027-02-01.

## Draft roadmap

A first draft for the owner to push out or pull in. It becomes the typed file behind the Roadmap page. The MVP itself is the FY27 Q3 entry. Monthly costs are planning estimates for budget conversations; confirm live rates before asking.

| Quarter | Item | Why it matters | Added monthly cost |
|---|---|---|---|
| **FY27 Q3** (Jan–Mar 2027) | **MVP launch, Feb 1:** morning brief for the pilot, Market, Americas earnings, Lead Times & Signals, Avnet performance for global users, Pitch Deck Builder | First users see the app | Google TTS and Claude for six users: a few dollars |
| FY27 Q3 | Role-curated Start Here | Each role lands on what matters to it | None |
| **FY27 Q4** (Apr–Jun 2027) | Scoped row-level security on Avnet performance: by supplier, region and customer | Opens internal data to supplier managers without cross-BU leaks | None |
| FY27 Q4 | Morning brief widens beyond the pilot | More users, same shared corpus | Grows with users (see the brief plan) |
| FY27 Q4 | **X (Twitter) in the morning brief** | Supplier and customer announcements often reach X before trade press; the case for the budget owner goes in the brief plan | **About $200** (30,000 post reads + 5,000 user reads; cap at $500) |
| FY27 Q4 | QBR Prep returns | One-pager from earnings, news and Avnet performance; needs scoped access first | Claude: cents per brief |
| **FY28 Q1** (Jul–Sep 2027) | Europe and Asia companies leave Beta | Covers the competitors and suppliers outside the US (WPG, WT Micro, RS Group, Taiwan filers) | Depends on the data sources chosen |
| FY28 Q1 | Cycle Engine | Coincident index for Avnet's served market from FRED, BEA and BLS against WSTS and Gartner; needs leading series (WSTS, Asian chip data) | None for public data |
| FY28 Q1 | Scenario Modeler | What-if growth and share targets over the market data | None |
| **FY28 Q2** (Oct–Dec 2027) | General availability, about 500 users | Self-serve onboarding across Avnet Americas | See the brief plan's scale costs |
| FY28 Q2 | Premium voices (ElevenLabs) | More natural, professional audio | Quote needed; well above Google |
| FY28 Q2 | Customizable Start Here | Users add, remove and resize components | None |
| FY28 Q2 | Brief by email or podcast feed | Listen without opening the app | Small |

Left off on purpose (still hidden, not promised): Learning Center, Line Cards, Supply Chain (internal lead times), Lead Finder. Add any of them to the roadmap file to promise them.

## Open questions

Questions 1, 2, 3 and 5 from the first draft were answered on 2026-11-05 and are now decisions 5, 9, 10 and 11.

1. **How Databricks knows the user.** The app reads Databricks with one service identity, so Unity Catalog row filters see the app, not the person. Either pass the user's SSO token through to Databricks (filters key on the real user; needs Entra and Databricks set up for it), or keep a user-to-scope mapping table that the views filter on through a session parameter. The first is real row-level security; the second relies on the app. Decide with the data team.
