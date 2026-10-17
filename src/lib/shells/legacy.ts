// Banners for the older mock pages (built before the shell system). They keep
// their own layouts; this records what each is for and what it is waiting on.

export const LEGACY: Record<string, { title: string; purpose: string; prd: string; personas: string[]; hookups: string[] }> = {
  "/overview": {
    title: "Market Overview",
    purpose: "Global semiconductor market size, growth, segments and regions, with a macro overlay.",
    prd: "PRD module 1",
    personas: ["executives", "strategy"],
    hookups: ["wsts", "gartner-forecast"],
  },
  "/tam": {
    title: "TAM / SAM / SOM",
    purpose: "Total market, the part Avnet can serve, and the part it wins, by segment and period.",
    prd: "PRD module 4 and section 7",
    personas: ["strategy", "executives", "product managers"],
    hookups: ["wsts", "gartner-forecast", "ipe-forecast", "billings", "code-map", "tam-sam-som"],
  },
  "/forecast": {
    title: "Scenario Modeler",
    purpose: "What-if on market growth rates and share targets.",
    prd: "PRD persona 3 tools and phase 4",
    personas: ["strategy"],
    hookups: ["wsts", "gartner-forecast", "tam-sam-som"],
  },
  "/copilot": {
    title: "Ask the Terminal",
    purpose: "Natural-language questions answered from the app's data, with sources. Will use Claude over the live and hooked-up data.",
    prd: "PRD persona 5 and section 10.2",
    personas: ["analysts", "everyone"],
    hookups: ["billings", "wsts", "tam-sam-som"],
  },
  "/export": {
    title: "Export Center",
    purpose: "Assemble Avnet-branded exports from the app's views. Superseded in part by the Pitch Deck Builder.",
    prd: "Superapp plan step 7",
    personas: ["executives", "sellers"],
    hookups: ["tam-sam-som", "billings"],
  },
};
