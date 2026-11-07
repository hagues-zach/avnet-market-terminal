// Rule-based tagging for the news feed: every article is tagged on five facets
// (segment, supplier, customer, end market, region) from its headline, snippet and
// the publisher's own category labels. Deterministic and offline — no model calls.

export type Facet = "segments" | "suppliers" | "customers" | "endMarkets" | "regions";

export const FACET_LABELS: Record<Facet, string> = {
  segments: "Segment",
  suppliers: "Supplier",
  customers: "Customer",
  endMarkets: "End market",
  regions: "Region",
};

type Rule = [label: string, pattern: RegExp];

// Patterns are case-insensitive unless a short acronym would false-positive
// (AI, EV, PC, EU, UK, RF …), in which case the rule is case-sensitive.
const SEGMENTS: Rule[] = [
  ["Memory", /\b(DRAM|NAND|HBM|memory|flash storage|SSDs?)\b/i],
  ["Analog & Power", /\b(analog|power (semiconductors?|devices?|modules?|management|electronics|ICs?|stages?)|SiC|GaN|MOSFETs?|IGBTs?|silicon carbide|gallium nitride|PMICs?|gate drivers?)\b/i],
  ["Logic & Processors", /\b(GPUs?|CPUs?|processors?|accelerators?|SoCs?|ASICs?|FPGAs?|chipsets?|x86)\b/i],
  ["MCU & Embedded", /\b(microcontrollers?|MCUs?|embedded|RISC-V)\b/i],
  ["Sensors & Opto", /\b(sensors?|lidar|LEDs?|optoelectronics?|photonics?|image sensors?|MEMS|lasers?)\b/i],
  ["IP&E", /\b(connectors?|capacitors?|MLCCs?|resistors?|inductors?|passives?|passive components?|relays?|electromechanical|interconnects?|circuit protection)\b/i],
  ["Foundry & Equipment", /\b(foundr(y|ies)|wafers?|fabs?|lithography|EUV|advanced packaging|chip packaging|CoWoS|[0-9.]+ ?nm|etch|deposition|chip manufacturing|chipmaking)\b/i],
  ["RF & Connectivity", /\b(5G|6G|Wi-?Fi|Bluetooth|wireless|cellular|mmWave|antennas?|UWB)\b|\bRF\b/],
];

/** The segment labels, in order: the rows of Lead Times & Signals and the News segment filter. */
export const SEGMENT_LABELS: readonly string[] = SEGMENTS.map(([label]) => label);

const SUPPLIERS: Rule[] = [
  ["Nvidia", /\bNvidia\b/i],
  ["AMD", /\bAMD\b|Advanced Micro Devices/],
  ["Intel", /\bIntel\b/],
  ["TSMC", /\bTSMC\b|Taiwan Semiconductor/i],
  ["Samsung", /\bSamsung\b/i],
  ["SK hynix", /\bSK ?hynix\b/i],
  ["Micron", /\bMicron\b/],
  ["Texas Instruments", /\bTexas Instruments\b/i],
  ["Analog Devices", /\bAnalog Devices\b|\bADI\b/],
  ["Microchip", /\bMicrochip (Technology|Tech)\b|\bMicrochip\b(?! (design|maker|industry))/],
  ["NXP", /\bNXP\b/],
  ["Infineon", /\bInfineon\b/i],
  ["STMicroelectronics", /\bSTMicro(electronics)?\b/i],
  ["onsemi", /\bonsemi\b|\bON Semiconductor\b|\bOn Semi\b/],
  ["Renesas", /\bRenesas\b/i],
  ["Qualcomm", /\bQualcomm\b/i],
  ["Broadcom", /\bBroadcom\b/i],
  ["Marvell", /\bMarvell\b/],
  ["MediaTek", /\bMediaTek\b/i],
  ["GlobalFoundries", /\bGlobalFoundries\b/i],
  ["SMIC", /\bSMIC\b/],
  ["ASML", /\bASML\b/],
  ["Applied Materials", /\bApplied Materials\b/i],
  ["Lam Research", /\bLam Research\b/i],
  ["KLA", /\bKLA\b/],
  ["Arm", /\bArm (Holdings|Ltd|Limited)\b|\bArm's\b|\bArm-based\b/],
  ["Kioxia", /\bKioxia\b/i],
  ["Wolfspeed", /\bWolfspeed\b/i],
  ["Rohm", /\bRohm\b/i],
  ["Nexperia", /\bNexperia\b/i],
  ["Monolithic Power", /\bMonolithic Power\b|\bMPS\b/],
  ["Skyworks", /\bSkyworks\b/i],
  ["Qorvo", /\bQorvo\b/i],
  ["Lattice", /\bLattice Semi(conductor)?\b/i],
  ["Murata", /\bMurata\b/i],
  ["TDK", /\bTDK\b/],
  ["Vishay", /\bVishay\b/i],
  ["Yageo", /\bYageo\b/i],
  ["TE Connectivity", /\bTE Connectivity\b/i],
  ["Amphenol", /\bAmphenol\b/i],
  ["Molex", /\bMolex\b/i],
  ["Huawei", /\bHuawei\b/i],
  ["Avnet", /\bAvnet\b/i],
  ["Arrow", /\bArrow Electronics\b/i],
  ["DigiKey", /\bDigi-?Key\b/i],
  ["Mouser", /\bMouser\b/i],
];

export type CustomerKind = "oem" | "ems";

export interface Customer {
  name: string;
  kind: CustomerKind;
  pattern: RegExp;
}

// The Americas customer universe for the morning brief: equipment makers (OEMs)
// and contract manufacturers (EMS) headquartered or building at scale in the
// Americas. Public companies only; which of them are Avnet's top customers is
// internal and kept out of the repo (src/lib/brief/top-customers.ts). Names that
// are also common words (Apple, Flex, Meta, HP) are matched case-sensitively and
// only in forms that name the company.
export const CUSTOMERS: Customer[] = [
  // Computing, data center and networking
  { name: "Apple", kind: "oem", pattern: /\bApple\b(?! (Daily|pie))/ },
  { name: "Dell", kind: "oem", pattern: /\bDell\b/ },
  { name: "HP Inc", kind: "oem", pattern: /\bHP Inc\b|\bHP\b(?![ -]?E\b)(?! Enterprise)/ },
  { name: "HPE", kind: "oem", pattern: /\bHPE\b|Hewlett Packard Enterprise/ },
  { name: "Cisco", kind: "oem", pattern: /\bCisco\b/i },
  { name: "Super Micro", kind: "oem", pattern: /\bSuper ?[Mm]icro\b|\bSupermicro\b/ },
  { name: "IBM", kind: "oem", pattern: /\bIBM\b/ },
  { name: "Arista", kind: "oem", pattern: /\bArista\b/ },
  { name: "Juniper", kind: "oem", pattern: /\bJuniper Networks\b|\bJuniper\b(?= (said|says|reported|launch))/ },
  { name: "Microsoft", kind: "oem", pattern: /\bMicrosoft\b|\bAzure\b/ },
  { name: "Google", kind: "oem", pattern: /\bGoogle\b|\bAlphabet\b/ },
  { name: "Amazon", kind: "oem", pattern: /\bAmazon\b|\bAWS\b/ },
  { name: "Meta", kind: "oem", pattern: /\bMeta\b(?!-)(?! ?(data|materials?|lens(es)?|surfaces?)\b)|\bMeta Platforms\b/ },
  { name: "Oracle", kind: "oem", pattern: /\bOracle\b/ },
  // Automotive
  { name: "General Motors", kind: "oem", pattern: /\bGeneral Motors\b|\bGM\b/ },
  { name: "Ford", kind: "oem", pattern: /\bFord\b(?! Foundation)/ },
  { name: "Tesla", kind: "oem", pattern: /\bTesla\b/ },
  { name: "Stellantis", kind: "oem", pattern: /\bStellantis\b/i },
  { name: "Rivian", kind: "oem", pattern: /\bRivian\b/i },
  { name: "Cummins", kind: "oem", pattern: /\bCummins\b/ },
  // Industrial
  { name: "Honeywell", kind: "oem", pattern: /\bHoneywell\b/i },
  { name: "Rockwell Automation", kind: "oem", pattern: /\bRockwell\b(?! Collins)/ },
  { name: "Emerson", kind: "oem", pattern: /\bEmerson( Electric)?\b/ },
  { name: "Deere", kind: "oem", pattern: /\bDeere\b/ },
  { name: "Caterpillar", kind: "oem", pattern: /\bCaterpillar\b/ },
  { name: "Eaton", kind: "oem", pattern: /\bEaton\b/ },
  { name: "Zebra Technologies", kind: "oem", pattern: /\bZebra Technologies\b/i },
  // Aerospace and defense
  { name: "Lockheed Martin", kind: "oem", pattern: /\bLockheed\b/i },
  { name: "RTX", kind: "oem", pattern: /\bRaytheon\b|\bRTX (Corp|Corporation)\b/ },
  { name: "Northrop Grumman", kind: "oem", pattern: /\bNorthrop\b/i },
  { name: "General Dynamics", kind: "oem", pattern: /\bGeneral Dynamics\b/i },
  { name: "L3Harris", kind: "oem", pattern: /\bL3Harris\b/i },
  { name: "Boeing", kind: "oem", pattern: /\bBoeing\b/i },
  // Medical
  { name: "Medtronic", kind: "oem", pattern: /\bMedtronic\b/i },
  { name: "GE HealthCare", kind: "oem", pattern: /\bGE Health[Cc]are\b/ },
  { name: "Boston Scientific", kind: "oem", pattern: /\bBoston Scientific\b/i },
  // Communications and consumer
  { name: "Motorola Solutions", kind: "oem", pattern: /\bMotorola\b/ },
  { name: "Garmin", kind: "oem", pattern: /\bGarmin\b/i },
  // Contract manufacturers
  { name: "Jabil", kind: "ems", pattern: /\bJabil\b/i },
  { name: "Flex", kind: "ems", pattern: /\bFlex (Ltd\.?|Inc\.?)|\bFlex's\b|\bFlextronics\b|\bFLEX\b/ },
  { name: "Sanmina", kind: "ems", pattern: /\bSanmina\b/i },
  { name: "Plexus", kind: "ems", pattern: /\bPlexus\b/ },
  { name: "Benchmark Electronics", kind: "ems", pattern: /\bBenchmark Electronics\b/i },
  { name: "Celestica", kind: "ems", pattern: /\bCelestica\b/i },
  { name: "Kimball Electronics", kind: "ems", pattern: /\bKimball Electronics\b/i },
  { name: "Foxconn", kind: "ems", pattern: /\bFoxconn\b|\bHon Hai\b/i },
];

const END_MARKETS: Rule[] = [
  ["AI & Data Center", /\bAI\b|\b(artificial intelligence|data ?cent(er|re)s?|hyperscalers?|servers?|LLMs?|generative)\b/],
  ["Automotive", /\b(automotive|vehicles?|ADAS|automakers?|carmakers?|autonomous driving)\b|\bEVs?\b/],
  ["Industrial", /\b(industrial|factory|factories|automation|robots?|robotics|motor control)\b/i],
  ["Consumer", /\b(smartphones?|consumer|wearables?|laptops?|notebooks?|tablets?|gaming)\b|\bPCs?\b/],
  ["Aerospace & Defense", /\b(defen[cs]e|aerospace|military|satellites?|avionics|radar)\b/i],
  ["Communications", /\b(telecom|telecommunications|5G|6G|networking|base stations?|optical networks?)\b/i],
  ["Medical", /\b(medical|healthcare|implantable|patient monitoring)\b/i],
  ["Energy", /\b(solar|renewables?|power grid|energy storage|batter(y|ies)|charging|inverters?)\b/i],
];

const REGIONS: Rule[] = [
  ["United States", /\bU\.S\.|\bUS\b(?!\$)|\b(United States|America|American|CHIPS Act|Commerce Department|Arizona|Ohio)\b/],
  ["China", /\b(China|Chinese|Beijing|Shanghai|Shenzhen|Huawei|SMIC)\b/],
  ["Taiwan", /\b(Taiwan|Taiwanese|Hsinchu|TSMC)\b/],
  ["South Korea", /\b(Korea|Korean|Seoul|SK ?hynix|Samsung)\b/i],
  ["Japan", /\b(Japan|Japanese|Tokyo|Kumamoto|Rapidus)\b/],
  ["Europe", /\bEU\b|\bUK\b|\b(Europe|European|Germany|German|Dresden|Netherlands|Dutch|France|French|Britain|Italy|Ireland)\b/],
  ["India", /\b(India|Indian|Gujarat|Bengaluru)\b/],
  ["Southeast Asia", /\b(Malaysia|Vietnam|Singapore|Thailand|Philippines|Penang)\b/],
];

const RULES: Record<Facet, Rule[]> = {
  segments: SEGMENTS,
  suppliers: SUPPLIERS,
  customers: CUSTOMERS.map((c): Rule => [c.name, c.pattern]),
  endMarkets: END_MARKETS,
  regions: REGIONS,
};

export type ArticleTags = Record<Facet, string[]>;

export function tagArticle(text: string): ArticleTags {
  const match = (rules: Rule[]) => rules.filter(([, re]) => re.test(text)).map(([label]) => label);
  return {
    segments: match(RULES.segments),
    suppliers: match(RULES.suppliers),
    customers: match(RULES.customers),
    endMarkets: match(RULES.endMarkets),
    regions: match(RULES.regions),
  };
}

/** True when the text carries a semiconductor-specific tag (used to screen broad feeds). */
export function isOnTopic(tags: ArticleTags): boolean {
  return tags.segments.length > 0 || tags.suppliers.length > 0;
}
