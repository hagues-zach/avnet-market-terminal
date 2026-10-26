// Data Hookups rules and content. Run with: npx tsx src/lib/data-hookups/read.test.ts
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { HOOKUPS, PILLAR_NAMES, type Hookup } from "@/lib/hookups";
import { NAV } from "@/components/layout/nav";
import { buildModel } from "@/lib/avnet/derive";
import { mockInputs } from "@/lib/avnet/mock";
import { shellSpecs } from "@/lib/shells/specs";
import type { ShellSpec } from "@/lib/shells/types";
import { CONNECTION_ORDER } from "./order";
import { PAGE_HOOKUPS } from "./pages";
import { byCloseness, lead, matches, nextStep, readPages, readSteps, unscheduled, widestStep } from "./read";

const ids = new Set(HOOKUPS.map((h) => h.id));
const specs: Record<string, ShellSpec> = shellSpecs(buildModel(mockInputs()));

// ---- Rules, on a small register ----
const h = (id: string, status: Hookup["status"], pillar: Hookup["pillar"] = "internal"): Hookup => ({
  id,
  name: id,
  pillar,
  status,
  description: "",
  sources: [],
  refresh: "Daily",
});
const reg = [h("a", "mock"), h("b", "mock"), h("c", "planned"), h("d", "live", "open"), h("e", "mock")];
const pages = [
  { href: "/one", title: "One", ids: ["a", "d"], files: [] },
  { href: "/two", title: "Two", ids: ["a", "b", "c"], files: [] },
  { href: "/three", title: "Three", ids: ["b"], files: [] },
  { href: "/four", title: "Four", ids: ["d"], files: [] },
];
const steps = [
  { step: "5.2", name: "C", sentence: "c", ids: ["c"] },
  { step: "5.3", name: "A and B", sentence: "a and b", ids: ["a", "b"] },
];

const pr = readPages(reg, pages);
assert.deepEqual(
  pr.map((p) => [p.live, p.pending.length]),
  [
    [1, 1],
    [0, 3],
    [0, 1],
    [1, 0],
  ],
);
// Fully live first, then fewest outstanding, nav order breaking ties.
assert.deepEqual(
  byCloseness(pr).map((p) => p.title),
  ["Four", "One", "Three", "Two"],
);

const sr = readSteps(reg, pages, steps);
assert.equal(sr[0].status, "Not started");
assert.deepEqual(
  sr[0].reach.map((p) => p.title),
  ["Two"],
);
assert.deepEqual(sr[0].completes, []);
assert.deepEqual(
  sr[1].reach.map((p) => p.title),
  ["One", "Two", "Three"],
);
// Connecting a and b leaves Two waiting on c, so only One and Three go fully live.
assert.deepEqual(
  sr[1].completes.map((p) => p.title),
  ["One", "Three"],
);
assert.equal(nextStep(sr)?.step, "5.2");
assert.equal(widestStep(sr)?.step, "5.3");
assert.deepEqual(
  unscheduled(reg, steps).map((x) => x.id),
  ["e"],
);
assert.equal(
  lead(reg, pages, steps),
  "1 of 5 sources are live, open data. 3 run on mock data and 1 is planned; 3 pages still show a mock marker. Next is step 5.2, c; step 5.3, a and b, reaches the most pages (3).",
);

// A step part-live is in progress and only counts what is still outstanding.
const partial = reg.map((x) => (x.id === "a" ? { ...x, status: "live" as const } : x));
const sp = readSteps(partial, pages, steps);
assert.equal(sp[1].status, "In progress");
assert.equal(sp[1].live, 1);
assert.deepEqual(
  sp[1].reach.map((p) => p.title),
  ["Two", "Three"],
);
// When the next step is also the widest, the lead says so once.
const noC = reg.map((x) => (x.id === "c" ? { ...x, status: "live" as const } : x));
assert.match(lead(noC, pages, steps), /Next is step 5\.3, a and b, which reaches the most pages \(3\)\.$/);
// All connected.
const allLive = reg.map((x) => ({ ...x, status: "live" as const }));
assert.match(lead(allLive, pages, steps), /Every phase 5 step is connected\.$/);

// Search covers names, tables and fields.
const billings = HOOKUPS.find((x) => x.id === "billings")!;
assert.ok(matches(billings, "BILL24_VIEW"));
assert.ok(matches(billings, "posting_date"));
assert.ok(!matches(billings, "transcript"));

// ---- The real register ----
assert.equal(ids.size, HOOKUPS.length, "hookup ids are unique");
for (const x of HOOKUPS) assert.ok(PILLAR_NAMES[x.pillar], x.id);

// The usage register: every id exists, every page is in the nav, every mock page is listed.
const navHrefs = new Set(NAV.map((n) => n.href));
for (const p of PAGE_HOOKUPS) {
  assert.ok(navHrefs.has(p.href), `${p.href} is in the nav`);
  for (const id of p.ids) assert.ok(ids.has(id), `${p.href}: ${id} is in HOOKUPS`);
  assert.equal(new Set(p.ids).size, p.ids.length, `${p.href}: no repeated ids`);
}
for (const n of NAV.filter((n) => n.mock))
  assert.ok(
    PAGE_HOOKUPS.some((p) => p.href === n.href),
    `${n.href} is mock in the nav but not listed`,
  );

// Ids written in each page's files match its entry, both ways. Arrays of quoted
// strings that are all hookup ids are the markers' ids (literal, constant or ternary).
const markerIds = (file: string) => {
  const src = readFileSync(file, "utf8");
  const out = new Set<string>();
  for (const m of src.matchAll(/\[([^\[\]]*)\]/g)) {
    const items = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const rest = m[1].replace(/"[^"]*"/g, "").replace(/[\s,]/g, "");
    if (items.length && !rest && items.every((x) => ids.has(x))) items.forEach((x) => out.add(x));
  }
  return out;
};
const specIds = (name: string) => (specs[name]?.sections ?? []).flatMap((s) => s.hookups);
for (const p of PAGE_HOOKUPS) {
  const found = new Set(p.files.flatMap((f) => [...markerIds(f)]));
  if (p.from) {
    // Start Here shows only its KPI section's marker; shell pages show every section's.
    const spec = specs[p.from.spec];
    assert.ok(spec, p.from.spec);
    const shown = p.href === "/start" ? (spec.sections.find((s) => s.kind === "kpis")?.hookups ?? []) : specIds(p.from.spec);
    shown.forEach((x) => found.add(x));
  }
  assert.deepEqual([...found].sort(), [...p.ids].sort(), `${p.href}: ids match what the page shows`);
}

// Every component that draws a marker belongs to a listed page (the kit gallery aside).
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) ? [p] : [];
  });
const listed = new Set(PAGE_HOOKUPS.flatMap((p) => p.files));
const exempt = ["src/components/ui/hookup-marker.tsx", "src/components/shell/", "src/app/(terminal)/design-kit/"];
for (const f of [...walk("src/app"), ...walk("src/components")]) {
  if (exempt.some((e) => f.startsWith(e))) continue;
  if (/<HookupMarker\b/.test(readFileSync(f, "utf8"))) assert.ok(listed.has(f), `${f} draws a hookup marker but no page lists it`);
}

// The connection order matches phase 5 of the build plan, and every id exists once.
const plan = readFileSync("docs/superapp-build-plan.md", "utf8");
const planSteps = [...plan.matchAll(/^- \[[ x]\] (5\.\d+) /gm)].map((m) => m[1]).filter((s) => s !== "5.1");
assert.deepEqual(
  CONNECTION_ORDER.map((s) => s.step),
  planSteps,
);
const ordered = CONNECTION_ORDER.flatMap((s) => s.ids);
for (const id of ordered) assert.ok(ids.has(id), `order: ${id} is in HOOKUPS`);
assert.equal(new Set(ordered).size, ordered.length, "each source is in one step");

// The lead, on the real register.
assert.match(lead(HOOKUPS, PAGE_HOOKUPS, CONNECTION_ORDER), /^\d+ of \d+ sources are live/);

// No slash in visible text (the slash-mark rule), no middle dot, no em-dash or en-dash.
// Table names and file paths are identifiers and keep their own spelling.
const visible = [
  ...HOOKUPS.flatMap((x) => [x.name, x.description, x.refresh, x.notes ?? "", ...(x.fields ?? [])]),
  ...PAGE_HOOKUPS.map((p) => p.title),
  ...CONNECTION_ORDER.flatMap((s) => [s.name, s.sentence]),
  ...Object.values(PILLAR_NAMES),
  lead(HOOKUPS, PAGE_HOOKUPS, CONNECTION_ORDER),
];
for (const t of visible) assert.ok(!/[/·—–]/.test(t), t);
for (const t of HOOKUPS.flatMap((x) => x.sources)) assert.ok(!/[·—–]/.test(t), t);

console.log("data-hookups read: ok");
