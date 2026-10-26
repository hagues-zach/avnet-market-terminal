import type { Layout, Placeholder } from "@/lib/brand/template/read";
import { CATALOG } from "./assemble";

// Which template layout a slide uses. Exporters ask for a kind; the headline's
// length picks the 1-line or 2-line family, since the template's title is one
// 26 pt line at 8.45 inches (about 44 characters) or two. Layouts from the
// copied masters and the slash pattern layouts are never chosen.

export type SlideKind = "cover" | "subhead" | "basic" | "two-column" | "closing";

const PREFERRED: Record<SlideKind, Record<"1-line" | "2-line", string>> = {
  // The full-image cover carries the template's A-frame photo and has no picture to fill.
  cover: { "1-line": "Cover - Full Image - 1 Line", "2-line": "Cover - Full Image - 2 Line" },
  // A headline and one supporting sentence; charts and tables are drawn below it.
  subhead: { "1-line": "Title and Subhead - 1 Line", "2-line": "Title and Subhead - 2 Line" },
  basic: { "1-line": "Basic - 1 Line", "2-line": "Basic - 2 line" },
  "two-column": { "1-line": "2 Column - 1 Line", "2-line": "2 Column - 2 Line" },
  closing: { "1-line": "Closing", "2-line": "Closing" },
};

/** Characters that fit on one title line: the body width at 26 pt for content, narrower on the cover. */
const ONE_LINE: Record<SlideKind, number> = { cover: 40, subhead: 44, basic: 44, "two-column": 44, closing: Infinity };

const usable = () => CATALOG.layouts.filter((l) => !l.excluded);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function familyFor(kind: SlideKind, headline = ""): "1-line" | "2-line" {
  return headline.length > ONE_LINE[kind] ? "2-line" : "1-line";
}

export function chooseLayout(kind: SlideKind, headline = ""): Layout {
  const name = PREFERRED[kind][familyFor(kind, headline)];
  const l = usable().find((x) => same(x.name, name) && (kind === "closing" || x.family === familyFor(kind, headline)));
  if (!l) throw new Error(`The template has no usable "${name}" layout`);
  return l;
}

/** A layout's placeholder by key ("title", or an idx such as "10"). */
export function placeholder(l: Layout, key: string): Placeholder | undefined {
  return l.placeholders.find((p) => (key === "title" ? p.type === "title" : String(p.idx) === key));
}
