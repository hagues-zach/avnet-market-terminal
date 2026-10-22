// Which hookups each page shows, read from the page's own markers. Data Hookups
// builds "used on" from this list, so it must match what the pages render: the
// test in read.test.ts reads the files named here and checks the ids.

export interface PageHookups {
  /** Route, as in the nav. */
  href: string;
  title: string;
  /** Every hookup id shown in the page's markers. */
  ids: string[];
  /** Source files whose markers carry the ids (checked by the test). */
  files: string[];
  /** Pages drawn from a shell spec or a legacy banner, checked against those instead. */
  from?: { spec: string } | { legacy: string };
}

export const PAGE_HOOKUPS: PageHookups[] = [
  {
    href: "/start",
    title: "Start Here",
    ids: ["billings", "bookings", "backlog", "tam-sam-som", "drms"],
    files: ["src/components/start/sections.tsx"],
    from: { spec: "START" },
  },
  { href: "/news", title: "Market News", ids: ["billings", "code-map", "customer-master"], files: ["src/components/news/topics.tsx"] },
  { href: "/overview", title: "Market Overview", ids: ["wsts", "gartner-forecast"], files: [], from: { legacy: "/overview" } },
  { href: "/cycle", title: "Market Cycle", ids: ["bookings", "backlog"], files: ["src/components/cycle/cycle-view.tsx"] },
  {
    href: "/network",
    title: "Company Profiles",
    ids: ["billings", "backlog", "drms", "quotes", "customer-master"],
    files: ["src/components/network/company-profile.tsx"],
  },
  {
    href: "/performance",
    title: "Performance Tracker",
    ids: ["billings", "bookings", "backlog", "drms", "material-master", "customer-master", "fiscal-calendar", "fx-rates"],
    files: ["src/app/(terminal)/performance/page.tsx", "src/components/performance/sections.tsx"],
  },
  {
    href: "/market-share",
    title: "Market Share",
    ids: ["billings", "wsts", "gartner-forecast", "code-map", "tam-sam-som"],
    files: ["src/components/share/sections.tsx"],
  },
  { href: "/tam", title: "TAM, SAM and SOM", ids: ["billings", "code-map", "tam-sam-som"], files: ["src/components/tam/sections.tsx"] },
  {
    href: "/supply-chain",
    title: "Supply Chain",
    ids: ["lead-times", "procurement", "backlog", "bookings"],
    files: ["src/components/supply/sections.tsx"],
  },
  { href: "/design-pipeline", title: "Design Pipeline", ids: ["drms", "billings"], files: ["src/app/(terminal)/design-pipeline/page.tsx"] },
  {
    href: "/customers",
    title: "Customers and End Markets",
    ids: ["billings", "customer-master", "backlog", "drms"],
    files: ["src/app/(terminal)/customers/page.tsx"],
  },
  {
    href: "/tools/qbr",
    title: "QBR Prep",
    ids: ["billings", "backlog", "drms", "quotes", "customer-master"],
    // The brief's business section reuses the profile's mock business and its ids.
    files: ["src/components/qbr/brief.tsx", "src/components/network/company-profile.tsx"],
  },
  { href: "/tools/deck", title: "Pitch Deck Builder", ids: ["account-data"], files: [], from: { spec: "DECK_SPEC" } },
  { href: "/tools/leads", title: "Lead Finder", ids: ["customer-master", "account-data"], files: [], from: { spec: "LEADS_SPEC" } },
  {
    href: "/forecast",
    title: "Scenario Modeler",
    ids: ["billings", "wsts", "gartner-forecast", "ipe-forecast", "code-map"],
    files: ["src/components/scenario/modeler.tsx"],
  },
  { href: "/tools/mapping", title: "Code Mapping", ids: ["code-map", "material-master"], files: ["src/app/(terminal)/tools/mapping/page.tsx"] },
  {
    href: "/copilot",
    title: "Ask the Terminal",
    ids: ["billings", "bookings", "backlog"],
    // Only the Avnet's business answer is mock; its marker ids are set in the answerer.
    files: ["src/components/ask/answer-view.tsx", "src/lib/ask/answer.ts"],
  },
  { href: "/export", title: "Export Center", ids: ["tam-sam-som", "billings"], files: [], from: { legacy: "/export" } },
];
