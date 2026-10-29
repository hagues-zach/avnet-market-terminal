import assert from "node:assert/strict";
import type { SnapshotStore } from "./snapshots";
import { cutoff, type Store } from "./types";

// The behavior every storage adapter must have, run against each one: the file
// adapter (file.test.ts), both SQL dialects over a fake database (sql.test.ts),
// and a real database (scripts/check-store.ts). With a prefix, every namespace
// and distributor it uses starts with it, so it can share a database with real
// data; the caller removes them afterwards.

export interface ContractTarget {
  name: string;
  /** A new store over the same saved data, as a second process would see it. */
  kv(): Store;
  snapshots(): SnapshotStore;
  /** Stores whose every save fails (a read-only disk, a database that's down). */
  broken: { kv(): Store; snapshots(): SnapshotStore };
}

export async function storeContract(t: ContractTarget, prefix = ""): Promise<void> {
  const at = (what: string) => `${t.name}: ${what}`;
  const p = (name: string) => `${prefix}${name}`;

  // Round trip, and a second process (a fresh store) reads the same data.
  const a = t.kv();
  assert.equal(await a.get(p("ns"), "missing"), undefined, at("missing key"));
  await a.set(p("ns"), "k1", { n: 1 });
  assert.deepEqual(await a.get(p("ns"), "k1"), { n: 1 }, at("round trip"));
  assert.deepEqual(await t.kv().get(p("ns"), "k1"), { n: 1 }, at("a fresh store reads it"));

  // Values are plain JSON, of any shape.
  const odd = { list: [1, "two", null, { deep: true }], text: "quotes ' \" and unicode é", n: 0.5 };
  await a.set(p("ns"), "https://example.com/story?id=1&b=2 'quoted'", odd);
  assert.deepEqual(await t.kv().get(p("ns"), "https://example.com/story?id=1&b=2 'quoted'"), odd, at("any key, any JSON"));

  // setMany adds to what's there; getAll sees everything; namespaces are separate.
  await a.setMany(p("ns"), { k2: { n: 2 }, k3: { n: 3 } });
  assert.deepEqual(
    Object.keys(await t.kv().getAll(p("ns"))).sort(),
    ["https://example.com/story?id=1&b=2 'quoted'", "k1", "k2", "k3"],
    at("setMany keeps the rest"),
  );
  await a.set(p("ns"), "k1", { n: 10 });
  assert.deepEqual(await t.kv().get(p("ns"), "k1"), { n: 10 }, at("set replaces"));
  assert.deepEqual(await a.getAll(p("other")), {}, at("an empty namespace"));

  // Large values: past 4 KB and 32 KB, where Oracle's string binds stop and CLOBs begin.
  for (const size of [5_000, 40_000, 120_000]) {
    const big = { text: "x".repeat(size), size };
    await a.set(p("big"), `k${size}`, big);
    assert.deepEqual(await t.kv().get(p("big"), `k${size}`), big, at(`a ${size} character value`));
  }

  // Writes in a row from one process don't lose each other's entries.
  await Promise.all(Array.from({ length: 10 }, (_, i) => a.set(p("busy"), `k${i}`, i)));
  assert.equal(Object.keys(await t.kv().getAll(p("busy"))).length, 10, at("concurrent writes"));

  // A big setMany.
  const many = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`story-${i}`, { i }]));
  await a.setMany(p("many"), many);
  assert.deepEqual(await t.kv().getAll(p("many")), many, at("a big setMany"));

  // Expiry by a date in the key, and by a date in the value; no date means dropped.
  // Callers that prune pass the same expiry on every write, so seed that way.
  const old = cutoff(30);
  const today = cutoff(0);
  const byKey = { days: 7, dateOf: (k: string) => k.slice(0, 10) };
  await a.setMany(p("dated"), { [`${old} q`]: 1, [`${today} q`]: 2 }, { ...byKey, days: 365 });
  assert.equal(Object.keys(await t.kv().getAll(p("dated"))).length, 2, at("both kept within a year"));
  const b = t.kv();
  await b.set(p("dated"), `${today} new`, 3, byKey);
  assert.deepEqual(Object.keys(await t.kv().getAll(p("dated"))).sort(), [`${today} new`, `${today} q`], at("expiry by key"));
  assert.deepEqual(Object.keys(await b.getAll(p("dated"))).sort(), [`${today} new`, `${today} q`], at("expiry in memory too"));

  type Dated = { at?: string };
  const byValue = { days: 7, dateOf: (_: string, v: Dated) => v.at };
  await a.setMany<Dated>(p("byValue"), { x: { at: old }, y: { at: today }, z: {} }, { ...byValue, days: 365 });
  assert.deepEqual(Object.keys(await t.kv().getAll(p("byValue"))).sort(), ["x", "y"], at("no date is dropped"));
  await b.set<Dated>(p("byValue"), "w", { at: today }, byValue);
  assert.deepEqual(Object.keys(await t.kv().getAll(p("byValue"))).sort(), ["w", "y"], at("expiry by value"));

  // When saving fails, writes don't throw and the process still remembers them.
  const c = t.broken.kv();
  await c.set(p("ns"), "k", "v");
  await c.setMany(p("ns"), { k2: "v2" });
  assert.equal(await c.get(p("ns"), "k"), "v", at("a failed write is remembered"));
  assert.deepEqual(await c.getAll(p("ns")), { k: "v", k2: "v2" }, at("by getAll too"));
  assert.equal(await t.broken.kv().get(p("ns"), "k"), undefined, at("nothing was saved"));

  // Snapshots: one document per distributor per date, dates oldest first.
  const s = t.snapshots();
  const mine = async (store: SnapshotStore) => (await store.distributors()).filter((d) => d.startsWith(prefix));
  assert.deepEqual(await mine(s), [], at("no distributors yet"));
  assert.deepEqual(await s.dates(p("arrow")), [], at("no dates yet"));
  assert.equal(await s.read(p("arrow"), "2026-10-01"), null, at("a missing snapshot"));
  await s.write(p("arrow"), "2026-10-08", { lines: ["b"] });
  await s.write(p("arrow"), "2026-10-01", { lines: ["a"] });
  await s.write(p("mouser"), "2026-10-01", { lines: [] });
  await s.write(p("arrow"), "2026-10-08", { lines: ["b", "c"] });
  const s2 = t.snapshots();
  assert.deepEqual((await mine(s2)).sort(), [p("arrow"), p("mouser")], at("distributors"));
  assert.deepEqual(await s2.dates(p("arrow")), ["2026-10-01", "2026-10-08"], at("dates oldest first"));
  assert.deepEqual(await s2.read(p("arrow"), "2026-10-08"), { lines: ["b", "c"] }, at("a rewrite replaces"));
  assert.deepEqual(await s2.read(p("arrow"), "2026-10-01"), { lines: ["a"] }, at("read"));

  // A large snapshot (real ones run to about 36 KB).
  const lines = Array.from({ length: 1_500 }, (_, i) => ({ id: i, maker: `Maker ${i}`, line: "Analog and power" }));
  await s.write(p("arrow"), "2026-10-15", { lines });
  assert.deepEqual(await t.snapshots().read(p("arrow"), "2026-10-15"), { lines }, at("a large snapshot"));

  // A snapshot that can't be saved throws, so the collector can say so.
  await assert.rejects(t.broken.snapshots().write(p("arrow"), "2026-10-15", { lines: [] }), at("a failed snapshot write"));
}
