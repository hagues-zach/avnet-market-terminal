import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import { plainDashes } from "@/lib/ai/dashes";
import catalogJson from "@/lib/brand/template/catalog.json";
import type { Catalog, Layout } from "@/lib/brand/template/read";

// Every PowerPoint the platform exports is built on the Avnet FY27 template
// (assets/brand/avnet-template-fy27.pptx): the file's own masters, layouts,
// theme and fonts, with the sample slides dropped and the slash pattern layouts
// removed. Each slide is linked to a layout from the catalog and fills that
// layout's real placeholders, so titles inherit the template's type and sit
// where the brand puts them. Charts, tables and footers are drawn with
// pptxgenjs on a scratch slide of the same size and moved across with their
// chart parts, so charts stay native and editable. Server-only.

export const CATALOG = catalogJson as Catalog;
const TEMPLATE = path.join(process.cwd(), "assets", "brand", CATALOG.template);

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Hex without #. */
  color?: string;
  /** Points. */
  size?: number;
}

/** A paragraph: plain text, or runs, with an optional level, numbering and size. */
export type Para =
  | string
  | { runs: Run[]; level?: number; numbered?: boolean; bullet?: false; size?: number; spaceAfter?: number }
  | { text: string; level?: number; numbered?: boolean; bullet?: false; size?: number; bold?: boolean; italic?: boolean; color?: string; spaceAfter?: number };

export interface TemplateSlide {
  /** The layout's number in the catalog (slideLayoutN.xml). */
  layout: number;
  /** Placeholder text, keyed "title" or by idx ("10", "11"...). Placeholders not given are left off the slide. */
  fill?: Record<string, Para[]>;
  /** Charts, tables and free text, drawn in inches on a 10 by 5.625 slide. */
  draw?: (slide: PptxGenJS.Slide, pptx: PptxGenJS) => void;
  /** Adds the layout's slide number placeholder. Default true when the layout has one. */
  slideNumber?: boolean;
}

export const layoutByNumber = (n: number): Layout => {
  const l = CATALOG.layouts.find((x) => x.n === n);
  if (!l) throw new Error(`No layout ${n} in the template catalog`);
  return l;
};

/* ---------- XML helpers ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CT = {
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function runXml(r: Run): string {
  const attrs = [`lang="en-US"`, r.size ? `sz="${Math.round(r.size * 100)}"` : "", r.bold ? `b="1"` : "", r.italic ? `i="1"` : "", `dirty="0"`].filter(Boolean).join(" ");
  const fill = r.color ? `<a:solidFill><a:srgbClr val="${r.color}"/></a:solidFill>` : "";
  return `<a:r><a:rPr ${attrs}>${fill}</a:rPr><a:t>${esc(plainDashes(r.text))}</a:t></a:r>`;
}

function paraXml(p: Para): string {
  const o = typeof p === "string" ? { text: p } : p;
  const runs: Run[] =
    "runs" in o ? o.runs.map((r) => ({ ...r, size: r.size ?? o.size })) : [{ text: o.text, bold: o.bold, italic: o.italic, color: o.color, size: o.size }];
  const level = o.level ? ` lvl="${o.level}"` : "";
  const space = o.spaceAfter !== undefined ? `<a:spcAft><a:spcPts val="${Math.round(o.spaceAfter * 100)}"/></a:spcAft>` : "";
  const bullet = o.numbered ? `<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>` : o.bullet === false ? "<a:buNone/>" : "";
  const indent = o.numbered ? ` marL="228600" indent="-228600"` : o.bullet === false ? ` marL="0" indent="0"` : "";
  const pPr = level || space || bullet || indent ? `<a:pPr${indent}${level}>${space}${bullet}</a:pPr>` : "";
  return `<a:p>${pPr}${runs.map(runXml).join("")}</a:p>`;
}

/** A placeholder shape that takes its position and styles from the layout. */
function placeholderXml(id: number, ph: { type: string; idx?: number }, paras: Para[] | "slidenum", n: number): string {
  const type = ph.type === "body" ? "" : ` type="${ph.type}"`;
  const idx = ph.idx !== undefined ? ` idx="${ph.idx}"` : "";
  const name = ph.type === "title" ? "Title" : ph.type === "sldNum" ? "Slide Number" : `Text ${ph.idx ?? ""}`.trim();
  const body =
    paras === "slidenum"
      ? `<a:p><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="en-US"/><a:t>${n}</a:t></a:fld></a:p>`
      : paras.map(paraXml).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph${type}${idx}/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp>`;
}

/* ---------- The scratch deck: charts, tables and footers drawn with pptxgenjs ---------- */

interface Drawn {
  /** Shape elements from the scratch slide, in order. */
  shapes: string;
  /** Relationship id in the scratch slide to the part it points at. */
  rels: Map<string, string>;
}

async function drawScratch(slides: TemplateSlide[]): Promise<{ zip: JSZip; drawn: (Drawn | null)[] }> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "AVNET_FY27", width: CATALOG.slide.width, height: CATALOG.slide.height });
  pptx.layout = "AVNET_FY27";
  const index: (number | null)[] = [];
  let k = 0;
  for (const s of slides) {
    if (!s.draw) {
      index.push(null);
      continue;
    }
    const slide = pptx.addSlide();
    s.draw(slide, pptx);
    index.push(++k);
  }
  const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
  const drawn = await Promise.all(
    index.map(async (n) => {
      if (n === null) return null;
      const xml = await zip.file(`ppt/slides/slide${n}.xml`)!.async("string");
      const tree = xml.match(/<p:spTree>([\s\S]*)<\/p:spTree>/)![1];
      const shapes = tree.replace(/^[\s\S]*?<\/p:grpSpPr>/, "");
      const relXml = (await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)?.async("string")) ?? "";
      const rels = new Map(
        [...relXml.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Type="([^"]+)"[^>]*Target="([^"]+)"/g)]
          .filter((m) => !/slideLayout|notesSlide/.test(m[2]))
          .map((m) => [m[1], m[3].replace(/^\//, "").replace(/^\.\.\//, "ppt/")]),
      );
      return { shapes, rels };
    }),
  );
  return { zip, drawn };
}

/* ---------- Assembly ---------- */

async function strip(zip: JSZip, types: { xml: string }) {
  // The template's sample slides go.
  const presRels = zip.file("ppt/_rels/presentation.xml.rels")!;
  let pr = await presRels.async("string");
  for (const m of [...pr.matchAll(/<Relationship [^>]*Target="slides\/(slide\d+\.xml)"[^>]*\/>/g)]) {
    zip.remove(`ppt/slides/${m[1]}`);
    zip.remove(`ppt/slides/_rels/${m[1]}.rels`);
    types.xml = types.xml.replace(new RegExp(`<Override PartName="/ppt/slides/${m[1]}"[^>]*/>`), "");
    pr = pr.replace(m[0], "");
  }
  zip.file("ppt/_rels/presentation.xml.rels", pr);

  // Slash pattern layouts go from the file, so nobody can pick them in PowerPoint either.
  const slash = CATALOG.layouts.filter((l) => l.excluded?.startsWith("Slash pattern"));
  for (const l of slash) {
    const mPart = `ppt/slideMasters/slideMaster${l.master}.xml`;
    const mRelsPart = `ppt/slideMasters/_rels/slideMaster${l.master}.xml.rels`;
    let mRels = await zip.file(mRelsPart)!.async("string");
    const rel = mRels.match(new RegExp(`<Relationship [^>]*Id="([^"]+)"[^>]*Target="../slideLayouts/${l.file}"[^>]*/>`));
    if (rel) {
      mRels = mRels.replace(rel[0], "");
      zip.file(mRelsPart, mRels);
      const mXml = await zip.file(mPart)!.async("string");
      zip.file(mPart, mXml.replace(new RegExp(`<p:sldLayoutId [^>]*r:id="${rel[1]}"\\s*/>`), ""));
    }
    zip.remove(`ppt/slideLayouts/${l.file}`);
    zip.remove(`ppt/slideLayouts/_rels/${l.file}.rels`);
    types.xml = types.xml.replace(new RegExp(`<Override PartName="/ppt/slideLayouts/${l.file}"[^>]*/>`), "");
  }
  // Media only the removed layouts used (the slash texture) goes with them.
  const removed = new Set(slash.flatMap((l) => l.media));
  const stillUsed = new Set<string>();
  for (const f of Object.keys(zip.files).filter((n) => n.endsWith(".rels"))) {
    for (const m of (await zip.file(f)!.async("string")).matchAll(/Target="[^"]*media\/([^"]+)"/g)) stillUsed.add(m[1]);
  }
  for (const m of removed) if (!stillUsed.has(m)) zip.remove(`ppt/media/${m}`);
}

/** The deck as .pptx bytes, on the Avnet template. */
export async function buildFromTemplate(slides: TemplateSlide[], meta: { title: string }): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await fs.readFile(TEMPLATE));
  const types = { xml: await zip.file("[Content_Types].xml")!.async("string") };
  await strip(zip, types);

  const { zip: scratch, drawn } = await drawScratch(slides);
  const presRelsPart = "ppt/_rels/presentation.xml.rels";
  let presRels = await zip.file(presRelsPart)!.async("string");
  let nextRel = Math.max(0, ...[...presRels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))) + 1;
  const sldIds: { id: number; rid: string }[] = [];
  let chartN = 0;

  for (const [i, s] of slides.entries()) {
    const n = i + 1;
    const layout = layoutByNumber(s.layout);
    if (layout.excluded?.startsWith("Slash pattern")) throw new Error(`Layout ${layout.n} (${layout.name}) is excluded: ${layout.excluded}`);
    const rels: string[] = [`<Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/${layout.file}"/>`];
    let shapeId = 2;
    const parts: string[] = [];

    for (const ph of layout.placeholders) {
      const key = ph.type === "title" || ph.type === "ctrTitle" ? "title" : ph.idx !== undefined ? String(ph.idx) : ph.type;
      if (ph.type === "sldNum") {
        if (s.slideNumber !== false) parts.push(placeholderXml(shapeId++, ph, "slidenum", n));
        continue;
      }
      const paras = s.fill?.[key];
      if (paras?.length) parts.push(placeholderXml(shapeId++, ph, paras, n));
    }

    const d = drawn[i];
    if (d) {
      let shapes = d.shapes;
      let r = 2;
      for (const [oldId, target] of d.rels) {
        const newId = `rId${r++}`;
        if (/charts\/chart\d+\.xml$/.test(target)) {
          const name = `chart${++chartN}.xml`;
          const chartXml = await scratch.file(target)!.async("string");
          zip.file(`ppt/charts/${name}`, chartXml);
          types.xml = types.xml.replace("</Types>", `<Override PartName="/ppt/charts/${name}" ContentType="${CT.chart}"/></Types>`);
          const cRels = (await scratch.file(target.replace(/charts\/(chart\d+\.xml)$/, "charts/_rels/$1.rels"))?.async("string")) ?? "";
          let outRels = cRels;
          for (const m of cRels.matchAll(/Target="\.\.\/embeddings\/([^"]+)"/g)) {
            const book = `Microsoft_Excel_Worksheet${chartN}.xlsx`;
            zip.file(`ppt/embeddings/${book}`, await scratch.file(`ppt/embeddings/${m[1]}`)!.async("uint8array"));
            outRels = outRels.replace(m[0], `Target="../embeddings/${book}"`);
          }
          zip.file(`ppt/charts/_rels/${name}.rels`, outRels);
          rels.push(`<Relationship Id="${newId}" Type="${REL}/chart" Target="../charts/${name}"/>`);
        } else if (/media\//.test(target)) {
          const ext = path.posix.extname(target);
          const name = `export-${n}-${r}${ext}`;
          zip.file(`ppt/media/${name}`, await scratch.file(target)!.async("uint8array"));
          rels.push(`<Relationship Id="${newId}" Type="${REL}/image" Target="../media/${name}"/>`);
        } else continue;
        shapes = shapes.replace(new RegExp(`r:(id|embed)="${oldId}"`, "g"), `r:$1="${newId}"`);
      }
      // pptxgenjs repeats shape ids; every shape on a slide needs its own.
      shapes = shapes.replace(/<p:cNvPr id="\d+"/g, () => `<p:cNvPr id="${shapeId++}"`);
      parts.push(shapes);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${parts.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    zip.file(`ppt/slides/slide${n}.xml`, xml);
    zip.file(
      `ppt/slides/_rels/slide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`,
    );
    types.xml = types.xml.replace("</Types>", `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="${CT.slide}"/></Types>`);
    const rid = `rId${nextRel++}`;
    presRels = presRels.replace("</Relationships>", `<Relationship Id="${rid}" Type="${REL}/slide" Target="slides/slide${n}.xml"/></Relationships>`);
    sldIds.push({ id: 256 + i, rid });
  }
  if (chartN && !/Extension="xlsx"/.test(types.xml)) types.xml = types.xml.replace("<Default ", `<Default Extension="xlsx" ContentType="${CT.xlsx}"/><Default `);
  zip.file(presRelsPart, presRels);
  zip.file("[Content_Types].xml", types.xml);

  // The slide list and the one section that holds it.
  let pres = await zip.file("ppt/presentation.xml")!.async("string");
  const list = `<p:sldIdLst>${sldIds.map((x) => `<p:sldId id="${x.id}" r:id="${x.rid}"/>`).join("")}</p:sldIdLst>`;
  pres = /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/.test(pres) ? pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, list) : pres.replace("</p:sldMasterIdLst>", `</p:sldMasterIdLst>${list}`);
  pres = pres.replace(/(<p14:section [^>]*>)\s*<p14:sldIdLst>[\s\S]*?<\/p14:sldIdLst>/, (_, open: string) => `${open}<p14:sldIdLst>${sldIds.map((x) => `<p14:sldId id="${x.id}"/>`).join("")}</p14:sldIdLst>`);
  zip.file("ppt/presentation.xml", pres);

  // Document properties: this deck, not the template's.
  zip.file(
    "docProps/app.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office PowerPoint</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slides.length}</Slides><Company>Avnet</Company></Properties>`,
  );
  const core = await zip.file("docProps/core.xml")!.async("string");
  const title = esc(plainDashes(meta.title));
  zip.file("docProps/core.xml", /<dc:title>[\s\S]*?<\/dc:title>|<dc:title\/>/.test(core) ? core.replace(/<dc:title>[\s\S]*?<\/dc:title>|<dc:title\/>/, `<dc:title>${title}</dc:title>`) : core.replace("</cp:coreProperties>", `<dc:title>${title}</dc:title></cp:coreProperties>`));
  zip.remove("docProps/thumbnail.jpeg");
  const rootRels = await zip.file("_rels/.rels")!.async("string");
  zip.file("_rels/.rels", rootRels.replace(/<Relationship [^>]*Target="docProps\/thumbnail\.jpeg"[^>]*\/>/, ""));
  zip.file("[Content_Types].xml", types.xml.replace(/<Override PartName="\/docProps\/thumbnail\.jpeg"[^>]*\/>/, ""));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
