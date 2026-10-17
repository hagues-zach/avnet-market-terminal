import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  DollarSign,
  FileDown,
  Gauge,
  GitBranch,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Network,
  Newspaper,
  PieChart,
  Plug,
  Presentation,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

import { HIDDEN_PATHS } from "@/lib/visibility";

// "home" and "admin" are not pillars, but sit in the nav the same way: Start
// Here above the pillars, Data Hookups below them.
export type Pillar = "home" | "knowledge" | "network" | "performance" | "tools" | "admin";

export const PILLAR_LABELS: Record<Pillar, string> = {
  home: "",
  knowledge: "Knowledge",
  network: "Network",
  performance: "Avnet performance",
  tools: "Tools",
  admin: "Setup",
};

export const PILLARS: Pillar[] = ["home", "knowledge", "network", "performance", "tools", "admin"];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** False for planned pages: shown in the nav as "Soon" and not linked. */
  built: boolean;
  pillar: Pillar;
  /** True while the page shows mock data for anything Avnet-specific or licensed. */
  mock?: boolean;
}

// The app is organised into pillars (see docs/superapp-plan.md). Pages listed in
// HIDDEN_PATHS are filtered out of the nav.
const ALL_NAV: NavItem[] = [
  { label: "Start Here", href: "/start", icon: Home, built: true, pillar: "home", mock: true },

  { label: "Market News", href: "/news", icon: Newspaper, built: true, pillar: "knowledge" },
  { label: "Market Overview", href: "/overview", icon: LayoutDashboard, built: true, pillar: "knowledge", mock: true },
  { label: "Market Cycle", href: "/cycle", icon: Gauge, built: true, pillar: "knowledge" },
  { label: "Economic Signals", href: "/signals", icon: Activity, built: true, pillar: "knowledge" },
  { label: "Learning Center", href: "/learn", icon: BookOpen, built: true, pillar: "knowledge" },

  { label: "Company Profiles", href: "/network", icon: Building2, built: true, pillar: "network" },
  { label: "Quarterly Earnings", href: "/earnings", icon: DollarSign, built: true, pillar: "network" },
  { label: "Avnet vs Arrow", href: "/competitive", icon: BarChart3, built: true, pillar: "network" },
  { label: "Line Cards", href: "/line-cards", icon: LayoutGrid, built: true, pillar: "network" },

  { label: "Performance Tracker", href: "/performance", icon: TrendingUp, built: true, pillar: "performance", mock: true },
  { label: "Market Share", href: "/market-share", icon: PieChart, built: true, pillar: "performance", mock: true },
  { label: "TAM / SAM / SOM", href: "/tam", icon: Target, built: true, pillar: "performance", mock: true },
  { label: "Supply Chain", href: "/supply-chain", icon: Truck, built: true, pillar: "performance", mock: true },
  { label: "Design Pipeline", href: "/design-pipeline", icon: GitBranch, built: true, pillar: "performance", mock: true },
  { label: "Customers & End Markets", href: "/customers", icon: Users, built: true, pillar: "performance", mock: true },

  { label: "QBR Prep", href: "/tools/qbr", icon: ClipboardList, built: true, pillar: "tools", mock: true },
  { label: "Pitch Deck Builder", href: "/tools/deck", icon: Presentation, built: true, pillar: "tools", mock: true },
  { label: "Lead Finder", href: "/tools/leads", icon: UserSearch, built: true, pillar: "tools", mock: true },
  { label: "Scenario Modeler", href: "/forecast", icon: TrendingUp, built: true, pillar: "tools", mock: true },
  { label: "Code Mapping", href: "/tools/mapping", icon: Network, built: true, pillar: "tools", mock: true },
  { label: "Ask the Terminal", href: "/copilot", icon: Sparkles, built: true, pillar: "tools", mock: true },
  { label: "Export Center", href: "/export", icon: FileDown, built: true, pillar: "tools", mock: true },

  { label: "Data Hookups", href: "/data-hookups", icon: Plug, built: true, pillar: "admin" },
];

export const NAV: NavItem[] = ALL_NAV.filter((item) => !HIDDEN_PATHS.includes(item.href));
