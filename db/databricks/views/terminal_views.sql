-- DRAFT views for the Market Intelligence Terminal, for the data team to confirm
-- and build. The app reads only these views (src/lib/avnet/databricks/queries.ts),
-- one per dataset, already aggregated, so billings never leave Databricks.
-- docs/data-contracts.md lists every column with its grain and units.
--
-- Status: written from the PRD's table and field names (src/lib/hookups.ts), not
-- run. Every source table, column and join below needs checking against the
-- real schemas: lines marked CONFIRM are guesses.
--
-- Target schema: gold.market_intelligence (or AVNET_DATA_CATALOG.AVNET_DATA_SCHEMA).
-- The app's service principal needs SELECT on these views only.
--
-- Conventions: money in US$ millions at constant rates; fiscal quarter labels
-- like 'FY27 Q1'; growth and shares as fractions (0.12 = 12%); trailing 12
-- months = the latest four complete fiscal quarters.

USE CATALOG gold;
USE SCHEMA market_intelligence;

-- ---------------------------------------------------------------------------
-- Building blocks (not read by the app)
-- ---------------------------------------------------------------------------

-- Fiscal quarters with their dates. CONFIRM column names in avnet_fiscal_calendar.
CREATE OR REPLACE VIEW terminal_fiscal_calendar AS
SELECT
  concat('FY', right(cast(fiscal_year AS STRING), 2), ' Q', cast(fiscal_quarter AS STRING)) AS fiscal_quarter,
  min(calendar_date) AS start_date,
  max(calendar_date) AS end_date
FROM bda_prd_na_avt.silver_master.avnet_fiscal_calendar
GROUP BY fiscal_year, fiscal_quarter;

-- The latest eight complete fiscal quarters, newest first, numbered (1 = latest).
CREATE OR REPLACE VIEW terminal_recent_quarters AS
SELECT fiscal_quarter, start_date, end_date, row_number() OVER (ORDER BY end_date DESC) AS q
FROM terminal_fiscal_calendar
WHERE end_date < current_date()
QUALIFY q <= 8;

-- Every billing line from the three regional systems, in one shape.
-- CONFIRM: the APAC and Asia column names, the USD conversion (fx-rates), how
-- Farnell is identified, and the customer and vertical joins (customer master).
CREATE OR REPLACE VIEW terminal_billings_base AS
SELECT posting_date, 'Americas' AS region, extended_resale AS usd, manufacturer_code, technology_code, drms_status, customer_parent, vertical
FROM bda_prd_na_avt.silver_sales.billings_primary_view            -- CONFIRM customer_parent, vertical columns or joins
UNION ALL
SELECT posting_date, CASE WHEN sales_org LIKE 'FAR%' THEN 'Farnell' ELSE 'EMEA' END, extended_resale_usd, manufacturer_code, technology_code, drms_status, customer_parent, vertical
FROM bda_prd_apac_pf.silver_sales.bill24_detail                   -- CONFIRM: is EMEA here or in billings_core_view?
UNION ALL
SELECT posting_date, 'Asia', extended_resale_usd, manufacturer_code, technology_code, drms_status, customer_parent, vertical
FROM bda_prd_asia_avt.silver_sales.bill24_view;

-- Billings by fiscal quarter, with the quarter number from terminal_recent_quarters.
CREATE OR REPLACE VIEW terminal_billings_quarterly AS
SELECT q.fiscal_quarter, q.end_date AS quarter_end, q.q, b.*
FROM terminal_billings_base b
JOIN terminal_recent_quarters q ON b.posting_date BETWEEN q.start_date AND q.end_date;

-- ---------------------------------------------------------------------------
-- Performance: one row per fiscal quarter
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW terminal_performance AS
WITH billed AS (
  SELECT fiscal_quarter, quarter_end, q, sum(usd) / 1e6 AS billings_usd_m,
         sum(CASE WHEN drms_status = '04' THEN usd END) / 1e6 AS design_approved_usd_m
  FROM terminal_billings_quarterly GROUP BY fiscal_quarter, quarter_end, q
),
booked AS (   -- CONFIRM bookings columns (PRD: "booking date", "order value")
  SELECT r.fiscal_quarter, sum(order_value_usd) / 1e6 AS bookings_usd_m
  FROM bda_prd_na_avt.silver_sales.bookings_primary_view b
  JOIN terminal_recent_quarters r ON b.booking_date BETWEEN r.start_date AND r.end_date
  GROUP BY r.fiscal_quarter                                         -- CONFIRM: add Asia book17_view
),
backlog AS (  -- CONFIRM: a backlog snapshot at each quarter end
  SELECT r.fiscal_quarter, sum(open_value_usd) / 1e6 AS backlog_usd_m
  FROM bda_prd_na_avt.silver_sales.backlog_primary_view b
  JOIN terminal_recent_quarters r ON b.snapshot_date = r.end_date
  GROUP BY r.fiscal_quarter
)
SELECT
  b.fiscal_quarter, b.quarter_end, b.billings_usd_m, k.bookings_usd_m, l.backlog_usd_m,
  k.bookings_usd_m / b.billings_usd_m AS book_to_bill,
  -- Share of trailing 12-month billings on design-approved parts, ending this quarter.
  sum(b.design_approved_usd_m) OVER w / sum(b.billings_usd_m) OVER w AS design_approved_share
FROM billed b
JOIN booked k USING (fiscal_quarter)
JOIN backlog l USING (fiscal_quarter)
WINDOW w AS (ORDER BY b.quarter_end ROWS BETWEEN 3 PRECEDING AND CURRENT ROW);

-- ---------------------------------------------------------------------------
-- Billings by segment (through the code map), region, supplier and vertical
-- ---------------------------------------------------------------------------

-- Segments: billings joined to a market segment through the validated code map.
CREATE OR REPLACE VIEW terminal_segments AS
WITH ttm AS (
  SELECT b.*, CASE WHEN q <= 4 THEN 'now' ELSE 'year_ago' END AS period FROM terminal_billings_quarterly b
),
mapped AS (
  SELECT m.segment, m.segment_order, m.is_semi, t.period, sum(t.usd) / 1e6 AS usd_m
  FROM ttm t JOIN gold.market_intelligence.gartner_avnet_code_map m ON t.technology_code = m.technology_code  -- CONFIRM join key
  WHERE m.status = 'validated' OR m.status = 'suggested'                                                     -- CONFIRM which statuses count
  GROUP BY m.segment, m.segment_order, m.is_semi, t.period
),
total AS (SELECT sum(usd) / 1e6 AS usd_m FROM ttm WHERE period = 'now')
SELECT
  n.segment, n.segment_order AS sort_order, n.is_semi, n.usd_m AS billings_usd_m,
  n.usd_m / y.usd_m - 1 AS growth,
  'High' AS confidence,                                             -- CONFIRM: from the share of the segment's billings on validated mappings
  sum(n.usd_m) OVER () / (SELECT usd_m FROM total) AS mapped_share
FROM mapped n JOIN mapped y ON y.segment = n.segment AND y.period = 'year_ago'
WHERE n.period = 'now';

CREATE OR REPLACE VIEW terminal_regions AS
SELECT
  region,
  CASE region WHEN 'Americas' THEN 1 WHEN 'EMEA' THEN 2 WHEN 'Asia' THEN 3 ELSE 4 END AS sort_order,
  sum(CASE WHEN q = 1 THEN usd END) / 1e6 AS billings_usd_m,
  sum(CASE WHEN q <= 4 THEN usd END) / 1e6 AS ttm_usd_m,
  sum(CASE WHEN q <= 4 THEN usd END) / sum(CASE WHEN q > 4 THEN usd END) - 1 AS growth,
  CAST(NULL AS DOUBLE) AS book_to_bill,                             -- CONFIRM: bookings by region, latest quarter
  CAST(NULL AS DOUBLE) AS backlog_usd_m                             -- CONFIRM: backlog by region, latest quarter end
FROM terminal_billings_quarterly
GROUP BY region;

-- Top five suppliers by billings, then "All others". revenue_usd_b is each
-- supplier's reported revenue (SEC filings or a licensed feed), latest four quarters.
CREATE OR REPLACE VIEW terminal_suppliers AS
WITH s AS (
  SELECT manufacturer_code,
         sum(CASE WHEN q <= 4 THEN usd END) / 1e6 AS now_m,
         sum(CASE WHEN q > 4 THEN usd END) / 1e6 AS before_m
  FROM terminal_billings_quarterly GROUP BY manufacturer_code
),
ranked AS (SELECT *, row_number() OVER (ORDER BY now_m DESC) AS r, sum(now_m) OVER () AS total_m FROM s)
SELECT supplier, sort_order, share, growth, revenue_usd_b, revenue_confidence, billings_usd_m FROM (
  SELECT coalesce(v.supplier_name, x.manufacturer_code) AS supplier, x.r AS sort_order, x.now_m / x.total_m AS share,
         x.now_m / x.before_m - 1 AS growth, v.revenue_usd_b, v.revenue_confidence, x.now_m AS billings_usd_m
  FROM ranked x LEFT JOIN gold.market_intelligence.supplier_revenue v ON v.manufacturer_code = x.manufacturer_code  -- CONFIRM: table to create
  WHERE x.r <= 5
  UNION ALL
  SELECT 'All others', 6, sum(now_m) / max(total_m), sum(now_m) / sum(before_m) - 1, NULL, NULL, sum(now_m)
  FROM ranked WHERE r > 5
);

CREATE OR REPLACE VIEW terminal_verticals AS
SELECT vertical, row_number() OVER (ORDER BY sum(CASE WHEN q <= 4 THEN usd END) DESC) AS sort_order,
       sum(CASE WHEN q <= 4 THEN usd END) / sum(sum(CASE WHEN q <= 4 THEN usd END)) OVER () AS share,
       sum(CASE WHEN q <= 4 THEN usd END) / sum(CASE WHEN q > 4 THEN usd END) - 1 AS growth,
       sum(CASE WHEN q <= 4 THEN usd END) / 1e6 AS billings_usd_m
FROM terminal_billings_quarterly
GROUP BY vertical;

-- ---------------------------------------------------------------------------
-- Customers (parent company, customer master)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW terminal_customer_parent_ttm AS
SELECT customer_parent,
       sum(CASE WHEN q <= 4 THEN usd END) / 1e6 AS now_m,
       sum(CASE WHEN q > 4 THEN usd END) / 1e6 AS before_m
FROM terminal_billings_quarterly GROUP BY customer_parent;

CREATE OR REPLACE VIEW terminal_customer_concentration AS
WITH r AS (
  SELECT *, row_number() OVER (ORDER BY now_m DESC) AS rn_now, row_number() OVER (ORDER BY before_m DESC) AS rn_before,
         sum(now_m) OVER () AS total_now, sum(before_m) OVER () AS total_before
  FROM terminal_customer_parent_ttm
)
SELECT
  sum(CASE WHEN rn_now <= 10 THEN now_m END) / max(total_now) AS top10_share,
  sum(CASE WHEN rn_before <= 10 THEN before_m END) / max(total_before) AS top10_share_year_ago,
  sum(CASE WHEN rn_now <= 100 THEN now_m END) / max(total_now) AS top100_share,
  sum(CASE WHEN rn_before <= 100 THEN before_m END) / max(total_before) AS top100_share_year_ago,
  count_if(now_m > 0) AS active_customers,
  CAST(NULL AS DOUBLE) AS new_customer_growth                       -- CONFIRM: first-billed customers this year ÷ last year − 1
FROM r;

CREATE OR REPLACE VIEW terminal_top_customers AS
SELECT c.customer_parent AS customer, m.vertical, m.region, c.now_m AS billings_usd_m, c.now_m / c.before_m - 1 AS growth,
       CAST(NULL AS DOUBLE) AS backlog_usd_m,                       -- CONFIRM: open backlog by parent company
       CAST(NULL AS DOUBLE) AS pipeline_usd_m                       -- CONFIRM: approved DRMS value not yet billing, by parent company
FROM terminal_customer_parent_ttm c
JOIN gold.market_intelligence.customer_parent_attributes m USING (customer_parent)  -- CONFIRM: parent's main vertical and region
ORDER BY c.now_m DESC
LIMIT 10;

-- One company's business with Avnet, matched on name: manufacturer name for
-- suppliers, parent company for customers. CONFIRM name matching; add an alias
-- table if the app's company names differ from Avnet's.
CREATE OR REPLACE VIEW terminal_accounts AS
SELECT supplier_name AS account_name, TRUE AS is_supplier, billings_usd_m, CAST(NULL AS DOUBLE) AS backlog_usd_m,
       CAST(NULL AS BIGINT) AS open_registrations, CAST(NULL AS BIGINT) AS open_quotes
FROM (SELECT coalesce(v.supplier_name, b.manufacturer_code) AS supplier_name, sum(CASE WHEN q <= 4 THEN usd END) / 1e6 AS billings_usd_m
      FROM terminal_billings_quarterly b LEFT JOIN gold.market_intelligence.supplier_revenue v USING (manufacturer_code)
      GROUP BY 1)
UNION ALL
SELECT customer_parent, FALSE, now_m, NULL, NULL, NULL FROM terminal_customer_parent_ttm;

-- ---------------------------------------------------------------------------
-- Design pipeline (DRMS: bda_prd_na_avt.silver_master.drms_detail)
-- Stages: submitted, approved, production, billing. Values are estimated annual
-- billings, US$ millions. The column list is the contract; the logic is the data
-- team's (registration status codes, how "in production" is judged).
-- ---------------------------------------------------------------------------

-- terminal_pipeline_funnel:        stage, registrations, value_usd_m  (four rows)
-- terminal_pipeline_summary:       approved_pipeline_year_ago_usd_m, new_registrations_quarter,
--                                  new_registrations_year_ago, approval_rate_year_ago, months_to_billing  (one row)
-- terminal_pipeline_quarterly:     fiscal_quarter, quarter_end, pipeline_usd_m, design_billings_usd_m  (the same eight quarters as terminal_performance)
-- terminal_pipeline_groups:        grouping ('supplier' | 'segment' | 'vertical'), name, sort_order, stage,
--                                  registrations, value_usd_m, pipeline_change, billings_usd_m, stalled  (one row per group and stage)
-- terminal_pipeline_registrations: list ('stalled' | 'recent'), sort_order, registration, supplier, segment,
--                                  value_usd_m, months_since_approval, days_since_approval

CREATE OR REPLACE VIEW terminal_pipeline_funnel AS
SELECT stage, count(*) AS registrations, sum(est_annual_usd) / 1e6 AS value_usd_m
FROM (
  SELECT d.design_registration_number, d.est_annual_usd,                                  -- CONFIRM value column
         explode(filter(array(
           'submitted',
           CASE WHEN d.reg_status IN ('03', '04') THEN 'approved' END,                    -- CONFIRM status codes
           CASE WHEN d.first_production_date IS NOT NULL THEN 'production' END,           -- CONFIRM
           CASE WHEN d.reg_status = '04' AND d.first_billing_date IS NOT NULL THEN 'billing' END
         ), s -> s IS NOT NULL)) AS stage
  FROM bda_prd_na_avt.silver_master.drms_detail d
  WHERE d.submitted_date >= add_months(current_date(), -12)
)
GROUP BY stage;

-- ---------------------------------------------------------------------------
-- Code map, supply, markets: the app's own and licensed tables
-- ---------------------------------------------------------------------------

-- terminal_code_map: one row per external market category.
--   category_id, source ('WSTS' | 'Gartner' | 'IP&E forecast'), segment, segment_order, category, category_order,
--   codes ARRAY<STRING>, pcc, billings_usd_m (trailing 12 months through the mapping; 0 when unmapped),
--   confidence ('High' | 'Medium' | 'Low' | NULL), status ('validated' | 'suggested' | 'review' | 'unmapped'),
--   waits_on, definition, reason, parts ARRAY<STRING>, history ARRAY<STRUCT<days_ago INT, event STRING, by STRING>>
--   Source: gold.market_intelligence.gartner_avnet_code_map joined to trailing 12-month billings by technology code.

-- terminal_supply: category, sort_order, lead_time_weeks, lead_time_change_weeks (on a quarter ago),
--   po_value_usd_m (purchase orders placed, latest quarter; NULL if none), po_change (on the quarter before)
--   Sources: the lead-time feed (licensed) and procurement (suppliers24_detail).

-- terminal_segment_markets: segment, market_usd_m (latest four quarters), market_growth, forecast_y1..forecast_y4
--   Sources: WSTS and Gartner (semiconductor segments), the IP&E forecast (connectors, passives, electromechanical).
-- terminal_region_markets:  region ('Americas' | 'EMEA' | 'Asia'), market_usd_b, growth  (WSTS regions; Asia = Asia Pacific plus Japan)
-- terminal_market_settings: supplier_revenue_growth, spread_y1..spread_y4  (one row)
-- terminal_ai_devices:      device, sort_order, sales_usd_m, growth  (WSTS Blue Book detail and Gartner device forecast)
--
-- Until a licensed feed is in Databricks, run with AVNET_MOCK_DATASETS naming it
-- (for example markets,supply): pages then mark Avnet's figures as mock.
