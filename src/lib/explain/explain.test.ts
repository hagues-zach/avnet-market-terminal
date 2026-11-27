// KPI explainer rules. Run with: npx tsx src/lib/explain/explain.test.ts
import assert from "node:assert/strict";
import { PERFORMANCE } from "@/lib/shells/mock-avnet";
import { GLOSSARY } from "@/lib/learn/content";
import { bandOf, quartersAboveOne, readBookToBill, scalePosition } from "./book-to-bill";
import { EXPLAINERS, explainer } from "./registry";
import {
  epsSteps,
  freeCashFlowSteps,
  grossMarginSteps,
  impliedShares,
  inventoryScale,
  operatingMarginSteps,
  readEps,
  readFreeCashFlow,
  readGrossMargin,
  readInventoryDays,
  readOperatingMargin,
  readRevenueGrowth,
  type FinQuarter,
  type Subject,
} from "./financials";
import { count, funnel, position, shareOfFirst, waterfall, weakestStep } from "./diagrams";

// Bands: the flat band is 0.98 to 1.02, inclusive at both ends.
assert.equal(bandOf(0.97), "shrinking");
assert.equal(bandOf(0.98), "flat");
assert.equal(bandOf(1), "flat");
assert.equal(bandOf(1.02), "flat");
assert.equal(bandOf(1.03), "growing");

// Reading: the reported ratio, the gap and the sentences.
const up = readBookToBill({ quarter: "FY27 Q1", bookings: 6420, billings: 5950, bookToBill: 1.08 });
assert.equal(up.ratio, 1.08);
assert.equal(up.band, "growing");
assert.equal(up.gap, 470);
assert.equal(up.gapText, "$470M more orders than shipments");
assert.equal(up.lead, "Orders are arriving faster than they ship.");
assert.equal(
  up.sentence,
  "Avnet booked $1.08 of orders for every $1.00 it shipped in FY27 Q1, so orders are arriving faster than they ship.",
);

const down = readBookToBill({ quarter: "FY25 Q2", bookings: 5150, billings: 5480, bookToBill: 0.94 });
assert.equal(down.band, "shrinking");
assert.equal(down.gapText, "$330M fewer orders than shipments");
assert.equal(down.sentence, "Avnet booked $0.94 of orders for every $1.00 it shipped in FY25 Q2, so it shipped more than it took in.");

const level = readBookToBill({ quarter: "FY25 Q4", bookings: 5420, billings: 5420, bookToBill: 1 }, "Arrow");
assert.equal(level.band, "flat");
assert.equal(level.gapText, "Orders equal shipments");
assert.ok(level.sentence.startsWith("Arrow booked $1.00"));

// Billions read as billions.
assert.equal(readBookToBill({ quarter: "Q", bookings: 7500, billings: 6000, bookToBill: 1.25 }).gapText, "$1.50B more orders than shipments");

// Scale: 0.80 to 1.20, pinned at the ends.
assert.equal(scalePosition(0.8), 0);
assert.equal(scalePosition(1), 0.5);
assert.equal(scalePosition(1.2), 1);
assert.equal(scalePosition(0.5), 0);
assert.equal(scalePosition(1.6), 1);

// The run above 1, counted back from the latest quarter.
const q = (bookToBill: number) => ({ quarter: "Q", bookings: 1, billings: 1, bookToBill });
assert.equal(quartersAboveOne([q(1.1), q(0.99), q(1.01), q(1.05)]), 2);
assert.equal(quartersAboveOne([q(0.97)]), 0);
assert.equal(quartersAboveOne([]), 0);

// The mock data the explainer is shown with matches the reported ratio.
for (const p of PERFORMANCE) assert.ok(Math.abs(p.bookings / p.billings - p.bookToBill) < 0.01, p.quarter);

// Registry: every explainer is a glossary term and carries its definition.
assert.ok(EXPLAINERS.length > 0);
for (const e of EXPLAINERS) {
  assert.equal(e.definition, GLOSSARY.find((g) => g.term === e.term)?.definition);
  assert.ok(e.learnHref.startsWith("/learn"));
}
assert.equal(explainer("Book-to-bill").formula, "Bookings ÷ billings");
assert.throws(() => explainer("Nope"));

// Copy: no slash, middle dot or dash in anything the explainer shows (paths aside).
const text = [
  ...EXPLAINERS.flatMap((e) => [e.name, e.formula, e.definition]),
  ...[up, down, level].flatMap((r) => [r.lead, r.sentence, r.gapText]),
];
for (const t of text) assert.ok(!/[/·—–]/.test(t.replace(/\/[a-z-]+/g, "")), t);

// Words: one to nine spelled out, ten and up in figures.
assert.equal(count(1), "one");
assert.equal(count(9), "nine");
assert.equal(count(12), "12");

// Position on any scale, pinned, and a zero-width scale does not divide by zero.
assert.equal(position(90, { min: 0, max: 180 }), 0.5);
assert.equal(position(-5, { min: 0, max: 10 }), 0);
assert.equal(position(3, { min: 3, max: 3 }), 0);

// Waterfall: revenue down to gross profit down to operating profit.
const pl = [
  { label: "Revenue", kind: "total" as const, value: 5900 },
  { label: "Cost of sales", kind: "step" as const, value: -5250 },
  { label: "Gross profit", kind: "total" as const, value: 650 },
  { label: "Operating costs", kind: "step" as const, value: -430 },
  { label: "Operating profit", kind: "total" as const, value: 220 },
];
const wf = waterfall(pl);
assert.deepEqual(
  wf.bars.map((b) => [b.from, b.to, b.running]),
  [
    [0, 5900, 5900],
    [650, 5900, 650],
    [0, 650, 650],
    [220, 650, 220],
    [0, 220, 220],
  ],
);
assert.deepEqual(wf.domain, { min: 0, max: 5900 });
assert.ok(Math.abs(shareOfFirst(pl, 2) - 650 / 5900) < 1e-9);
// A loss takes the domain below zero.
const loss = waterfall([
  { label: "Operating cash flow", kind: "total", value: 100 },
  { label: "Capex", kind: "step", value: -160 },
]);
assert.deepEqual(loss.domain, { min: -60, max: 100 });
assert.deepEqual([loss.bars[1].from, loss.bars[1].to], [-60, 100]);

// Funnel: widths against the first stage, conversion from the stage before, and the weakest step.
const fn = funnel([
  { label: "Registered", value: 1000 },
  { label: "Approved", value: 600 },
  { label: "Billing", value: 150 },
]);
assert.deepEqual(fn.map((r) => r.width), [1, 0.6, 0.15]);
assert.deepEqual(fn.map((r) => r.conversion), [null, 0.6, 0.25]);
assert.equal(weakestStep(fn), 2);
assert.equal(weakestStep(funnel([{ label: "Only", value: 5 }])), null);

// Glossary: the terms the next explainers depend on are in place (kpi-plan.md, Step 0).
for (const t of [
  "Gross margin",
  "Operating margin",
  "Free cash flow",
  "Diluted EPS",
  "Revenue growth (year on year)",
  "Backlog coverage",
  "Customer concentration",
  "Hyperscaler capex",
  "Distributor inventory",
  "Approval rate",
]) {
  const g = GLOSSARY.find((x) => x.term === t);
  assert.ok(g, t);
  assert.ok(!/[/·—–]/.test(g.definition), g.definition);
}

// Financial explainers. Amounts are in dollars, as the earnings model keeps them.
const avnet: Subject = { name: "Avnet", slug: "avnet", group: "distributor" };
const B = 1e9;
const M = 1e6;
const fq: FinQuarter = {
  label: "FY26 Q4",
  v: {
    revenue: 5.9 * B,
    grossProfit: 0.65 * B,
    grossMargin: 0.65 / 5.9,
    operatingIncome: 0.22 * B,
    operatingMargin: 0.22 / 5.9,
    netIncome: 0.12 * B,
    epsDiluted: 1.35,
    operatingCashFlow: 0.4 * B,
    capex: 40 * M,
    freeCashFlow: 0.36 * B,
    inventoryDays: 98.4,
    revenueYoY: -0.04,
  },
  yearAgo: { label: "FY25 Q4", revenue: 5.9 * B / 0.96, inventoryDays: 86 },
};

const gm = readGrossMargin(fq, avnet)!;
assert.equal(gm.lead, "Avnet kept 11 cents of every revenue dollar after the cost of what it sold.");
assert.equal(gm.sentence, "In FY26 Q4, revenue of $5.90B less cost of sales of $5.25B left gross profit of $650M, a gross margin of 11.0%.");
assert.ok(gm.note?.startsWith("Distributors"));
assert.deepEqual(grossMarginSteps(fq)!.map((x) => x.value), [5.9 * B, 0.65 * B - 5.9 * B, 0.65 * B]);
// Under ten cents is spelled out.
assert.ok(readGrossMargin({ label: "Q", v: { revenue: 100, grossProfit: 8, grossMargin: 0.08 } }, avnet)!.lead.includes("eight cents"));
assert.equal(readGrossMargin({ label: "Q", v: { revenue: 100 } }, avnet), null);

const om = readOperatingMargin(fq, avnet)!;
assert.equal(om.lead, "Avnet kept four cents of every revenue dollar after running the business.");
assert.ok(om.sentence.includes("operating costs of $430M left operating profit of $220M"));
assert.equal(operatingMarginSteps(fq)!.at(-1)!.label, "Operating profit");
const lossQ: FinQuarter = { label: "Q", v: { revenue: 100 * M, grossProfit: 20 * M, operatingIncome: -5 * M, operatingMargin: -0.05 } };
assert.equal(operatingMarginSteps(lossQ)!.at(-1)!.label, "Operating loss");
assert.ok(readOperatingMargin(lossQ, avnet)!.lead.includes("ran at a loss"));

const fcf = readFreeCashFlow(fq, avnet)!;
assert.equal(fcf.lead, "Avnet brought in $360M of cash after paying for its equipment and buildings.");
assert.equal(fcf.sentence, "In FY26 Q4, cash from operations of $400M less capital spending of $40M left free cash flow of $360M.");
// The teaching moment: a distributor making cash while revenue falls.
assert.ok(fcf.note?.includes("releases cash in a downturn"));
assert.equal(readFreeCashFlow(fq, { ...avnet, group: "chipMaker" })!.note, undefined);
assert.deepEqual(freeCashFlowSteps(fq)!.map((x) => x.value), [0.4 * B, -40 * M, 0.36 * B]);
const burn = readFreeCashFlow({ label: "Q", v: { operatingCashFlow: -50 * M, capex: 10 * M, freeCashFlow: -60 * M, revenueYoY: 0.2 } }, avnet)!;
assert.equal(burn.lead, "Avnet paid out $60M more than its operations brought in.");
assert.ok(burn.note?.includes("inventory that growth needs"));

const eps = readEps(fq, avnet)!;
assert.equal(eps.lead, "Avnet earned $1.35 for each share in FY26 Q4.");
assert.ok(eps.sentence.includes("over about 89 million diluted shares"));
assert.equal(eps.note, undefined);
assert.ok(readEps({ ...fq, epsDerived: true }, avnet)!.note?.includes("approximate"));
assert.equal(impliedShares(100, 0), null);
assert.equal(impliedShares(-100 * M, 1), null);
assert.equal(epsSteps(fq)!.at(-1)!.label, "Net income");

const inv = readInventoryDays(fq, avnet)!;
assert.equal(inv.lead, "Avnet's inventory would last 98 days at its current rate of sales.");
assert.equal(inv.sentence, "In FY26 Q4, Avnet held 98 days of inventory, up 12 days on FY25 Q4.");
assert.ok(inv.note?.includes("warning sign"));
assert.equal(readInventoryDays({ ...fq, yearAgo: { label: "FY25 Q4", inventoryDays: 97 } }, avnet)!.note, undefined);
assert.deepEqual(inventoryScale([72, 104]), { min: 60, max: 120 });
assert.deepEqual(inventoryScale([200]), { min: 70, max: 220 });

const rg = readRevenueGrowth(fq, avnet)!;
assert.equal(rg.lead, "Revenue was down 4.0% on the same quarter a year ago.");
assert.equal(rg.gapText, "$246M less than a year ago");
assert.ok(rg.note?.includes("seasons"));
// A foreign filer's local currency growth differs from the dollar bars.
assert.ok(readRevenueGrowth({ ...fq, v: { ...fq.v, revenueYoY: 0.03 } }, { name: "WPG", slug: "wpg", group: "distributor" })!.note?.includes("own currency"));
assert.equal(readRevenueGrowth({ label: "Q", v: { revenue: 1 } }, avnet), null);

// Copy rules hold in every financial sentence.
const fin = [gm, om, fcf, burn, eps, inv, rg].flatMap((r) => [r.lead, r.sentence, r.note ?? ""]);
for (const t of fin) assert.ok(!/[/·—–]/.test(t), t);

console.log("explain: all tests passed");
