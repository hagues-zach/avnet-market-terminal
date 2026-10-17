// MOCK. Synthetic Avnet figures for the shell pages. None of these numbers are
// real; they exist so the layouts can be designed and reviewed. Each section that
// uses them names its hookup (src/lib/hookups.ts). Replace with queries against
// the internal tables listed there.

export const QUARTERS = ["FY25 Q2", "FY25 Q3", "FY25 Q4", "FY26 Q1", "FY26 Q2", "FY26 Q3", "FY26 Q4", "FY27 Q1"];

export const REGIONS = ["Americas", "EMEA", "Asia", "Farnell"] as const;

export const SEGMENTS = [
  "Analog",
  "Microcontrollers & processors",
  "Logic & FPGA",
  "Memory",
  "Discretes & power",
  "Optoelectronics",
  "Sensors",
  "Connectors",
  "Passives",
  "Electromechanical",
] as const;

/** Billings, bookings and backlog by quarter, $M. */
export const PERFORMANCE = QUARTERS.map((q, i) => {
  const billings = 5600 + i * 360 + (i % 2 ? 80 : -40);
  const bookings = billings * (0.94 + i * 0.022);
  return { quarter: q, billings, bookings, backlog: 9200 + i * 450, bookToBill: bookings / billings };
});

export const SUPPLIERS = [
  { name: "Supplier A", billings: 1840, growth: 0.31, share: 0.22 },
  { name: "Supplier B", billings: 1210, growth: 0.18, share: 0.14 },
  { name: "Supplier C", billings: 860, growth: 0.44, share: 0.1 },
  { name: "Supplier D", billings: 640, growth: -0.06, share: 0.08 },
  { name: "Supplier E", billings: 520, growth: 0.12, share: 0.06 },
  { name: "All others", billings: 3330, growth: 0.21, share: 0.4 },
];

export const VERTICALS = [
  { name: "Industrial", billings: 2410, growth: 0.19 },
  { name: "Automotive", billings: 1460, growth: 0.07 },
  { name: "Communications", billings: 1320, growth: 0.36 },
  { name: "Data center & computing", billings: 1180, growth: 0.62 },
  { name: "Aerospace & defense", billings: 760, growth: 0.15 },
  { name: "Medical", billings: 540, growth: 0.09 },
  { name: "Consumer", billings: 410, growth: -0.04 },
];

export const fmtM = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(2)}B` : `$${Math.round(v)}M`);
export const fmtPct = (v: number, signed = false) => `${signed && v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
