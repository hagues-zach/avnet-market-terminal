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
};
