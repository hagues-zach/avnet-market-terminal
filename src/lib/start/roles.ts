// Start Here roles. No accounts yet (plan step 6), so the role lives in the URL
// (?role=sales) and the browser remembers the last one. Safe for client and server.

export type RoleId = "everyone" | "supplier" | "sales" | "strategy" | "executive" | "analyst";

export interface Step {
  title: string;
  page: string;
  href: string;
}

export interface Role {
  id: RoleId;
  label: string;
  /** Used in "Ranked for …". */
  plural: string;
  steps: Step[];
}

export const ROLES: Role[] = [
  {
    id: "everyone",
    label: "Everyone",
    plural: "everyone",
    steps: [
      { title: "Supplier or product managers: start with a company", page: "Company Profiles", href: "/network" },
      { title: "Sales leaders: check performance by region", page: "Performance Tracker", href: "/performance" },
      { title: "Strategy: size the market Avnet can serve", page: "TAM / SAM / SOM", href: "/tam" },
      { title: "Executives: see where the cycle is heading", page: "Market Cycle", href: "/cycle" },
      { title: "Analysts: see which data is live", page: "Data Hookups", href: "/data-hookups" },
    ],
  },
  {
    id: "supplier",
    label: "Supplier or product manager",
    plural: "supplier and product managers",
    steps: [
      { title: "Review a supplier before your next call", page: "Company Profiles", href: "/network" },
      { title: "See who else carries your suppliers", page: "Line Cards", href: "/line-cards" },
      { title: "Find segments where Avnet's share is low", page: "Market Share", href: "/market-share" },
      { title: "Follow registrations from design to billing", page: "Design Pipeline", href: "/design-pipeline" },
    ],
  },
  {
    id: "sales",
    label: "Sales leader",
    plural: "sales leaders",
    steps: [
      { title: "Check regional billings against plan", page: "Performance Tracker", href: "/performance" },
      { title: "Prepare for this week's account reviews", page: "QBR Prep", href: "/tools/qbr" },
      { title: "See which end markets are moving", page: "Customers & End Markets", href: "/customers" },
    ],
  },
  {
    id: "strategy",
    label: "Strategy",
    plural: "strategy and corporate development",
    steps: [
      { title: "Size the market Avnet can serve", page: "TAM / SAM / SOM", href: "/tam" },
      { title: "Test a forecast against scenarios", page: "Scenario Modeler", href: "/forecast" },
      { title: "See where the cycle is heading", page: "Market Cycle", href: "/cycle" },
    ],
  },
  {
    id: "executive",
    label: "Executive",
    plural: "executives",
    steps: [
      { title: "See where the cycle is heading", page: "Market Cycle", href: "/cycle" },
      { title: "Compare Avnet with Arrow", page: "Avnet vs Arrow", href: "/competitive" },
      { title: "Check billings, bookings and backlog", page: "Performance Tracker", href: "/performance" },
    ],
  },
  {
    id: "analyst",
    label: "Analyst",
    plural: "analysts",
    steps: [
      { title: "Map Avnet part codes to market segments", page: "Code Mapping", href: "/tools/mapping" },
      { title: "See which data is live and which is mock", page: "Data Hookups", href: "/data-hookups" },
      { title: "Ask a question of the data", page: "Ask the Terminal", href: "/copilot" },
    ],
  },
];

export const DEFAULT_ROLE: RoleId = "everyone";
export const ROLE_STORAGE_KEY = "start-role";

export function roleOf(value: string | string[] | undefined | null): Role {
  const id = Array.isArray(value) ? value[0] : value;
  return ROLES.find((r) => r.id === id) ?? ROLES.find((r) => r.id === DEFAULT_ROLE)!;
}
