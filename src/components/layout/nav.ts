import {
  Activity,
  BarChart3,
  DollarSign,
  FileDown,
  Gauge,
  LayoutDashboard,
  Newspaper,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { HIDDEN_PATHS } from "@/lib/visibility";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  built: boolean;
}

// Full Terminal IA. Pages listed in HIDDEN_PATHS are filtered out of the nav.
const ALL_NAV: NavItem[] = [
  { label: "Market Overview", href: "/overview", icon: LayoutDashboard, built: true },
  { label: "TAM / SAM / SOM", href: "/tam", icon: Target, built: true },
  { label: "Forecast & Scenario", href: "/forecast", icon: TrendingUp, built: true },
  { label: "Economic Signals", href: "/signals", icon: Activity, built: true },
  { label: "Competitive & Channel", href: "/competitive", icon: BarChart3, built: true },
  { label: "Market News", href: "/news", icon: Newspaper, built: true },
  { label: "Market Cycle", href: "/cycle", icon: Gauge, built: true },
  { label: "Quarterly Earnings", href: "/earnings", icon: DollarSign, built: true },
  { label: "Market Copilot", href: "/copilot", icon: Sparkles, built: true },
  { label: "Export Center", href: "/export", icon: FileDown, built: true },
];

export const NAV: NavItem[] = ALL_NAV.filter((item) => !HIDDEN_PATHS.includes(item.href));
