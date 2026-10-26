// Extract the Avnet PowerPoint template's masters and layouts into a catalog the
// exporters choose from. Every layout is recorded, with its placeholders in inches,
// so a new template version only needs this script run again (the catalog test
// fails until it is).
//
//   npx tsx scripts/extract-template.ts
//
// Writes src/lib/brand/template/catalog.json.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TEMPLATE_PATH, readCatalog } from "../src/lib/brand/template/read";

async function main() {
  const out = path.join(process.cwd(), "src/lib/brand/template/catalog.json");
  const catalog = await readCatalog(readFileSync(TEMPLATE_PATH));
  writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
  const used = catalog.layouts.filter((l) => !l.excluded);
  console.log(
    `${catalog.masters.length} masters, ${catalog.layouts.length} layouts (${used.length} usable, ${catalog.layouts.length - used.length} excluded), slide ${catalog.slide.width} by ${catalog.slide.height} in`,
  );
}

main();
