import {
  Building2,
  ClipboardList,
  Gauge,
  Home,
  Newspaper,
  Plug,
  Presentation,
  Sparkles,
  TrendingUp,
  UserSearch,
  type LucideIcon,
} from "lucide-react";

import { isHidden } from "@/lib/visibility";

// Kept for the shell specs (src/lib/shells), which still record the pillar each page began in.
export type Pillar = "home" | "knowledge" | "network" | "performance" | "tools" | "admin";

/**
 * The sidebar lists hubs; a hub with more than one page shows them as tabs
 * above the page (HubTabs). "main" hubs sit at the top, "tools" under a Tools
 * heading, "footer" at the foot of the sidebar, and "topbar" only in the top bar.
 */
export type HubId = "start" | "news" | "market" | "companies" | "performance" | "qbr" | "deck" | "leads" | "setup" | "ask";

export interface Hub {
  id: HubId;
  label: string;
  icon: LucideIcon;
  section: "main" | "tools" | "footer" | "topbar";
}

export const HUBS: Hub[] = [
  { id: "start", label: "Start Here", icon: Home, section: "main" },
  { id: "news", label: "News", icon: Newspaper, section: "main" },
  { id: "market", label: "Market", icon: Gauge, section: "main" },
  { id: "companies", label: "Companies", icon: Building2, section: "main" },
  { id: "performance", label: "Avnet performance", icon: TrendingUp, section: "main" },
  { id: "qbr", label: "QBR Prep", icon: ClipboardList, section: "tools" },
  { id: "deck", label: "Pitch Deck Builder", icon: Presentation, section: "tools" },
  { id: "leads", label: "Lead Finder", icon: UserSearch, section: "tools" },
  { id: "setup", label: "Setup", icon: Plug, section: "footer" },
  { id: "ask", label: "Ask the Terminal", icon: Sparkles, section: "topbar" },
];

export interface NavItem {
  /** The page's full name. */
  label: string;
  /** Its name as a tab inside the hub. */
  tab: string;
  href: string;
  hub: HubId;
  /** True while the page shows mock data for anything Avnet-specific or licensed. */
  mock?: boolean;
}

// Every page, in tab order within its hub. Pages listed in HIDDEN_PATHS are
// filtered out, so a hidden page comes back as a tab when it is unhidden.
const ALL_NAV: NavItem[] = [
  { label: "Start Here", tab: "Start Here", href: "/start", hub: "start", mock: true },

  { label: "Market News", tab: "News", href: "/news", hub: "news" },

  { label: "Market Overview", tab: "Overview", href: "/overview", hub: "market", mock: true },
  { label: "Market Cycle", tab: "Cycle", href: "/cycle", hub: "market" },
  { label: "Economic Signals", tab: "Economic signals", href: "/signals", hub: "market" },
  { label: "How the cycle engine works", tab: "Cycle engine", href: "/signals/engine", hub: "market" },
  { label: "Learning Center", tab: "Learning Center", href: "/learn", hub: "market" },

  { label: "Company Profiles", tab: "Profiles", href: "/network", hub: "companies" },
  { label: "Quarterly Earnings", tab: "Earnings", href: "/earnings", hub: "companies" },
  { label: "Avnet vs Arrow", tab: "Avnet vs Arrow", href: "/competitive", hub: "companies" },
  { label: "Line Cards", tab: "Line cards", href: "/line-cards", hub: "companies" },

  { label: "Performance Tracker", tab: "Performance", href: "/performance", hub: "performance", mock: true },
  { label: "Market Share", tab: "Market share", href: "/market-share", hub: "performance", mock: true },
  { label: "TAM / SAM / SOM", tab: "TAM / SAM / SOM", href: "/tam", hub: "performance", mock: true },
  { label: "Supply Chain", tab: "Supply chain", href: "/supply-chain", hub: "performance", mock: true },
  { label: "Design Pipeline", tab: "Design pipeline", href: "/design-pipeline", hub: "performance", mock: true },
  { label: "Customers & End Markets", tab: "Customers", href: "/customers", hub: "performance", mock: true },
  { label: "Scenario Modeler", tab: "Scenario modeler", href: "/forecast", hub: "performance", mock: true },

  { label: "QBR Prep", tab: "QBR Prep", href: "/tools/qbr", hub: "qbr", mock: true },
  { label: "Pitch Deck Builder", tab: "Pitch Deck Builder", href: "/tools/deck", hub: "deck", mock: true },
  { label: "Lead Finder", tab: "Lead Finder", href: "/tools/leads", hub: "leads", mock: true },

  { label: "Data Hookups", tab: "Data hookups", href: "/data-hookups", hub: "setup" },
  { label: "Code Mapping", tab: "Code mapping", href: "/tools/mapping", hub: "setup", mock: true },

  { label: "Ask the Terminal", tab: "Ask the Terminal", href: "/copilot", hub: "ask", mock: true },
];

export const NAV: NavItem[] = ALL_NAV.filter((item) => !isHidden(item.href));

/** The visible pages of a hub, in tab order. */
export const hubPages = (hub: HubId): NavItem[] => NAV.filter((item) => item.hub === hub);

/** Hubs with at least one visible page. */
export const visibleHubs = (section: Hub["section"]): Hub[] => HUBS.filter((h) => h.section === section && hubPages(h.id).length > 0);

/** Where a hub's sidebar link goes: its first visible page. */
export const hubHref = (hub: HubId): string => hubPages(hub)[0]?.href ?? "/start";

/** A hub shows the mock ring only when every one of its visible pages is mock. */
export const hubMock = (hub: HubId): boolean => {
  const pages = hubPages(hub);
  return pages.length > 0 && pages.every((p) => p.mock);
};

/** The page a path belongs to: the longest nav href it equals or sits under, so a profile belongs to Company Profiles. */
export function pageFor(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of NAV) {
    if ((pathname === item.href || pathname.startsWith(`${item.href}/`)) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}
