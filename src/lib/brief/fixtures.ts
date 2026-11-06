import { tagArticle } from "@/lib/data/live/tagging";
import type { ArticleKind } from "@/lib/data/live/shared";
import type { Relevance } from "@/lib/ai/news-angles";
import type { Corpus, CorpusItem } from "./corpus";

// Fixture corpora for the morning brief evals: a normal day, a quiet day and a
// heavy day, built at 07:00 UTC on 2026-11-05. Headlines are invented for the
// tests (no real news and no Avnet figures), tagged by the real tagArticle so the
// facets behave as they do live. Story ids say what each story is for.

export const BUILT_AT = "2026-11-05T07:00:00.000Z";
const HOUR = 3_600_000;

interface Spec {
  id: string;
  title: string;
  summary?: string;
  hours: number;
  relevance?: Relevance;
  kind?: ArticleKind;
  outlet?: string;
  /** Seen by an earlier corpus this many hours before the build. */
  seenHours?: number;
  topCustomers?: string[];
}

function item(s: Spec): CorpusItem {
  const kind = s.kind ?? "news";
  const outlet = s.outlet ?? (kind === "filing" ? "SEC EDGAR" : kind === "regulatory" ? "Federal Register" : "EE Times");
  const tags = tagArticle(`${s.title} \n ${s.summary ?? ""}`);
  return {
    id: s.id,
    kind,
    title: s.title,
    summary: s.summary ?? "",
    outlet,
    url: `https://example.com/${s.id}`,
    publishedAt: new Date(Date.parse(BUILT_AT) - s.hours * HOUR).toISOString(),
    ...tags,
    ...(kind === "regulatory" ? { regions: Array.from(new Set(["United States", ...tags.regions])) } : {}),
    sourceId: `https://example.com/${s.id}`,
    ingestedAt: new Date(Date.parse(BUILT_AT) - (s.seenHours ?? 0) * HOUR).toISOString(),
    topCustomers: s.topCustomers ?? [],
    ...(s.relevance ? { relevance: s.relevance, angle: "Why it matters." } : {}),
  };
}

const NORMAL: Spec[] = [
  // Memory
  { id: "micron-hbm-capacity", title: "Micron adds HBM capacity in Idaho as DRAM contract prices rise", summary: "The memory maker said lead times for HBM stay above 30 weeks.", hours: 5, relevance: "high" },
  { id: "skhynix-nand-cut", title: "SK hynix trims NAND output to support pricing", hours: 9, relevance: "high", outlet: "TrendForce" },
  { id: "samsung-ddr5", title: "Samsung starts mass production of 1c DDR5 memory", hours: 20, relevance: "medium", outlet: "DigiTimes" },
  { id: "dram-spot-prices", title: "DRAM spot prices climb for a sixth week", hours: 14, relevance: "high", outlet: "TrendForce" },
  { id: "micron-old", title: "Micron opens a memory design center in Hyderabad", hours: 130, relevance: "low" },
  // Power and analog, automotive
  { id: "ti-sherman-fab", title: "Texas Instruments starts production at its Sherman 300mm analog fab", summary: "The first Sherman fab will make analog chips on 300mm wafers, which TI says cut the cost per chip by about 40% against 200mm.", hours: 6, relevance: "high" },
  { id: "adi-guidance", title: "Analog Devices raises guidance on industrial and automotive recovery", hours: 18, relevance: "high", outlet: "EPS News" },
  { id: "onsemi-sic-tesla", title: "onsemi signs SiC power module deal with Tesla", summary: "The multi-year agreement covers silicon carbide MOSFET modules for traction inverters, starting in the second half of 2027.", hours: 11, relevance: "high", outlet: "Power Electronics News" },
  { id: "infineon-gan", title: "Infineon launches 650 V GaN transistors for chargers", hours: 30, relevance: "medium", outlet: "Power Electronics News" },
  { id: "gm-ev-delay", title: "General Motors delays two EV programs to 2028", hours: 16, relevance: "high", outlet: "electrek.co", topCustomers: ["General Motors"] },
  { id: "ford-ev-battery", title: "Ford shifts battery sourcing for its electric pickups", hours: 22, relevance: "medium", outlet: "reuters.com" },
  { id: "lidar-sensor", title: "New automotive lidar sensors cut cost per unit", hours: 26, relevance: "medium" },
  // Embedded and industrial
  { id: "microchip-mcu-lead", title: "Microchip says MCU lead times are back to normal", summary: "Microchip said lead times on most microcontrollers are now 8 to 12 weeks and its book-to-bill ratio rose to 1.05.", hours: 8, relevance: "high", outlet: "EPS News" },
  { id: "nxp-risc-v", title: "NXP adds RISC-V cores to its embedded processor line", hours: 19, relevance: "medium" },
  { id: "st-mcu-price", title: "STMicroelectronics raises prices on some microcontrollers", hours: 12, relevance: "high", outlet: "Electronics Weekly" },
  { id: "rockwell-orders", title: "Rockwell Automation sees factory automation orders pick up", hours: 15, relevance: "medium", outlet: "reuters.com" },
  { id: "jabil-mexico", title: "Jabil expands embedded electronics assembly in Mexico", hours: 28, relevance: "medium" },
  // Compute and foundry
  { id: "nvidia-blackwell", title: "Nvidia ramps Blackwell GPUs as hyperscalers add data center capacity", hours: 4, relevance: "high", outlet: "Semiconductor Engineering" },
  { id: "tsmc-2nm", title: "TSMC starts 2nm wafer output in Hsinchu", hours: 10, relevance: "high", outlet: "DigiTimes" },
  { id: "amd-mi-series", title: "AMD wins Microsoft order for its accelerators", hours: 13, relevance: "high" },
  { id: "intel-ohio", title: "Intel slows its Ohio fab build again", hours: 21, relevance: "medium" },
  { id: "aws-trainium", title: "AWS designs a new Trainium accelerator with Marvell", hours: 17, relevance: "medium", outlet: "Semiconductor Engineering" },
  { id: "cowos-capacity", title: "Advanced packaging capacity for CoWoS doubles next year", hours: 33, relevance: "medium" },
  // Worth knowing: customers the users don't serve, in the news for a technology
  { id: "apple-modem-memory", title: "Apple qualifies a second LPDDR memory source for iPhones", hours: 12, relevance: "medium", outlet: "DigiTimes" },
  { id: "cisco-switch-asic", title: "Cisco moves its switch ASICs to a new foundry node", hours: 25, relevance: "medium" },
  // Passives and connectors, kept thin for the quiet case
  { id: "mlcc-prices", title: "MLCC prices hold steady as inventories normalize", hours: 40, relevance: "low", outlet: "eenewseurope.com" },
  // Seen in yesterday's brief
  { id: "micron-yesterday", title: "Micron prices its new convertible notes", hours: 30, relevance: "medium", seenHours: 24 },
  // Out of everyone's scope
  { id: "smartphone-shipments", title: "Smartphone shipments rise in India", hours: 7, relevance: "medium", outlet: "gadgets.example" },
  { id: "unrelated-low", title: "A startup raises money for chip design software", hours: 3, relevance: "low" },
  // Filings and rules
  { id: "sec-micron-8k", title: "Micron files 8-K: Results of operations", kind: "filing", hours: 20 },
  { id: "sec-ti-10q", title: "Texas Instruments files 10-Q: Quarterly report", kind: "filing", hours: 40 },
  { id: "sec-nvidia-8k", title: "Nvidia files 8-K: Results of operations", kind: "filing", hours: 30 },
  { id: "sec-microchip-old", title: "Microchip files 8-K: Other events", kind: "filing", hours: 24 * 20 },
  { id: "fr-export-rule", title: "Export controls on advanced computing items and semiconductor manufacturing equipment", kind: "regulatory", hours: 30, relevance: "high" },
  { id: "fr-ftz-unrelated", title: "Foreign-Trade Zone notification for a furniture maker", kind: "regulatory", hours: 30, relevance: "low" },
];

const QUIET: Spec[] = [
  { id: "mlcc-prices", title: "MLCC prices hold steady as inventories normalize", hours: 20, relevance: "medium", outlet: "TrendForce" },
  { id: "smartphone-shipments", title: "Smartphone shipments rise in India", hours: 7, relevance: "medium", outlet: "gadgets.example" },
  { id: "unrelated-low", title: "A startup raises money for chip design software", hours: 3, relevance: "low" },
];

// A heavy day for compute: thirty strong, fresh stories on Nvidia, AMD, TSMC and their customers.
const HEAVY: Spec[] = [
  ...NORMAL,
  ...Array.from({ length: 30 }, (_, i): Spec => {
    const who = ["Nvidia", "AMD", "TSMC", "Intel"][i % 4];
    const what = ["GPU allocation tightens", "accelerator lead times stretch", "2nm wafer prices rise", "processor supply update"][i % 4];
    return { id: `heavy-${i + 1}`, title: `${who} ${what}, report ${i + 1}`, hours: 2 + (i % 20), relevance: "high", outlet: "Semiconductor Engineering" };
  }),
];

function corpus(specs: Spec[]): Corpus {
  return { date: "2026-11-05", builtAt: BUILT_AT, fetchedAt: BUILT_AT, sources: [], angles: "ok", items: specs.map(item) };
}

export const FIXTURES = {
  normal: corpus(NORMAL),
  quiet: corpus(QUIET),
  heavy: corpus(HEAVY),
};
export type FixtureDay = keyof typeof FIXTURES;
