// The local file adapter: the shared store contract, then what's particular to
// files (the JSON layout, pruning entries another process wrote, a read-only
// filesystem). Run with: npx tsx src/lib/store/file.test.ts
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { storeContract } from "./contract";
import { fileStore } from "./file";
import { fileSnapshots } from "./snapshots";
import { cutoff } from "./types";

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "store-test-"));
  const file = (ns: string) => path.join(root, "ai", `${ns}.json`);
  const locked = path.join(root, "locked");
  await fs.mkdir(locked);
  await fs.chmod(locked, 0o555);
  try {
    await storeContract({
      name: "file",
      kv: () => fileStore(path.join(root, "ai")),
      snapshots: () => fileSnapshots(path.join(root, "line-cards")),
      broken: {
        kv: () => fileStore(path.join(locked, "ai")),
        snapshots: () => fileSnapshots(path.join(locked, "line-cards")),
      },
    });

    // One JSON object per namespace, and snapshots pretty-printed per distributor per date.
    assert.deepEqual(JSON.parse(await fs.readFile(file("ns"), "utf8")).k2, { n: 2 });
    const snap = await fs.readFile(path.join(root, "line-cards", "arrow", "2026-10-01.json"), "utf8");
    assert.equal(snap, `${JSON.stringify({ lines: ["a"] }, null, 2)}\n`);

    // Pruning applies dateOf to entries the store never wrote (another process's, or older files).
    const old = cutoff(30);
    const today = cutoff(0);
    await fs.writeFile(file("seeded"), JSON.stringify({ [`${old} q`]: 1, [`${today} q`]: 2 }));
    const b = fileStore(path.join(root, "ai"));
    await b.set("seeded", `${today} new`, 3, { days: 7, dateOf: (k) => k.slice(0, 10) });
    assert.deepEqual(Object.keys(await fileStore(path.join(root, "ai")).getAll("seeded")).sort(), [
      `${today} new`,
      `${today} q`,
    ]);
  } finally {
    await fs.chmod(locked, 0o755);
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log("file store: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
