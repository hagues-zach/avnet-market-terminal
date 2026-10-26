// The template catalog matches the template file, and accounts for every layout.
// Run with: npx tsx src/lib/brand/template/catalog.test.ts
// If it fails after a template change, run: npx tsx scripts/extract-template.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TEMPLATE_PATH, readCatalog, type Catalog } from "./read";

(async () => {
  const fresh = await readCatalog(readFileSync(TEMPLATE_PATH));
  const stored = JSON.parse(readFileSync(path.join(process.cwd(), "src/lib/brand/template/catalog.json"), "utf8")) as Catalog;
  assert.deepEqual(stored, fresh, "catalog.json is out of date: run npx tsx scripts/extract-template.ts");

  const c = fresh;
  assert.deepEqual(c.slide, { width: 10, height: 5.625 }, "16:9 at 10 inches");
  assert.equal(c.layouts.length, c.masters.reduce((n, m) => n + m.layouts.length, 0), "every master's layouts are catalogued");
  assert.equal(new Set(c.layouts.map((l) => l.n)).size, c.layouts.length, "no layout twice");
  assert.ok(c.layouts.every((l) => l.kind !== "other"), "every layout has a kind");

  const slash = c.layouts.filter((l) => /slash pattern/i.test(l.name));
  assert.ok(slash.length > 0 && slash.every((l) => l.excluded?.startsWith("Slash pattern")), "slash pattern layouts are excluded");
  // Copied masters' layouts are excluded only where the original master has the same layout.
  for (const l of c.layouts.filter((x) => x.excluded?.startsWith("Duplicate"))) {
    const twin = Number(l.excluded!.match(/layout (\d+)/)![1]);
    assert.ok(c.layouts.find((x) => x.n === twin && !x.excluded), `layout ${l.n}'s twin ${twin} is usable`);
  }
  // The layouts the exporters rely on are there and usable, with the placeholders they fill.
  const usable = c.layouts.filter((l) => !l.excluded);
  const has = (kind: string, family: string, types: string[]) =>
    usable.some((l) => l.kind === kind && l.family === family && types.every((t) => l.placeholders.some((p) => `${p.type}${p.idx !== undefined ? `:${p.idx}` : ""}` === t)));
  assert.ok(has("cover", "1-line", ["title", "body:11", "body:13"]), "a cover with title, subtitle and date line");
  for (const family of ["1-line", "2-line"]) {
    assert.ok(has("basic", family, ["title", "body:10"]), `a ${family} basic layout`);
    assert.ok(has("subhead", family, ["title", "body:11"]), `a ${family} title and subhead layout`);
    assert.ok(has("two-column", family, ["title", "body:10", "body:15"]), `a ${family} two column layout`);
  }
  assert.ok(usable.some((l) => l.kind === "closing"), "a closing layout");
  console.log(`template catalog: ok (${c.layouts.length} layouts, ${usable.length} usable)`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
