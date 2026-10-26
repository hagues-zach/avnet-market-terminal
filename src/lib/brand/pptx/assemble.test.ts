// The template writer produces a consistent PowerPoint package on the Avnet template.
// Run with: npx tsx src/lib/brand/pptx/assemble.test.ts
import assert from "node:assert/strict";
import path from "node:path";
import JSZip from "jszip";
import { CATALOG, buildFromTemplate, type TemplateSlide } from "./assemble";
import { chooseLayout } from "./layouts";

const cover = chooseLayout("cover", "Microchip and Avnet");
const basic = chooseLayout("basic", "Short headline");
const two = chooseLayout("two-column", "A headline long enough to need the second title line here");
const closing = chooseLayout("closing");

const slides: TemplateSlide[] = [
  { layout: cover.n, fill: { title: ["Microchip and Avnet"], "11": ["Supplier pitch"], "13": ["Oct 26"] }, slideNumber: false },
  { layout: basic.n, fill: { title: ["Short headline"], "10": ["One — line", { text: "Two", bullet: false }] } },
  {
    layout: two.n,
    fill: { title: ["A headline long enough to need the second title line here"] },
    draw: (s, p) => {
      s.addChart(p.ChartType.bar, [{ name: "Avnet", labels: ["Growth"], values: [0.477] }], { x: 0.5, y: 1.4, w: 4.2, h: 3 });
      s.addTable([[{ text: "Revenue" }, { text: "$1.48B" }]], { x: 5.3, y: 1.4, w: 4.2 });
      s.addText("Source: SEC filings", { x: 0.5, y: 5.3, w: 5, h: 0.2, fontSize: 8 });
    },
  },
  {
    layout: basic.n,
    fill: { title: ["Second chart"] },
    draw: (s, p) => s.addChart(p.ChartType.line, [{ name: "Market", labels: ["Q1", "Q2"], values: [0.1, 0.2] }], { x: 0.5, y: 1.2, w: 9, h: 3.4 }),
  },
  { layout: closing.n, slideNumber: false },
];

(async () => {
  const zip = await JSZip.loadAsync(await buildFromTemplate(slides, { title: "Test — deck" }));
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const read = (n: string) => zip.file(n)!.async("string");

  // Every relationship target exists.
  for (const relsFile of names.filter((n) => n.endsWith(".rels"))) {
    const dir = path.posix.dirname(path.posix.dirname(relsFile));
    for (const m of (await read(relsFile)).matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*\/>/g)) {
      if (/TargetMode="External"/.test(m[0])) continue;
      const target = m[1].startsWith("/") ? m[1].slice(1) : path.posix.normalize(path.posix.join(dir === "." ? "" : dir, m[1]));
      assert.ok(names.includes(target), `${relsFile} points at missing ${target}`);
    }
  }
  // Every part has a content type, by override or by extension.
  const types = await read("[Content_Types].xml");
  const overrides = new Set([...types.matchAll(/PartName="\/([^"]+)"/g)].map((m) => m[1]));
  const defaults = new Set([...types.matchAll(/<Default Extension="([^"]+)"/g)].map((m) => m[1].toLowerCase()));
  for (const n of names.filter((x) => x !== "[Content_Types].xml"))
    // ("_rels/.rels" has no extension to Node; its type is the "rels" default.)
    assert.ok(overrides.has(n) || defaults.has(n.slice(n.lastIndexOf(".") + 1).toLowerCase()), `no content type for ${n}`);
  for (const o of overrides) assert.ok(names.includes(o), `content type for missing part ${o}`);

  // Slides: in order, unique ids, the section lists exactly them, each on the chosen layout.
  const pres = await read("ppt/presentation.xml");
  const ids = [...pres.matchAll(/<p:sldId id="(\d+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, slides.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...pres.matchAll(/<p14:sldId id="(\d+)"/g)].map((m) => m[1]), ids, "the section holds the new slides");
  for (const [i, s] of slides.entries()) {
    const rels = await read(`ppt/slides/_rels/slide${i + 1}.xml.rels`);
    assert.match(rels, new RegExp(`slideLayouts/slideLayout${s.layout}\\.xml"`), `slide ${i + 1} layout`);
  }
  const s1 = await read("ppt/slides/slide1.xml");
  assert.match(s1, /<p:ph type="title"\/>[\s\S]*Microchip and Avnet/, "the title fills the layout's title placeholder");
  assert.match(s1, /<p:ph idx="13"\/>/, "the cover's date line fills its placeholder");
  assert.ok(!/<p:ph type="pic"/.test(s1), "unfilled placeholders are left off");
  assert.match(await read("ppt/slides/slide2.xml"), /One, line/, "dashes rewritten");
  assert.match(await read("ppt/slides/slide2.xml"), /type="slidenum"/, "slide number on content slides");
  const s3 = await read("ppt/slides/slide3.xml");
  const shapeIds = [...s3.matchAll(/<p:cNvPr id="(\d+)"/g)].map((m) => m[1]);
  assert.equal(new Set(shapeIds).size, shapeIds.length, "shape ids are unique on a slide");

  // Charts moved across with their workbooks; two charts, two workbooks.
  assert.deepEqual(names.filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).sort(), ["ppt/charts/chart1.xml", "ppt/charts/chart2.xml"]);
  assert.equal(names.filter((n) => /^ppt\/embeddings\/.*\.xlsx$/.test(n)).length, 2);

  // The template stays whole except the slash pattern layouts and their texture.
  const layoutsLeft = names.filter((n) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)).length;
  const slash = CATALOG.layouts.filter((l) => l.excluded?.startsWith("Slash pattern"));
  assert.equal(layoutsLeft, CATALOG.layouts.length - slash.length, "every other layout is kept");
  for (const l of slash) assert.ok(!names.includes(`ppt/slideLayouts/${l.file}`), `${l.name} removed`);
  for (const m of new Set(slash.flatMap((l) => l.media))) assert.ok(!names.includes(`ppt/media/${m}`), `${m} removed`);
  for (let m = 1; m <= CATALOG.masters.length; m++) {
    const master = await read(`ppt/slideMasters/slideMaster${m}.xml`);
    const mRels = await read(`ppt/slideMasters/_rels/slideMaster${m}.xml.rels`);
    const listed = [...master.matchAll(/<p:sldLayoutId [^>]*r:id="([^"]+)"/g)].map((x) => x[1]);
    for (const rid of listed) assert.match(mRels, new RegExp(`Id="${rid}"`), `master ${m} lists a layout it links`);
  }
  assert.ok(!names.some((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n) && Number(n.match(/\d+/)![0]) > slides.length), "the template's sample slides are gone");
  assert.match(await read("docProps/core.xml"), /<dc:title>Test, deck<\/dc:title>/);
  assert.match(await read("docProps/app.xml"), new RegExp(`<Slides>${slides.length}</Slides>`));
  console.log("template writer: ok");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
