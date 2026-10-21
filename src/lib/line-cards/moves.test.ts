// Headline matching for franchise moves. Run with: npx tsx src/lib/line-cards/moves.test.ts
import assert from "node:assert/strict";
import { readMove } from "./moves";

// [headline, distributor slug, supplier, ended]
const MATCHED: [string, string, string, boolean][] = [
  ["Mouser Signs Global Distribution Agreement with ControlByWeb to Deliver Innovative Industrial IoT Controllers", "mouser", "ControlByWeb", false],
  ["Altera and Rutronik sign strategic distribution agreement", "rutronik", "Altera", false],
  ["Altera and Rutronik partner to broaden FPGA availability across Europe", "rutronik", "Altera", false],
  ["DEEPX Expands APAC Footprint Through Distribution Agreement with Global Technology Distributor Avnet", "avnet", "DEEPX", false],
  ["Dell Technologies Terminates Enterprise Computing Distribution Deal With Arrow: Sources", "arrow", "Dell Technologies", true],
  ["iDEAL Semiconductor signs global distribution deal with DigiKey", "digikey", "iDEAL Semiconductor", false],
  ["Mouser Electronics Inks Global Distribution Agreement with Telit Cinterion", "mouser", "Telit Cinterion", false],
  ["Mouser and Amphenol CDI Announce Global Distribution Agreement", "mouser", "Amphenol CDI", false],
  ["Arrow Electronics extends Bitdefender distribution agreement across the UK and Ireland", "arrow", "Bitdefender", false],
  ["Quectel Expands EMEA Reach With Future Electronics Distribution Agreement", "future", "Quectel", false],
  ["Navitas Expands Global Distribution Network with Avnet", "avnet", "Navitas", false],
  ["Mouser Electronics Adds Amphenol TPC Wire & Cable Products to Its Industrial Connectivity Portfolio", "mouser", "Amphenol TPC Wire", false],
  // Avnet-owned brands resolve to Avnet or Farnell, not a bare match elsewhere.
  ["Avnet Silica signs distribution agreement with LEM", "avnet", "LEM", false],
  ["EBV Elektronik signs franchise agreement with Ambiq", "avnet", "Ambiq", false],
  ["Molex appoints Avnet Abacus as franchise partner in Europe", "avnet", "Molex", false],
  ["Farnell Expands Electromechanical Portfolio With Hongfa Distribution Agreement", "newark", "Hongfa", false],
  ["Farnell signs partnership agreement with Hailo to accelerate Edge AI innovation", "newark", "Hailo", false],
];

const NOT_MATCHED: string[] = [
  // Investment and capacity
  "DigiKey invests $100m to expand global distribution capacity",
  "DigiKey Commits $100 Million Investment Over Next 18 Months to Expand Global Distribution Operations",
  // Earnings
  "Arrow Electronics reports third-quarter results as distribution revenue rises",
  "Avnet signs off fiscal year with record earnings",
  // Facilities and logistics
  "A Look Inside the Technology and Logistics of our Global Distribution Center | Mouser Electronics",
  "Mouser signs lease for new distribution facility in Texas",
  // Awards
  "Mouser Receives Top Distribution Awards from Vishay Intertechnology for Fifth Consecutive Year",
  // Line card totals with no named supplier
  "Mouser Expands Line Card with 60+ New Manufacturers in 2025",
  "DigiKey Adds More Than 108,000 New Stocking Parts and 364 Suppliers in 2025",
  "DigiKey Expands In-Stock Line Card with Nearly 31,000 New Parts in Q1 2026",
  // No agreement wording
  "Mouser And EPC Expand Global Access To GaN Power Devices",
  "DigiKey announces the launch of its regional Vietnam website",
  // No known distributor
  "RFMW and Ohmite Announce Distribution Agreement for High-Power Resistors and Thermal Management Solutions",
];

let failed = 0;
const check = (title: string, fn: () => void) => {
  try {
    fn();
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${title}\n  ${(e as Error).message.split("\n")[0]}`);
  }
};

for (const [title, slug, supplier, ended] of MATCHED) {
  check(title, () => {
    const read = readMove(title);
    assert.ok(read, "expected a move");
    assert.deepEqual({ slug: read.distributor.slug, supplier: read.supplier, ended: read.ended }, { slug, supplier, ended });
  });
}
for (const title of NOT_MATCHED) check(title, () => assert.equal(readMove(title), null, "expected no move"));

const total = MATCHED.length + NOT_MATCHED.length;
console.log(`${total - failed}/${total} headlines read as expected`);
if (failed) process.exit(1);
