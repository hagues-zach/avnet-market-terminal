import {
  Activity,
  BarChart3,
  FileDown,
  LayoutDashboard,
  Newspaper,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  built: boolean;
}

// Full Terminal IA. Only "TAM / SAM / SOM" ships in this first build; the rest are
// shown as upcoming so the terminal reads complete.
export const NAV: NavItem[] = [
  { label: "Market Overview", href: "/overview", icon: LayoutDashboard, built: true },
  { label: "TAM / SAM / SOM", href: "/tam", icon: Target, built: true },
  { label: "Forecast & Scenario", href: "/forecast", icon: TrendingUp, built: true },
  { label: "Economic Signals", href: "/signals", icon: Activity, built: true },
  { label: "Competitive & Channel", href: "/competitive", icon: BarChart3, built: true },
  { label: "Market News", href: "/news", icon: Newspaper, built: true },
  { label: "Market Copilot", href: "/copilot", icon: Sparkles, built: true },
  { label: "Export Center", href: "/export", icon: FileDown, built: true },
];
