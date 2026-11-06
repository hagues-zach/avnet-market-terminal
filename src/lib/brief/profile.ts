import type { CUSTOMERS } from "@/lib/data/live/tagging";

// A user's morning brief profile, as docs/morning-brief-plan.md lays it out. On
// the Avnet machine it lives in Oracle (brief_profiles, phase B5) and is set at
// onboarding (B6); until then the brief is built and judged with the test
// profiles below. They describe kinds of user, never real people: pilot users'
// names stay out of this public repo.

export const TECH_TIERS = ["beginner", "intermediate", "advanced"] as const;
export type TechTier = (typeof TECH_TIERS)[number];

export type BriefLength = "standard" | "quick";

export interface BriefProfile {
  id: string;
  role: string;
  /** A region tag from tagging.ts ("United States" covers the Americas for now). */
  region: string;
  /** Supplier tags from tagging.ts, most important first. */
  suppliers: string[];
  /** Customer names from CUSTOMERS in tagging.ts, the ones this user serves. */
  customers: (typeof CUSTOMERS)[number]["name"][];
  /** Also follow the customers flagged as Avnet's top Americas customers. */
  followTopCustomers: boolean;
  /** Segment tags from tagging.ts. */
  technologies: string[];
  techTier: TechTier;
  /** A Google Cloud TTS voice name. */
  voice: string;
  length: BriefLength;
}

export const TEST_PROFILES: BriefProfile[] = [
  {
    id: "memory-supplier-manager",
    role: "Supplier manager for memory lines",
    region: "United States",
    suppliers: ["Micron", "SK hynix", "Samsung"],
    customers: ["Dell", "HPE", "Super Micro"],
    followTopCustomers: true,
    technologies: ["Memory"],
    techTier: "advanced",
    voice: "en-US-Chirp3-HD-Charon",
    length: "standard",
  },
  {
    id: "power-analog-seller",
    role: "Field seller, automotive and power",
    region: "United States",
    suppliers: ["Texas Instruments", "Analog Devices", "onsemi", "Infineon"],
    customers: ["Tesla", "General Motors", "Ford"],
    followTopCustomers: true,
    technologies: ["Analog & Power", "Sensors & Opto"],
    techTier: "beginner",
    voice: "en-US-Neural2-F",
    length: "standard",
  },
  {
    id: "embedded-industrial-quick",
    role: "Field application engineer, industrial",
    region: "United States",
    suppliers: ["Microchip", "NXP", "STMicroelectronics", "Renesas"],
    customers: ["Rockwell Automation", "Honeywell", "Jabil"],
    followTopCustomers: false,
    technologies: ["MCU & Embedded"],
    techTier: "intermediate",
    voice: "en-US-Neural2-D",
    length: "quick",
  },
  {
    id: "compute-strategy",
    role: "Strategy and market intelligence",
    region: "United States",
    suppliers: ["Nvidia", "AMD", "Intel", "TSMC"],
    customers: ["Microsoft", "Amazon", "Super Micro"],
    followTopCustomers: true,
    technologies: ["Logic & Processors", "Foundry & Equipment"],
    techTier: "advanced",
    voice: "en-US-Chirp3-HD-Charon",
    length: "standard",
  },
  {
    id: "ipe-quiet",
    role: "Supplier manager for interconnect and passives",
    region: "United States",
    suppliers: ["Vishay", "Amphenol", "TE Connectivity"],
    customers: ["Flex"],
    followTopCustomers: false,
    technologies: ["IP&E"],
    techTier: "intermediate",
    voice: "en-US-Neural2-F",
    length: "standard",
  },
];
