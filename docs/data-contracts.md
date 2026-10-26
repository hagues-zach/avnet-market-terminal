# Avnet data contracts

Built 2026-10-27. Every Avnet figure in the app is read through one layer, `src/lib/avnet`. The figures are billings, bookings, backlog, the design pipeline, customers, the code map, and the licensed market data that shares are measured against. Today the layer serves the synthetic mock; at Avnet it reads Databricks. This document is the app's side of the contract: what each dataset must contain. The data team builds views to match it.

## How it fits together

```
pages and libraries ──> getAvnet() ──> derive.ts (TTM, shares, approved pipeline …)
                            │
                  AVNET_DATA picks the adapter
                 ┌──────────┴───────────┐
             mock.ts              databricks/adapter.ts ──> queries.ts ──> terminal_* views
       (src/lib/shells mock)                                              (db/databricks/views)
```

| File | What |
|---|---|
| `src/lib/avnet/contracts.ts` | The record types: fields, grain and units |
| `src/lib/avnet/source.ts` | `AvnetData`: one method per dataset |
| `src/lib/avnet/derive.ts` | Every figure derived from the datasets, the same way for any adapter |
| `src/lib/avnet/contract.ts` | The contract suite any adapter's data must pass |
| `src/lib/avnet/index.ts` | `getAvnet()` (the model, once per request, kept 15 minutes) and `getAccount()` |
| `src/lib/avnet/databricks/queries.ts` | The SQL the app runs: plain reads of the `terminal_*` views |
| `db/databricks/views/terminal_views.sql` | **Draft** view definitions over the PRD's source tables, for the data team |
| `scripts/check-avnet-data.ts` | Loads every dataset and runs the contract suite |

Rules:
- **Aggregates only.** Every view is aggregated to the grain below inside Databricks. Billing lines never leave it.
- **Never mock dressed as real.** `AVNET_DATA=databricks` without settings fails with an error naming what's missing. A view with a missing column or a wrong type fails, naming the view, row and column. A dataset is taken from the mock only when `AVNET_MOCK_DATASETS` names it, and then every Avnet figure is marked Mock.
- **The Databricks client** is `src/lib/databricks/client.ts` (Statement Execution API, HTTPS and a token), shared with the Databricks store.

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `AVNET_DATA` | `mock` | `mock` or `databricks` |
| `AVNET_MOCK_DATASETS` | unset | Datasets to take from the mock, e.g. `markets,supply` |
| `AVNET_CACHE_MINUTES` | 15 | How long figures are kept between queries |
| `DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABRICKS_WAREHOUSE_ID` | unset | The workspace, a token, the SQL warehouse |
| `AVNET_DATA_CATALOG`, `AVNET_DATA_SCHEMA` | `gold`, `market_intelligence` | Where the views live. The app needs SELECT on them only |

## Conventions

- Money: US$ millions at constant rates, unless a column says `_usd_b`.
- Quarters: Avnet fiscal quarters labelled `FY27 Q1`. The fiscal year ends on the Saturday nearest 30 June. Labels must match `terminal_fiscal_calendar`.
- Growth and shares: fractions (0.12 is 12%). Growth is on the same period a year earlier.
- Trailing 12 months: the latest four complete fiscal quarters.
- Segments: the code map's segment names, the same in every view.
- Regions: `Americas`, `EMEA`, `Asia`, `Farnell`.

## Datasets

Each row gives the method, its view(s) and the grain. Types are Databricks SQL types; every column is required unless it says NULL is allowed.

### fiscalCalendar: `terminal_fiscal_calendar`
One row per fiscal quarter in the last five years. `fiscal_quarter STRING`, `start_date DATE`, `end_date DATE`. Source: `bda_prd_na_avt.silver_master.avnet_fiscal_calendar`.

### performance: `terminal_performance`
One row per fiscal quarter, the latest eight (the app reads 8, newest first by `quarter_end`).

| Column | Type | Meaning |
|---|---|---|
| `fiscal_quarter` | STRING | `FY27 Q1` |
| `quarter_end` | DATE | For ordering |
| `billings_usd_m` | DOUBLE | Billings in the quarter |
| `bookings_usd_m` | DOUBLE | Bookings in the quarter |
| `backlog_usd_m` | DOUBLE | Backlog at quarter end |
| `book_to_bill` | DOUBLE | Bookings ÷ billings (checked within 1%) |
| `design_approved_share` | DOUBLE | Share of trailing 12-month billings on design-approved parts (DRMS status 04), ending this quarter |

Sources: billings (four regional views), bookings, backlog.

### segments: `terminal_segments`
One row per market segment, trailing 12 months. `segment STRING`, `sort_order INT`, `is_semi BOOLEAN` (a WSTS category), `billings_usd_m` (joined through the code map), `growth`, `confidence STRING` (`High`, `Medium`, `Low`: how much is on validated mappings), `mapped_share` (share of all billings the code map joins to a segment, the same on every row). Segment billings must add to trailing 12-month billings × `mapped_share`.

### regions: `terminal_regions`
One row per region. `region`, `sort_order`, `billings_usd_m` (latest quarter), `ttm_usd_m`, `growth`, `book_to_bill`, `backlog_usd_m` (latest quarter end). Regions' `ttm_usd_m` must add to the total.

### suppliers: `terminal_suppliers`
The top five suppliers by billings, then `All others`. `supplier`, `sort_order`, `share` (of all billings), `growth`, `revenue_usd_b` (the supplier's reported revenue, latest four quarters; NULL for All others), `revenue_confidence` (NULL for All others), `billings_usd_m`. Shares add to 1.

### verticals: `terminal_verticals`
One row per end market. `vertical`, `sort_order`, `share`, `growth`, `billings_usd_m`. Shares add to 1.

### pipeline: five views (DRMS)
Stages are `submitted`, `approved`, `production` and `billing`. Values are estimated annual billings. The window is registrations submitted in the trailing 12 months.
- `terminal_pipeline_funnel`: four rows, `stage`, `registrations`, `value_usd_m`. Counts never grow from one stage to the next.
- `terminal_pipeline_summary`: one row, `approved_pipeline_year_ago_usd_m`, `new_registrations_quarter`, `new_registrations_year_ago`, `approval_rate_year_ago`, `months_to_billing` (median, approval to first billing).
- `terminal_pipeline_quarterly`: the same eight quarters as performance, `fiscal_quarter`, `quarter_end`, `pipeline_usd_m` (approved, not yet billing), `design_billings_usd_m`.
- `terminal_pipeline_groups`: one row per group and stage. Columns: `grouping` (`supplier`, `segment` or `vertical`), `name`, `sort_order`, `stage`, `registrations`, `value_usd_m`, `pipeline_change` (on a year ago), `billings_usd_m` (the group's trailing 12 months), `stalled` (approved over 12 months ago, not in production). Each grouping adds back to the funnel.
- `terminal_pipeline_registrations`: `list` (`stalled`, oldest first; `recent`, approved in 30 days, newest first), `sort_order`, `registration`, `supplier`, `segment`, `value_usd_m`, `months_since_approval` (stalled), `days_since_approval` (recent).

### customers: `terminal_customer_concentration`, `terminal_top_customers`
Parent companies from the customer master.
- Concentration, one row: `top10_share`, `top10_share_year_ago`, `top100_share`, `top100_share_year_ago`, `active_customers` (billed in 12 months), `new_customer_growth`.
- Top customers, the ten largest: `customer`, `vertical` (one of the verticals), `region`, `billings_usd_m`, `growth`, `backlog_usd_m`, `pipeline_usd_m`. Their billings must match the top-10 share.

### codeMap: `terminal_code_map`
One row per external market category: `category_id`, `source` (`WSTS`, `Gartner`, `IP&E forecast`), `segment`, `segment_order`, `category`, `category_order`, `codes ARRAY<STRING>`, `pcc`, `billings_usd_m` (0 when unmapped), `confidence` (NULL when unmapped), `status` (`validated`, `suggested`, `review`, `unmapped`), `waits_on`, `definition`, `reason`, `parts ARRAY<STRING>`, `history ARRAY<STRUCT<days_ago INT, event STRING, by STRING>>`. A segment's mappings add to its billings. Source: `gold.market_intelligence.gartner_avnet_code_map`.

### supply: `terminal_supply`
One row per product category: `category`, `sort_order`, `lead_time_weeks`, `lead_time_change_weeks` (on a quarter ago), `po_value_usd_m` (purchase orders placed in the latest quarter; NULL allowed), `po_change`. Sources: the lead-time feed (licensed), procurement.

### markets: four views (licensed)
- `terminal_segment_markets`: one row per segment, `segment`, `market_usd_m` (latest four quarters), `market_growth`, `forecast_y1` to `forecast_y4` (growth in each of the next four years: the Scenario Modeler's base case).
- `terminal_region_markets`: `region` (Americas, EMEA, Asia, where Asia is Asia Pacific plus Japan), `market_usd_b`, `growth`.
- `terminal_market_settings`: one row, `supplier_revenue_growth` (until each supplier's own growth is joined), `spread_y1` to `spread_y4` (upside and downside band).
- `terminal_ai_devices`: `device`, `sort_order`, `sales_usd_m`, `growth`.

Sources: WSTS, Gartner, the IP&E forecast. Until these are in Databricks, run with `AVNET_MOCK_DATASETS=markets`.

### account: `terminal_accounts`
One row per company. Columns: `account_name`, `is_supplier`, `billings_usd_m`, `backlog_usd_m`, `open_registrations` (suppliers), `open_quotes` (customers; NULL allowed). The app looks a company up by name (case-insensitive) and role, and shows "None on record" when there's no row. Used by Company Profile, QBR briefs, Leads and the deck's account slide.

## At Avnet: hooking it up

1. Build the views from the draft in `db/databricks/views/terminal_views.sql`. Every line marked CONFIRM is a guess at a source column or rule.
2. Give the app's service principal SELECT on the views, and set `DATABRICKS_HOST`, `DATABRICKS_TOKEN` and `DATABRICKS_WAREHOUSE_ID`.
3. Run `AVNET_DATA=databricks npx tsx scripts/check-avnet-data.ts`. Add `AVNET_MOCK_DATASETS` for any dataset not built yet. Fix what it reports.
4. Set `AVNET_DATA=databricks` on the host. Pages show Live chips once nothing is taken from the mock.
5. In `src/lib/hookups.ts`, set each connected source's status to `live`.

Still to do once real data flows:
- Page copy still says "mock" or "names withheld in mock" in captions and footnotes. Sweep it when the data is live.
- `src/lib/data/mock/tam.ts` (TAM history) and `src/lib/data/mock/forecast.ts` remain public-data mocks outside this layer, to be replaced by the WSTS hookup.

## Tests

- `src/lib/avnet/mock.contract.test.ts`: the mock passes the contract, and every derived figure equals the old mock constants exactly.
- `src/lib/avnet/databricks/adapter.test.ts`: the mock written out as view rows comes back unchanged through the adapter and passes the contract. Bad rows, missing settings and the mock opt-in are also tested.

Neither has run against a real workspace.
