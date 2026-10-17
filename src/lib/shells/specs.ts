import type { ShellSpec } from "./types";
import { fmtM, fmtPct, PERFORMANCE, QUARTERS, REGIONS, SEGMENTS, SUPPLIERS, VERTICALS } from "./mock-avnet";
import { LEAD_TIMES, SHARE_BY_SEGMENT, SHARE_TREND } from "./mock-market";
import { MAPPING_ROWS } from "./mock-mapping";

// One spec per shell page. Every Avnet-specific figure here is MOCK and every
// section names the hookup that will replace it.

const latest = PERFORMANCE[PERFORMANCE.length - 1];
const yearAgo = PERFORMANCE[PERFORMANCE.length - 5];

export const START: ShellSpec = {
  title: "Start Here",
  subtitle: "The five numbers that matter this week, and where to go next",
  pillar: "home",
  purpose: "The landing page: Avnet's position in one glance, what changed, and the next step for each role.",
  prd: "PRD 8.3 onboarding and persona 4 executive summary",
  personas: ["everyone"],
  sections: [
    {
      kind: "kpis",
      title: "This quarter",
      subtitle: `${QUARTERS[QUARTERS.length - 1]} · mock`,
      hookups: ["billings", "bookings", "backlog", "tam-sam-som", "drms"],
      items: [
        { label: "Billings", value: fmtM(latest.billings), change: `${fmtPct(latest.billings / yearAgo.billings - 1, true)} YoY`, good: true },
        { label: "Book-to-bill", value: latest.bookToBill.toFixed(2), note: "above 1 means demand is building" },
        { label: "Backlog", value: fmtM(latest.backlog), change: `${fmtPct(latest.backlog / yearAgo.backlog - 1, true)} YoY`, good: true },
        { label: "Share of mapped market", value: "4.3%", change: "+0.3 pts YoY", good: true },
      ],
    },
    {
      kind: "list",
      title: "Start with",
      subtitle: "By role (PRD section 9)",
      hookups: [],
      span: "half",
      items: [
        { title: "Product or supplier business manager", body: "Company Profiles, Line Cards, Market Share by supplier, Design Pipeline.", tag: "Network" },
        { title: "Sales leader or regional VP", body: "Performance Tracker by region, Customers & End Markets, QBR Prep.", tag: "Performance" },
        { title: "Strategy and corporate development", body: "TAM / SAM / SOM, Scenario Modeler, Market Cycle.", tag: "Performance" },
        { title: "Executive", body: "This page, Market Cycle and Avnet vs Arrow.", tag: "Knowledge" },
        { title: "Analyst", body: "Code Mapping, Data Hookups, Ask the Terminal.", tag: "Tools" },
      ],
    },
    {
      kind: "list",
      title: "What changed this week",
      subtitle: "Will be generated from news, filings and Avnet movements",
      hookups: ["billings", "bookings"],
      span: "half",
      items: [
        { title: "Book-to-bill rose above 1.1 in Asia", body: "Mock. Will come from regional bookings and billings.", tag: "Avnet" },
        { title: "Two suppliers announced new distribution agreements", body: "Live data exists on Line Cards; this summary is not wired yet.", tag: "Network" },
        { title: "Memory lead times extended again", body: "Mock. Will come from ECIA and Sourceability lead times.", tag: "Supply" },
      ],
    },
  ],
};

export const PERFORMANCE_SPEC: ShellSpec = {
  title: "Performance Tracker",
  subtitle: "Avnet billings, bookings and backlog by region, supplier and quarter",
  pillar: "performance",
  purpose: "How Avnet is doing, on its own numbers, before comparing it with the market.",
  prd: "PRD module 2",
  personas: ["sales leaders", "executives"],
  sections: [
    {
      kind: "kpis",
      title: "Headline",
      hookups: ["billings", "bookings", "backlog", "drms"],
      items: [
        { label: "Billings, trailing 12 months", value: fmtM(PERFORMANCE.slice(-4).reduce((s, p) => s + p.billings, 0)), change: "+21.4% YoY", good: true },
        { label: "Book-to-bill", value: latest.bookToBill.toFixed(2) },
        { label: "Backlog", value: fmtM(latest.backlog) },
        { label: "Design-approved billings", value: "38%", note: "DRMS status 04, share of billings" },
      ],
    },
    {
      kind: "trend",
      title: "Billings and bookings",
      subtitle: "$M by fiscal quarter",
      hookups: ["billings", "bookings", "fiscal-calendar"],
      unit: "usd",
      series: ["Avnet billings", "Bookings"],
      rows: PERFORMANCE.map((p) => ({ label: p.quarter, "Avnet billings": p.billings * 1e6, Bookings: p.bookings * 1e6 })),
      span: "half",
    },
    {
      kind: "trend",
      title: "Book-to-bill",
      subtitle: "Bookings over billings",
      hookups: ["billings", "bookings"],
      unit: "index",
      series: ["Book-to-bill"],
      rows: PERFORMANCE.map((p) => ({ label: p.quarter, "Book-to-bill": Number(p.bookToBill.toFixed(2)) })),
      span: "half",
    },
    {
      kind: "table",
      title: "By region",
      subtitle: "Latest quarter",
      hookups: ["billings", "bookings", "backlog", "fx-rates"],
      columns: [
        { key: "region", label: "Region" },
        { key: "billings", label: "Billings" },
        { key: "growth", label: "YoY" },
        { key: "btb", label: "Book-to-bill" },
        { key: "backlog", label: "Backlog" },
      ],
      rows: REGIONS.map((r, i) => ({
        region: r,
        billings: fmtM([2060, 2300, 3440, 500][i]),
        growth: fmtPct([0.55, 0.44, 0.46, 0.29][i], true),
        btb: ["1.08", "1.04", "1.12", "1.01"][i],
        backlog: fmtM([3100, 2900, 3700, 420][i]),
      })),
    },
    {
      kind: "bars",
      title: "Supplier concentration",
      subtitle: "Share of billings · supplier names withheld in mock",
      hookups: ["billings"],
      items: SUPPLIERS.map((s) => ({ label: s.name, value: s.share, display: fmtPct(s.share), note: `${fmtPct(s.growth, true)} YoY` })),
    },
  ],
};

export const MARKET_SHARE_SPEC: ShellSpec = {
  title: "Market Share",
  subtitle: "Avnet billings divided by the market, by segment, supplier, region and quarter",
  pillar: "performance",
  purpose: "Estimated share = Avnet billings in a segment ÷ that segment's market size, joined through the code map.",
  prd: "PRD module 3 and section 7",
  personas: ["product managers", "strategy", "executives"],
  sections: [
    {
      kind: "table",
      title: "Share by segment",
      subtitle: "Latest four quarters · confidence comes from the code map",
      hookups: ["billings", "wsts", "gartner-forecast", "ipe-forecast", "code-map"],
      columns: [
        { key: "segment", label: "Segment" },
        { key: "tam", label: "Market size" },
        { key: "share", label: "Avnet share" },
        { key: "change", label: "Change YoY" },
        { key: "confidence", label: "Mapping confidence", align: "left" },
      ],
      rows: SHARE_BY_SEGMENT.map((s) => ({
        segment: s.segment,
        tam: `$${s.tam}B`,
        share: fmtPct(s.share),
        change: `${s.shareChange >= 0 ? "+" : "−"}${(Math.abs(s.shareChange) * 100).toFixed(1)} pts`,
        confidence: s.confidence,
      })),
    },
    {
      kind: "trend",
      title: "Share over time",
      subtitle: "Mapped segments combined",
      hookups: ["billings", "wsts", "code-map"],
      unit: "pctWhole",
      series: ["Avnet share of mapped TAM"],
      rows: SHARE_TREND,
      span: "half",
    },
    {
      kind: "bars",
      title: "White space",
      subtitle: "Large markets where Avnet's share is low",
      hookups: ["tam-sam-som", "code-map"],
      span: "half",
      items: SHARE_BY_SEGMENT.filter((s) => s.share < 0.05)
        .sort((a, b) => b.tam - a.tam)
        .map((s) => ({ label: s.segment, value: s.tam, display: `$${s.tam}B market`, note: `${fmtPct(s.share)} share` })),
    },
  ],
};

export const SUPPLY_CHAIN_SPEC: ShellSpec = {
  title: "Supply Chain",
  subtitle: "Lead times, backlog and purchasing, side by side",
  pillar: "performance",
  purpose: "Whether supply is tightening or easing, and how that lines up with Avnet's backlog and buying.",
  prd: "PRD module 5",
  personas: ["product managers", "sales leaders"],
  sections: [
    {
      kind: "bars",
      title: "Lead times by category",
      subtitle: "Weeks · change on a quarter ago",
      hookups: ["lead-times"],
      span: "half",
      items: LEAD_TIMES.map((l) => ({ label: l.category, value: l.weeks, display: `${l.weeks} wks`, note: `${l.change >= 0 ? "+" : "−"}${Math.abs(l.change)} wks` })),
    },
    {
      kind: "trend",
      title: "Backlog against lead times",
      subtitle: "Backlog $M; lead times move first",
      hookups: ["backlog", "lead-times"],
      unit: "usd",
      series: ["Avnet backlog"],
      rows: PERFORMANCE.map((p) => ({ label: p.quarter, "Avnet backlog": p.backlog * 1e6 })),
      span: "half",
    },
    {
      kind: "table",
      title: "Purchasing activity",
      subtitle: "Purchase orders placed, by category, latest quarter",
      hookups: ["procurement", "material-master"],
      columns: [
        { key: "category", label: "Category" },
        { key: "pos", label: "PO value" },
        { key: "change", label: "Change QoQ" },
        { key: "lead", label: "Lead time", align: "left" },
      ],
      rows: LEAD_TIMES.slice(0, 6).map((l, i) => ({
        category: l.category,
        pos: fmtM([620, 540, 410, 380, 260, 300][i]),
        change: fmtPct([0.12, 0.05, 0.21, 0.34, -0.08, 0.02][i], true),
        lead: `${l.weeks} wks`,
      })),
    },
  ],
};

export const PIPELINE_SPEC: ShellSpec = {
  title: "Design Pipeline",
  subtitle: "Design registrations from submission to billing",
  pillar: "performance",
  purpose: "Design registrations are the leading indicator of billings: where the pipeline is, and how much of it converts.",
  prd: "PRD module 8",
  personas: ["product managers", "field engineers", "sales leaders"],
  sections: [
    {
      kind: "funnel",
      title: "Conversion",
      subtitle: "Trailing 12 months",
      hookups: ["drms", "billings"],
      span: "half",
      steps: [
        { label: "Submitted", value: 4200, display: "4,200 registrations" },
        { label: "Approved", value: 2730, display: "2,730" },
        { label: "In production", value: 1450, display: "1,450" },
        { label: "Billing", value: 1180, display: "1,180" },
      ],
    },
    {
      kind: "bars",
      title: "Active registrations by segment",
      subtitle: "Estimated annual value",
      hookups: ["drms", "material-master"],
      span: "half",
      items: SEGMENTS.slice(0, 7).map((s, i) => ({ label: s, value: [410, 380, 220, 90, 260, 70, 110][i], display: fmtM([410, 380, 220, 90, 260, 70, 110][i]) })),
    },
    {
      kind: "table",
      title: "Recently approved",
      subtitle: "Supplier and customer names withheld in mock",
      hookups: ["drms", "customer-master"],
      columns: [
        { key: "reg", label: "Registration" },
        { key: "supplier", label: "Supplier", align: "left" },
        { key: "segment", label: "Segment", align: "left" },
        { key: "value", label: "Est. annual value" },
        { key: "approved", label: "Approved", align: "left" },
      ],
      rows: [
        { reg: "DR-000001", supplier: "Supplier A", segment: "Microcontrollers & processors", value: "$1.2M", approved: "Oct 2" },
        { reg: "DR-000002", supplier: "Supplier C", segment: "Discretes & power", value: "$860K", approved: "Sep 28" },
        { reg: "DR-000003", supplier: "Supplier B", segment: "Connectors", value: "$410K", approved: "Sep 25" },
        { reg: "DR-000004", supplier: "Supplier E", segment: "Sensors", value: "$290K", approved: "Sep 19" },
      ],
    },
  ],
};

export const CUSTOMERS_SPEC: ShellSpec = {
  title: "Customers & End Markets",
  subtitle: "Where Avnet's revenue comes from, by vertical, customer and region",
  pillar: "performance",
  purpose: "Which end markets and customers are driving growth, and how concentrated the business is.",
  prd: "PRD module 7",
  personas: ["sales leaders", "strategy"],
  sections: [
    {
      kind: "bars",
      title: "Billings by end market",
      subtitle: "Trailing 12 months · change YoY",
      hookups: ["billings", "customer-master"],
      span: "half",
      items: VERTICALS.map((v) => ({ label: v.name, value: v.billings, display: fmtM(v.billings), note: fmtPct(v.growth, true) })),
    },
    {
      kind: "kpis",
      title: "Concentration",
      hookups: ["billings", "customer-master"],
      span: "half",
      items: [
        { label: "Top 10 customers", value: "18%", note: "of billings" },
        { label: "Top 100 customers", value: "41%", note: "of billings" },
        { label: "Active customers", value: "≈ 1.4M", note: "parent-company roll-up" },
        { label: "New customers", value: "+6.2%", note: "YoY" },
      ],
    },
    {
      kind: "table",
      title: "Largest customers",
      subtitle: "Names withheld in mock · by parent company",
      hookups: ["billings", "customer-master", "backlog"],
      columns: [
        { key: "customer", label: "Customer" },
        { key: "vertical", label: "End market", align: "left" },
        { key: "billings", label: "Billings TTM" },
        { key: "growth", label: "YoY" },
        { key: "backlog", label: "Backlog" },
      ],
      rows: ["Customer 1", "Customer 2", "Customer 3", "Customer 4", "Customer 5"].map((c, i) => ({
        customer: c,
        vertical: ["Data center & computing", "Industrial", "Communications", "Automotive", "Aerospace & defense"][i],
        billings: fmtM([410, 360, 300, 260, 220][i]),
        growth: fmtPct([0.71, 0.14, 0.38, 0.02, 0.11][i], true),
        backlog: fmtM([380, 210, 240, 190, 260][i]),
      })),
    },
  ],
};

export const QBR_SPEC: ShellSpec = {
  title: "QBR Prep",
  subtitle: "A briefing for a supplier line review or a customer account review",
  pillar: "tools",
  purpose:
    "Pick a company and a meeting; the app assembles public facts it already has (earnings, commentary, revenue mix, news, line cards, the cycle) with Avnet's own numbers, and Claude writes talking points and questions.",
  prd: "Superapp plan step 4 · PRD persona 1 and 2 tools",
  personas: ["sellers", "field engineers", "supplier business managers"],
  sections: [
    {
      kind: "form",
      title: "Set up the brief",
      hookups: [],
      fields: [
        { label: "Company", placeholder: "Choose a supplier or customer", type: "select", options: ["Microchip", "Texas Instruments", "Amphenol"] },
        { label: "Meeting type", placeholder: "Supplier line review or customer account review", type: "select", options: ["Supplier line review", "Customer account review"] },
        { label: "Meeting date", placeholder: "Date" },
        { label: "Anything to focus on", placeholder: "e.g. allocation on MCUs, design-in support for a new program", type: "textarea" },
      ],
      action: "Build the brief",
    },
    {
      kind: "kpis",
      title: "Our business with them",
      subtitle: "Avnet's own numbers for this company",
      hookups: ["billings", "bookings", "backlog", "drms", "quotes"],
      items: [
        { label: "Billings TTM", value: "$84.2M", change: "+18% YoY", good: true },
        { label: "Book-to-bill", value: "1.09" },
        { label: "Open quotes", value: "$12.6M", note: "41% win rate" },
        { label: "Active design registrations", value: "126", note: "$9.8M est. annual" },
      ],
    },
    {
      kind: "list",
      title: "Brief outline",
      subtitle: "Public sections are already built elsewhere in the app; this page will pull them together",
      hookups: ["account-data"],
      items: [
        { title: "The quarter in brief", body: "From Quarterly Earnings: revenue, growth, margins and inventory days against a year ago.", tag: "Live elsewhere" },
        { title: "What management said", body: "From Management commentary: guidance, demand, inventory, lead times, pricing, channel.", tag: "Live elsewhere" },
        { title: "Distribution position", body: "From Line Cards: who else carries them and recent franchise moves.", tag: "Live elsewhere" },
        { title: "Our business with them", body: "Billings, backlog, quotes and design registrations for this account.", tag: "Needs data" },
        { title: "Talking points and questions", body: "Written by Claude from all of the above, each tied to its source.", tag: "To build" },
      ],
    },
  ],
};

export const DECK_SPEC: ShellSpec = {
  title: "Pitch Deck Builder",
  subtitle: "Turn any view in the app into Avnet-branded slides",
  pillar: "tools",
  purpose: "Pick slides from the app's views (a profile, market share, a QBR brief) and export an Avnet-branded deck.",
  prd: "Superapp plan step 7",
  personas: ["sellers", "executives"],
  sections: [
    {
      kind: "form",
      title: "Deck setup",
      hookups: [],
      fields: [
        { label: "Audience", placeholder: "Customer, supplier or internal", type: "select", options: ["Customer", "Supplier", "Internal"] },
        { label: "Starting point", placeholder: "A company profile, a QBR brief or a blank deck", type: "select", options: ["Company profile", "QBR brief", "Blank"] },
        { label: "Title", placeholder: "Deck title" },
      ],
      action: "Generate deck",
    },
    {
      kind: "list",
      title: "Slide library",
      subtitle: "Each slide is a view that already exists or is planned",
      hookups: ["account-data"],
      span: "half",
      items: [
        { title: "Market cycle snapshot", body: "From Market Cycle.", tag: "Live data" },
        { title: "Supplier at a glance", body: "From Company Profiles.", tag: "Live data" },
        { title: "Avnet performance with this account", body: "From Performance Tracker.", tag: "Mock" },
        { title: "Share of segment", body: "From Market Share.", tag: "Mock" },
      ],
    },
    {
      kind: "list",
      title: "Brand rules applied",
      hookups: [],
      span: "half",
      items: [
        { title: "Avnet template", body: "Uses the Avnet PowerPoint template and brand palette.", tag: "Planned" },
        { title: "Avnet Green means Avnet", body: "In every chart, green is only ever Avnet.", tag: "Rule" },
      ],
    },
  ],
};

export const LEADS_SPEC: ShellSpec = {
  title: "Lead Finder",
  subtitle: "Companies likely to buy what Avnet carries, ranked and enriched",
  pillar: "tools",
  purpose: "Find companies designing with a technology or growing in an end market, check whether they already buy from Avnet, and enrich them with contacts.",
  prd: "Superapp plan step 7",
  personas: ["sellers", "field engineers"],
  sections: [
    {
      kind: "form",
      title: "Search",
      hookups: [],
      fields: [
        { label: "Technology", placeholder: "e.g. SiC MOSFETs, PCIe Gen6, MLCC", type: "text" },
        { label: "End market", placeholder: "Any", type: "select", options: ["Industrial", "Automotive", "Data center", "Medical"] },
        { label: "Region", placeholder: "Any", type: "select", options: ["Americas", "EMEA", "Asia"] },
      ],
      action: "Find companies",
    },
    {
      kind: "table",
      title: "Results",
      subtitle: "Company names withheld in mock",
      hookups: ["customer-master", "account-data"],
      columns: [
        { key: "company", label: "Company" },
        { key: "signal", label: "Why it showed up", align: "left" },
        { key: "customer", label: "Avnet customer?", align: "left" },
        { key: "fit", label: "Fit" },
      ],
      rows: [
        { company: "Prospect 1", signal: "Hiring power electronics engineers; new EV charger line", customer: "No", fit: "High" },
        { company: "Prospect 2", signal: "Announced edge AI camera module", customer: "Yes, small", fit: "Medium" },
        { company: "Prospect 3", signal: "Expanding US industrial automation plant", customer: "No", fit: "Medium" },
      ],
    },
    {
      kind: "list",
      title: "Enrichment",
      hookups: [],
      items: [{ title: "Contacts and firmographics", body: "Treg enrichment (paid per call): contacts, size and technology stack, added on request.", tag: "To build" }],
    },
  ],
};

export const MAPPING_SPEC: ShellSpec = {
  title: "Code Mapping",
  subtitle: "Map Gartner and WSTS categories to Avnet product codes",
  pillar: "tools",
  purpose: "The workbench for the most critical workstream: AI suggests mappings, product managers validate them, and every change is versioned.",
  prd: "PRD section 6",
  personas: ["analysts", "product managers"],
  sections: [
    {
      kind: "kpis",
      title: "Coverage",
      hookups: ["code-map", "material-master"],
      items: [
        { label: "External categories", value: "214" },
        { label: "Validated", value: "61%", change: "+8 pts this month", good: true },
        { label: "Suggested, awaiting review", value: "52" },
        { label: "Unmapped", value: "31", note: "need an owner" },
      ],
    },
    {
      kind: "table",
      title: "Mappings",
      subtitle: "Codes are illustrative",
      hookups: ["code-map", "material-master", "wsts", "gartner-forecast", "ipe-forecast"],
      columns: [
        { key: "external", label: "External category" },
        { key: "avnet", label: "Avnet code", align: "left" },
        { key: "pcc", label: "PCC levels", align: "left" },
        { key: "confidence", label: "Confidence", align: "left" },
        { key: "status", label: "Status", align: "left" },
      ],
      rows: MAPPING_ROWS,
    },
    {
      kind: "list",
      title: "Known challenges",
      subtitle: "PRD 6.3",
      hookups: [],
      items: [
        { title: "Granularity mismatch", body: "External categories can be broader or narrower than Avnet's codes." },
        { title: "Many-to-many", body: "One external category can span several Avnet codes, and the reverse." },
        { title: "Regional variation", body: "APAC Farnell uses the PCC hierarchy; the Americas use technology codes." },
        { title: "Drift", body: "Both classifications change over time, so mappings are versioned." },
      ],
    },
  ],
};
