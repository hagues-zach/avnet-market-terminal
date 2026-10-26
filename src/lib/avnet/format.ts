import type { MapStatus, PipelineStage } from "./contracts";

// Labels and formatters for Avnet figures. No data here, so browser components
// can import it.

export const fmtM = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);
export const fmtPct = (v: number, signed = false) => `${signed && v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "production", label: "In production" },
  { id: "billing", label: "Billing" },
];

export const STATUS_LABEL: Record<MapStatus, string> = {
  validated: "Validated",
  suggested: "Suggested",
  review: "In review",
  unmapped: "Not mapped",
};

/** Short segment names for the strip and the category path. A segment not listed shows in full. */
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
export const segmentShort = (segment: string) => SEGMENT_SHORT[segment] ?? segment;
