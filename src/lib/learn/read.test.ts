// Learning Center rules and content. Run with: npx tsx src/lib/learn/read.test.ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { GLOSSARY, METHODS, PATHS, PRIMERS, ROLES } from "./content";
import { glossaryGroups, makerTrend } from "./read";

// Maker trend: count, median, one maker, missing filings.
assert.equal(
  makerTrend([
    { slug: "a", name: "A", growth: 0.06 },
    { slug: "b", name: "B", growth: -0.04 },
    { slug: "c", name: "C", growth: 0.04 },
  ]),
  "2 of 3 makers grew revenue on a year ago; the median is +4%.",
);
assert.equal(
  makerTrend([
    { slug: "a", name: "A", growth: 0.1 },
    { slug: "b", name: "B", growth: 0.2 },
    { slug: "c", name: "C" },
  ]),
  "2 of 2 makers grew revenue on a year ago; the median is +15%. No recent filing for C.",
);
assert.equal(makerTrend([{ slug: "v", name: "Vishay", growth: -0.05 }]), "Vishay's revenue fell 5% on a year ago.");
assert.equal(makerTrend([{ slug: "v", name: "Vishay" }]), "No recent filings for these makers yet.");

// Glossary search: term or definition, grouped A to Z.
const groups = glossaryGroups(GLOSSARY, "");
assert.deepEqual(
  groups.map((g) => g.letter),
  [...groups.map((g) => g.letter)].sort(),
);
assert.equal(
  groups.reduce((n, g) => n + g.entries.length, 0),
  GLOSSARY.length,
);
assert.ok(glossaryGroups(GLOSSARY, "SHIPPED").some((g) => g.entries.some((e) => e.term === "Backlog")));
assert.deepEqual(glossaryGroups(GLOSSARY, "zzz"), []);

// Content checks: makers exist in the app, each primer has an illustration, paths cover every role,
// related terms are in the glossary, and no visible text uses a slash, a middle dot or an em-dash.
const slugs = new Set(COMPANIES.map((c) => c.slug));
for (const p of PRIMERS) {
  for (const m of p.makers) assert.ok(slugs.has(m), `${p.slug}: ${m} is not in COMPANIES`);
  assert.ok(existsSync(`public/learn/${p.slug}.jpg`), `${p.slug}: missing illustration`);
  for (const t of p.related)
    assert.ok(
      GLOSSARY.some((g) => g.term === t),
      `${p.slug}: ${t} not in the glossary`,
    );
  assert.equal(p.questions.length, 5, p.slug);
}
for (const r of ROLES) assert.equal(PATHS[r.id].length, 5, r.id);
const text = [
  ...PRIMERS.flatMap((p) => [p.name, p.summary, p.alt, p.whatItIs, ...p.questions, ...p.uses.flatMap((u) => [u.name, u.detail])]),
  ...GLOSSARY.flatMap((g) => [g.term, g.definition]),
  ...METHODS.flatMap((m) => [m.title, m.body]),
  ...Object.values(PATHS).flatMap((s) => s.flatMap((x) => [x.page, x.why])),
];
for (const t of text) assert.ok(!/[/·—–]/.test(t.replace(/\/[a-z-]+/g, "")), t);

console.log("learn read: all tests passed");
