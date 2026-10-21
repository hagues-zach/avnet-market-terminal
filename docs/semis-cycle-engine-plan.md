# Semiconductor cycle engine plan

An engine that finds which economic series lead, move with, or lag the semiconductor cycle, combines them into four indexes, and turns them into a read on Economic Signals: what could push the market up or down, for product leaders, account managers and executives. This is the "Semiconductor Economic Coincident Index" noted on build plan step 2.15.

Status: **planned, not started.** Written 2026-10-21 from a read of the code at `a7db242`, and from the user's notes on EPB Research's four-economy framework.

## The idea, from EPB Research

EPB reads the economy as a sequence, not a single number:

**Leading → Cyclical → Aggregate → Lagging**

- **Leading:** money, credit and new commitments (real money supply, the yield curve, new orders, permits).
- **Cyclical:** production and jobs in the rate-sensitive core (for EPB, housing and durable goods).
- **Aggregate:** the headline economy that dates the cycle (payrolls, GDP, real income excluding transfers).
- **Lagging:** what reacts last (services jobs, defaults, late price changes).

Three rules carry over to chips:

1. **Sequence over single series.** A turn needs confirmation down the chain, not one series moving.
2. **Strip the noise.** Work on the cyclical core, and split out what distorts it. Today that is AI and datacenter spending, which makes the headline look healthier than the rate-sensitive market (auto, industrial, consumer) underneath.
3. **Lead times are mechanical.** Backlogs, margin cushions and finished inventory explain why weakness up front takes months to reach jobs and prices.

## What the code already gives us

- **Economic Signals** (`src/lib/data/live/signals.ts`, `src/lib/signals/read.ts`): about 25 live series from five keyless sources. Fed G.17 production and utilisation, BLS producer prices and chip employment, IMF metals, Treasury and Fed rates, ECB currencies. Four rule-written reads on top (demand, costs, financing, dollar).
- **Market Cycle** (`src/lib/data/live/cycle.ts`): revenue growth, inventory days, gross and operating margin by company group, from SEC filings, aligned on calendar quarters. This already supplies the margin cushion and a group-level split for "ex-AI".
- **Pure, tested read logic:** `read.ts` and `read.test.ts` are the pattern for the engine's rules: plain functions over figures, tested with frozen inputs.

## What is missing

1. **History.** Signals keeps 36 months (`MONTHS_KEPT`). Lead/lag testing needs 20 or more years across several chip cycles.
2. **A reference cycle.** Nothing in the app defines when the chip cycle peaked or troughed, so nothing can be measured as leading or lagging.
3. **Leading series.** Today's set is nearly all coincident (production, utilisation) or lagging (producer prices). There are no new orders, credit spreads, equipment billings or Asian export data.
4. **Inventory by stage.** Inventory days exist per company group, but not split into finished goods versus work in process.

## Where the notes need adjusting

- **Some targets have no public data.** EDA license commitments, foundry booking volumes, legacy-node service-agreement defaults and wafer starts by node are paid or private. Each tier gets a free stand-in (next section).
- **The index formula as written breaks.** An average of z-scores sits around zero and turns negative, so dividing it by its 12-month average (the 6-month smoothed growth rate) blows up. Use the Conference Board method instead: standardise each series' monthly change, sum them, and cumulate into an index based at 100. Then take the smoothed growth of that level.
- **The thresholds are from housing and US recessions.** The 44% → 75% → 83% signal accuracy, the 10.5-month average lead, the 8-point margin cushion and the 0.30 completed-inventory trigger were measured on NBER recessions and homebuilders. The rules carry over; the numbers are re-measured on chip cycles before they drive anything.
- **Stock indexes.** The notes reject the SOX as aggregate noise. Stock prices are a leading component of the Conference Board's own index, and the SOX tends to lead chip revenue. It is tested like any other candidate and placed by its measured lead.
- **Output rules in the notes** (Markdown only, no scripts) were for a report prompt. They do not apply to the web page.

## Candidate series by tier

Tiers here are the starting guess. Phase 2 places each series by its measured lead.

| Tier | Candidates (free) | EPB equivalent |
|---|---|---|
| **Leading** | Real M2 (M2 ÷ CPI); 10-year minus 3-month spread; high-yield credit spread (ICE BofA via FRED); new orders, computers and electronic products, and core capital goods (Census M3); manufacturing construction spending, computer, electronic and electrical (fab-building proxy); Japan semiconductor equipment billings (SEAJ); Korea semiconductor exports; Taiwan export orders; Philadelphia and New York Fed new-orders indexes; SOX | Real money supply, yield curve, new orders, permits |
| **Cyclical** (all-in) | US semiconductor production and utilisation (have); computer and electronics shipments (Census M3); semiconductor employment (have); motor vehicle assemblies | Residential construction, durable goods output and jobs |
| **Cyclical** (ex-AI) | Revenue of the analog, MCU and auto groups in Market Cycle (TI, Microchip, NXP, Infineon, ST, ADI and peers) against the AI and datacenter group; vehicle assemblies; industrial production excluding high-tech | Rate-sensitive core |
| **Aggregate** (the benchmark) | WSTS Blue Book global semiconductor sales (Avnet access), 3-month average; combined SEC revenue across Market Cycle groups; TSMC monthly revenue | NBER-dated aggregate |
| **Lagging** | Semiconductor producer prices (have); consumer-electronics CPI; inventory days (have); computer systems design employment | Services jobs, late price changes, defaults |

**The inventory split exists.** Census M3 publishes inventories for computer and electronic products by stage: materials and supplies, work in process, finished goods. Finished goods over total inventory is the notes' completed-inventory ratio, measured directly.

## Phases

### Phase 0: Reference cycle and storage (about 1 day)

- Date peaks and troughs of the chip cycle from WSTS Blue Book global sales, 1995 to today (Bry–Boschan rules: minimum phase and cycle lengths). This is the chip equivalent of NBER dating, and every later test measures against it.
- Storage: a script writes long history for public series into versioned JSON files in the repo. Licensed WSTS data and Avnet bookings do not go in the repo; where they live (a gitignored local file, Databricks, or an access-controlled store) is decided here. The live fetch keeps refreshing recent points every 6 hours and splices onto that history. No database: Supabase production is read-only, and the app has no writable store on Vercel.

### Phase 1: Data layer

- A **series catalog**: key, source, frequency, release lag, unit, transform (level, year-on-year, spread), whether a rise is good news, starting tier, and whether it counts toward ex-AI.
- Load 20+ years for existing series and add the new sources: FRED CSV downloads (no key), Census M3, SEAJ, Korea and Taiwan trade releases, WSTS Blue Books.
- Respect release timing: each point carries the date it was published, so backtests only use what was known at the time.
- Tests: gaps, units, release dates, and a visible note when a source fails (the page already lists `failed` sources).

### Phase 2: The finder (sorts series into leading, coincident and lagging)

For every candidate, against the reference cycle:

- **Cross-correlation** of year-on-year growth, shifted −18 to +18 months; the best lag and its strength.
- **Turning-point matching:** the series' own peaks and troughs matched to the cycle's, giving median lead at peaks and at troughs, hit rate, false signals and missed turns.
- **Stability:** the lead measured separately on earlier and later cycles, so a lead that only held once is not trusted.

The result is a scorecard per series, and the tier it is assigned. It is also a simple internal page so the choices can be checked.

### Phase 3: Composite indexes

- Five indexes: **Leading**, **Cyclical (all-in)**, **Cyclical (ex-AI)**, **Aggregate** and **Lagging**, built the Conference Board way from the series Phase 2 assigned.
- Each gets EPB's 6-month smoothed annualised growth rate, computed on the index level.
- **The AI gap:** all-in minus ex-AI cyclical growth, the measure of how much AI spending holds up the headline.
- Each index records which inputs moved it most this month, so the page can say why it moved.

### Phase 4: Signals and stress flags

- **Turning-point signal**, built up and measured one step at a time on chip history:
  1. Leading index more than 10% below its 24-month peak.
  2. Yield curve inverted within the last 24 months.
  3. Leading momentum negative.
  4. Signals within 12 months counted as one.

  Each step's hit rate, false signals and lead are reported, as EPB does.
- **Up-turn signal**, the mirror image, for the recovery side.
- **Stress flag:** finished-goods share of inventory high *and* operating margin compressed from its peak (the margin cushion used up). Both thresholds are set from past chip downturns, not copied from housing.
- **Stage read:** where the sequence stands, for example "Leading has turned up; Cyclical and Aggregate still falling; Lagging not yet turned."
- Pure functions with frozen-figure tests, like `read.test.ts`.

### Phase 5: The Economic Signals page

- **Hero:** a four-step sequence strip (Leading → Cyclical → Aggregate → Lagging), each with direction, momentum and stage, plus one sentence for the whole chain.
- **What could push the market:** the leading inputs moving the index most this month, split into upside and downside.
- **Views by audience:**
  - *Executives:* the stage sentence and the turning-point signal.
  - *Product leaders:* all-in versus ex-AI, and auto and industrial against datacenter.
  - *Account managers:* one plain talking point per end market.
- The current four-rule read stays as the short version, and the full indicator card stays below.
- Design tools are chosen with the user before this phase starts.

### Phase 6: Long-run backdrop (optional, deferred)

Demographics, debt levels, and net investment against depreciation work on a span of years, while the page looks 0–18 months ahead. At most, one background card with the notes' figures and sources. Not an input to the indexes.

## Risks

- **Few cycles.** Chips have had perhaps eight or nine full cycles since 1995, so measured leads are noisy. Report ranges, not single numbers, and prefer series that led in most cycles.
- **AI may have changed the cycle.** Leads measured before 2023 may not hold now. The ex-AI split and the stability check in Phase 2 are the guard.
- **Revisions.** Census and Fed series are revised. Phase 1 stores what was published when, where the source allows; otherwise the backtest is marked as using revised data.
- **Source fragility.** Asian trade releases and WSTS Blue Books come from press releases and spreadsheets, not APIs. Each gets a parser with a test and a visible failure, never a silent gap.

## Data access (confirmed 2026-10-21)

- **WSTS through Avnet:** Blue Books and forecast data. Blue Book history is the benchmark for the Phase 0 reference cycle, with full product and region detail. That detail also gives a second ex-AI cut: product categories such as microcontrollers, analog and discretes, against logic and memory. WSTS forecasts are a comparison line on the page, not an input to the indexes. Licensed data stays out of the public repo and off any public page; how it is stored is decided in Phase 0.
- **Avnet bookings history:** pulled from Databricks when Phase 2 starts, and tested in the finder as a candidate leading series. It is likely the strongest one for account managers.
