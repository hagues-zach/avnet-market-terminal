// The SQL the Databricks adapter runs. Each reads one view in the app's schema
// (AVNET_DATA_CATALOG.AVNET_DATA_SCHEMA, gold.market_intelligence by default)
// that the data team builds from the source tables, aggregated to the contract's
// grain, so billings never leave Databricks. Draft definitions of every view are
// in db/databricks/views/; docs/data-contracts.md lists their columns.
//
// DRAFT: the view and column names here are the app's side of the contract.
// Confirm them with the data team when the views are built.

export const QUERIES = {
  fiscalCalendar: `
    SELECT fiscal_quarter, start_date, end_date
    FROM terminal_fiscal_calendar
    WHERE start_date >= add_months(current_date(), -60) AND start_date <= current_date()
    ORDER BY start_date`,

  performance: `
    SELECT fiscal_quarter, billings_usd_m, bookings_usd_m, backlog_usd_m, book_to_bill, design_approved_share
    FROM terminal_performance
    ORDER BY quarter_end DESC
    LIMIT 8`,

  segments: `
    SELECT segment, is_semi, billings_usd_m, growth, confidence, mapped_share
    FROM terminal_segments
    ORDER BY sort_order`,

  regions: `
    SELECT region, billings_usd_m, ttm_usd_m, growth, book_to_bill, backlog_usd_m
    FROM terminal_regions
    ORDER BY sort_order`,

  suppliers: `
    SELECT supplier, share, growth, revenue_usd_b, revenue_confidence, billings_usd_m
    FROM terminal_suppliers
    ORDER BY sort_order`,

  verticals: `
    SELECT vertical, share, growth, billings_usd_m
    FROM terminal_verticals
    ORDER BY sort_order`,

  pipelineFunnel: `
    SELECT stage, registrations, value_usd_m
    FROM terminal_pipeline_funnel`,

  pipelineSummary: `
    SELECT approved_pipeline_year_ago_usd_m, new_registrations_quarter, new_registrations_year_ago, approval_rate_year_ago, months_to_billing
    FROM terminal_pipeline_summary`,

  pipelineQuarterly: `
    SELECT fiscal_quarter, pipeline_usd_m, design_billings_usd_m
    FROM terminal_pipeline_quarterly
    ORDER BY quarter_end DESC
    LIMIT 8`,

  pipelineGroups: `
    SELECT grouping, name, stage, registrations, value_usd_m, pipeline_change, billings_usd_m, stalled
    FROM terminal_pipeline_groups
    ORDER BY grouping, sort_order`,

  pipelineRegistrations: `
    SELECT list, registration, supplier, segment, value_usd_m, months_since_approval, days_since_approval
    FROM terminal_pipeline_registrations
    ORDER BY list, sort_order`,

  concentration: `
    SELECT top10_share, top10_share_year_ago, top100_share, top100_share_year_ago, active_customers, new_customer_growth
    FROM terminal_customer_concentration`,

  topCustomers: `
    SELECT customer, vertical, region, billings_usd_m, growth, backlog_usd_m, pipeline_usd_m
    FROM terminal_top_customers
    ORDER BY billings_usd_m DESC
    LIMIT 10`,

  codeMap: `
    SELECT category_id, source, segment, category, to_json(codes) AS codes, pcc, billings_usd_m, confidence, status,
           waits_on, definition, reason, to_json(parts) AS parts, to_json(history) AS history
    FROM terminal_code_map
    ORDER BY segment_order, category_order`,

  supply: `
    SELECT category, lead_time_weeks, lead_time_change_weeks, po_value_usd_m, po_change
    FROM terminal_supply
    ORDER BY sort_order`,

  segmentMarkets: `
    SELECT segment, market_usd_m, market_growth, forecast_y1, forecast_y2, forecast_y3, forecast_y4
    FROM terminal_segment_markets`,

  regionMarkets: `
    SELECT region, market_usd_b, growth
    FROM terminal_region_markets`,

  marketSettings: `
    SELECT supplier_revenue_growth, spread_y1, spread_y2, spread_y3, spread_y4
    FROM terminal_market_settings`,

  aiDevices: `
    SELECT device, sales_usd_m, growth
    FROM terminal_ai_devices
    ORDER BY sort_order`,

  account: `
    SELECT billings_usd_m, backlog_usd_m, open_registrations, open_quotes
    FROM terminal_accounts
    WHERE lower(account_name) = lower(:name) AND is_supplier = :supplier
    LIMIT 1`,
} as const;

export type QueryName = keyof typeof QUERIES;

/** The view each query reads, for errors and docs. */
export const viewOf = (name: QueryName) => /FROM (terminal_\w+)/.exec(QUERIES[name])![1];
