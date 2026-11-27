// KPI explainer rules. Run with: npx tsx src/lib/explain/explain.test.ts
import assert from "node:assert/strict";
import { PERFORMANCE } from "@/lib/shells/mock-avnet";
import { GLOSSARY } from "@/lib/learn/content";
import {
  bandOf,
  quartersAboveOne,
  readBookToBill,
  scalePosition,
} from "./book-to-bill";
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
import {
  backlogSteps,
  concentrationSegments,
  coverage,
  pipelineView,
  readActiveCustomers,
  readBacklog,
  readConcentration,
  readDesignApproved,
  readPipeline,
  readTtmBillings,
  type PipelineFigures,
} from "./operations";
import {
  categoryShares,
  confidenceShares,
  gapScale,
  mappingShares,
  readAgainstHold,
  readGrowthGap,
  readMappedBillings,
  readMappedShare,
  readPeerShare,
  readScenarioGrowth,
  readScenarioShare,
  readValidated,
  type ScenarioFigures,
} from "./share";
import { summarise, coverage as mapCoverage, weakest } from "@/lib/mapping/read";
import { getAvnet } from "@/lib/avnet";
import {
  count,
  funnel,
  nested,
  position,
  shareOfFirst,
  waterfall,
  weakestStep,
} from "./diagrams";

// Bands: the flat band is 0.98 to 1.02, inclusive at both ends.
assert.equal(bandOf(0.97), "shrinking");
assert.equal(bandOf(0.98), "flat");
assert.equal(bandOf(1), "flat");
assert.equal(bandOf(1.02), "flat");
assert.equal(bandOf(1.03), "growing");

// Reading: the reported ratio, the gap and the sentences.
const up = readBookToBill({
  quarter: "FY27 Q1",
  bookings: 6420,
  billings: 5950,
  bookToBill: 1.08,
});
assert.equal(up.ratio, 1.08);
assert.equal(up.band, "growing");
assert.equal(up.gap, 470);
assert.equal(up.gapText, "$470M more orders than shipments");
assert.equal(up.lead, "Orders are arriving faster than they ship.");
assert.equal(
  up.sentence,
  "Avnet booked $1.08 of orders for every $1.00 it shipped in FY27 Q1, so orders are arriving faster than they ship.",
);

const down = readBookToBill({
  quarter: "FY25 Q2",
  bookings: 5150,
  billings: 5480,
  bookToBill: 0.94,
});
assert.equal(down.band, "shrinking");
assert.equal(down.gapText, "$330M fewer orders than shipments");
assert.equal(
  down.sentence,
  "Avnet booked $0.94 of orders for every $1.00 it shipped in FY25 Q2, so it shipped more than it took in.",
);

const level = readBookToBill(
  { quarter: "FY25 Q4", bookings: 5420, billings: 5420, bookToBill: 1 },
  "Arrow",
);
assert.equal(level.band, "flat");
assert.equal(level.gapText, "Orders equal shipments");
assert.ok(level.sentence.startsWith("Arrow booked $1.00"));

// Billions read as billions.
assert.equal(
  readBookToBill({
    quarter: "Q",
    bookings: 7500,
    billings: 6000,
    bookToBill: 1.25,
  }).gapText,
  "$1.50B more orders than shipments",
);

// Scale: 0.80 to 1.20, pinned at the ends.
assert.equal(scalePosition(0.8), 0);
assert.equal(scalePosition(1), 0.5);
assert.equal(scalePosition(1.2), 1);
assert.equal(scalePosition(0.5), 0);
assert.equal(scalePosition(1.6), 1);

// The run above 1, counted back from the latest quarter.
const q = (bookToBill: number) => ({
  quarter: "Q",
  bookings: 1,
  billings: 1,
  bookToBill,
});
assert.equal(quartersAboveOne([q(1.1), q(0.99), q(1.01), q(1.05)]), 2);
assert.equal(quartersAboveOne([q(0.97)]), 0);
assert.equal(quartersAboveOne([]), 0);

// The mock data the explainer is shown with matches the reported ratio.
for (const p of PERFORMANCE)
  assert.ok(Math.abs(p.bookings / p.billings - p.bookToBill) < 0.01, p.quarter);

// Registry: every explainer is a glossary term and carries its definition.
assert.ok(EXPLAINERS.length > 0);
for (const e of EXPLAINERS) {
  assert.equal(
    e.definition,
    GLOSSARY.find((g) => g.term === e.term)?.definition,
  );
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
assert.deepEqual(
  fn.map((r) => r.width),
  [1, 0.6, 0.15],
);
assert.deepEqual(
  fn.map((r) => r.conversion),
  [null, 0.6, 0.25],
);
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
  yearAgo: { label: "FY25 Q4", revenue: (5.9 * B) / 0.96, inventoryDays: 86 },
};

const gm = readGrossMargin(fq, avnet)!;
assert.equal(
  gm.lead,
  "Avnet kept 11 cents of every revenue dollar after the cost of what it sold.",
);
assert.equal(
  gm.sentence,
  "In FY26 Q4, revenue of $5.90B less cost of sales of $5.25B left gross profit of $650M, a gross margin of 11.0%.",
);
assert.ok(gm.note?.startsWith("Distributors"));
assert.deepEqual(
  grossMarginSteps(fq)!.map((x) => x.value),
  [5.9 * B, 0.65 * B - 5.9 * B, 0.65 * B],
);
// Under ten cents is spelled out.
assert.ok(
  readGrossMargin(
    { label: "Q", v: { revenue: 100, grossProfit: 8, grossMargin: 0.08 } },
    avnet,
  )!.lead.includes("eight cents"),
);
assert.equal(readGrossMargin({ label: "Q", v: { revenue: 100 } }, avnet), null);

const om = readOperatingMargin(fq, avnet)!;
assert.equal(
  om.lead,
  "Avnet kept four cents of every revenue dollar after running the business.",
);
assert.ok(
  om.sentence.includes(
    "operating costs of $430M left operating profit of $220M",
  ),
);
assert.equal(operatingMarginSteps(fq)!.at(-1)!.label, "Operating profit");
const lossQ: FinQuarter = {
  label: "Q",
  v: {
    revenue: 100 * M,
    grossProfit: 20 * M,
    operatingIncome: -5 * M,
    operatingMargin: -0.05,
  },
};
assert.equal(operatingMarginSteps(lossQ)!.at(-1)!.label, "Operating loss");
assert.ok(readOperatingMargin(lossQ, avnet)!.lead.includes("ran at a loss"));

const fcf = readFreeCashFlow(fq, avnet)!;
assert.equal(
  fcf.lead,
  "Avnet brought in $360M of cash after paying for its equipment and buildings.",
);
assert.equal(
  fcf.sentence,
  "In FY26 Q4, cash from operations of $400M less capital spending of $40M left free cash flow of $360M.",
);
// The teaching moment: a distributor making cash while revenue falls.
assert.ok(fcf.note?.includes("releases cash in a downturn"));
assert.equal(
  readFreeCashFlow(fq, { ...avnet, group: "chipMaker" })!.note,
  undefined,
);
assert.deepEqual(
  freeCashFlowSteps(fq)!.map((x) => x.value),
  [0.4 * B, -40 * M, 0.36 * B],
);
const burn = readFreeCashFlow(
  {
    label: "Q",
    v: {
      operatingCashFlow: -50 * M,
      capex: 10 * M,
      freeCashFlow: -60 * M,
      revenueYoY: 0.2,
    },
  },
  avnet,
)!;
assert.equal(
  burn.lead,
  "Avnet paid out $60M more than its operations brought in.",
);
assert.ok(burn.note?.includes("inventory that growth needs"));

const eps = readEps(fq, avnet)!;
assert.equal(eps.lead, "Avnet earned $1.35 for each share in FY26 Q4.");
assert.ok(eps.sentence.includes("over about 89 million diluted shares"));
assert.equal(eps.note, undefined);
assert.ok(
  readEps({ ...fq, epsDerived: true }, avnet)!.note?.includes("approximate"),
);
assert.equal(impliedShares(100, 0), null);
assert.equal(impliedShares(-100 * M, 1), null);
assert.equal(epsSteps(fq)!.at(-1)!.label, "Net income");

const inv = readInventoryDays(fq, avnet)!;
assert.equal(
  inv.lead,
  "Avnet's inventory would last 98 days at its current rate of sales.",
);
assert.equal(
  inv.sentence,
  "In FY26 Q4, Avnet held 98 days of inventory, up 12 days on FY25 Q4.",
);
assert.ok(inv.note?.includes("warning sign"));
assert.equal(
  readInventoryDays(
    { ...fq, yearAgo: { label: "FY25 Q4", inventoryDays: 97 } },
    avnet,
  )!.note,
  undefined,
);
assert.deepEqual(inventoryScale([72, 104]), { min: 60, max: 120 });
assert.deepEqual(inventoryScale([200]), { min: 70, max: 220 });

const rg = readRevenueGrowth(fq, avnet)!;
assert.equal(rg.lead, "Revenue was down 4.0% on the same quarter a year ago.");
assert.equal(rg.gapText, "$246M less than a year ago");
assert.ok(rg.note?.includes("seasons"));
// A foreign filer's local currency growth differs from the dollar bars.
assert.ok(
  readRevenueGrowth(
    { ...fq, v: { ...fq.v, revenueYoY: 0.03 } },
    { name: "WPG", slug: "wpg", group: "distributor" },
  )!.note?.includes("own currency"),
);
assert.equal(readRevenueGrowth({ label: "Q", v: { revenue: 1 } }, avnet), null);

// Copy rules hold in every financial sentence.
const fin = [gm, om, fcf, burn, eps, inv, rg].flatMap((r) => [
  r.lead,
  r.sentence,
  r.note ?? "",
]);
for (const t of fin) assert.ok(!/[/·—–]/.test(t), t);

// Backlog: rolled forward from the opening figure, closing on the reported one.
const b0 = {
  quarter: "FY26 Q4",
  bookings: 6000,
  billings: 5800,
  backlog: 9000,
};
const b1 = {
  quarter: "FY27 Q1",
  bookings: 6500,
  billings: 6000,
  backlog: 9500,
};
assert.deepEqual(
  backlogSteps(b0, b1).map((x) => [x.label, x.value]),
  [
    ["Backlog at end of FY26 Q4", 9000],
    ["Bookings", 6500],
    ["Billings", -6000],
    ["Backlog at end of FY27 Q1", 9500],
  ],
);
// A gap between the arithmetic and the reported backlog gets its own row.
const odd = backlogSteps(b0, { ...b1, backlog: 9300 });
assert.equal(odd[3].label, "Cancellations and other changes");
assert.equal(odd[3].value, -200);
assert.equal(odd.at(-1)!.value, 9300);
assert.equal(coverage(b1).toFixed(2), "1.58");
const bl = readBacklog(b0, b1);
assert.equal(bl.lead, "Avnet has 1.6 quarters of shipments already on order.");
assert.equal(
  bl.sentence,
  "In FY27 Q1, Avnet booked $6.50B and billed $6.00B, so backlog grew $500M to $9.50B.",
);

const ttm = readTtmBillings(
  [
    { quarter: "Q1", billings: 5000 },
    { quarter: "Q2", billings: 6000 },
    { quarter: "Q3", billings: 6500 },
    { quarter: "Q4", billings: 7000 },
    { quarter: "Q5", billings: 7200 },
  ],
  26700,
  23640,
);
assert.equal(
  ttm.lead,
  "Avnet billed $26.70B over the last four quarters, up 13% on the four before.",
);
assert.ok(ttm.sentence.startsWith("Q2 to Q5: Q2 $6.00B"));

const da = readDesignApproved(0.38, 24700);
assert.equal(
  da.lead,
  "38% of Avnet's billings come from parts it helped design in.",
);
assert.ok(Math.abs(da.approved - 9386) < 1e-6);

const pf: PipelineFigures = {
  stages: [
    { label: "Submitted", count: 4000, value: 3000 },
    { label: "Approved", count: 2600, value: 2200 },
    { label: "In production", count: 1800, value: 1600 },
    { label: "Billing", count: 600, value: 700 },
  ],
  approvedPipeline: 1500,
  approvedPipelineYearAgo: 1300,
  approvalRate: { now: 0.65, yearAgo: 0.62 },
  newRegistrations: { thisQuarter: 1100, yearAgo: 1000 },
  monthsToBilling: 9,
};
assert.deepEqual(pipelineView(pf, "approvedPipeline"), {
  stages: pf.stages.map((x) => ({ label: x.label, value: x.value })),
  highlight: 1,
  byValue: true,
});
assert.equal(pipelineView(pf, "newRegistrations").highlight, 0);
assert.equal(pipelineView(pf, "approvalRate").stages[0].value, 4000);
const ap = readPipeline(pf, "approvedPipeline");
assert.equal(
  ap.lead,
  "$1.50B of approved designs are not billing yet, up 15% on a year ago.",
);
assert.ok(ap.note?.includes("about nine months"));
const ar = readPipeline(pf, "approvalRate");
assert.equal(
  ar.lead,
  "Suppliers approved 65% of the designs Avnet registered, up three points on a year ago.",
);
assert.equal(
  ar.note,
  "Most registrations drop out between in production and billing.",
);
assert.equal(
  readPipeline(pf, "newRegistrations").lead,
  "Avnet registered 1,100 new designs this quarter, up 10% on a year ago.",
);

const segs = concentrationSegments(0.18, 0.42);
assert.deepEqual(
  segs.map((x) => x.label),
  ["Top 10", "Next 90", "Everyone else"],
);
assert.ok(Math.abs(segs.reduce((a, x) => a + x.share, 0) - 1) < 1e-9);
const conc = {
  top10: { now: 0.18, yearAgo: 0.17 },
  top100: { now: 0.42, yearAgo: 0.42 },
};
const c10 = readConcentration(conc, "top10");
assert.equal(
  c10.lead,
  "Avnet's ten largest customers bring in 18% of its billings.",
);
assert.ok(
  c10.sentence.endsWith("The top 10 share is up 1.0 points on a year ago."),
);
assert.ok(c10.note?.includes("1.8% of billings"));
assert.ok(
  readConcentration(conc, "top100").sentence.endsWith("level with a year ago."),
);
assert.equal(
  readActiveCustomers(2_100_000, 0.04).lead,
  "Avnet billed about 2.1 million companies in the last 12 months.",
);

// Nested boxes: areas to scale, and an inner level never outgrows its holder.
assert.deepEqual(
  nested([
    { label: "Market", value: 100 },
    { label: "Avnet", value: 4 },
  ]),
  [1, 0.2],
);
assert.deepEqual(
  nested([
    { label: "Market", value: 100 },
    { label: "Part", value: 25 },
    { label: "Too big", value: 81 },
  ]),
  [1, 0.5, 0.5],
);
assert.deepEqual(nested([{ label: "Empty", value: 0 }]), [0]);

// Share of mapped market: SOM over TAM, and the low confidence segments named.
const segShares = [
  { segment: "Analog", tam: 80, share: 0.05, confidence: "High" },
  { segment: "Memory", tam: 200, share: 0.01, confidence: "Medium" },
  { segment: "Sensors", tam: 20, share: 0.1, confidence: "Low" },
];
const conf = confidenceShares(segShares);
assert.ok(Math.abs(conf.reduce((a, v) => a + v, 0) - 1) < 1e-9);
assert.ok(Math.abs(conf[0] - 4 / 8) < 1e-9);
const ms = readMappedShare({ share: 8 / 300, shareYearAgo: 0.025, mappedShare: 0.85, segments: segShares });
assert.equal(ms.lead, "Avnet wins 2.7% of the market its billings map to, up 0.2 pts on a year ago.");
assert.equal(ms.sentence, "$8.0B of Avnet's billings map to segments worth $300.0B, and $8.0B ÷ $300.0B is 2.7%.");
assert.ok(ms.note?.startsWith("The other 15% of billings have no market category"));
assert.ok(ms.note?.includes("25% of mapped billings are in Sensors"));

// Mapped billings: validated, awaiting review and not mapped add to one.
const mf = { ttm: 24700, mappedShare: 0.85, validatedBillings: 15835, reviewBillings: 5160 };
const shares = mappingShares(mf);
assert.ok(Math.abs(shares.reduce((a, v) => a + v, 0) - 1) < 1e-9);
assert.ok(Math.abs(shares[2] - 0.15) < 1e-9);
assert.equal(readMappedBillings(mf, "share").lead, "85% of Avnet's billings map to a market category: $21.0B of $24.7B.");
assert.equal(readMappedBillings(mf, "amount").lead, "$21.0B of Avnet's billings map to a market category, 85% of the total.");
assert.deepEqual(mappingShares({ ...mf, ttm: 0 }), [0, 0, 1]);

// Validated categories.
const cat = { categories: 162, validated: 101, review: 37, unmapped: 24, validatedMonthAgo: 94 };
assert.ok(Math.abs(categoryShares(cat).reduce((a, v) => a + v, 0) - 1) < 1e-9);
const vc = readValidated(cat, mf, { segment: "Memory", validatedShare: 0.41 });
assert.equal(vc.lead, "101 of 162 market categories have a validated mapping, seven more than a month ago.");
assert.ok(vc.sentence.startsWith("37 categories wait for review and 24 have no Avnet code."));
assert.ok(readValidated({ ...cat, validated: 94 }, mf).lead.endsWith("level with a month ago."));

// Share of Avnet and Arrow: equal revenue is reported as equal, never as an error.
const pq = { label: "Q3 '26", avnet: 0.5, avnetRevenue: 5600, arrowRevenue: 5600 };
assert.equal(readPeerShare(pq).sentence, "In Q3 '26, Avnet reported $5.6B and Arrow $5.6B, so Avnet had the same revenue as Arrow.");
assert.equal(
  readPeerShare({ ...pq, avnet: 0.52 }, { ...pq, avnet: 0.5 }).lead,
  "Avnet took 52.0% of the two companies' combined revenue, up 2.0 pts on a year ago.",
);

// Growth over makers: an even scale about zero, and ahead or behind in words.
assert.deepEqual(gapScale([0.03, -0.12]), { min: -0.15, max: 0.15 });
assert.deepEqual(gapScale([0.01]), { min: -0.05, max: 0.05 });
assert.equal(
  readGrowthGap({ label: "Q3 '26", avnet: 0.08, makers: 0.12 }, 23).lead,
  "Avnet's revenue grew 4.0 pts slower than the revenue of the makers whose parts it sells.",
);
assert.equal(
  readGrowthGap({ label: "Q3 '26", avnet: -0.02, makers: 0.05 }, 7).sentence,
  "In Q3 '26, Avnet's revenue fell 2% on a year ago and the makers' combined revenue grew 5%.",
);
assert.ok(readGrowthGap({ label: "Q3 '26", avnet: 0.1, makers: 0.05 }, 7).note?.includes("the seven makers"));

// Scenario Modeler.
const sc: ScenarioFigures = {
  years: 2,
  billings: 21000,
  billingsAt: 25410,
  holdAt: 24200,
  market: 686000,
  marketAt: 750000,
  share: 21000 / 686000,
  shareAt: 25410 / 750000,
  cagr: 0.1,
};
assert.equal(readScenarioShare(sc).lead, "The scenario takes Avnet's share of the mapped market to 3.4% in two years, from 3.1% today.");
assert.equal(readAgainstHold(sc).lead, "The scenario bills $1.2B more than Avnet would if it kept today's share.");
assert.equal(readAgainstHold({ ...sc, billingsAt: 24200 }).lead, "The scenario bills the same as Avnet would if it kept today's share.");
assert.equal(readScenarioGrowth(sc).lead, "The scenario grows Avnet's mapped billings 10.0% a year, compounded.");
assert.ok(readScenarioGrowth(sc).note?.endsWith("adds up to 21%, not 20%."));
assert.equal(readScenarioGrowth({ ...sc, years: 1 }).note, "Over one year, the rate a year is simply the growth.");
const shareReads = [ms, readMappedBillings(mf, "share"), vc, readPeerShare(pq), readScenarioShare(sc), readAgainstHold(sc), readScenarioGrowth(sc)];

// The mock data the explainers are shown with reads cleanly.
void (async () => {
  const am = await getAvnet();
  const sum = summarise(am.mappings);
  const amf = {
    ttm: am.ttmBillings,
    mappedShare: am.mappedShare,
    validatedBillings: am.mappings.filter((x) => x.status === "validated").reduce((a, x) => a + x.billings, 0),
    reviewBillings: sum.reviewBillings,
  };
  // The code map's statuses cover every mapped dollar, so the bar adds to one.
  assert.ok(Math.abs(mappingShares(amf).reduce((a, v) => a + v, 0) - 1) < 1e-9);
  const weak = weakest(mapCoverage(am.mappings, am.segments));
  const shareOps = [
    readMappedShare({
      share: am.shareTrend.at(-1)!["Avnet share of mapped TAM"],
      shareYearAgo: am.shareTrend.at(-5)!["Avnet share of mapped TAM"],
      mappedShare: am.mappedShare,
      segments: am.shareBySegment,
    }),
    readMappedBillings(amf, "amount"),
    readMappedBillings(amf, "share"),
    readValidated({ ...sum, validatedMonthAgo: am.validatedMonthAgo }, amf, weak),
  ];
  const ops = [
    readBacklog(am.performance.at(-2)!, am.performance.at(-1)!),
    readTtmBillings(am.performance, am.ttmBillings, am.ttmBillingsYearAgo),
    readDesignApproved(am.designApprovedShare, am.ttmBillings),
    readConcentration(am.concentration, "top10"),
    readActiveCustomers(
      am.concentration.active,
      am.concentration.newCustomerGrowth,
    ),
    ...(["approvedPipeline", "approvalRate", "newRegistrations"] as const).map(
      (f) =>
        readPipeline(
          {
            stages: (
              ["submitted", "approved", "production", "billing"] as const
            ).map((k) => ({ label: k, ...am.pipeline[k] })),
            approvedPipeline: am.approvedPipeline,
            approvedPipelineYearAgo: am.approvedPipelineYearAgo,
            approvalRate: am.approvalRate,
            newRegistrations: am.newRegistrations,
            monthsToBilling: am.monthsToBilling,
          },
          f,
        ),
    ),
  ];
  for (const t of [bl, ttm, da, ap, ar, c10, ...ops, ...shareReads, ...shareOps].flatMap((r) => [
    r.lead,
    r.sentence,
    r.note ?? "",
  ])) {
    assert.ok(!/[/·—–]/.test(t), t);
    assert.ok(!/NaN|Infinity|undefined/.test(t), t);
  }

  console.log("explain: all tests passed");
})();
