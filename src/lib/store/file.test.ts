// The local file adapter: round trip, getAll, setMany, pruning and a read-only
// filesystem. Run with: npx tsx src/lib/store/file.test.ts
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileStore } from "./file";
import { cutoff } from "./types";

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "store-test-"));
  const file = (ns: string) => path.join(root, `${ns}.json`);
  try {
    // Round trip, and a second process (a fresh store) reads the same file.
    const a = fileStore(root);
    assert.equal(await a.get("ns", "missing"), undefined);
    await a.set("ns", "k1", { n: 1 });
    assert.deepEqual(await a.get("ns", "k1"), { n: 1 });
    assert.deepEqual(await fileStore(root).get("ns", "k1"), { n: 1 });
    assert.deepEqual(JSON.parse(await fs.readFile(file("ns"), "utf8")), { k1: { n: 1 } });

    // setMany adds to what's there; getAll sees everything; namespaces are separate.
    await a.setMany("ns", { k2: { n: 2 }, k3: { n: 3 } });
    assert.deepEqual(Object.keys(await fileStore(root).getAll("ns")).sort(), ["k1", "k2", "k3"]);
    assert.deepEqual(await a.getAll("other"), {});

    // Writes in a row from one process don't lose each other's entries.
    await Promise.all(Array.from({ length: 10 }, (_, i) => a.set("busy", `k${i}`, i)));
    assert.equal(Object.keys(JSON.parse(await fs.readFile(file("busy"), "utf8"))).length, 10);

    // Pruning by a date in the key, and by a date in the value; no date means dropped.
    const old = cutoff(30);
    const today = cutoff(0);
    await fs.writeFile(file("dated"), JSON.stringify({ [`${old} q`]: 1, [`${today} q`]: 2 }));
    const b = fileStore(root);
    await b.set("dated", `${today} new`, 3, { days: 7, dateOf: (k) => k.slice(0, 10) });
    assert.deepEqual(Object.keys(await fileStore(root).getAll("dated")).sort(), [`${today} new`, `${today} q`]);
    await fs.writeFile(file("byValue"), JSON.stringify({ x: { at: old }, y: { at: today }, z: {} }));
    await b.set<{ at?: string }>("byValue", "w", { at: today }, { days: 7, dateOf: (_, v) => v.at });
    assert.deepEqual(Object.keys(await fileStore(root).getAll("byValue")).sort(), ["w", "y"]);

    // A read-only filesystem: writes don't throw and the process still remembers them.
    const locked = path.join(root, "locked");
    await fs.mkdir(locked);
    await fs.chmod(locked, 0o555);
    const c = fileStore(path.join(locked, "ai"));
    await c.set("ns", "k", "v");
    await c.setMany("ns", { k2: "v2" });
    assert.equal(await c.get("ns", "k"), "v");
    assert.deepEqual(await c.getAll("ns"), { k: "v", k2: "v2" });
    assert.equal(await fileStore(path.join(locked, "ai")).get("ns", "k"), undefined, "nothing reached the disk");
    await fs.chmod(locked, 0o755);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log("file store: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
