# KPI explain layer: plan for the remaining KPIs

Written 2026-11-26, after the Book-to-bill pilot. That pilot is built and checked in the browser on branch `claude/kpi-explain`, which isn't committed yet. Read `README.md` in this folder first, for the design review and what was built.

## What the pilot gives every next KPI
- **`ExplainPopover`** (`src/components/explain/explain-popover.tsx`): the mark, the anchored panel, Esc, clicking outside, tabbing out, refocus and keeping inside the viewport. Reuse it as is.
- **`KpiTile`'s `explain` slot**: pass `explain={<ExplainX … />}`.
- **The registry** (`src/lib/explain/registry.ts`): add an entry per KPI. The definition comes from `GLOSSARY` (`src/lib/learn/content.ts`), so **a KPI needs a glossary entry before it gets an explainer.** The test fails otherwise.
- **The pattern per KPI**: pure reading functions in `src/lib/explain/<kpi>.ts` plus tests, then a body component in `src/components/explain/<kpi>.tsx`.
- **Rules to keep**:
  - Lead with the answer.
  - Nothing moves on its own, and the 150 ms slide only applies when reduced motion is off.
  - Avnet is always green, with its two greens for its own two series; dark blue means Arrow only.
  - No slash, middle dot or dash in copy.
  - One to nine spelled out in words.
  - A hidden table as the text alternative, and an `aria-live` sentence.

## Step 0: shared diagram primitives (built 2026-11-27, uncommitted)
Built in `src/components/explain/diagrams/` (`RatioScale`, `PairBars`, `Waterfall`, `Funnel`, plus `SrTable` for the hidden table every diagram carries), with their layout rules in `src/lib/explain/diagrams.ts` and tests in `explain.test.ts`. Book-to-bill now draws with `RatioScale` and `PairBars`. All four are on `/design-kit` under "Explainer diagrams". The ten glossary terms below are in `GLOSSARY`. Stitch was not run for the waterfall and funnel: they reuse the pilot's visual language (row labels above 10px bars, grey for context, the subject's colour for the highlight). Run Stitch before Phase 1 if you want a second opinion on them.

Most KPIs below use one of four diagram shapes. Build them once in `src/components/explain/diagrams/`:

| Primitive | Shows | Used by |
|---|---|---|
| **Ratio scale** (pull out of the pilot) | a value against a threshold or bands, with a trail of earlier periods | Book-to-bill, Inventory days, Approval rate, Share of mapped market |
| **Waterfall** | revenue stepping down to a profit or cash figure | Gross margin, Operating margin, Free cash flow, Diluted EPS |
| **Pair bars** | two amounts on one scale from zero, with the gap outlined (from the pilot) | Revenue growth, Backlog, Billings, last 12 months |
| **Flow or funnel** | stages with a count or amount at each | Design-approved billings, Approved pipeline, New registrations, Billings mapped |

Also in Step 0, add the missing glossary terms. They also help the Learning Center:
- Gross margin
- Operating margin
- Free cash flow
- Diluted EPS
- Revenue growth (year on year)
- Backlog coverage
- Customer concentration
- Hyperscaler capex
- Distributor inventory
- Approval rate

The glossary already has Book-to-bill, Backlog, Inventory days, Cash conversion cycle, Market share, TAM, SAM, SOM, DRMS, DRMS status 04 and Code map.

## Phase 1: financial KPIs (built 2026-11-27, branch `claude/kpi-explain-financials`)
Built as one component, `ExplainFinancial` (`src/components/explain/financials.tsx`), with a `kind` per tile, on the shared `ExplainFrame` (`frame.tsx`). Rules are in `src/lib/explain/financials.ts`; `financials-data.ts` builds the quarters on the server with the tiles' comparability rule, so the explainer never shows a figure the tile hides. Wired into the earnings tiles on US filers' profiles (Revenue growth, Gross margin, Operating margin, Diluted EPS, Free cash flow) and the overview tiles on foreign filers' profiles (Revenue, Gross margin, Operating margin, Inventory days). Not done:
- Half-yearly reporters (RS Group and other ESEF filers) get no explainers yet, since the copy and stepper speak of quarters.
- `cycle-view.tsx` uses `Measure`, not `KpiTile`, so its Inventory days has no mark.
- "Growth a year" on the scenario modeler is a compounded scenario rate, not revenue growth; it belongs with Phase 3's "Against holding share".
- No peer comparison (open question 1 below); the gross margin note names the group to compare with instead.

### Phase 1 as planned
These appear for every company, so one explainer covers about 40 profiles.

| KPI tile | Where | Diagram | The one idea it must land |
|---|---|---|---|
| Gross margin | `company-profile.tsx`, `company-view.tsx` | Waterfall: revenue, cost of sales, gross profit, with gross profit highlighted | Distributors run near 10 to 12%, chip makers 50%+; never compare across the two. Use the tile's `caveat` (non-GAAP) |
| Operating margin | `company-profile.tsx:241`, `company-view.tsx` | The same waterfall continued: gross profit, operating costs, operating profit | What's left after running the business. The same waterfall component with a different step highlighted |
| Inventory days | `company-profile.tsx`, `company-view.tsx`, `cycle-view.tsx` | Ratio scale in days, with a trail of eight quarters and a 90-day reference | "198 days" means inventory would last that long at the current rate of sales. Rising days early in a downturn is the warning sign |
| Revenue / Revenue growth / Growth a year | `company-view.tsx:76`, `scenario/modeler.tsx` | Pair bars: this quarter against the same quarter a year ago | Why year on year and not quarter on quarter (seasonality). Fiscal and calendar quarters are lined up |
| Free cash flow | `company-profile.tsx` | Waterfall: operating cash flow, capex, free cash flow | **Distributors make cash in downturns** by releasing inventory. Counter-intuitive, and the best teaching moment in the set |
| Diluted EPS | `company-profile.tsx`, `company-view.tsx` | A small waterfall (net income) over a shares count | Q4 EPS comes from annual reports and is approximate (METHODS: "Fourth quarters from annual reports") |

## Phase 2: Avnet operations (Performance hub)

| KPI tile | Where | Diagram | The one idea |
|---|---|---|---|
| Backlog | `performance/sections.tsx` | Flow: bookings in, billings out, backlog level, plus coverage in quarters | Backlog divided by quarterly billings is how many quarters of shipments are already ordered. Pairs naturally with Book-to-bill |
| Billings, last 12 months | `performance/sections.tsx`, `customers/page.tsx` | Pair bars over four quarters | Trailing 12 months smooths out the quarters. "Billings" is Avnet's word for revenue |
| Design-approved billings / Billings on design-approved parts | `performance/sections.tsx`, `design-pipeline/page.tsx` | Funnel: registered, approved (DRMS 04), billing | Design wins are the demand Avnet created rather than took as orders |
| Approved pipeline, Approval rate, New registrations | `design-pipeline/page.tsx` | One funnel explainer shared by the three tiles, with a different stage highlighted for each | Where registrations stall, and the usual months from approval to billing |
| Top 10 customers / Top 100 customers | `customers/page.tsx` | A stacked bar of the share of billings: top 10, the next 90, everyone else | Concentration risk in one picture |
| Active customers | `customers/page.tsx` | A text-only explainer (definition and source) | What counts as active |

## Phase 3: market and share

| KPI tile | Where | Diagram | The one idea |
|---|---|---|---|
| Share of mapped market | `share/sections.tsx`, `scenario/modeler.tsx` | Nested boxes: TAM, SAM, SOM, with share = SOM ÷ TAM | Only the mapped part of the market counts, so share carries the code map's confidence |
| Mapped billings / Billings mapped / Not mapped / Validated categories | `share/sections.tsx`, `tools/mapping/page.tsx` | Flow: Avnet product codes to market categories, with the mapped percentage | Every share figure goes through the code map |
| Growth over makers / Share of Avnet + Arrow / Avnet against Arrow | `share/sections.tsx`, `line-cards/insights.tsx` | Pair bars, Avnet green against Arrow dark blue | Gaining share means growing faster than the makers whose parts Avnet sells |
| Against holding share | `scenario/modeler.tsx` | Pair bars: scenario against a held share | What the scenario assumes |

## Phase 4: cycle

| KPI tile | Where | Diagram | The one idea |
|---|---|---|---|
| Supply-chain revenue | `cycle/cycle-view.tsx` | Ratio scale of growth with the expansion and contraction bands | Where the label comes from (METHODS: "Cycle label") |
| Distributor inventory | `cycle/cycle-view.tsx` | Ratio scale in days with a trail | Distributor inventory turns before chip makers' revenue does |
| Hyperscaler capex | `cycle/cycle-view.tsx` | Pair bars across years | The AI gap: capex against chip revenue (see `/signals/engine`) |
| Companies growing / Median revenue growth | `cycle-view.tsx`, `earnings/season.tsx` | Dot strip, one dot per company | Breadth against the average |

## Skip: counts and status (a plain `title` tooltip at most)
Suppliers, Suppliers tracked, Shared with Avnet, Carried elsewhere, Agreements announced, Filed the quarter, Reporting this week, Next for Avnet, Awaiting review, and the Live, Mock and Planned counts with Pages with a mock marker on `/data-hookups`. These are self-explanatory counts, and an explainer would be noise.

## Suggested order and size
1. **Step 0:** primitives and glossary terms. About one session.
2. **Phase 1:** six financial KPIs. One to two sessions, since the waterfall serves four of them.
3. **Phase 2:** Backlog first (it pairs with the pilot), then the funnel set.
4. **Phases 3 and 4.**

Each phase is its own branch and PR. Run Stitch first only for new diagram shapes (the waterfall and the funnel); the ratio scale and pair bars are already approved.

## Open questions for you
- Should the financial explainers on company profiles compare the company with its peer group (median gross margin for distributors, for example) or stay with the company alone?
- Should column headers in tables get the same explainer mark? Earnings and Market share have many numeric columns. Out of scope for the pilot.
- Should Ask the Terminal open an explainer when someone asks "what is X"? This ties into idea 7 in `docs/design/explainer-ideas.md`.
