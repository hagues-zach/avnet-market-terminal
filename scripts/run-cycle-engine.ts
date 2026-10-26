// Run the semiconductor cycle engine end to end on the committed history and
// write data/cycle/output.json for the internal page (/signals/engine).
//
//   npx tsx scripts/fetch-history.ts      (refresh the history first, when wanted)
//   npx tsx scripts/run-cycle-engine.ts
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REFERENCE, SERIES, type CatalogSeries } from "../src/lib/cycle/catalog";
import { composite, smoothedGrowth, type Component } from "../src/lib/cycle/composite";
import { score, TIER_RULES, type Scorecard } from "../src/lib/cycle/finder";
import { measured, rawSeries, secGroup } from "../src/lib/cycle/history";
import { crossCheck, referenceCycle, REFERENCE_RULES } from "../src/lib/cycle/reference";
import { backtest, chooseDrop, phases, stageSentence, stateOf, stress, type IndexName } from "../src/lib/cycle/signals";
import { monthIndex, quarterMonths, type Series } from "../src/lib/cycle/transform";
import { datedTurns } from "../src/lib/cycle/turns";

const OUT = path.join(process.cwd(), "data", "cycle", "output.json");
const CHART_FROM = "1995-01";
const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const compact = (s: Series, from = CHART_FROM) => s.filter((p) => p.month >= from).map((p) => [p.month, round(p.value)] as [string, number]);
const by = (key: string) => SERIES.find((s) => s.key === key)!;

function component(s: CatalogSeries): Component {
  // Growth measures change on their level (a percent change); levels, ratios and SEC growth by difference.
  const percent = s.measure === "yoy" && !s.sec;
  return { key: s.key, level: rawSeries(s), change: percent ? "percent" : "difference", sign: s.upIsGood ? 1 : -1 };
}

function main() {
  const ref = referenceCycle();

  // The SEC check: chip makers' own revenue cycle since 2009 against the reference dates.
  const secTurns = datedTurns(measured(by("sec-chips")), REFERENCE_RULES);
  const check = crossCheck(ref.turns, secTurns, "2010-01");

  // The finder, every backtested series against the dated cycle.
  const cards: (Scorecard & { label: string; source: string; guess: string; tested: boolean })[] = SERIES.filter((s) => !s.reference).map((s) => {
    if (!s.backtest) {
      return { ...score(s.key, [], ref.growth, ref.turns, s.upIsGood), placement: "not placed" as const, reason: "History too short to test against past cycles; shown only", label: s.label, source: s.source, guess: s.guess, tested: false };
    }
    const card = score(s.key, measured(s), ref.growth, ref.turns, s.upIsGood);
    // Chip makers' revenue is the cycle itself, not a predictor of it: all chip makers
    // are Aggregate by definition, and the AI and ex-AI splits feed the AI gap and the
    // ex-AI index. Their measured lead is kept as evidence about the reference proxy.
    if (s.sec) {
      const measuredAs = `${card.placement === "not placed" ? "not placed" : `measured ${card.placement}`} against the proxy (${card.reason})`;
      return s.sec === "chips"
        ? { ...card, placement: "coincident" as const, reason: `Chip revenue is the cycle itself, so Aggregate by definition; ${measuredAs}`, label: s.label, source: s.source, guess: s.guess, tested: true }
        : { ...card, placement: "not placed" as const, reason: `Used for the AI gap${s.sec === "exai" ? " and the ex-AI index" : ""}, not tiered; ${measuredAs}`, label: s.label, source: s.source, guess: s.guess, tested: true };
    }
    return { ...card, label: s.label, source: s.source, guess: s.guess, tested: true };
  });
  // Series whose data stopped (SEAJ bookings) are tested but never join an index.
  const placed = (p: string) => cards.filter((c) => c.placement === p && !by(c.key).backtestOnly).map((c) => c.key);

  // The five indexes.
  const membership: Record<string, string[]> = {
    Leading: placed("leading"),
    "Cyclical, all-in": SERIES.filter((s) => s.cyclical === "all" || s.cyclical === "both").map((s) => s.key),
    "Cyclical, excluding AI": SERIES.filter((s) => s.cyclical === "exai" || s.cyclical === "both").map((s) => s.key),
    Aggregate: [REFERENCE.key, ...placed("coincident")],
    Lagging: placed("lagging"),
  };
  const indexes = Object.entries(membership).map(([name, keys]) => {
    if (!keys.length) return { name, members: [], weights: {}, index: [], growth: [], latest: null, movers: null, empty: true };
    const c = composite(keys.map((k) => component(by(k))));
    const growth = smoothedGrowth(c.index);
    const lastMonth = c.index.at(-1)?.month;
    const parts = (lastMonth && c.contributions.get(lastMonth)) || [];
    const sorted = [...parts].sort((a, b) => b.value - a.value);
    return {
      name,
      members: keys,
      weights: Object.fromEntries(Object.entries(c.weights).map(([k, v]) => [k, round(v)])),
      index: compact(c.index),
      growth: compact(growth),
      latest: growth.at(-1) ? { month: growth.at(-1)!.month, growth: round(growth.at(-1)!.value) } : null,
      movers: { month: lastMonth, up: sorted.filter((p) => p.value > 0).slice(0, 3).map((p) => ({ key: p.key, value: round(p.value) })), down: sorted.filter((p) => p.value < 0).slice(-3).reverse().map((p) => ({ key: p.key, value: round(p.value) })) },
      empty: false,
    };
  });
  const growthOf = (name: string) => {
    const x = indexes.find((i) => i.name === name)!;
    return x.growth.map(([month, value]) => ({ month, value }));
  };

  // The AI gap: all-in against ex-AI cyclical growth, and the chip makers' own split since 2009.
  const all = new Map(growthOf("Cyclical, all-in").map((p) => [p.month, p.value]));
  const aiGap = growthOf("Cyclical, excluding AI").flatMap((p) => (all.has(p.month) ? [[p.month, round(all.get(p.month)! - p.value)] as [string, number]] : []));
  const ai = new Map(secGroup("ai").map((q) => [q.quarter, q.growth]));
  const secGap = secGroup("exai").flatMap((q) => (ai.has(q.quarter) ? [{ quarter: q.quarter, ai: round(ai.get(q.quarter)!), exai: round(q.growth), gap: round(ai.get(q.quarter)! - q.growth) }] : []));

  // Signals, when there's a leading index to signal from.
  const leading = indexes.find((i) => i.name === "Leading")!;
  const curve = rawSeries(by("curve-10y3m"));
  let signals: unknown = { available: false, reason: "No series passed the leading test against the reference cycle, so there is no leading index to signal from yet." };
  if (!leading.empty) {
    const lev = leading.index.map(([month, value]) => ({ month, value }));
    const g = growthOf("Leading");
    const down = chooseDrop((d) => backtest(lev, g, curve, ref.turns, d, "down"));
    const up = chooseDrop((d) => backtest(lev, g, curve, ref.turns, d, "up"));
    signals = {
      available: true,
      down: { drop: down.drop, steps: backtest(lev, g, curve, ref.turns, down.drop, "down"), grid: down.grid },
      up: { drop: up.drop, steps: backtest(lev, g, curve, ref.turns, up.drop, "up"), grid: up.grid },
    };
  }

  // Stage, across the sequence.
  const names: [IndexName, string][] = [["Leading", "Leading"], ["Cyclical", "Cyclical, all-in"], ["Aggregate", "Aggregate"], ["Lagging", "Lagging"]];
  const states = names.map(([short, name]) => (indexes.find((i) => i.name === name)!.empty ? null : stateOf(short, growthOf(name))));

  // Stress: finished goods share, and chip makers' operating margin against past downturns' drawdowns.
  const margins = secGroup("chips").flatMap((q) => (q.margin === undefined ? [] : [{ quarter: q.quarter, margin: q.margin }]));
  const quarterOf = (month: string) => margins.findIndex((m) => quarterMonths(m.quarter).includes(month));
  const drawdowns = phases(ref.turns, "down").flatMap((p) => {
    const a = quarterOf(p.start);
    const b = quarterOf(p.end);
    if (a < 0 || b < 0) return [];
    const before = Math.max(...margins.slice(Math.max(0, a - 3), a + 1).map((m) => m.margin));
    const low = Math.min(...margins.slice(a, b + 1).map((m) => m.margin));
    return [before - low];
  });
  const finishedShare = rawSeries(by("inv-finished-share"));
  const s = stress(finishedShare, margins, drawdowns);

  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "data", "cycle", "manifest.json"), "utf8"));
  const output = {
    generated: new Date().toISOString().slice(0, 10),
    history: { fetched: manifest.fetched, vintage: manifest.vintage, note: manifest.note, failed: manifest.failed ?? [], manual: manifest.manual ?? [] },
    reference: {
      source: ref.source,
      series: ref.series,
      method: ref.method,
      turns: ref.turns.map((t) => ({ month: t.month, kind: t.kind })),
      // The public proxy's own growth is public data; a WSTS reference never writes its figures.
      growth: ref.source === "Public proxy" ? compact(ref.growth, "1985-01") : null,
      check: { against: "SEC chip makers' revenue, all groups", from: "2010-01", agree: check.agree, unmatched: check.unmatched.map((t) => ({ month: t.month, kind: t.kind })), extra: check.extra.map((t) => ({ month: t.month, kind: t.kind })) },
    },
    rules: { tier: TIER_RULES },
    scorecard: cards.map((c) => ({
      key: c.key,
      label: c.label,
      source: c.source,
      guess: c.guess,
      tested: c.tested,
      placement: c.placement,
      reason: c.reason,
      lead: c.lead,
      leadAtPeaks: c.leadAtPeaks,
      leadAtTroughs: c.leadAtTroughs,
      range: c.range,
      hitRate: round(c.hitRate, 2),
      matched: c.matched,
      missed: c.missed,
      falseTurns: c.falseTurns,
      eras: c.eras,
      stable: c.stable,
      correlation: c.correlation ? { lead: c.correlation.lead, r: round(c.correlation.r, 2) } : null,
      lastMonth: rawSeries(by(c.key)).at(-1)?.month ?? null,
      backtestOnly: Boolean(by(c.key).backtestOnly),
    })),
    indexes,
    aiGap: { index: aiGap.filter(([m]) => m >= "2010-01"), sec: secGap },
    signals,
    stage: { sentence: stageSentence(states), states },
    stress: { ...s, share: s.share === null ? null : round(s.share, 2), drawdown: s.drawdown === null ? null : round(s.drawdown), threshold: s.threshold === null ? null : round(s.threshold), latestMargin: margins.at(-1) ?? null, pastDrawdowns: drawdowns.map((d) => round(d)) },
  };
  writeFileSync(OUT, `${JSON.stringify(output)}\n`);

  // A summary for the terminal.
  console.log(`Reference: ${ref.source}, ${ref.series}. ${ref.turns.length} turns; troughs ${ref.turns.filter((t) => t.kind === "trough").map((t) => t.month).join(", ")}`);
  console.log(`SEC check since 2010: ${check.agree.length} agree, ${check.unmatched.length} unmatched, ${check.extra.length} extra`);
  for (const p of ["leading", "coincident", "lagging", "not placed"]) console.log(`${p}: ${cards.filter((c) => c.placement === p).map((c) => c.key).join(", ") || "none"}`);
  for (const i of indexes) console.log(`${i.name}: ${i.empty ? "empty" : `${i.members.length} members, latest growth ${i.latest ? `${(i.latest.growth * 100).toFixed(1)}% (${i.latest.month})` : "n/a"}`}`);
  console.log(`Stage: ${output.stage.sentence}`);
  console.log(`Stress: ${s.on ? "on" : "off"} (finished goods share percentile ${s.share?.toFixed(2)}, margin drawdown ${s.drawdown?.toFixed(3)} against ${s.threshold?.toFixed(3)})`);
  console.log(`Output: ${(JSON.stringify(output).length / 1024).toFixed(0)} KB, ${monthIndex(output.generated.slice(0, 7))}`);
}

main();
