// Pitch Deck Builder rules and content. Run with: npx tsx src/lib/deck/outline.test.ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HOOKUPS, type Hookup } from "@/lib/hookups";
import { COMPANIES } from "@/lib/data/live/earnings-model";
import { PRIMERS } from "@/lib/learn/content";
import { SEGMENTS } from "@/lib/shells/mock-avnet";
import {
  AUDIENCES,
  PRIMER_SEGMENT,
  SLIDES,
  addSlide,
  available,
  companyHeadline,
  count,
  deckHref,
  deckName,
  hrefOf,
  lead,
  list,
  move,
  outline,
  parseStart,
  primerFor,
  shareHeadline,
  slide,
  sourcesPreview,
  startedFrom,
  statusOf,
  unavailableReason,
  type SlideId,
} from "./outline";

const ids = new Set(HOOKUPS.map((h) => h.id));
const q = (url: string) => Object.fromEntries(new URL(url, "http://x").searchParams);

// ---- Slides ----
assert.equal(new Set(SLIDES.map((s) => s.id)).size, SLIDES.length, "slide ids are unique");
for (const s of SLIDES) for (const h of s.hookups) assert.ok(ids.has(h), `${s.id}: ${h} is in HOOKUPS`);

// Status comes from the register: live only when every source is live.
const reg = (status: Hookup["status"]) => HOOKUPS.map((h) => (h.id === "billings" ? { ...h, status } : h));
assert.equal(statusOf(slide("company")), "live");
assert.equal(statusOf(slide("cycle")), "live");
assert.equal(statusOf(slide("share")), "mock");
assert.equal(statusOf(slide("pipeline")), "mock");
assert.equal(statusOf(slide("leads")), "live", "the lead list ranks on SEC filings and news");
assert.equal(statusOf(slide("technology")), "live", "written content with no data source is live");
const allLive = HOOKUPS.map((h) => ({ ...h, status: "live" as const }));
assert.equal(statusOf(slide("share"), allLive), "live", "a slide turns live with its hookups");
assert.equal(statusOf(slide("pipeline"), reg("live")), "mock", "billings alone isn't enough while drms is mock");

// ---- Starting points ----
const microchip = COMPANIES.find((c) => c.slug === "microchip")!;
const fromQbr = parseStart(q("/tools/deck?company=microchip&from=qbr"));
assert.equal(fromQbr.company?.slug, "microchip");
assert.equal(fromQbr.audience, "supplier", "a supplier opens a supplier pitch");
assert.equal(fromQbr.primer?.slug, "microcontrollers", "the company's technology comes from the primers");
assert.equal(startedFrom(fromQbr), "Started from QBR Prep for Microchip.");
assert.equal(parseStart(q("/tools/deck?company=jabil")).audience, "customer", "a customer opens a customer pitch");
assert.equal(parseStart(q("/tools/deck?company=td-synnex")).audience, "internal", "a competitor opens an internal review");
assert.equal(parseStart(q("/tools/deck?company=microchip&audience=internal")).audience, "internal", "the audience in the URL wins");
assert.equal(parseStart(q("/tools/deck")).audience, "internal");
assert.equal(startedFrom(parseStart(q("/tools/deck"))), null);

const fromLearn = parseStart(q("/tools/deck?primer=sic-mosfets&from=learn"));
assert.equal(fromLearn.audience, "customer");
assert.equal(fromLearn.primer?.slug, "sic-mosfets");
assert.equal(startedFrom(fromLearn), "Started from the Learning Center for SiC MOSFETs.");

const fromLeads = parseStart(q("/tools/deck?company=tesla&primer=sic-mosfets&from=leads"));
assert.equal(fromLeads.audience, "customer");
assert.equal(fromLeads.primer?.slug, "sic-mosfets", "the technology from Lead Finder wins over the company's own");
assert.equal(startedFrom(fromLeads), "Started from Lead Finder for Tesla.");

const fromScenario = parseStart(q("/tools/deck?from=scenario&horizon=3&view=upside&share=0.5"));
assert.deepEqual(fromScenario.scenario, { years: 3, view: "upside", share: 0.5 });
assert.equal(startedFrom(fromScenario), "Started from Scenario Modeler.");
assert.deepEqual(parseStart(q("/tools/deck?horizon=9&view=bull&share=x")).scenario, { years: 2, view: "base", share: 0.25 }, "bad values fall back");
assert.equal(parseStart(q("/tools/deck?share=0")).scenario.share, 0, "holding share is a real choice");

const unknown = parseStart(q("/tools/deck?company=acme&primer=lasers&slide=nope"));
assert.equal(unknown.company, undefined);
assert.equal(unknown.notes.length, 3, "each unknown value is noted, never an error");
assert.equal(unknown.audience, "internal");

// Every link into the deck parses to the start it promises.
const sources: [string, RegExp][] = [
  ["src/app/(terminal)/tools/qbr/page.tsx", /\/tools\/deck\?company=\$\{company\.slug\}&from=qbr/],
  ["src/app/(terminal)/network/[slug]/page.tsx", /\/tools\/deck\?company=\$\{company\.slug\}&from=profile/],
  ["src/app/(terminal)/learn/[slug]/page.tsx", /\/tools\/deck\?primer=\$\{p\.slug\}&from=learn/],
  ["src/components/scenario/modeler.tsx", /deckHref\(\{ from: "scenario"/],
  ["src/components/leads/finder.tsx", /\/tools\/deck\?company=\$\{c\.slug\}&primer=\$\{p\.slug\}&from=leads/],
];
for (const [file, re] of sources) assert.match(readFileSync(file, "utf8"), re, `${file} links into the deck`);
assert.equal(parseStart(q("/tools/deck?company=microchip&from=profile")).from, "profile");
for (const p of PRIMERS) assert.equal(parseStart(q(`/tools/deck?primer=${p.slug}&from=learn`)).primer?.slug, p.slug, p.slug);
for (const c of COMPANIES) assert.equal(parseStart(q(`/tools/deck?company=${c.slug}&from=qbr`)).company?.slug, c.slug, c.slug);

// deckHref and parseStart round-trip.
const round = parseStart(q(deckHref({ audience: "customer", company: "microchip", from: "qbr" })));
assert.deepEqual([round.audience, round.company?.slug, round.from], ["customer", "microchip", "qbr"]);
assert.deepEqual(parseStart(q(deckHref({ from: "scenario", scenario: { years: 4, view: "downside", share: 0 } }))).scenario, {
  years: 4,
  view: "downside",
  share: 0,
});
assert.equal(deckHref({}), "/tools/deck");

// ---- Outlines ----
const titles = (xs: SlideId[]) => xs.join(" ");
assert.equal(titles(outline(fromQbr)), "cover company commentary linecard leads share arrow pipeline cycle talking sources", "a QBR deck closes on its talking points");
// The talking points slide needs a deck started from QBR Prep, and the start keeps the meeting and focus.
assert.ok(!outline(parseStart(q("/tools/deck?company=microchip&from=profile"))).includes("talking"));
assert.equal(unavailableReason("talking", parseStart(q("/tools/deck?company=microchip"))), "Needs a deck started from QBR Prep");
const withFocus = parseStart(q("/tools/deck?company=apple&from=qbr&focus=lead%20times"));
assert.deepEqual(withFocus.qbr, { meeting: "customer", focus: "lead times" }, "a customer's meeting by default");
const roundQbr = parseStart(q(deckHref({ company: "microchip", from: "qbr", qbr: { meeting: "supplier", focus: "pricing in Japan" } })));
assert.deepEqual(roundQbr.qbr, { meeting: "supplier", focus: "pricing in Japan" });
assert.equal(parseStart(q("/tools/deck?company=microchip&focus=x")).qbr, undefined, "no QBR without from=qbr");
assert.equal(
  titles(outline(parseStart(q("/tools/deck?company=jabil")))),
  "cover company commentary news account supply sources",
  "no primer, no technology slide",
);
assert.equal(titles(outline(fromLearn)), "cover technology news supply sources", "no company, no company slides");
assert.equal(titles(outline(parseStart(q("/tools/deck")))), "cover cycle economy arrow performance share scenario sources");
assert.equal(titles(outline(parseStart(q("/tools/deck?slide=cycle")))), "cycle", "one view is a one-slide deck");
assert.equal(
  titles(outline(parseStart(q("/tools/deck?slide=company")))),
  "cover cycle economy arrow performance share scenario sources",
  "a slide that can't be made falls back",
);
for (const a of AUDIENCES) {
  const o = outline({ ...fromQbr, audience: a.value });
  assert.equal(o[0], "cover");
  assert.equal(o[o.length - 1], "sources");
}
assert.equal(available("leads", fromQbr), true, "a supplier with a primer gets a lead list");
assert.equal(unavailableReason("leads", parseStart({})), "Needs a company with a primer");
assert.equal(unavailableReason("company", parseStart({})), "Needs a company");
assert.equal(unavailableReason("cycle", parseStart({})), null);
assert.equal(unavailableReason("news", parseStart({})), "Needs a company or a technology");

// Adding goes before sources; moving stays in bounds.
assert.deepEqual(addSlide(["cover", "cycle", "sources"], "economy"), ["cover", "cycle", "economy", "sources"]);
assert.deepEqual(addSlide(["cycle"], "economy"), ["cycle", "economy"]);
assert.deepEqual(addSlide(["cycle"], "cycle"), ["cycle"]);
assert.deepEqual(move(["cover", "cycle", "sources"], "cycle", -1), ["cycle", "cover", "sources"]);
assert.deepEqual(move(["cover", "cycle"], "cover", -1), ["cover", "cycle"]);

// ---- The lead ----
assert.equal(
  lead(fromQbr, outline(fromQbr)),
  "A supplier pitch for Microchip in 11 slides: seven on live data and two on mock, with a cover and sources.",
);
assert.equal(
  lead(parseStart({}), outline(parseStart({}))),
  "An internal review in eight slides: three on live data and three on mock, with a cover and sources.",
);
assert.equal(lead(fromLearn, outline(fromLearn)), "A customer pitch on SiC MOSFETs in five slides: three on live data, with a cover and sources.");
assert.equal(lead(fromQbr, ["cycle"]), "One slide: Where the cycle is, on live data.");
assert.equal(lead(fromQbr, ["cover", "sources"]), "A supplier pitch for Microchip in two slides: just a cover and sources.");
assert.equal(lead(fromQbr, []), "A supplier pitch for Microchip, with no slides yet. Add one from the library.");
assert.equal(lead(fromQbr, outline(fromQbr), allLive), "A supplier pitch for Microchip in 11 slides: nine on live data, with a cover and sources.");
assert.equal(deckName({ audience: "internal", company: microchip }), "An internal review with Microchip");
assert.equal(count(9), "nine");
assert.equal(count(12), "12");
assert.equal(list(["a", "b", "c"]), "a, b and c");

// ---- Headlines and the sources slide ----
assert.equal(companyHeadline("Microchip", 0.38), "Microchip grew 38% on a year ago");
assert.equal(companyHeadline("Wolfspeed", -0.12), "Wolfspeed's revenue fell 12% on a year ago");
assert.equal(companyHeadline("Microchip"), "Microchip at a glance");
assert.equal(shareHeadline("Microcontrollers & processors", 0.0441), "Avnet holds 4.4% of microcontrollers and processors");
const src = sourcesPreview(["cover", "company", "share", "sources"], {
  company: { headline: "x", source: "SEC filings", period: "Q2 2026" },
  share: { headline: "y", source: "Mock model of Avnet" },
});
assert.deepEqual(src.lines, ["Company at a glance: SEC filings, Q2 2026", "Avnet's share of the segment: Mock model of Avnet"]);
assert.equal(src.text, "One of two slides uses mock data until Avnet's sources are hooked up.");
assert.deepEqual(sourcesPreview(["share"], {}).lines, ["Avnet's share of the segment: Market Share (mock data)"]);
assert.equal(sourcesPreview(["company"], {}).text, "Every slide is on live data.");

// ---- Content ----
// Every primer maps to a real segment, and every primer has a maker in the app.
for (const p of PRIMERS) assert.ok((SEGMENTS as readonly string[]).includes(PRIMER_SEGMENT[p.slug]), `${p.slug} has a segment`);
assert.equal(primerFor(microchip)?.slug, "microcontrollers");

// Every page a slide opens on exists in the app.
const route = (href: string) => {
  const path = href.split("?")[0].replace(/^\//, "");
  const dir = join(
    "src/app/(terminal)",
    ...path.split("/").map((seg, i, all) => (i === all.length - 1 && /^(microchip|microcontrollers)$/.test(seg) ? "[slug]" : seg)),
  );
  return existsSync(join(dir, "page.tsx"));
};
for (const s of SLIDES) {
  const href = hrefOf(s.id, { company: microchip, primer: primerFor(microchip), scenario: fromQbr.scenario });
  if (s.id === "cover" || s.id === "sources") assert.equal(href, null);
  else assert.ok(href && route(href), `${s.id} opens on ${href}`);
}

// No slash in visible text (the slash-mark rule), no middle dot, no em-dash or en-dash.
const visible = [
  ...SLIDES.flatMap((s) => [s.title, s.from]),
  ...AUDIENCES.map((a) => a.label),
  ...AUDIENCES.map((a) => lead({ ...fromQbr, audience: a.value }, outline({ ...fromQbr, audience: a.value }))),
  lead(fromLearn, outline(fromLearn)),
  startedFrom(fromQbr)!,
  startedFrom(fromLearn)!,
  ...unknown.notes,
  ...src.lines!,
  // JSX text in the builder: runs between tags that start with a capital letter.
  ...[...readFileSync("src/components/deck/builder.tsx", "utf8").matchAll(/>\s*([A-Z][^<>{}=;()]*?)\s*</g)].map((m) => m[1]),
];
for (const t of visible) assert.ok(!/[/·—–]/.test(t), t);

console.log("deck outline: ok");
