// Every place the app needs real data, in one register. Pages and sections refer
// to these by id, the Data Hookups page lists them, and the Learning Center uses
// them as data source guides. When a source is connected, change its status to
// "live" and replace the mock module named in `replaceIn`.
//
// Data pillars follow the PRD (docs/superapp-plan.md links it): open data,
// licensed third-party data, and Avnet internal data.

export type DataPillar = "open" | "licensed" | "internal" | "derived";
export type HookupStatus = "live" | "mock" | "planned";

export const PILLAR_NAMES: Record<DataPillar, string> = {
  open: "Open data",
  licensed: "Licensed third-party",
  internal: "Avnet internal",
  derived: "Derived (built on the others)",
};

export interface Hookup {
  id: string;
  name: string;
  pillar: DataPillar;
  status: HookupStatus;
  /** What it is, in a sentence. */
  description: string;
  /** Tables, views, files or endpoints, exactly as named in the PRD or the code. */
  sources: string[];
  fields?: string[];
  refresh: string;
  /** Mock module to replace when this goes live. */
  replaceIn?: string;
  notes?: string;
}

export const HOOKUPS: Hookup[] = [
  // ---- Avnet internal (PRD section 3) ----
  {
    id: "billings",
    name: "Avnet billings",
    pillar: "internal",
    status: "mock",
    description: "Billings by posting date, manufacturer and technology code. The numerator of every market share figure.",
    sources: [
      "bda_prd_na_avt.silver_sales.billings_primary_view",
      "bda_prd_na_avt.silver_sales.billings_core_view",
      "bda_prd_asia_avt.silver_sales.bill24_view",
      "bda_prd_apac_pf.silver_sales.bill24_detail",
    ],
    fields: ["posting_date", "extended_resale", "manufacturer_code", "technology_code", "drms_status"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "bookings",
    name: "Avnet bookings",
    pillar: "internal",
    status: "mock",
    description: "Orders booked, for book-to-bill and forward demand.",
    sources: ["bda_prd_na_avt.silver_sales.bookings_primary_view", "bda_prd_asia_avt.silver_sales.book17_view"],
    fields: ["booking date", "order value"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "backlog",
    name: "Avnet backlog",
    pillar: "internal",
    status: "mock",
    description: "Open backlog with customer-requested and committed dates.",
    sources: [
      "bda_prd_na_avt.silver_sales.backlog_primary_view",
      "bda_prd_na_pf.silver_sales.backlog_details",
      "bda_prd_apac_pf.silver_sales.backlog_view",
    ],
    fields: ["CRD / MAD segmentation", "open value"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "quotes",
    name: "Quote pipeline",
    pillar: "internal",
    status: "mock",
    description: "Quote lines and vendor quotations, for win rates and pricing.",
    sources: ["bda_prd_apac_pf.silver_quote.quotelines", "bda_prd_apac_pf.silver_quote.vendavaodet"],
    fields: ["quote value", "won orders", "pricing", "discounts"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
    notes: "Only APAC (Farnell) is listed in the PRD; other regions to confirm.",
  },
  {
    id: "drms",
    name: "Design registrations (DRMS)",
    pillar: "internal",
    status: "mock",
    description: "Design registration records: a leading indicator of future billings.",
    sources: ["bda_prd_na_avt.silver_master.drms_detail"],
    fields: ["design_registration_number", "reg_status", "supplier", "approved_date", "material"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
    notes: "DRMS status '04' marks design-approved billings (PRD module 2).",
  },
  {
    id: "material-master",
    name: "Product and material master",
    pillar: "internal",
    status: "planned",
    description: "Product hierarchy, commodity codes and manufacturer part numbers: the key for mapping to Gartner and WSTS.",
    sources: [
      "bcs_prd_na_avt.ssds_master.material",
      "bda_prd_na_avt.silver_master.mat24_detail",
      "bda_prd_asia_avt.silver_master.mat24_detail",
      "bda_prd_apac_pf.silver_master.products_detail",
      "bda_prd_apac_pf.silver_master.classcodes24_detail",
      "bda_prd_apac_pf.silver_master.prodgroupcpc24_detail",
      "bda_prd_apac_pf.silver_master.productmanager_detail",
      "bda_prd_apac_pf.silver_master.brands_detail",
    ],
    fields: ["product_hierarchy", "product_category", "Commodity_code", "pcc_level_1/2/3", "manufacturer_part_number", "brand_name", "parent_brand_name"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-mapping.ts",
  },
  {
    id: "customer-master",
    name: "Customer and end-market master",
    pillar: "internal",
    status: "mock",
    description: "End customer, industry environment, SIC code, parent company and region.",
    sources: [
      "bda_prd_apac_pf.silver_master.customershipto24_detail",
      "bda_prd_apac_pf.silver_master.customer_accts_daily_snapshot",
      "bda_prd_apac_pf.silver_master.customer_accts_monthly_snapshot",
      "bda_prd_asia_avt.silver_master.cust24_detail",
    ],
    fields: ["EndCustomer", "SICC_Code", "GlobalEnvironmentc", "GlobalSubEnvironmentC", "ParentCompany", "Region"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "procurement",
    name: "Purchasing and fulfilment",
    pillar: "internal",
    status: "mock",
    description: "Purchase orders, sales orders and deliveries: the buy side.",
    sources: [
      "bcs_prd_na_avt.ssds_purchase.po_header",
      "bcs_prd_na_avt.ssds_purchase.po_item",
      "bcs_prd_na_avt.ssds_sales.sales_order_item",
      "bcs_prd_na_avt.ssds_sales.delivery_item",
      "bda_prd_apac_pf.silver_master.suppliers24_detail",
    ],
    fields: ["Vendor_No", "Purch_Doc_Date", "PO_Qty", "Net_Price_Purchasing_Doc"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "fiscal-calendar",
    name: "Avnet fiscal calendar",
    pillar: "internal",
    status: "planned",
    description: "Fiscal weeks, months, quarters and years, so every figure lines up on Avnet's calendar.",
    sources: ["bda_prd_na_avt.silver_master.avnet_fiscal_calendar"],
    refresh: "Yearly",
  },
  {
    id: "fx-rates",
    name: "Exchange rates (internal)",
    pillar: "internal",
    status: "planned",
    description: "Rates for converting regional billings to one currency.",
    sources: ["bda_prd_apac_pf.silver_master.exrates_detail"],
    refresh: "Daily",
  },
  {
    id: "avnet-outlooks",
    name: "Avnet market outlooks",
    pillar: "internal",
    status: "mock",
    description: "Avnet's own market outlook reports and forecasts.",
    sources: ["Internal outlook reports (delivery format to confirm)"],
    refresh: "Quarterly",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },
  {
    id: "account-data",
    name: "Seller account data",
    pillar: "internal",
    status: "mock",
    description: "A seller's own accounts, open quotes and opportunities, for QBR prep and lead finding.",
    sources: ["CRM (system to confirm, PRD open question 15)"],
    refresh: "Daily",
    replaceIn: "src/lib/shells/mock-avnet.ts",
  },

  // ---- Licensed third-party (PRD section 2, pillar 2) ----
  {
    id: "wsts",
    name: "WSTS billings and forecasts",
    pillar: "licensed",
    status: "mock",
    description: "Monthly semiconductor billings and forecasts by product category and region. The denominator for market share.",
    sources: ["WSTS files (format to confirm)"],
    fields: ["product category", "region", "month", "billings", "forecast"],
    refresh: "Monthly",
    replaceIn: "src/lib/data/mock/tam.ts, src/lib/data/mock/overview.ts, src/lib/data/mock/forecast.ts",
  },
  {
    id: "gartner-forecast",
    name: "Gartner semiconductor forecast",
    pillar: "licensed",
    status: "mock",
    description: "Revenue forecasts by device type, application and geography.",
    sources: ["Gartner files or API (to confirm)"],
    fields: ["device type", "application", "geography", "year"],
    refresh: "Quarterly",
    replaceIn: "src/lib/shells/mock-market.ts",
  },
  {
    id: "gartner-capex",
    name: "Gartner capex and memory forecasts",
    pillar: "licensed",
    status: "planned",
    description: "Capital expenditure and DRAM, NAND and NOR projections.",
    sources: ["Gartner files or API (to confirm)"],
    refresh: "Quarterly",
  },
  {
    id: "gartner-articles",
    name: "Gartner analyst articles",
    pillar: "licensed",
    status: "planned",
    description: "Analyst commentary to sit beside the open news feed.",
    sources: ["Gartner portal (to confirm)"],
    refresh: "Weekly",
  },
  {
    id: "ipe-forecast",
    name: "IP&E forecast",
    pillar: "licensed",
    status: "mock",
    description: "Interconnect, passive and electromechanical component forecasts.",
    sources: ["IP&E forecast files (provider to confirm)"],
    refresh: "Quarterly",
    replaceIn: "src/lib/shells/mock-market.ts",
  },
  {
    id: "lead-times",
    name: "Lead times (ECIA and Sourceability)",
    pillar: "licensed",
    status: "mock",
    description: "Component lead times and availability across the channel.",
    sources: ["ECIA lead time data (via Avnet)", "Sourceability lead time feed"],
    fields: ["manufacturer part number", "lead time weeks", "availability"],
    refresh: "Weekly",
    replaceIn: "src/lib/shells/mock-market.ts",
    notes: "Matched to the material master by manufacturer part number.",
  },

  // ---- Derived ----
  {
    id: "code-map",
    name: "Gartner/WSTS to Avnet code map",
    pillar: "derived",
    status: "mock",
    description: "The mapping from external market categories to Avnet's product codes. Without it, market share is meaningless.",
    sources: ["gold.market_intelligence.gartner_avnet_code_map"],
    fields: [
      "gartner_device_type_code",
      "wsts_product_category",
      "avnet_technology_code",
      "avnet_product_hierarchy",
      "avnet_pcc_level_1/2/3",
      "mapping_confidence",
      "validated_by",
      "validation_date",
    ],
    refresh: "As needed, versioned",
    replaceIn: "src/lib/shells/mock-mapping.ts",
  },
  {
    id: "tam-sam-som",
    name: "TAM / SAM / SOM tables",
    pillar: "derived",
    status: "mock",
    description: "Pre-computed market size, serviceable market and Avnet share by segment and period.",
    sources: ["gold.market_intelligence.tam_sam_som_quarterly", "gold.market_intelligence.market_share_by_segment"],
    refresh: "Monthly",
    replaceIn: "src/lib/shells/mock-market.ts",
  },
  {
    id: "transcripts",
    name: "Earnings call transcripts",
    pillar: "open",
    status: "planned",
    description: "Full call transcripts for summaries and sentiment. Press releases are already used; transcripts need a source.",
    sources: ["Transcript provider (to choose)", "gold.market_intelligence.earnings_call_summaries"],
    refresh: "Quarterly",
  },

  // ---- Open data already live ----
  {
    id: "sec",
    name: "SEC filings and financial data",
    pillar: "open",
    status: "live",
    description: "Quarterly financials, segment and region splits, filings and press releases for 77 companies.",
    sources: ["data.sec.gov company facts and submissions", "www.sec.gov filing documents"],
    refresh: "Every 6–12 hours",
  },
  {
    id: "news",
    name: "News feeds",
    pillar: "open",
    status: "live",
    description: "Trade-press RSS, GDELT, Federal Register notices and distribution agreement announcements.",
    sources: ["RSS feeds", "GDELT", "Federal Register API", "Google News search feed"],
    refresh: "Every 15 minutes to 6 hours",
  },
  {
    id: "macro",
    name: "Economic indicators",
    pillar: "open",
    status: "live",
    description: "Production, prices, metals, rates and currency.",
    sources: ["Federal Reserve G.17", "BLS", "IMF commodity prices", "US Treasury", "New York Fed", "ECB"],
    refresh: "Every 6 hours",
  },
  {
    id: "line-cards",
    name: "Distributor line cards",
    pillar: "open",
    status: "live",
    description: "Snapshots from TTI, Future and Newark; other distributors by import.",
    sources: ["Distributor manufacturer pages", "data/line-cards"],
    refresh: "On collect or import",
  },
];

export const hookup = (id: string): Hookup | undefined => HOOKUPS.find((h) => h.id === id);
