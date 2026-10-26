import { promises as fs } from "node:fs";
import path from "node:path";
import { cutoff, type Expiry, type Store } from "./types";

// The local file adapter: one JSON object per namespace, at <root>/<ns>.json
// (.cache/ai by default, not committed). Each process also keeps what it wrote or
// read in memory, in front of the files, so a read-only filesystem (a serverless
// deployment) still keeps results for the life of the instance. Reads go to the
// file as well, so another process's writes are seen. Server-only.

export function fileStore(root = path.join(process.cwd(), ".cache", "ai")): Store {
  const memory = new Map<string, Map<string, unknown>>();
  // Writes to one namespace run one at a time, so two in a row don't lose each other's entries.
  const queue = new Map<string, Promise<void>>();

  const mem = (ns: string) => {
    let m = memory.get(ns);
    if (!m) memory.set(ns, (m = new Map()));
    return m;
  };

  async function readFile<T>(ns: string): Promise<Record<string, T>> {
    try {
      return JSON.parse(await fs.readFile(path.join(root, `${ns}.json`), "utf8")) as Record<string, T>;
    } catch {
      return {};
    }
  }

  function prune<T>(entries: Record<string, T>, expire?: Expiry<T>): Record<string, T> {
    if (!expire) return entries;
    const from = cutoff(expire.days);
    return Object.fromEntries(Object.entries(entries).filter(([k, v]) => (expire.dateOf(k, v) ?? "") >= from));
  }

  async function write<T>(ns: string, entries: Record<string, T>, expire?: Expiry<T>): Promise<void> {
    const m = mem(ns);
    for (const [k, v] of Object.entries(entries)) m.set(k, v);
    if (expire) {
      const kept = prune(Object.fromEntries(m) as Record<string, T>, expire);
      for (const k of [...m.keys()]) if (!(k in kept)) m.delete(k);
    }
    const run = (queue.get(ns) ?? Promise.resolve()).then(async () => {
      const merged = prune({ ...(await readFile<T>(ns)), ...entries }, expire);
      try {
        await fs.mkdir(root, { recursive: true });
        await fs.writeFile(path.join(root, `${ns}.json`), JSON.stringify(merged), "utf8");
      } catch {
        // A read-only filesystem only costs the saved copy, not the result.
      }
    });
    queue.set(ns, run);
    await run;
  }

  return {
    async get<T>(ns: string, key: string) {
      const m = mem(ns);
      if (m.has(key)) return m.get(key) as T;
      const hit = (await readFile<T>(ns))[key];
      if (hit !== undefined) m.set(key, hit);
      return hit;
    },
    async getAll<T>(ns: string) {
      return { ...(await readFile<T>(ns)), ...(Object.fromEntries(mem(ns)) as Record<string, T>) };
    },
    set: (ns, key, value, expire) => write(ns, { [key]: value }, expire),
    setMany: (ns, entries, expire) => write(ns, entries, expire),
  };
}
