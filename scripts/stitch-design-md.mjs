// Builds docs/design/stitch-design.md: DESIGN.md minus the sections only the repo
// needs (fixes, brand-team questions, iteration guide), for Stitch's design system.
// Run: node scripts/stitch-design-md.mjs
import { readFileSync, writeFileSync } from "node:fs";

const DROP = ["Fixes this document asks for", "Open questions for the Avnet brand team", "Iteration guide"];

const src = readFileSync("DESIGN.md", "utf8");
const end = src.indexOf("\n---\n", 4) + 5;
const frontMatter = src.slice(0, end);
const sections = src.slice(end).split(/\n(?=## )/);
const kept = sections.filter((s) => !DROP.some((title) => s.startsWith(`## ${title}`)));

writeFileSync("docs/design/stitch-design.md", frontMatter + kept.join("\n").replace(/\n{3,}/g, "\n\n"));
console.log(`docs/design/stitch-design.md: kept ${kept.length} of ${sections.length} sections`);
