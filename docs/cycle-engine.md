# The semiconductor cycle engine

Built 2026-10-26 from `docs/semis-cycle-engine-plan.md`, Phases 0 to 4, on public data only. It finds which series lead, move with or lag the chip cycle, builds composite indexes, and backtests the signals. The results are on an internal page, `/signals/engine`, linked from Economic Signals as "How the cycle engine works". The Economic Signals redesign (Phase 5) comes later, after choosing design tools.

## Refresh

```bash
npx tsx scripts/fetch-history.ts      # download the history: FRED (keyless) and SEC filings; a few minutes
npx tsx scripts/run-cycle-engine.ts   # date the cycle, run the finder, indexes and signals; writes data/cycle/output.json
```

Both outputs are committed: `data/cycle/history/` (public data) and `data/cycle/output.json`. The page reads `output.json`, so nothing is fetched or computed per request. Splicing the 6-hourly live points onto the history waits for the database.

## Asian sources (Phase 1b, added 2026-10-27)

| Series | Source | History | Notes |
|---|---|---|---|
| Japan chip equipment billings | SEAJ "Back Number" workbook, found by link on seaj.or.jp/english/statistics | Jan 2005 to the latest month | 3-month averages, read with SheetJS (`xlsx`, devDependency, script only) |
| Japan chip equipment bookings, book-to-bill | Same workbook | Jan 2005 to Mar 2017 | SEAJ stopped publishing bookings; tested against past cycles, never in an index |
| Korea chip exports (HS 8542) | UN Comtrade public preview, from Korea Customs | Jan 2013 to about nine months ago | One month per call, fetched only for months not held yet |
| Taiwan export orders, electronic products | Saved by hand to `data/cycle/manual/taiwan-orders-electronics.csv` | As saved | MOEA blocks automated downloads |
| TSMC monthly revenue | Saved by hand to `data/cycle/manual/tsmc-revenue.csv` | As saved | TSMC investor relations blocks automated downloads |

**Each month, by hand:** save the Taiwan export orders and TSMC revenue figures as described in `data/cycle/manual/README.md`, then rerun `run-cycle-engine`. The engine page says how current each file is. Once the first real downloads are saved, a parser for their exact layout can replace the hand-copied CSV.

**Korea, current:** register for the free Korea Customs API `관세청_품목별 수출입실적(GW)` on data.go.kr and add `KCS_SERVICE_KEY` to `.env.local`. The adapter is written once a key is available to test against, and it replaces Comtrade for Korea.

A source that fails on a refresh keeps its previous file and is listed in `manifest.failed`, which the page shows.

## Files

| Where | What |
|---|---|
| `src/lib/cycle/catalog.ts` | The 29 candidate series: source, FRED id, measure (growth on a year ago or level), whether a rise is good news, starting tier, cyclical membership, whether it can be backtested |
| `src/lib/cycle/transform.ts` | Monthly series, growth on a year ago, ratios, 3-month averages, quarters to months, chip makers' group growth (the same companies a year apart; quarters most of the group hasn't reported are dropped) |
| `src/lib/cycle/turns.ts` | Bry-Boschan turning points: extremes within 6 months either side, alternating, phases of 6 months or more, cycles of 15 or more, a minimum swing, ends censored |
| `src/lib/cycle/reference.ts` | The dated cycle: WSTS when `data/cycle/licensed/wsts-monthly.json` exists, the public proxy otherwise; and the check against chip makers' revenue |
| `src/lib/cycle/finder.ts` | Correlation at shifts of up to 18 months, turn-by-turn matching, the stability check across 2008, and the tier rule |
| `src/lib/cycle/composite.ts` | Conference Board indexes (symmetric changes, inverse-volatility weights, chained to 100 in 2017) and EPB's 6-month smoothed annualised growth |
| `src/lib/cycle/signals.ts` | The step-by-step downturn and upturn signals with their backtests and threshold grid, the stage sentence, the stress flag |
| `src/lib/cycle/history.ts` | Reads the committed history into each series' measure |
| `data/cycle/licensed/` | Gitignored. WSTS goes here; only derived dates, leads and index values are ever written out |

Every module has a tsx test: `npx tsx src/lib/cycle/<module>.test.ts`.

## The rules

- **Reference cycle:** dated on the 3-month average growth on a year ago from 1985, with swings of 5 points or more. Until WSTS arrives the reference is **US shipments of computers and electronic products** (decided 2026-10-26). US semiconductor production was tried first and lined up less well with the series that should move with chip revenue.
- **Tiers:**
  - **Leading:** a median lead of 3 months or more, 60% of the cycle's turns matched, and the lead holds before and after 2008.
  - **Coincident:** within 2 months either way.
  - **Lagging:** 3 months or more behind.
  - **Placement needs both:** at least half of the series' own turns must be the cycle's, and a best correlation of 0.3 or more. Otherwise noise with many turns matches by chance.
  - **Short series:** where there are too few turns, a correlation of 0.6 or more places a series by its best shift.
- **Indexes:**
  - Leading, Aggregate and Lagging take the series the finder placed there. Aggregate also holds the reference and chip makers' revenue, which is the cycle itself by definition.
  - The two cyclical indexes are defined by membership: production, utilisation, shipments, jobs and chip revenue for all-in; autos, broad industrial production, Philadelphia Fed orders and the non-AI chip makers for ex-AI.
- **Signals:** EPB's four steps, each backtested:
  1. the leading index a set drop below its 24-month high
  2. the yield curve inverted in the last 24 months
  3. leading momentum negative
  4. signals within 12 months counted once

  The drop is chosen from 5% to 15% by fewest false signals while catching 75% of downturns. The upturn signal is the mirror image.
- **Stress:** the finished-goods share of electronics inventory in the top fifth of its history, *and* chip makers' operating margin down from its 4-quarter high by more than the median drawdown of past downturns.

## First results (2026-10-26)

- **Reference troughs:** Oct 1996, Sep 1998, Feb 2000, Jan 2002, Jul 2005, Jun 2009, Oct 2012, Jan 2015, Jun 2020 and Oct 2024. Since 2010 only 3 of the proxy's turns line up with chip makers' own revenue turns within six months, and 5 don't. US electronics shipments are a weak stand-in for global chip sales; WSTS is the fix.
- **No series passed the leading test, so there is no leading index or signal yet.**
  - Real money supply and both yield curves show almost no correlation with the cycle (r 0.09 to 0.16).
  - Korea's OECD leading indicator leads by about 4 to 6 months on average, but not in both eras.
  - New orders move with the cycle rather than ahead of it (r 0.79 to 0.90 at no shift): in Census data, orders for computers and electronics are close to shipments.
- **Moves with the cycle:** new orders (electronics, capital goods, durables), US semiconductor production, utilisation (r 0.78), China's OECD leading indicator, and chip makers' revenue.
- **Lagging:** semiconductor jobs (about 4 months, r 0.86), consumer electronics prices (5), manufacturing construction (8), computer systems design jobs (7).
- **Not placed:**
  - money, the yield curves, Philadelphia orders, the OECD leading indicators of Korea, Japan and the US, Korea and Japan exports, autos, broad industrial production, semiconductor producer prices, inventories and the finished-goods share
  - the high-yield spread, which has only 3 years of history and is shown only
- **Stage:** "Cyclical and Lagging have turned up; Aggregate is still rising. No leading index yet."
- **Stress:** off. The finished-goods share is higher than 64% of its history, and chip makers' operating margin is at a high (55% in 2026 Q2).
- **AI gap:** in 2026 Q2, AI and datacenter chip revenue grew 73.5% against 24.6% for everyone else.

## Results with the Asian sources (2026-10-27)

Still **no series passed the leading test**:
- Japan chip equipment billings came out **lagging** (about 4 months, 90% of turns).
- Bookings and book-to-bill (to March 2017) and Korea chip exports came out **moving with the cycle**.

But their best correlations sit at positive leads: Korea chip exports at 8 months ahead (r 0.48), book-to-bill at 7, billings at 3. That pattern, early by correlation but on time by turns, fits the SEC check: the US shipments proxy itself turns late against chip makers' revenue. So the reference is the likeliest reason these don't place as leading. Rerunning on WSTS is the test.

## Next

1. **WSTS Blue Book monthly history** from Avnet into `data/cycle/licensed/wsts-monthly.json`, then rerun. That re-dates the cycle on global chip sales and retests every series. The Asian and OECD indicators may well qualify against it.
2. **Still to add:** the Korea Customs key (current Korea data), the first Taiwan and TSMC downloads, and the SOX through a licensed feed (the free history sits behind a bot check).
3. **Avnet bookings history** from Databricks, tested as a leading candidate.
4. **Phase 5:** the Economic Signals page, once the leading tier has members.
