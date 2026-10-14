import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  DollarSign,
  FileDown,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  Newspaper,
  Presentation,
  Sparkles,
  Target,
  TrendingUp,
  UserSearch,
  type LucideIcon,
} from "lucide-react";

import { HIDDEN_PATHS } from "@/lib/visibility";

export type Pillar = "knowledge" | "network" | "tools";

export const PILLAR_LABELS: Record<Pillar, string> = {
  knowledge: "Knowledge",
  network: "Network",
  tools: "Tools",
};

export const PILLARS: Pillar[] = ["knowledge", "network", "tools"];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** False for planned pages: shown in the nav as "Soon" and not linked. */
  built: boolean;
  pillar: Pillar;
}

// The app is organised into three pillars (see docs/superapp-plan.md). Pages listed
// in HIDDEN_PATHS are filtered out of the nav.
const ALL_NAV: NavItem[] = [
  { label: "Market News", href: "/news", icon: Newspaper, built: true, pillar: "knowledge" },
  { label: "Market Cycle", href: "/cycle", icon: Gauge, built: true, pillar: "knowledge" },
  { label: "Economic Signals", href: "/signals", icon: Activity, built: true, pillar: "knowledge" },
  { label: "Market Overview", href: "/overview", icon: LayoutDashboard, built: true, pillar: "knowledge" },
  { label: "TAM / SAM / SOM", href: "/tam", icon: Target, built: true, pillar: "knowledge" },
  { label: "Forecast & Scenario", href: "/forecast", icon: TrendingUp, built: true, pillar: "knowledge" },
  { label: "Company Profiles", href: "/network", icon: Building2, built: true, pillar: "network" },
  { label: "Quarterly Earnings", href: "/earnings", icon: DollarSign, built: true, pillar: "network" },
  { label: "Avnet vs Arrow", href: "/competitive", icon: BarChart3, built: true, pillar: "network" },
  { label: "Line Cards", href: "/line-cards", icon: LayoutGrid, built: false, pillar: "network" },
  { label: "QBR Prep", href: "/tools/qbr", icon: ClipboardList, built: false, pillar: "tools" },
  { label: "Pitch Deck Builder", href: "/tools/deck", icon: Presentation, built: false, pillar: "tools" },
  { label: "Lead Finder", href: "/tools/leads", icon: UserSearch, built: false, pillar: "tools" },
  { label: "Market Copilot", href: "/copilot", icon: Sparkles, built: true, pillar: "tools" },
  { label: "Export Center", href: "/export", icon: FileDown, built: true, pillar: "tools" },
];

export const NAV: NavItem[] = ALL_NAV.filter((item) => !HIDDEN_PATHS.includes(item.href));
