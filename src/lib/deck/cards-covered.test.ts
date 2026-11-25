// Every card on a visible page can go in a deck: each <Panel> and <ChartCard>
// passes the slide it makes (`deck`), or `deck={null}` when it has none (an
// error, a loading state, a form). A new card can't ship without deciding.
// Run with: npx tsx src/lib/deck/cards-covered.test.ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Pages hidden from the app (src/lib/visibility.ts) and pages that aren't the product.
const SKIP = [
  "src/components/ui/",
  "src/components/learn/",
  "src/components/line-cards/",
  "src/components/supply/",
  "src/components/leads/",
  "src/components/customers/",
  "src/components/qbr/",
  "src/components/scenario/",
  "src/components/pipeline/",
  "src/components/cycle-engine/",
  "src/app/(terminal)/learn/",
  "src/app/(terminal)/line-cards/",
  "src/app/(terminal)/supply-chain/",
  "src/app/(terminal)/tools/leads/",
  "src/app/(terminal)/tools/qbr/",
  "src/app/(terminal)/design-pipeline/",
  "src/app/(terminal)/customers/",
  "src/app/(terminal)/signals/engine/",
  "src/app/(terminal)/forecast/",
  "src/app/(terminal)/design-kit/",
  "src/app/(terminal)/dev/",
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) ? [p] : [];
  });

/** The opening tag starting at i: up to its closing ">" outside braces and quotes. */
function openingTag(src: string, i: number): string {
  let depth = 0;
  let quote = "";
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === quote && src[j - 1] !== "\\") quote = "";
    } else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return src.slice(i, j + 1);
  }
  return src.slice(i);
}

const missing: string[] = [];
let cards = 0;
for (const file of [...walk("src/components"), ...walk("src/app")]) {
  if (SKIP.some((s) => file.startsWith(s))) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/<(Panel|ChartCard)\b/g)) {
    cards++;
    const tag = openingTag(src, m.index!);
    if (!/\bdeck=/.test(tag)) {
      const line = src.slice(0, m.index).split("\n").length;
      const title = tag.match(/title=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/);
      missing.push(`${file}:${line} ${m[1]} ${title ? title[1] ?? title[2] ?? title[3] : "(untitled)"}`);
    }
  }
}

assert.ok(cards > 50, `found ${cards} cards; the scan should see the app's cards`);
assert.deepEqual(missing, [], `${missing.length} of ${cards} cards have no deck slide (pass deck={...}, or deck={null} for none):\n${missing.join("\n")}`);
console.log(`cards-covered.test.ts: ok (${cards} cards)`);
