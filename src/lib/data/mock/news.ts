import type { NewsArticle, Sourced } from "../types";

const ARTICLES: NewsArticle[] = [
  { id: "a1", title: "WSTS lifts 2026 outlook to ~$975B on AI accelerator demand", summary: "The autumn release raises the 2026 forecast sharply, driven by logic and HBM memory tied to data-center buildouts.", outlet: "WSTS", tag: "Forecast", date: "2026-06-12" },
  { id: "a2", title: "Memory pricing firms as HBM capacity stays tight into 2026", summary: "DRAM and high-bandwidth memory contract prices rise for a fourth straight quarter; suppliers prioritize HBM allocation.", outlet: "DigiTimes", tag: "Memory", date: "2026-06-10" },
  { id: "a3", title: "Auto MCU inventories normalize; lead times near pre-shortage levels", summary: "Tier-1 inventories have largely cleared; microcontroller lead times compress as automotive demand stabilizes.", outlet: "EE Times", tag: "Automotive", date: "2026-06-07" },
  { id: "a4", title: "Distribution channel returns to growth after 2023–24 correction", summary: "ECIA data shows authorized-distribution revenue recovering in 2025 following two years of double-digit declines.", outlet: "ECIA", tag: "Channel", date: "2026-06-05" },
  { id: "a5", title: "Foundry utilization climbs on leading-edge AI silicon", summary: "Advanced-node capacity tightens as accelerator and custom-silicon orders fill 3nm/2nm lines through 2026.", outlet: "Reuters", tag: "Supply", date: "2026-06-03" },
  { id: "a6", title: "Analog demand stabilizes as industrial restocking begins", summary: "Distributors report firming analog bookings; book-to-bill ticks above 1.0 for the first time in five quarters.", outlet: "Bloomberg", tag: "Analog", date: "2026-05-29" },
  { id: "a7", title: "AI data-center capex guidance raised across hyperscalers", summary: "Combined 2026 capex guidance implies >20% growth, underpinning logic and networking semiconductor demand.", outlet: "WSJ", tag: "AI", date: "2026-05-27" },
  { id: "a8", title: "Export-control updates reshape advanced-node supply routing", summary: "New licensing guidance affects leading-edge tooling and high-end GPU shipments; distributors review compliance exposure.", outlet: "Nikkei", tag: "Geopolitics", date: "2026-05-22" },
  { id: "a9", title: "Power-discrete softness persists on weak industrial end-markets", summary: "Discretes and power modules lag the broader recovery as factory automation and renewables demand stays muted.", outlet: "EE Times", tag: "Power", date: "2026-05-19" },
  { id: "a10", title: "SEMI: equipment billings rebound on memory and advanced packaging", summary: "Front-end and advanced-packaging tool orders climb, signaling capacity additions to support 2026–27 demand.", outlet: "SEMI", tag: "Supply", date: "2026-05-15" },
  { id: "a11", title: "Gartner: top-10 suppliers hold roughly two-thirds of the market", summary: "Consolidation continues as AI-accelerator and memory leaders capture an outsized share of 2025 revenue growth.", outlet: "Gartner", tag: "Competitive", date: "2026-05-12" },
  { id: "a12", title: "Consumer semis tepid as smartphone refresh cycle lengthens", summary: "Consumer-segment billings trail the market; unit growth stays low-single-digit amid extended replacement cycles.", outlet: "Counterpoint", tag: "Consumer", date: "2026-05-08" },
];

export function getNews(): Sourced<{ articles: NewsArticle[]; tags: string[] }> {
  const tags = Array.from(new Set(ARTICLES.map((a) => a.tag)));
  return { value: { articles: ARTICLES, tags }, source: "mock", vintage: "Curated feed" };
}
