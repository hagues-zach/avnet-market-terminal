// MOCK. Example rows for the code mapping workbench. The real table is
// gold.market_intelligence.gartner_avnet_code_map, seeded by AI-assisted matching
// against the material master and validated by product managers (PRD section 6).

export const MAPPING_ROWS = [
  { external: "WSTS · Analog · General purpose", avnet: "TC 0AA · PH ANLG-GP", pcc: "SEMI / ANALOG / GP", confidence: "High", status: "Validated" },
  { external: "WSTS · Micro · MCU 32-bit", avnet: "TC 0MC · PH MCU-32", pcc: "SEMI / MICRO / MCU", confidence: "High", status: "Validated" },
  { external: "Gartner · Memory · DRAM", avnet: "TC 0DR · PH MEM-DRAM", pcc: "SEMI / MEMORY / DRAM", confidence: "Medium", status: "Suggested" },
  { external: "WSTS · Discretes · Power MOSFET", avnet: "TC 0PW · PH DIS-PWR", pcc: "SEMI / DISCRETE / POWER", confidence: "Medium", status: "In review" },
  { external: "IP&E · Connectors · Board-to-board", avnet: "TC 0II · PH CON-B2B", pcc: "IPE / CONN / B2B", confidence: "High", status: "Validated" },
  { external: "IP&E · Passives · MLCC", avnet: "TC 0CP · PH PAS-MLCC", pcc: "IPE / PASSIVE / CAP", confidence: "Low", status: "Suggested" },
  { external: "Gartner · Opto · Image sensors", avnet: "Unmapped", pcc: "—", confidence: "Unmapped", status: "Needs owner" },
];
