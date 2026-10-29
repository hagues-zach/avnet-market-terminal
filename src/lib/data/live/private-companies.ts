// Competitors with no public filings: private, or held inside a larger group
// that doesn't report them on their own. They have a profile and a row in the
// company directory, but no place in the earnings build, so nothing that reads
// COMPANIES (rollups, earnings, decks, briefs) sees them. Pure data.

export interface PrivateCompany {
  slug: string;
  name: string;
  hq: string;
  /** Who owns it, in a phrase; the owner's profile when it has one. */
  owner: string;
  ownerSlug?: string;
  summary: string;
  /** The distributor's slug in the line-card tracker (src/lib/line-cards/model.ts). */
  lineCard?: string;
  /** Annual sales from a published ranking, in dollars, when one exists. */
  sales?: { value: number; year: number; note?: string; source: string; url: string };
}

const ECIA_2025 = {
  source: "ECIA Top 50 Global Authorized Distributors Report 2025 (Electronics Sourcing North America, September 2025)",
  url: "https://ecia.memberclicks.net/assets/workplace/ESNA%20Sep25%20p32_60%20Top%2050%20Global%20Report%20no%20Ads.pdf",
};

export const PRIVATE_COMPANIES: PrivateCompany[] = [
  {
    slug: "tti",
    name: "TTI",
    hq: "Fort Worth, Texas",
    owner: "Berkshire Hathaway",
    summary: "Specialist distributor of passives, interconnect and electromechanical parts. Owns Mouser, Sager, RFMW and Symmetry.",
    lineCard: "tti",
    sales: { value: 7_860_000_000, year: 2024, note: "Includes Mouser, Sager, RFMW and Symmetry", ...ECIA_2025 },
  },
  {
    slug: "mouser",
    name: "Mouser",
    hq: "Mansfield, Texas",
    owner: "TTI (Berkshire Hathaway)",
    ownerSlug: "tti",
    summary: "High-service catalog distributor focused on new product introductions and design engineers.",
    lineCard: "mouser",
  },
  {
    slug: "digikey",
    name: "DigiKey",
    hq: "Thief River Falls, Minnesota",
    owner: "Privately held",
    summary: "High-service catalog distributor selling to engineers and small buyers, mostly online.",
    lineCard: "digikey",
    sales: { value: 3_500_000_000, year: 2024, ...ECIA_2025 },
  },
  {
    slug: "future",
    name: "Future Electronics",
    hq: "Montreal, Canada",
    owner: "WT Microelectronics",
    ownerSlug: "wt-micro",
    summary: "Broadline distributor with a strong Americas business. WT Microelectronics bought it in 2024, so its results now sit inside WT's.",
    lineCard: "future",
    sales: { value: 4_750_000_000, year: 2024, ...ECIA_2025 },
  },
];
