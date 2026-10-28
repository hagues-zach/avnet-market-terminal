// Lead Finder ranking and content. Run with: npx tsx src/lib/leads/rank.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { PRIMERS } from "@/lib/learn/content";
import {
  CUSTOMERS,
  GROUPS,
  PRIMER_GROUPS,
  PRIMER_TERMS,
  filter,
  groupLabel,
  lead,
  leadsHref,
  list,
  parseLeadStart,
  rank,
  reasonsFor,
  techName,
  useFor,
  type LeadInput,
  type Story,
} from "./rank";

const primer = (slug: string) => PRIMERS.find((p) => p.slug === slug)!;
const co = (slug: string) => COMPANIES.find((c) => c.slug === slug)!;
const story = (age: number, onTechnology: boolean): Story => ({ title: "t", outlet: "o", date: "Nov 3", url: `u${age}`, age, onTechnology });
const sic = primer("sic-mosfets");
const q = (url: string) => Object.fromEntries(new URL(url, "http://x").searchParams);

// ---- Groups and primers ----
assert.equal(CUSTOMERS.length, 24, "24 public customer companies");
for (const c of CUSTOMERS)
  assert.ok(
    GROUPS.some((g) => g.value === c.cohort),
    c.slug,
  );
for (const p of PRIMERS) {
  assert.ok(PRIMER_GROUPS[p.slug]?.length, `${p.slug} maps to customer groups`);
  assert.ok(PRIMER_TERMS[p.slug], `${p.slug} has news terms`);
  assert.ok(PRIMER_GROUPS[p.slug].includes("ems"), `${p.slug}: contract manufacturers build for every market`);
}
assert.ok(!PRIMER_GROUPS["sic-mosfets"].includes("hyperscaler"));
assert.match("Wolfspeed ships SiC for 800 V", PRIMER_TERMS["sic-mosfets"]);
assert.doesNotMatch("Tesla raises Megapack output", PRIMER_TERMS["sic-mosfets"]);
assert.equal(useFor(sic, "auto"), "traction inverters and on-board chargers, especially on 800 V platforms");
assert.equal(useFor(sic, "ems"), undefined, "contract manufacturers have no one use");
assert.equal(techName(primer("connectors")), "connectors");
assert.equal(techName(sic), "SiC MOSFETs");
assert.equal(techName(primer("fpgas")), "FPGAs");

// ---- Reasons: live figures only, never a missing one ----
const base = (slug: string, x: Partial<LeadInput> = {}): LeadInput => ({ company: co(slug), stories: [], ...x });
assert.deepEqual(
  reasonsFor(base("tesla", { growth: 0.255, inventoryDays: 53.4, inventoryDaysYearAgo: 71.2, stories: [story(4, true)] }), sic).map((r) => r.text),
  ["Revenue up 25.5% on a year ago", "In the news on SiC MOSFETs, Nov 3", "Inventory down to 53 days from 71"],
);
assert.deepEqual(
  reasonsFor(base("ford", { growth: 0.064 }), sic),
  [{ kind: "fit", text: "Its market uses SiC MOSFETs" }],
  "slow growth is no reason",
);
assert.equal(reasonsFor(base("ford", { stories: [story(45, true)] }), sic)[0].kind, "fit", "old news is no reason");
assert.equal(reasonsFor(base("ford", { stories: [story(2, false)] }), sic)[0].kind, "fit", "news not on the technology is no reason");
assert.equal(reasonsFor(base("ford", { inventoryDays: 50 }), sic)[0].kind, "fit", "no year-ago figure, no inventory reason");
assert.equal(reasonsFor(base("ford", { inventoryDays: 50.2, inventoryDaysYearAgo: 49.8 }), sic)[0].kind, "fit", "the same whole days is no change");

// ---- Ranking ----
const inputs: LeadInput[] = [
  base("sanmina", { growth: 0.697 }),
  base("tesla", { growth: 0.255, inventoryDays: 53, inventoryDaysYearAgo: 71 }),
  base("caterpillar", { growth: 0.24, inventoryDays: 147, inventoryDaysYearAgo: 157 }),
  base("ford", { growth: 0.064 }),
  base("gm"),
  base("amazon", { growth: 0.2 }),
  base("microchip", { growth: 0.38 }),
];
const r = rank(inputs, sic);
assert.deepEqual(
  r.map((l) => l.company.slug),
  ["tesla", "caterpillar", "sanmina", "ford", "gm"],
  "most reasons first, then faster growth; hyperscalers don't use SiC; suppliers are never leads",
);
assert.equal(r[3].signals, 0);
assert.deepEqual(
  filter(r, "auto").map((l) => l.company.slug),
  ["tesla", "ford", "gm"],
);
const withNews = rank([base("ford", { stories: [story(3, true)] }), base("tesla", { growth: 0.3 })], sic);
assert.deepEqual(
  filter(withNews, undefined, true).map((l) => l.company.slug),
  ["ford"],
);

// ---- The lead ----
assert.equal(
  lead(r, sic),
  "For SiC MOSFETs, Tesla and Caterpillar lead: their markets use the part, revenue is up 24% or more on a year ago and inventory is down on a year ago.",
);
assert.equal(
  lead(filter(r, "industrial"), sic, "industrial"),
  "For SiC MOSFETs among industrial OEMs, Caterpillar leads: its market uses the part, revenue is up 24.0% on a year ago and inventory is down on a year ago.",
);
assert.equal(lead(rank([base("gm")], sic), sic), "For SiC MOSFETs, General Motors leads: its market uses the part.");
assert.equal(lead([], primer("connectors")), "No customer company in the app uses connectors.");
assert.equal(lead([], sic, "auto", true), "No customer company among carmakers has been in the news on SiC MOSFETs in the last 30 days.");
assert.equal(list(["a", "b", "c"]), "a, b and c");
assert.equal(groupLabel("ems"), "Contract manufacturers");

// ---- Where a list starts ----
assert.equal(parseLeadStart(q("/tools/leads")).primer.slug, "sic-mosfets");
assert.equal(parseLeadStart(q("/tools/leads?primer=fpgas")).primer.slug, "fpgas");
const fromSupplier = parseLeadStart(q("/tools/leads?supplier=wolfspeed"));
assert.equal(fromSupplier.primer.slug, "sic-mosfets", "a supplier picks its technology");
assert.equal(fromSupplier.supplier?.slug, "wolfspeed");
assert.equal(parseLeadStart(q("/tools/leads?primer=connectors&group=hyperscaler&news=1")).group, "hyperscaler");
assert.equal(parseLeadStart(q("/tools/leads?news=1")).news, true);
const bad = parseLeadStart(q("/tools/leads?primer=lasers&supplier=acme&group=pets"));
assert.equal(bad.notes.length, 3, "each unknown value is noted, never an error");
assert.equal(parseLeadStart(q("/tools/leads?supplier=arrow")).notes[0], "Arrow Electronics doesn't make a part with a primer yet.");
for (const p of PRIMERS) assert.equal(parseLeadStart(q(leadsHref({ primer: p.slug }))).primer.slug, p.slug);
const round = parseLeadStart(q(leadsHref({ primer: "mlccs", group: "auto", news: true })));
assert.deepEqual([round.primer.slug, round.group, round.news], ["mlccs", "auto", true]);
assert.equal(leadsHref({}), "/tools/leads");

// ---- Content ----
// Links out of the page route, and the primer page links in.
for (const href of [
  "src/app/(terminal)/network/[slug]/page.tsx",
  "src/app/(terminal)/tools/qbr/page.tsx",
  "src/app/(terminal)/tools/deck/page.tsx",
  "src/app/(terminal)/learn/[slug]/page.tsx",
  "src/app/(terminal)/customers/page.tsx",
  "src/app/(terminal)/line-cards/page.tsx",
])
  assert.ok(existsSync(href), href);
assert.match(readFileSync("src/app/(terminal)/learn/[slug]/page.tsx", "utf8"), /\/tools\/leads\?primer=\$\{p\.slug\}/);

// No slash in visible text, no middle dot, no em-dash or en-dash.
const visible = [
  ...GROUPS.map((g) => g.label),
  ...PRIMERS.map((p) => lead(rank(inputs, p), p)),
  ...r.flatMap((l) => l.reasons.map((x) => x.text)),
  ...bad.notes,
  ...[...readFileSync("src/components/leads/finder.tsx", "utf8").matchAll(/>\s*([A-Z][^<>{}=;()]*?)\s*</g)].map((m) => m[1]),
];
for (const t of visible) assert.ok(!/[/·—–]/.test(t), t);

console.log("leads rank: ok");
