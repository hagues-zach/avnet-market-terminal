// Reads the Avnet PowerPoint template's masters and layouts into a catalog. Pure
// over the file's bytes; used by scripts/extract-template.ts to write
// catalog.json and by its test to check catalog.json is current.
import path from "node:path";
import JSZip from "jszip";

export const TEMPLATE_FILE = "avnet-template-fy27.pptx";
export const TEMPLATE_PATH = path.join(process.cwd(), "assets", "brand", TEMPLATE_FILE);

const EMU = 914400;
const inch = (v: string) => Math.round((Number(v) / EMU) * 1000) / 1000;

export type LayoutKind =
  | "cover"
  | "title"
  | "title-pattern"
  | "subhead"
  | "basic"
  | "two-column"
  | "image"
  | "contents"
  | "divider"
  | "qa"
  | "thanks"
  | "closing"
  | "quote"
  | "callout"
  | "cv"
  | "section"
  | "other";

export interface Placeholder {
  /** title, body, pic, sldNum... (a placeholder with no type is a body). */
  type: string;
  idx?: number;
  /** Inches; inherited from the master when the layout doesn't set them. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Font size in points, when the layout sets one. */
  size?: number;
  prompt: string;
}

export interface Layout {
  /** 1-based number of slideLayoutN.xml. */
  n: number;
  file: string;
  master: number;
  name: string;
  family: "1-line" | "2-line";
  kind: LayoutKind;
  placeholders: Placeholder[];
  media: string[];
  /** False when the layout hides the master's logo tab, rule and title (covers, dividers, closing). */
  masterShapes: boolean;
  /** Why the platform never uses it, if it doesn't. */
  excluded?: string;
}

export interface Master {
  n: number;
  file: string;
  theme: string;
  family: "1-line" | "2-line";
  layouts: number[];
  duplicateOf?: number;
}

export interface Catalog {
  template: string;
  slide: { width: number; height: number };
  masters: Master[];
  layouts: Layout[];
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const num = (file: string) => Number(file.match(/(\d+)\.xml$/)![1]);

function kindOf(name: string): LayoutKind {
  const n = name.toLowerCase();
  if (/cover/.test(n)) return "cover";
  if (/divider/.test(n)) return "divider";
  if (/q&a/.test(n)) return "qa";
  if (/thank you/.test(n)) return "thanks";
  if (/closing/.test(n)) return "closing";
  if (/table of contents/.test(n)) return "contents";
  if (/quote/.test(n)) return "quote";
  if (/callout/.test(n)) return "callout";
  if (/\bcv\b|core values/.test(n)) return "cv";
  if (/section info/.test(n)) return "section";
  if (/2 column/.test(n)) return "two-column";
  if (/50\/50|image/.test(n)) return "image";
  if (/subhead/.test(n)) return "subhead";
  if (/pattern/.test(n)) return "title-pattern";
  if (/basic/.test(n)) return "basic";
  if (/title/.test(n)) return "title";
  return "other";
}

/** Relationship id to target file name, for one part. */
async function rels(zip: JSZip, part: string): Promise<Map<string, string>> {
  const dir = path.posix.dirname(part);
  const file = zip.file(`${dir}/_rels/${path.posix.basename(part)}.rels`);
  if (!file) return new Map();
  const xml = await file.async("string");
  return new Map([...xml.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], path.posix.basename(m[2])]));
}

function placeholders(xml: string, inherit: Map<string, Omit<Placeholder, "prompt" | "size">>): Placeholder[] {
  const out: Placeholder[] = [];
  for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? []) {
    const ph = sp.match(/<p:ph([^>]*?)\/?>/);
    if (!ph) continue;
    const type = ph[1].match(/type="(\w+)"/)?.[1] ?? "body";
    if (type === "dt" || type === "ftr") continue;
    const idxRaw = ph[1].match(/idx="(\d+)"/)?.[1];
    const g = sp.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/);
    const base = inherit.get(type) ?? inherit.get("body");
    const box = g ? { x: inch(g[1]), y: inch(g[2]), w: inch(g[3]), h: inch(g[4]) } : base ? { x: base.x, y: base.y, w: base.w, h: base.h } : { x: 0, y: 0, w: 0, h: 0 };
    const size = sp.match(/<a:defRPr[^>]*sz="(\d+)"/)?.[1] ?? sp.match(/sz="(\d+)"/)?.[1];
    out.push({
      type,
      ...(idxRaw !== undefined ? { idx: Number(idxRaw) } : {}),
      ...box,
      ...(size ? { size: Number(size) / 100 } : {}),
      prompt: decode([...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" ").trim()),
    });
  }
  return out;
}

export async function readCatalog(bytes: Buffer | Uint8Array): Promise<Catalog> {
  const zip = await JSZip.loadAsync(bytes);
  const pres = await zip.file("ppt/presentation.xml")!.async("string");
  const sz = pres.match(/<p:sldSz cx="(\d+)" cy="(\d+)"/)!;
  const presRels = await rels(zip, "ppt/presentation.xml");
  const masterFiles = [...pres.matchAll(/<p:sldMasterId [^>]*r:id="([^"]+)"/g)].map((m) => presRels.get(m[1])!);

  const masters: Master[] = [];
  const layouts: Layout[] = [];
  for (const file of masterFiles) {
    const part = `ppt/slideMasters/${file}`;
    const xml = await zip.file(part)!.async("string");
    const r = await rels(zip, part);
    const themeFile = [...r.values()].find((t) => t.startsWith("theme"))!;
    const themeName = decode((await zip.file(`ppt/theme/${themeFile}`)!.async("string")).match(/<a:theme [^>]*name="([^"]*)"/)![1]);
    const family = /2 L+ine/i.test(themeName) ? "2-line" : "1-line";
    const inherit = new Map(placeholders(xml, new Map()).map((p) => [p.type, p]));
    const order = [...xml.matchAll(/<p:sldLayoutId [^>]*r:id="([^"]+)"/g)].map((m) => r.get(m[1])!);
    const master: Master = { n: num(file), file, theme: themeName, family, layouts: order.map(num) };
    masters.push(master);
    for (const lf of order) {
      const lpart = `ppt/slideLayouts/${lf}`;
      const lx = await zip.file(lpart)!.async("string");
      const name = decode(lx.match(/<p:cSld name="([^"]*)"/)?.[1] ?? lf).trim();
      layouts.push({
        n: num(lf),
        file: lf,
        master: master.n,
        name,
        // The name says when it differs from its master ("Basic Title - 2 Lline" sits in a 1-line master).
        family: /\b2[- ]?l+ine\b/i.test(name) ? "2-line" : /\b1[- ]?line\b/i.test(name) ? "1-line" : family,
        kind: kindOf(name),
        placeholders: placeholders(lx, inherit),
        media: [...(await rels(zip, lpart)).values()].filter((t) => /\.(png|jpe?g|svg|gif|emf)$/i.test(t)),
        masterShapes: !/showMasterSp="0"/.test(lx),
      });
    }
  }
  // Later masters whose theme copies an earlier one ("1_Avnet Templates - 1 Line") are duplicates.
  for (const m of masters) {
    const original = masters.find((o) => o.n < m.n && m.theme.replace(/^\d+_/, "").replace(/L+ine/i, "Line") === o.theme.replace(/L+ine/i, "Line"));
    if (original) m.duplicateOf = original.n;
  }
  // A layout in a copied master is a duplicate only when the original master has one of the
  // same name; the copies also carry a few layouts found nowhere else, which stay usable.
  const same = (n: string) => n.toLowerCase().replace(/^\d+_/, "").replace(/l+ine/g, "line").replace(/\s+/g, " ").trim();
  for (const l of layouts) {
    if (/slash pattern/i.test(l.name)) {
      l.excluded = "Slash pattern: the brand kit dropped the slash mark";
      continue;
    }
    const m = masters.find((x) => x.n === l.master)!;
    const twin = m.duplicateOf ? layouts.find((o) => o.master === m.duplicateOf && same(o.name) === same(l.name)) : undefined;
    if (twin) l.excluded = `Duplicate of layout ${twin.n} in master ${twin.master}`;
  }
  layouts.sort((a, b) => a.n - b.n);
  return { template: TEMPLATE_FILE, slide: { width: inch(sz[1]), height: inch(sz[2]) }, masters, layouts };
}
