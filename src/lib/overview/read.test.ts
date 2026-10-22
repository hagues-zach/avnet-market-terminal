// Market Overview rules and content. Run with: npx tsx src/lib/overview/read.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getTam } from "@/lib/data/mock/tam";
import { getForecast } from "@/lib/data/mock/forecast";
import { AI_DEVICES } from "@/lib/shells/mock-market";
import { bn, forecastDrift, inWords, lead, pace, pct, split } from "./read";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

// ---- The split ----
const s = split(
  [
    { usdM: 100, yoy: 1 },
    { usdM: 60, yoy: 0.2 },
  ],
  400,
  300,
);
close(s.ai.usdM, 160);
close(s.ai.prior, 100);
close(s.ai.growth, 0.6);
close(s.rest.usdM, 240);
close(s.rest.prior, 200);
close(s.rest.growth, 0.2);
close(s.ai.share + s.rest.share, 1);

// On the app's figures: the two groups add to the published market, both years.
const tam = getTam().value;
const prior = tam.trend.find((p) => p.year === tam.latestYear - 1)!.tamUsdM;
const real = split(AI_DEVICES, tam.tamUsdM, prior);
close(real.ai.usdM + real.rest.usdM, tam.tamUsdM);
close(real.ai.prior + real.rest.prior, prior);
assert.equal(Math.round(real.rest.growth * 100), 5, "the rest of the market grew about 5%");

// Each mock device fits inside the published WSTS category it belongs to.
const cat = (p: string) => tam.byProduct.find((x) => x.product === p)!.usdM;
const dev = (...names: string[]) => AI_DEVICES.filter((d) => names.includes(d.device)).reduce((a, d) => a + d.usdM, 0);
assert.ok(dev("DRAM", "Flash") <= cat("memory"), "DRAM and Flash fit in memory");
assert.ok(dev("MPUs") <= cat("micro"), "MPUs fit in micro");
assert.ok(dev("GPUs", "AI accelerators") <= cat("logic"), "GPUs and AI accelerators fit in logic");
assert.equal(new Set(AI_DEVICES.map((d) => d.device)).size, 5);

// ---- Pace ----
assert.equal(pace(0.3, 0.2), "faster");
assert.equal(pace(0.2, 0.3), "slower");
assert.equal(pace(0.21, 0.2), "steady");
assert.equal(pace(undefined, 0.2), null);

// ---- Words ----
assert.equal(pct(0.656), "+65.6%");
assert.equal(pct(-0.04), "−4.0%");
assert.equal(pct(undefined), "n/a");
assert.equal(bn(772_200), "$772B");
assert.equal(bn(975_500, 1), "$975.5B");
assert.equal(inWords("Memory & storage"), "memory and storage");
assert.equal(inWords("AI & connectivity"), "AI and connectivity");

const vintages = getForecast().value.vintages.map((v) => ({ vintage: v.vintage, value: v.proj2026 }));
assert.equal(forecastDrift(vintages, 2026), "WSTS has raised its 2026 forecast by 42% since Spring 2024.");
assert.equal(
  forecastDrift(
    [
      { vintage: "Spring 2025", value: 100 },
      { vintage: "Autumn 2025", value: 90 },
    ],
    2026,
  ),
  "WSTS has cut its 2026 forecast by 10% since Spring 2025.",
);
assert.equal(forecastDrift([{ vintage: "Autumn 2025", value: 100 }], 2026), "One WSTS forecast for 2026 so far.");

// ---- The lead ----
const base = {
  year: 2025,
  market: tam.tamUsdM,
  growth: tam.yoyGrowth,
  forecast: tam.forecastNextYearUsdM,
  devices: AI_DEVICES.map((d) => d.device),
  rest: real.rest,
};
assert.equal(
  lead({ ...base, quarter: "Q2 2026", supplyGrowth: 0.656, leader: "Memory & storage" }),
  "The chip market reached $772B in 2025, up 22.5%, and WSTS expects $976B in 2026. DRAM, Flash, MPUs, GPUs and AI accelerators carried it: the rest of the market grew 5%. In Q2 2026 the supply chain's revenue grew 65.6%, led by memory and storage.",
);
assert.match(lead(base), /The latest quarter's filings couldn't be read, so the supply chain's growth is n\/a\.$/);

// ---- Content: no slash, middle dot or em-dash in visible text ("n/a" is the agreed exception) ----
const visible = [
  lead({ ...base, quarter: "Q2 2026", supplyGrowth: 0.656, leader: "Memory & storage" }),
  forecastDrift(vintages, 2026),
  ...AI_DEVICES.map((d) => d.device),
  ...[...readFileSync("src/components/overview/sections.tsx", "utf8").matchAll(/>\s*([A-Z][^<>{}=;()]*?)\s*</g)].map((m) => m[1]),
  ...[...readFileSync("src/app/(terminal)/overview/page.tsx", "utf8").matchAll(/>\s*([A-Z][^<>{}=;()]*?)\s*</g)].map((m) => m[1]),
];
for (const t of visible) assert.ok(!/[/·—–]/.test(t.replace(/n\/a/g, "")), t);

console.log("overview read: ok");
