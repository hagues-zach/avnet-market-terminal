// MOCK. The code map: external market categories (WSTS, Gartner, the IP&E
// forecast) and the Avnet product codes each maps to. The real table is
// gold.market_intelligence.gartner_avnet_code_map, seeded by AI-assisted
// matching against the material master and validated by product managers
// (PRD section 6). Category names are the public taxonomies' own; codes,
// billings, reasons and history are synthetic.
//
// It joins the shared model of Avnet: each segment's mapped categories split
// that segment's billings in SEGMENT_BILLINGS, so mapped billings add back to
// MAPPED_SHARE of all billings, and the share of a segment's billings on
// validated mappings follows its confidence rating.

import { SEGMENT_BILLINGS, SEGMENTS } from "./mock-avnet";

export type MapStatus = "validated" | "suggested" | "review" | "unmapped";
export type Confidence = "High" | "Medium" | "Low";
export type Source = "WSTS" | "Gartner" | "IP&E forecast";

export const STATUS_LABEL: Record<MapStatus, string> = {
  validated: "Validated",
  suggested: "Suggested",
  review: "In review",
  unmapped: "Not mapped",
};

export interface HistoryEvent {
  daysAgo: number;
  event: string;
  by: string;
}

export interface Mapping {
  id: string;
  source: Source;
  segment: (typeof SEGMENTS)[number];
  name: string;
  /** Avnet technology codes; empty when not mapped. */
  codes: string[];
  /** PCC level used in APAC and Farnell; null when not mapped. */
  pcc: string | null;
  /** Billings through this mapping, trailing 12 months, $M. Zero when not mapped. */
  billings: number;
  /** Confidence in the mapping; null when not mapped. */
  confidence: Confidence | null;
  status: MapStatus;
  /** The role a decision waits on, for suggested and in-review mappings. */
  waitsOn: string | null;
  definition: string;
  /** Why the mapping was suggested. Written by Claude once 3.5 is built; mock text until then. */
  reason: string | null;
  parts: string[];
  history: HistoryEvent[];
}

/** Short segment names for the strip and the category path. */
export const SEGMENT_SHORT: Record<string, string> = {
  Analog: "Analog",
  "Microcontrollers & processors": "Micro",
  "Logic & FPGA": "Logic",
  Memory: "Memory",
  "Discretes & power": "Discretes",
  Optoelectronics: "Opto",
  Sensors: "Sensors",
  Connectors: "Connectors",
  Passives: "Passives",
  Electromechanical: "Electromech",
};

// Each segment's categories and the sources that publish them.
const CATEGORIES: Record<string, { sources: Source[]; names: string[]; parts: string[] }> = {
  Analog: {
    sources: ["WSTS", "Gartner"],
    names: [
      "General purpose amplifiers",
      "Data converters",
      "Interface",
      "Power management",
      "Voltage regulators",
      "Signal conditioning",
      "Automotive analog",
      "Communications analog",
      "Consumer analog",
      "Industrial analog",
      "Computer analog",
    ],
    parts: ["Precision op amps", "12-bit SAR converters", "Buck regulators"],
  },
  "Microcontrollers & processors": {
    sources: ["WSTS", "Gartner"],
    names: [
      "8-bit MCUs",
      "16-bit MCUs",
      "32-bit MCUs",
      "Microprocessors",
      "Embedded processors",
      "Digital signal processors",
      "Application processors",
      "Wireless SoCs",
      "Security controllers",
      "Automotive MCUs",
    ],
    parts: ["Arm Cortex-M4 MCUs", "Quad-core application processors", "Bluetooth LE SoCs"],
  },
  "Logic & FPGA": {
    sources: ["WSTS", "Gartner"],
    names: ["FPGAs", "CPLDs", "Standard logic", "ASICs", "Display drivers", "Programmable SoCs", "Interface logic", "Clock and timing"],
    parts: ["Mid-range FPGAs", "Level shifters", "Clock generators"],
  },
  Memory: {
    sources: ["WSTS", "Gartner"],
    names: ["DRAM", "NAND flash", "NOR flash", "SRAM", "EEPROM", "High bandwidth memory", "FRAM", "MRAM", "Mask ROM", "Pseudo SRAM", "Managed NAND"],
    parts: ["DDR5 modules", "LPDDR4X devices", "Serial NOR flash"],
  },
  "Discretes & power": {
    sources: ["WSTS", "Gartner"],
    names: [
      "Power MOSFETs",
      "IGBTs",
      "Diodes",
      "Rectifiers",
      "Small-signal transistors",
      "Thyristors",
      "SiC power devices",
      "GaN power devices",
      "Power modules",
      "TVS diodes",
    ],
    parts: ["650 V SiC MOSFETs", "Schottky rectifiers", "IGBT modules"],
  },
  Optoelectronics: {
    sources: ["WSTS", "Gartner"],
    names: ["LEDs", "Image sensors", "Optocouplers", "Laser diodes", "Photodiodes", "Infrared components", "Displays"],
    parts: ["High-power LEDs", "CMOS image sensors", "Digital optocouplers"],
  },
  Sensors: {
    sources: ["WSTS", "Gartner"],
    names: [
      "Pressure sensors",
      "Inertial sensors",
      "Magnetic sensors",
      "Temperature sensors",
      "Humidity sensors",
      "Gas sensors",
      "Current sensors",
      "Proximity sensors",
    ],
    parts: ["MEMS accelerometers", "Hall-effect sensors", "Digital temperature sensors"],
  },
  Connectors: {
    sources: ["IP&E forecast"],
    names: [
      "Board-to-board",
      "Wire-to-board",
      "Circular",
      "Rectangular",
      "RF coaxial",
      "Fibre optic",
      "USB and IO connectors",
      "Terminal blocks",
      "Automotive connectors",
      "Card edge",
      "FFC and FPC",
      "Power connectors",
    ],
    parts: ["0.5 mm pitch mezzanine", "M12 circular", "USB-C receptacles"],
  },
  Passives: {
    sources: ["IP&E forecast"],
    names: [
      "MLCC",
      "Tantalum capacitors",
      "Aluminium electrolytic",
      "Film capacitors",
      "Thick film resistors",
      "Thin film resistors",
      "Inductors",
      "Ferrites",
      "Crystals and oscillators",
      "Supercapacitors",
      "Varistors",
      "Fuses",
    ],
    parts: ["0402 X7R MLCC", "Shielded power inductors", "Chip resistors"],
  },
  Electromechanical: {
    sources: ["IP&E forecast"],
    names: ["Relays", "Switches", "Circuit protection", "Fans and thermal", "Enclosures", "Motors", "Solenoids", "Keypads"],
    parts: ["PCB signal relays", "Tactile switches", "DC brushless fans"],
  },
};

// Share of a segment's categories by status, by its confidence rating.
const MIX: Record<string, { validated: number; review: number }> = {
  High: { validated: 0.74, review: 0.16 },
  Medium: { validated: 0.56, review: 0.28 },
  Low: { validated: 0.42, review: 0.33 },
};

/** A stable number in [0, 1) from a string, so the mock never changes between runs. */
function unit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

const lower = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

function build(): Mapping[] {
  const out: Mapping[] = [];
  SEGMENTS.forEach((segment, si) => {
    const spec = CATEGORIES[segment];
    const seg = SEGMENT_BILLINGS[si];
    const all = spec.sources.flatMap((source) => spec.names.map((name, ni) => ({ source, name, ni })));
    // Order by a stable hash, then hand out statuses so each segment matches its mix.
    const ordered = [...all].sort((a, b) => unit(`${a.source}${a.name}`) - unit(`${b.source}${b.name}`));
    const mix = MIX[seg.confidence];
    const nValid = Math.round(ordered.length * mix.validated);
    const nReview = Math.round(ordered.length * mix.review);
    const statusOf = (i: number): MapStatus =>
      i < nValid ? "validated" : i < nValid + nReview ? (i % 3 === 0 ? "review" : "suggested") : "unmapped";
    const rows = ordered.map((c, i) => ({ ...c, status: statusOf(i), weight: 0.3 + unit(`${c.name}${c.source}w`) * 1.4 }));
    const mappedWeight = rows.filter((r) => r.status !== "unmapped").reduce((n, r) => n + r.weight, 0);
    const short = SEGMENT_SHORT[segment];
    for (const r of rows) {
      const mapped = r.status !== "unmapped";
      const letters = r.name
        .replace(/[^A-Za-z]/g, "")
        .toUpperCase()
        .slice(0, 2);
      const code = `TC ${si}${letters}`;
      const pcc = `PCC ${101 + si}-${String(r.ni + 1).padStart(2, "0")}`;
      const u = unit(`${r.source}${r.name}c`);
      const confidence: Confidence | null = !mapped
        ? null
        : r.status === "validated"
          ? u < 0.8
            ? "High"
            : "Medium"
          : u < 0.35
            ? "High"
            : u < 0.75
              ? "Medium"
              : "Low";
      // Validations are spread over about six months; open items are recent.
      const age = 2 + Math.floor(unit(`${r.name}${r.source}d`) * (r.status === "validated" ? 180 : 40));
      const role = `Product manager, ${short}`;
      const history: HistoryEvent[] = [];
      if (mapped) history.push({ daysAgo: age + 21, event: "Suggested", by: "Code map suggestion" });
      if (r.status === "review") history.push({ daysAgo: age, event: "Sent for review", by: "Market analyst" });
      if (r.status === "validated") {
        if (u > 0.7) history.push({ daysAgo: age + 7, event: "Codes edited", by: role });
        history.push({ daysAgo: age, event: "Validated", by: role });
      }
      if (!mapped) history.push({ daysAgo: age + 30, event: "No Avnet code found", by: "Code map suggestion" });
      out.push({
        id: `${r.source}-${segment}-${r.name}`.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase(),
        source: r.source,
        segment,
        name: r.name,
        codes: mapped ? [code] : [],
        pcc: mapped ? pcc : null,
        billings: mapped ? (seg.billings * r.weight) / mappedWeight : 0,
        confidence,
        status: r.status,
        waitsOn: r.status === "suggested" || r.status === "review" ? role : null,
        definition: `${r.source}'s category for ${lower(r.name)}, within ${segment.toLowerCase()}.`,
        reason: mapped
          ? `Most parts under ${code} are described as ${lower(r.name)} in the material master, and they sit under ${pcc} in the product hierarchy.`
          : null,
        parts: spec.parts,
        history: history.sort((a, b) => b.daysAgo - a.daysAgo),
      });
    }
  });
  return out;
}

export const MAPPINGS: Mapping[] = build();

/** Validated categories a month ago, for the KPI's change. */
export const VALIDATED_MONTH_AGO = MAPPINGS.filter((m) => m.status === "validated" && m.history.at(-1)!.daysAgo > 30).length;

/** The shell spec's example rows, from the same model. */
export const MAPPING_ROWS = MAPPINGS.filter((_, i) => i % 23 === 0).map((m) => ({
  external: `${m.source} › ${SEGMENT_SHORT[m.segment]} › ${m.name}`,
  avnet: m.codes.join(", ") || "Not mapped",
  pcc: m.pcc ?? "Not mapped",
  confidence: m.confidence ?? "Not mapped",
  status: STATUS_LABEL[m.status],
}));
